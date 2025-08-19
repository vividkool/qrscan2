// 高性能QRスキャナー（ZXing第1候補 + HTML5-QRCode フォールバック）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  orderBy,
  query,
  where,
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
    this.zxingErrorCount = 0; // ZXingエラーカウンター
    this.maxZXingErrors = 10; // ZXing最大エラー数

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
    this.zxingErrorCount = 0; // エラーカウンターをリセット

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
            this.zxingErrorCount = 0; // 成功時はエラーカウンターをリセット
            this.handleScanResult(result.text);
            return;
          }

          if (err) {
            // ZXing固有のエラーは正常な動作として扱う
            if (
              err instanceof ZXing.NotFoundException ||
              err instanceof ZXing.ChecksumException ||
              err instanceof ZXing.FormatException
            ) {
              // これらは正常なスキャン処理中に発生する
              return;
            }

            // その他のエラーはカウントアップ
            this.zxingErrorCount++;

            // デバッグ出力（詳細ログは抑制）
            if (this.zxingErrorCount <= 3) {
              this.debugLog("ZXing デコードエラー", err.message || err);
            }

            // エラーが多すぎる場合はフォールバックを検討
            if (this.zxingErrorCount >= this.maxZXingErrors) {
              this.debugLog(
                `ZXing エラー多発 (${this.zxingErrorCount}回), フォールバックを検討`
              );
              // 非同期でフォールバックを実行
              setTimeout(() => {
                if (this.isScanning && this.currentMode === "zxing") {
                  this.debugLog("ZXing からHTML5-QRCode へ自動フォールバック");
                  this.switchToFallback();
                }
              }, 1000);
            }
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
      this.showStatus("💾 スキャン結果を処理中...", "info");

      // QRコードデータをパラメータ区切りで分割（カンマ、セミコロン、パイプなど対応）
      const params = qrData.split(/[,;|]/);
      this.debugLog("QRコードパラメータ分析", { original: qrData, params });

      // 1番目のパラメータが"aaa"かチェック
      const firstParam = params[0]?.trim();
      if (firstParam !== "aaa") {
        this.debugLog("不正なQRコード識別子", firstParam);

        // エラーモーダル表示
        this.showErrorModal(
          "無効なQRコード",
          `このQRコードは展示会用ではありません。`
        );

        // カメラを停止
        await this.stopScan();
        return;
      }

      // 2番目のパラメータを取得（item_no として使用）
      const itemNo = params[1]?.trim();
      if (!itemNo) {
        this.debugLog("item_noパラメータが見つかりません");

        this.showErrorModal(
          "データ不足",
          "QRコードの2番目のパラメータ（item_no）が見つかりません。"
        );

        await this.stopScan();
        return;
      }

      this.showStatus("🔍 アイテム情報を検索中...", "info");

      // itemsコレクションからitem_noで詳細情報を取得
      let itemDetails = null;
      try {
        // 文字列として検索を試行
        let itemsQuery = query(
          collection(db, "items"),
          where("item_no", "==", itemNo)
        );
        let querySnapshot = await getDocs(itemsQuery);

        // 文字列で見つからない場合は数値として検索
        if (querySnapshot.empty) {
          const itemNoAsNumber = parseInt(itemNo, 10);
          if (!isNaN(itemNoAsNumber)) {
            this.debugLog("文字列検索で見つからないため数値で再検索", {
              original: itemNo,
              number: itemNoAsNumber,
            });

            itemsQuery = query(
              collection(db, "items"),
              where("item_no", "==", itemNoAsNumber)
            );
            querySnapshot = await getDocs(itemsQuery);
          }
        }

        if (!querySnapshot.empty) {
          // 最初にマッチしたドキュメントを使用
          const itemDoc = querySnapshot.docs[0];
          itemDetails = itemDoc.data();
          this.debugLog("アイテム詳細情報取得成功", itemDetails);
        } else {
          this.debugLog(
            "アイテム情報が見つかりません（文字列・数値両方で検索済み）",
            {
              stringSearch: itemNo,
              numberSearch: parseInt(itemNo, 10),
            }
          );

          this.showErrorModal(
            "アイテム未登録",
            `アイテム番号「${itemNo}」は登録されていません。\n\n管理者にお問い合わせください。`
          );

          await this.stopScan();
          return;
        }
      } catch (error) {
        this.debugLog("アイテム検索エラー", error);

        this.showErrorModal(
          "検索エラー",
          `アイテム情報の検索中にエラーが発生しました。\n\n${error.message}`
        );

        await this.stopScan();
        return;
      }

      this.showStatus("💾 展示会データを保存中...", "info");

      // 現在のユーザー情報を取得
      const currentUser = this.getCurrentUserInfo();

      // scanItemsコレクションに保存するデータを構築
      const scanData = {
        // QRコード基本情報
        content: itemNo, // item_noをcontentとして保存（後方互換性）
        item_no: itemNo, // item_no
        originalQrCode: qrData, // 元のQRコードデータも保存
        identifier: firstParam, // 識別子も保存

        // アイテム詳細情報（itemsコレクションから取得）
        item_name: itemDetails?.item_name || "",
        category_name: itemDetails?.category_name || "",
        maker_name: itemDetails?.company_name || "", // company_nameをmaker_nameとして保存
        maker_code: itemDetails?.maker_code || "",

        // スキャン情報
        timestamp: new Date().toISOString(),
        createdAt: new Date(),
        scannerMode: this.currentMode,
        deviceInfo: this.getDeviceInfo(),
        userAgent: navigator.userAgent.substr(0, 100),

        // ユーザー情報
        role: currentUser.role || "",
        user_id: currentUser.user_id || "",
        user_name: currentUser.user_name || "",
        company_name: currentUser.company_name || "",
      };

      const docRef = await addDoc(collection(db, "scanItems"), scanData);

      this.debugLog("展示会データ保存完了", {
        docId: docRef.id,
        itemNo,
        itemName: itemDetails?.item_name,
        makerName: itemDetails?.company_name,
      });

      // 成功モーダル表示（アイテム名を表示）
      const displayContent = itemDetails?.item_name
        ? `${itemDetails.item_name} (${itemNo})`
        : itemNo;
      this.showSuccessModal(displayContent, docRef.id);

      // UIリセット
      this.resetUI();

      // 履歴更新
      await this.displayScanHistory();
    } catch (error) {
      this.debugLog("保存エラー", error);
      this.showError(`保存エラー: ${error.message}`);
    }
  }

  async switchToFallback() {
    if (!this.isScanning || this.currentMode !== "zxing") return;

    this.debugLog("ZXing から HTML5-QRCode への自動フォールバック開始");

    try {
      // ZXingスキャナーを停止（UIはリセットしない）
      if (this.primaryScanner) {
        this.primaryScanner.reset();
        this.debugLog("ZXing スキャナー停止（フォールバック）");
      }

      // カメラストリームを停止
      await this.stopCurrentStream();

      // HTML5-QRCodeでスキャン再開
      await this.tryHTML5QRCodeScan();
    } catch (error) {
      this.debugLog("フォールバックエラー", error);
      this.showError("スキャナーの切り替えに失敗しました");
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

      // スキャン履歴を表示
      await this.displayScanHistory();
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

  getCurrentUserInfo() {
    try {
      // 直接localStorageから取得（最も確実な方法）
      const userStr = localStorage.getItem("currentUser");
      if (userStr) {
        const user = JSON.parse(userStr);
        this.debugLog("localStorage からユーザー情報取得", user);
        return user;
      }

      // フォールバック: UserSessionクラスから取得（非同期の場合があるので注意）
      if (typeof UserSession !== "undefined" && UserSession.getSession) {
        const user = UserSession.getSession();
        this.debugLog("UserSession.getSession からユーザー情報取得", user);
        if (user && typeof user === "object" && !user.then) {
          // Promiseではない場合のみ
          return user;
        }
      }

      this.debugLog("ユーザー情報が見つかりません");
      return {};
    } catch (error) {
      this.debugLog("ユーザー情報取得エラー", error);
      return {};
    }
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

  showErrorModal(title, message) {
    if (typeof showErrorModal === "function") {
      showErrorModal(title, message);
    } else {
      // フォールバック: alertを使用
      alert(`${title}\n\n${message}`);
    }
    this.debugLog("エラーモーダル表示", { title, message });
  }

  // UI制御関数
  showCameraContainer() {
    const container =
      document.getElementById("cameraContainer") ||
      document.querySelector(".camera-container");
    if (container) {
      container.style.display = "block";
      container.classList.add("active");
      this.debugLog("カメラコンテナを表示");
    }
  }

  hideCameraContainer() {
    const container =
      document.getElementById("cameraContainer") ||
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

  async displayScanHistory() {
    try {
      this.debugLog("スキャン履歴表示開始");

      const historyElement = document.getElementById("scanHistory");
      if (!historyElement) {
        this.debugLog("scanHistory要素が見つかりません");
        return;
      }

      // ローディング表示
      historyElement.innerHTML =
        '<div class="loading">📜 履歴を読み込み中...</div>';

      // 現在のユーザー情報を取得
      const currentUser = this.getCurrentUserInfo();

      this.debugLog("取得したユーザー情報の詳細", {
        fullUser: currentUser,
        userId: currentUser.user_id,
        userIdType: typeof currentUser.user_id,
        userName: currentUser.user_name,
        hasUserId: !!currentUser.user_id,
      });

      const currentUserId = currentUser.user_id;

      if (!currentUserId) {
        this.debugLog("ユーザーIDが取得できません", {
          currentUser: currentUser,
          userIdValue: currentUserId,
          localStorageRaw: localStorage.getItem("currentUser"),
        });
        historyElement.innerHTML =
          '<div class="error">ユーザー情報が取得できません。再ログインしてください。</div>';
        return;
      }

      this.debugLog("現在のユーザーID", currentUserId);

      // Firestoreからスキャン履歴を取得（user_idでフィルタ）
      let querySnapshot;
      try {
        // まず文字列のuser_idで検索
        const userQuery = query(
          collection(db, "scanItems"),
          where("user_id", "==", String(currentUserId))
        );
        querySnapshot = await getDocs(userQuery);

        // 文字列で見つからない場合は数値で検索
        if (querySnapshot.empty) {
          const userIdAsNumber = parseInt(currentUserId, 10);
          if (!isNaN(userIdAsNumber)) {
            this.debugLog("文字列検索で見つからないため数値で再検索", {
              original: currentUserId,
              number: userIdAsNumber,
            });

            const numberQuery = query(
              collection(db, "scanItems"),
              where("user_id", "==", userIdAsNumber)
            );
            querySnapshot = await getDocs(numberQuery);
          }
        }
      } catch (error) {
        this.debugLog("Firestoreクエリエラー", error);
        historyElement.innerHTML =
          '<div class="error">履歴の検索中にエラーが発生しました</div>';
        return;
      }

      if (querySnapshot.empty) {
        historyElement.innerHTML = `<div class="no-data">📝 ${
          currentUser.user_name || "あなた"
        }のスキャン履歴がありません</div>`;
        this.debugLog("該当ユーザーのスキャン履歴なし", currentUserId);
        return;
      }

      // データを配列に変換して時刻順にソート
      const scanData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        scanData.push({
          id: doc.id,
          content: data.content,
          item_no: data.item_no || data.content, // item_noを取得、後方互換性でcontentも使用
          item_name: data.item_name || "",
          category_name: data.category_name || "",
          maker_name: data.maker_name || "",
          maker_code: data.maker_code || "",
          company_name: data.company_name || "",
          timestamp: data.timestamp,
          createdAt: data.createdAt,
          scannerMode: data.scannerMode,
          user_name: data.user_name,
          user_id: data.user_id,
          role: data.role,
        });
      });

      // 新しい順にソート
      scanData.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.createdAt);
        const timeB = new Date(b.timestamp || b.createdAt);
        return timeB - timeA;
      });

      // テーブル形式でHTML生成
      let html = `<h3>
        スキャン履歴</h3>`;
      html += '<div class="history-table-container">';
      html += '<table class="history-table">';
      html += "<thead>";
      html += "<tr>";
      html += "<th>番号</th>";
      html += "<th>カテゴリ</th>";
      html += "<th>メーカー</th>";
      html += "<th>アイテム名</th>";
      html += "<th>削除</th>";
      html += "</tr>";
      html += "</thead>";
      html += "<tbody>";

      scanData.slice(0, 20).forEach((item, index) => {
        const time = new Date(item.timestamp || item.createdAt);
        const timeStr = time.toLocaleString("ja-JP", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

        // 表示用の名前を生成
        /*
        const displayName = item.item_name
          ? `${item.item_name} (${item.item_no})`
          : item.item_no || item.content;
        */
        const category = item.category_name || "-";
        const maker = item.maker_name || "-";

        html += "<tr>";
        html += `<td class="content-cell">${item.item_no}</td>`;
        html += `<td class="category-cell">${category}</td>`;
        html += `<td class="maker-cell">${maker}</td>`;
        html += `<td class="content-cell">${item.item_name}</td>`;
        html += `<td class="delete-cell">
          <button class="delete-btn" onclick="window.smartScanner.deleteScanItem('${item.id}')" 
                  title="この記録を削除">削除</button>
        </td>`;
        html += "</tr>";
      });

      html += "</tbody>";
      html += "</table>";
      html += "</div>";

      if (scanData.length > 20) {
        html += `<div class="history-footer">他 ${
          scanData.length - 20
        } 件</div>`;
      }

      // 総件数表示
      html += `<div class="history-summary">合計: ${scanData.length}件のスキャン履歴</div>`;

      historyElement.innerHTML = html;
      this.debugLog(
        `ユーザー別スキャン履歴表示完了: ${scanData.length}件 (user_id: ${currentUserId})`
      );
    } catch (error) {
      this.debugLog("スキャン履歴表示エラー", error);
      const historyElement = document.getElementById("scanHistory");
      if (historyElement) {
        historyElement.innerHTML =
          '<div class="error">履歴の読み込みに失敗しました</div>';
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

  // 管理者向け：全ユーザーのスキャン履歴表示
  async displayAllScanHistory() {
    try {
      this.debugLog("全ユーザーのスキャン履歴表示開始");

      const historyElement = document.getElementById("scanHistory");
      if (!historyElement) {
        this.debugLog("scanHistory要素が見つかりません");
        return;
      }

      // 現在のユーザー権限をチェック
      const currentUser = this.getCurrentUserInfo();
      if (currentUser.role !== "admin") {
        this.debugLog("管理者権限なし", currentUser.role);
        historyElement.innerHTML =
          '<div class="error">管理者権限が必要です</div>';
        return;
      }

      // ローディング表示
      historyElement.innerHTML =
        '<div class="loading">📜 全ユーザーの履歴を読み込み中...</div>';

      // Firestoreから全スキャン履歴を取得
      const querySnapshot = await getDocs(collection(db, "scanItems"));

      if (querySnapshot.empty) {
        historyElement.innerHTML =
          '<div class="no-data">📝 スキャン履歴がありません</div>';
        this.debugLog("全ユーザーのスキャン履歴なし");
        return;
      }

      // データを配列に変換して時刻順にソート
      const scanData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        scanData.push({
          id: doc.id,
          content: data.content,
          item_no: data.item_no || data.content,
          item_name: data.item_name || "",
          category_name: data.category_name || "",
          maker_name: data.maker_name || "",
          maker_code: data.maker_code || "",
          company_name: data.company_name || "",
          timestamp: data.timestamp,
          createdAt: data.createdAt,
          scannerMode: data.scannerMode,
          user_name: data.user_name,
          user_id: data.user_id,
          role: data.role,
        });
      });

      // 新しい順にソート
      scanData.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.createdAt);
        const timeB = new Date(b.timestamp || b.createdAt);
        return timeB - timeA;
      });

      // テーブル形式でHTML生成（管理者向けに詳細表示）
      let html = "<h3>📜 全ユーザーのスキャン履歴（管理者用）</h3>";
      html += '<div class="history-table-container">';
      html += '<table class="history-table">';
      html += "<thead>";
      html += "<tr>";
      html += "<th>ユーザー</th>";
      html += "<th>番号</th>";
      html += "<th>カテゴリ</th>";
      html += "<th>メーカー</th>";
      html += "<th>アイテム名</th>";
      html += "<th>時刻</th>";
      html += "<th>削除</th>";
      html += "</tr>";
      html += "</thead>";
      html += "<tbody>";

      scanData.slice(0, 50).forEach((item, index) => {
        const time = new Date(item.timestamp || item.createdAt);
        const timeStr = time.toLocaleString("ja-JP", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

        const category = item.category_name || "-";
        const maker = item.maker_name || "-";
        const userName = item.user_name || "Unknown";

        html += "<tr>";
        html += `<td class="user-cell">${userName}</td>`;
        html += `<td class="content-cell">${item.item_no}</td>`;
        html += `<td class="category-cell">${category}</td>`;
        html += `<td class="maker-cell">${maker}</td>`;
        html += `<td class="content-cell">${item.item_name}</td>`;
        html += `<td class="time-cell">${timeStr}</td>`;
        html += `<td class="delete-cell">
          <button class="delete-btn" onclick="window.smartScanner.deleteScanItem('${item.id}')" 
                  title="この記録を削除">削除</button>
        </td>`;
        html += "</tr>";
      });

      html += "</tbody>";
      html += "</table>";
      html += "</div>";

      if (scanData.length > 50) {
        html += `<div class="history-footer">他 ${
          scanData.length - 50
        } 件</div>`;
      }

      // 総件数表示
      html += `<div class="history-summary">全体合計: ${scanData.length}件のスキャン履歴</div>`;

      historyElement.innerHTML = html;
      this.debugLog(`全ユーザーのスキャン履歴表示完了: ${scanData.length}件`);
    } catch (error) {
      this.debugLog("全ユーザーのスキャン履歴表示エラー", error);
      const historyElement = document.getElementById("scanHistory");
      if (historyElement) {
        historyElement.innerHTML =
          '<div class="error">履歴の読み込みに失敗しました</div>';
      }
    }
  }

  // スキャン記録削除メソッド
  async deleteScanItem(docId) {
    try {
      // 確認ダイアログを表示
      if (!confirm("この記録を削除しますか？\n削除すると元に戻せません。")) {
        return;
      }

      this.debugLog("スキャン記録削除開始", docId);
      this.showStatus("🗑️ 記録を削除中...", "info");

      // Firestoreからドキュメントを削除
      await deleteDoc(doc(db, "scanItems", docId));

      this.debugLog("スキャン記録削除完了", docId);
      this.showStatus("✅ 記録を削除しました", "success");

      // 履歴を再読み込み
      await this.displayScanHistory();

      // 2秒後にステータスを非表示
      setTimeout(() => {
        const statusElement = document.getElementById("scannerStatus");
        if (statusElement) {
          statusElement.style.display = "none";
        }
      }, 2000);
    } catch (error) {
      this.debugLog("スキャン記録削除エラー", error);
      this.showError(`削除エラー: ${error.message}`);
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

  // スキャン開始時の表示制御
  const cameraContainer = document.getElementById("cameraContainer");
  const scanHistory = document.getElementById("scanHistory");
  const toggleBtn = document.getElementById("toggleBtn");

  if (cameraContainer && scanHistory && toggleBtn) {
    cameraContainer.style.display = "block";
    scanHistory.style.display = "none";
    toggleBtn.textContent = "📋 担当者一覧表示";

    // staff.jsのisShowingScannerフラグも更新
    if (window.isShowingScanner !== undefined) {
      window.isShowingScanner = true;
    }

    console.log("スキャン開始：カメラ表示、履歴非表示");
  }
};

window.stopScan = async function () {
  await window.smartScanner.stopScan();

  // スキャン停止時の表示制御
  const cameraContainer = document.getElementById("cameraContainer");
  const scanHistory = document.getElementById("scanHistory");
  const toggleBtn = document.getElementById("toggleBtn");

  if (cameraContainer && scanHistory && toggleBtn) {
    cameraContainer.style.display = "none";
    scanHistory.style.display = "block";
    toggleBtn.textContent = "📷 スキャナー表示";

    // staff.jsのisShowingScannerフラグも更新
    if (window.isShowingScanner !== undefined) {
      window.isShowingScanner = false;
    }

    console.log("スキャン停止：カメラ非表示、履歴表示");
  }
};

// グローバル関数として公開
window.SmartQRScanner = SmartQRScanner;

console.log("Smart QR Scanner (ZXing + HTML5-QRCode) が初期化されました");
