// QRスキャナー - Firebase関連の処理
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, orderBy, query } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyCWFL91baSHkjkvU_k-yTUv6QS191YTFlg",
    authDomain: "qrscan2-99ffd.firebaseapp.com",
    projectId: "qrscan2-99ffd",
    storageBucket: "qrscan2-99ffd.firebasestorage.app",
    messagingSenderId: "1089215781575",
    appId: "1:1089215781575:web:bf9d05f6930b7123813ce2",
    measurementId: "G-QZZWT3HW0W"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// グローバル変数
let stream = null;
let scanning = false;
let animationId = null;
let processing = false; // QRコード処理中フラグ

// デバッグモード（開発時のみ）
const DEBUG_MODE = true; // 本番環境では false に設定

function debugLog(message, data = null) {
    if (DEBUG_MODE) {
        console.log(`[QR Scanner Debug] ${message}`, data || '');
    }
}

// QRコードデータをFirestoreに保存
window.saveScanResult = async function (qrData) {
    try {
        debugLog('saveScanResult 開始', { qrData, scanning, processing });

        // 既に処理中の場合は重複実行を防ぐ
        if (processing) {
            debugLog('QRコード処理中のため処理をスキップ');
            return;
        }

        if (!scanning) {
            debugLog('スキャン停止済みのため処理をスキップ');
            return;
        }

        // 処理開始フラグを設定
        processing = true;
        debugLog('processing フラグを true に設定（処理開始）');

        showResult('スキャン結果を保存中...', '');
        debugLog('QRコードスキャン結果を保存開始', qrData);

        // カメラを即座に停止
        debugLog('カメラリセット開始');
        window.codeReader.reset();
        const videoElement = document.getElementById('camera');
        if (videoElement.srcObject) {
            const tracks = videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoElement.srcObject = null;
        }
        debugLog('カメラリセット完了');

        debugLog('Firestore保存開始');
        const docRef = await addDoc(collection(db, 'scanItems'), {
            content: qrData,
            timestamp: new Date().toISOString(),
            createdAt: new Date(),
            deviceInfo: navigator.userAgent.substr(0, 100)
        });

        debugLog('Firestore保存完了', docRef.id);

        // 成功モーダルを表示
        debugLog('モーダル表示開始');
        showSuccessModal(qrData, docRef.id);

        // UIをリセット
        debugLog('UIリセット開始');
        resetUI();

        // 履歴を更新
        debugLog('履歴更新開始');
        loadScanHistory();

        debugLog('saveScanResult 完了');

    } catch (error) {
        console.error('保存エラー:', error);
        debugLog('保存エラー発生', error);
        showResult(`保存エラー: ${error.message}`, 'error');
        resetUI();
    } finally {
        // 処理完了時にフラグをリセット
        processing = false;
        scanning = false;
        debugLog('処理完了: processing と scanning フラグをリセット');
    }
};

// 成功モーダルを表示
window.showSuccessModal = function (qrData, docId) {
    debugLog('showSuccessModal 開始', { qrData, docId });

    const modal = document.getElementById('successModal');
    const modalBody = document.getElementById('modalBody');
    const startBtn = document.getElementById('startScanBtn');

    if (!modal) {
        debugLog('エラー: successModal 要素が見つかりません');
        return;
    }
    if (!modalBody) {
        debugLog('エラー: modalBody 要素が見つかりません');
        return;
    }
    if (!startBtn) {
        debugLog('エラー: startScanBtn 要素が見つかりません');
        return;
    }

    debugLog('モーダル要素の取得成功');

    modalBody.innerHTML = `
        <div><strong>スキャン内容:</strong></div>
        <div style="background-color: #e8f5e8; padding: 10px; border-radius: 4px; margin: 10px 0; word-break: break-all;">
            ${qrData}
        </div>
        <div style="font-size: 12px; color: #666;">
            ドキュメントID: ${docId}<br>
            ${new Date().toLocaleString('ja-JP')}
        </div>
    `;

    debugLog('モーダル内容設定完了');

    modal.classList.add('show');
    debugLog('モーダルに show クラスを追加');

    // モーダルが表示されている間はカメラ開始ボタンを無効化
    startBtn.disabled = true;
    startBtn.style.opacity = '0.5';
    startBtn.style.cursor = 'not-allowed';
    debugLog('ボタン無効化完了');

    // 成功時の視覚的フィードバック
    showResult('✅ QRコードスキャン成功！データを保存しました', 'success');
    debugLog('成功メッセージ表示完了');

    debugLog('showSuccessModal 完了');
};

// モーダルを閉じる
window.closeModal = function () {
    const modal = document.getElementById('successModal');
    const startBtn = document.getElementById('startScanBtn');

    debugLog('モーダルを閉じる');

    modal.classList.remove('show');

    // スキャン履歴コンテナを再表示
    document.getElementById('scanHistoryContainer').classList.remove('hidden');

    // カメラ開始ボタンを再度有効化
    startBtn.disabled = false;
    startBtn.style.opacity = '1';
    startBtn.style.cursor = 'pointer';

    // 処理フラグをリセット
    processing = false;
    scanning = false;
    debugLog('モーダル閉じる: processing と scanning フラグをリセット');

    showResult('新しいQRコードをスキャンできます', 'success');
};

// スキャン履歴を読み込み
window.loadScanHistory = async function () {
    try {
        const historyDiv = document.getElementById('scanHistory');
        historyDiv.innerHTML = '<div class="loading"></div> 履歴を読み込み中...';

        const q = query(collection(db, 'scanItems'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            historyDiv.innerHTML = '<p>スキャン履歴がありません。</p>';
            return;
        }

        let historyHtml = '';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const date = new Date(data.timestamp).toLocaleString('ja-JP');
            historyHtml += `
                <div class="scan-item">
                    <div><strong>内容:</strong> ${data.content}</div>
                    <div class="scan-timestamp">スキャン日時: ${date}</div>
                    <div class="scan-timestamp">ID: ${doc.id}</div>
                </div>
            `;
        });

        historyDiv.innerHTML = historyHtml;

    } catch (error) {
        console.error('履歴読み込みエラー:', error);
        document.getElementById('scanHistory').innerHTML = `<p class="error">履歴の読み込みに失敗しました: ${error.message}</p>`;
    }
};

// 結果表示
window.showResult = function (message, type = '') {
    const element = document.getElementById('result');
    element.textContent = message;
    element.className = `result ${type}`;
    element.style.display = 'block';
};

// カメラ開始
window.startScan = async function () {
    try {
        const cameraContainer = document.getElementById('cameraContainer');
        const startBtn = document.getElementById('startScanBtn');
        const stopBtn = document.getElementById('stopScanBtn');
        const videoElement = document.getElementById('camera');
        const scanHistoryContainer = document.getElementById('scanHistoryContainer');

        // UI更新: スキャン履歴を隠してカメラコンテナを表示
        scanHistoryContainer.classList.add('hidden');
        cameraContainer.classList.add('active');
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        scanning = true;
        processing = false; // 処理フラグをリセット
        debugLog('スキャン開始: scanning = true, processing = false');

        showResult('カメラを起動中...', '');
        debugLog('カメラデバイス検索開始');

        // デバイスの取得
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        debugLog('利用可能なカメラデバイス', videoDevices.length);

        if (videoDevices.length === 0) {
            throw new Error('カメラが見つかりません');
        }

        // 後面カメラを優先的に選択
        let selectedDevice = videoDevices[0];
        for (const device of videoDevices) {
            if (device.label.toLowerCase().includes('back') ||
                device.label.toLowerCase().includes('rear') ||
                device.label.toLowerCase().includes('environment')) {
                selectedDevice = device;
                debugLog('後面カメラを選択', device.label);
                break;
            }
        }

        debugLog('選択されたカメラデバイス', selectedDevice.label || 'Unknown Device');

        // QRコードスキャン開始
        const result = await window.codeReader.decodeFromVideoDevice(
            selectedDevice.deviceId,
            videoElement,
            (result, err) => {
                if (result && scanning) {
                    debugLog('QRコード検出コールバック', { text: result.text, scanning });
                    console.log('QRコード検出:', result.text);
                    // saveScanResult を呼び出してから scanning フラグを変更
                    saveScanResult(result.text);
                } else if (result && !scanning) {
                    debugLog('QRコード検出されたが scanning = false のためスキップ', result.text);
                }
                if (err) {
                    // NotFoundException は QRコードが見つからない場合の正常な動作なので無視
                    // その他の深刻なエラーのみログに出力
                    if (!(err instanceof ZXing.NotFoundException) &&
                        !(err instanceof ZXing.ChecksumException) &&
                        !(err instanceof ZXing.FormatException)) {
                        console.warn('スキャン処理中のエラー:', err.constructor.name);
                    }
                }
            }
        );

        showResult('QRコードをカメラに向けてください', '');

        // カメラ開始成功をユーザーに視覚的に示す
        setTimeout(() => {
            const scanStatus = document.getElementById('scanStatus');
            if (scanStatus && scanning) {
                scanStatus.style.color = '#27ae60';
                scanStatus.innerHTML = '✅ カメラ起動完了 - QRコードをスキャン中...';
            }
        }, 500);

    } catch (error) {
        console.error('カメラ起動エラー:', error);
        showResult(`カメラ起動エラー: ${error.message}`, 'error');
        resetUI();
    }
};

// カメラ停止
window.stopScan = function () {
    try {
        scanning = false;
        window.codeReader.reset();

        // ストリーム停止
        const videoElement = document.getElementById('camera');
        if (videoElement.srcObject) {
            const tracks = videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoElement.srcObject = null;
        }

        resetUI();
        showResult('カメラを停止しました', 'success');

    } catch (error) {
        console.error('カメラ停止エラー:', error);
        showResult(`カメラ停止エラー: ${error.message}`, 'error');
    }
};

// UI リセット
function resetUI() {
    const cameraContainer = document.getElementById('cameraContainer');
    const startBtn = document.getElementById('startScanBtn');
    const stopBtn = document.getElementById('stopScanBtn');
    const scanHistoryContainer = document.getElementById('scanHistoryContainer');

    // カメラコンテナを隠してスキャン履歴を表示
    cameraContainer.classList.remove('active');
    scanHistoryContainer.classList.remove('hidden');
    startBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
}

// ページを離れる時にカメラを停止
window.addEventListener('beforeunload', () => {
    if (scanning) {
        stopScan();
    }
});

// 初期化時に履歴を読み込み
window.addEventListener('load', () => {
    loadScanHistory();
});

console.log('Firebase アプリが初期化されました');
