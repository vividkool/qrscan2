// 高性能QRスキャナー（ZXing第1候補 + HTML5-QRCode フォールバック）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyCWFL91baSHkjkvU_k-yTUv6QS191YTFlg",
  authDomain: "qrscan2-99ffd.firebaseapp.com",
  projectId: "qrscan2-99ffd",
  storageBucket: "qrscan2-99ffd.firebasestorage.app",
  messagingSenderId: "1089215781575",
  appId: "1:1089215781575:web:bf9d05f6930b7123813ce2",
  measurementId: "G-QZZWT3HW0W",
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// スキャナー管理クラス
class SmartQRScanner {
  constructor() {
    this.primaryScanner = null; // ZXing
    this.fallbackScanner = null; // HTML5-QRCode
    this.isScanning = false;
    this.processing = false;
    this.currentMode = null;
    this.retryCount = 0;
    this.maxRetries = 2;

    // デバッグモード
    this.DEBUG_MODE = true;

    this.init();
  }

  debugLog(message, data = null) {
    if (this.DEBUG_MODE) {
      console.log(`[Smart QR Scanner] ${message}`, data || "");
    }
  }

  async init() {
    this.debugLog("SmartQRScanner 初期化開始");

    try {
      // ZXingライブラリの読み込み確認と待機
      await this.waitForZXing();

      if (typeof ZXing !== "undefined") {
        this.primaryScanner = new ZXing.BrowserQRCodeReader();
        this.debugLog("ZXing スキャナー初期化完了");
      } else {
        this.debugLog("ZXing ライブラリが見つかりません");
      }

      // HTML5-QRCodeライブラリを動的読み込み
      await this.loadHTML5QRCode();
    } catch (error) {
      this.debugLog("初期化エラー", error);
      this.showError("スキャナーの初期化に失敗しました");
    }
  }

  async waitForZXing() {
    // ZXingライブラリの読み込み完了を待つ
    let attempts = 0;
    const maxAttempts = 50; // 5秒間待機

    while (typeof ZXing === "undefined" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (typeof ZXing === "undefined") {
      throw new Error("ZXing ライブラリの読み込みがタイムアウトしました");
    }

    this.debugLog("ZXing ライブラリ読み込み完了");
  }

  async loadHTML5QRCode() {
    try {
      if (typeof Html5QrcodeScanner === "undefined") {
        this.debugLog("HTML5-QRCode ライブラリ読み込み開始");

        const script = document.createElement("script");
        script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        this.debugLog("HTML5-QRCode ライブラリ読み込み完了");
      }

      return true;
    } catch (error) {
      this.debugLog("HTML5-QRCode ライブラリ読み込みエラー", error);
      return false;
    }
  }

  async startScan() {
    if (this.isScanning) {
      this.debugLog("既にスキャン中です");
      return;
    }

    this.debugLog("スキャン開始");
    this.isScanning = true;
    this.retryCount = 0;

    // まずZXingを試行
    const zxingSuccess = await this.tryZXingScan();

    if (!zxingSuccess) {
      this.debugLog("ZXing スキャンに失敗、HTML5-QRCode にフォールバック");
      await this.tryHTML5QRCodeScan();
    }
  }

  async tryZXingScan() {
    try {
      if (!this.primaryScanner) {
        this.debugLog("ZXing スキャナーが利用できません");
        return false;
      }

      this.currentMode = "zxing";
      this.debugLog("ZXing スキャン開始");

      this.showStatus("📷 ZXing で高速スキャン中...", "info");

      const videoElement = document.getElementById("camera");
      if (!videoElement) {
        throw new Error("カメラ要素が見つかりません");
      }

      // カメラコンテナを表示
      this.showCameraContainer();
      
      // ボタン状態を切り替え
      this.toggleScanButtons(true);

      // カメラデバイス取得
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      let selectedDevice = videoDevices[0];

      // 後面カメラを優先選択
      for (const device of videoDevices) {
        if (
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("rear") ||
          device.label.toLowerCase().includes("environment")
        ) {
          selectedDevice = device;
          break;
        }
      }

      this.debugLog(
        "選択されたカメラデバイス",
        selectedDevice?.label || "Unknown Device"
      );

      // ZXingで継続的スキャン開始
      const result = await this.primaryScanner.decodeFromVideoDevice(
        selectedDevice?.deviceId,
        videoElement,
        (result, err) => {
          if (result && this.isScanning) {
            this.debugLog("ZXing QRコード検出", result.text);
            this.handleScanResult(result.text);
            return;
          }

          if (err && !(err instanceof ZXing.NotFoundException)) {
            this.debugLog("ZXing スキャンエラー", err);
          }
        }
      );

      return true;
    } catch (error) {
      this.debugLog("ZXing スキャンエラー", error);

      // iOSやWebKit関連のエラーの場合は即座にフォールバック
      if (this.isWebKitError(error) || this.isiOSDevice()) {
        this.debugLog("iOS/WebKit エラー検出、即座にフォールバック");
        return false;
      }

      // その他のエラーは再試行
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        this.debugLog(`ZXing 再試行 ${this.retryCount}/${this.maxRetries}`);
        await this.delay(1000);
        return await this.tryZXingScan();
      }

      return false;
    }
  }

  async tryHTML5QRCodeScan() {
    try {
      this.currentMode = "html5-qrcode";
      this.debugLog("HTML5-QRCode スキャン開始");

      this.showStatus("📱 HTML5-QRCode でスキャン中...", "warning");

      // 既存のカメラストリームを停止
      await this.stopCurrentStream();

      // カメラコンテナを表示
      this.showCameraContainer();
      
      // ボタン状態を切り替え
      this.toggleScanButtons(true);

      // HTML5-QRCode スキャナー設定
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
      };

      // HTML5-QRCode インスタンス作成
      this.fallbackScanner = new Html5QrcodeScanner(
        "camera-container",
        config,
        false
      );

      // スキャン結果のハンドラ
      const onScanSuccess = async (decodedText, decodedResult) => {
        this.debugLog("HTML5-QRCode スキャン成功", decodedText);
        await this.handleScanResult(decodedText);
      };

      const onScanFailure = (error) => {
        // スキャン失敗は正常な動作（継続的にスキャン中）
        // console.log で出力しない
      };

      // スキャン開始
      this.fallbackScanner.render(onScanSuccess, onScanFailure);

      return true;
    } catch (error) {
      this.debugLog("HTML5-QRCode スキャンエラー", error);
      this.showError("QRコードスキャナーの起動に失敗しました");
      return false;
    }
  }

  async handleScanResult(qrData) {
    if (this.processing) {
      this.debugLog("既に処理中のため重複実行を防止");
      return;
    }

    try {
      this.processing = true;
      this.debugLog("QRコード処理開始", qrData);

      // スキャンを停止
      await this.stopScan();

      // 結果を保存
      await this.saveScanResult(qrData);
    } catch (error) {
      this.debugLog("QRコード処理エラー", error);
      this.showError(`処理エラー: ${error.message}`);
    } finally {
      this.processing = false;
    }
  }

  async saveScanResult(qrData) {
    try {
      this.showStatus("💾 スキャン結果を保存中...", "info");

      const docRef = await addDoc(collection(db, "scanItems"), {
        content: qrData,
        timestamp: new Date().toISOString(),
        createdAt: new Date(),
        scannerMode: this.currentMode,
        deviceInfo: this.getDeviceInfo(),
        userAgent: navigator.userAgent.substr(0, 100),
      });

      this.debugLog("Firestore保存完了", docRef.id);

      // 成功モーダル表示
      this.showSuccessModal(qrData, docRef.id);

      // UIリセット
      this.resetUI();

      // 履歴更新
      if (typeof loadScanHistory === "function") {
        loadScanHistory();
      }
    } catch (error) {
      this.debugLog("保存エラー", error);
      this.showError(`保存エラー: ${error.message}`);
    }
  }

  async stopScan() {
    if (!this.isScanning) return;

    this.debugLog("スキャン停止");
    this.isScanning = false;

    try {
      // ZXing スキャナーの停止
      if (this.primaryScanner) {
        this.primaryScanner.reset();
        this.debugLog("ZXing スキャナー停止");
      }

      // HTML5-QRCode スキャナーの停止
      if (this.fallbackScanner) {
        await this.fallbackScanner.clear();
        this.fallbackScanner = null;
        this.debugLog("HTML5-QRCode スキャナー停止");
      }

      // カメラストリーム停止
      await this.stopCurrentStream();
      
      // UI をリセット
      this.hideCameraContainer();
      this.toggleScanButtons(false);
      
    } catch (error) {
      this.debugLog("スキャン停止エラー", error);
    }
  }

  async stopCurrentStream() {
    const videoElement = document.getElementById("camera");
    if (videoElement && videoElement.srcObject) {
      const tracks = videoElement.srcObject.getTracks();
      tracks.forEach((track) => {
        track.stop();
        this.debugLog("カメラトラック停止", track.kind);
      });
      videoElement.srcObject = null;
    }
  }

  // ユーティリティメソッド
  isWebKitError(error) {
    const errorString = error.toString().toLowerCase();
    return (
      errorString.includes("webkit") ||
      errorString.includes("not supported") ||
      errorString.includes("permission")
    );
  }

  isiOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  getDeviceInfo() {
    return {
      platform: navigator.platform,
      userAgent: navigator.userAgent.substr(0, 100),
      isMobile: /Mobi|Android/i.test(navigator.userAgent),
      isiOS: this.isiOSDevice(),
      isWebKit: /WebKit/i.test(navigator.userAgent),
    };
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // UI メソッド
  showStatus(message, type = "info") {
    const statusElement = document.getElementById("scannerStatus");
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status ${type}`;
      statusElement.style.display = "block";
    }
    this.debugLog("ステータス表示", { message, type });
  }

  showError(message) {
    this.showStatus(`❌ ${message}`, "error");
    console.error("[Smart QR Scanner Error]", message);
  }

  showSuccessModal(qrData, docId) {
    if (typeof showSuccessModal === "function") {
      showSuccessModal(qrData, docId);
    } else {
      this.showStatus(`✅ 保存完了: ${qrData}`, "success");
    }
  }

  // UI制御関数
  showCameraContainer() {
    const container = document.getElementById("cameraContainer") || 
                     document.querySelector(".camera-container");
    if (container) {
      container.style.display = "block";
      container.classList.add("active");
      this.debugLog("カメラコンテナを表示");
    }
  }

  hideCameraContainer() {
    const container = document.getElementById("cameraContainer") || 
                     document.querySelector(".camera-container");
    if (container) {
      container.style.display = "none";
      container.classList.remove("active");
      this.debugLog("カメラコンテナを非表示");
    }
  }

  toggleScanButtons(scanning) {
    const startBtn = document.getElementById("startScanBtn");
    const stopBtn = document.getElementById("stopScanBtn");
    
    if (startBtn && stopBtn) {
      if (scanning) {
        startBtn.style.display = "none";
        stopBtn.style.display = "block";
        this.debugLog("スキャンボタンを停止状態に切り替え");
      } else {
        startBtn.style.display = "block";
        stopBtn.style.display = "none";
        this.debugLog("スキャンボタンを開始状態に切り替え");
      }
    }
  }

  resetUI() {
    if (typeof resetUI === "function") {
      resetUI();
    }

    // スキャナーステータスをリセット
    const statusElement = document.getElementById("scannerStatus");
    if (statusElement) {
      statusElement.style.display = "none";
    }
  }
}

// グローバルインスタンス
window.smartScanner = new SmartQRScanner();

// 既存の関数をオーバーライド
window.startScanning = async function () {
  await window.smartScanner.startScan();
};

window.stopScanning = async function () {
  await window.smartScanner.stopScan();
};

// 互換性のための関数名
window.startScan = async function () {
  await window.smartScanner.startScan();
};

window.stopScan = async function () {
  await window.smartScanner.stopScan();
};

// グローバル関数として公開
window.SmartQRScanner = SmartQRScanner;

console.log("Smart QR Scanner (ZXing + HTML5-QRCode) が初期化されました");
