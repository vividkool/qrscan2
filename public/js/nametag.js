// Nametag Creation Module - 名札作成機能
console.log("nametag.js loaded");

// A6サイズの設定（mm）
const A6_SIZE = {
  width: 105, // mm
  height: 148, // mm
};

// 名札データクラス
class NametagData {
  constructor(userData, projectName = "", adminData = null) {
    this.userName = userData.user_name || "未設定";
    this.companyName = userData.company_name || "未設定";
    this.userId = userData.user_id || "未設定";
    this.projectName = projectName || currentAdmin?.project_name || "イベント";
    this.status = userData.status || "未設定";
    this.userRole = userData.user_role || "user";

    // QRコード用データ
    this.adminId =
      adminData?.admin_id || window.currentAdmin?.admin_id || "unknown";
    this.eventId =
      adminData?.event_id || window.currentAdmin?.event_id || "unknown";
    this.docId = userData.docId || userData.uid || this.userId; // uidの代替としてuser_idを使用
  }

  // QRコード用URL生成
  generateQRUrl() {
    const baseUrl = "https://qrscan2-99ffd.web.app/login.html";
    const params = new URLSearchParams({
      admin_id: this.adminId,
      event_id: this.eventId,
      uid: this.docId, // uidの代替としてdocIdを使用
    });
    return `${baseUrl}?${params.toString()}`;
  }
}

// 名札モーダルHTML生成
function createNametagModalHTML() {
  return `
    <div id="nametagModal" class="nametag-modal" style="display: none;">
      <div class="nametag-modal-content">
        <div class="nametag-modal-header">
          <h3>🏷️ 名札プレビュー</h3>
          <button class="nametag-close-btn" onclick="closeNametagModal()">&times;</button>
        </div>
        <div class="nametag-modal-body">
          <div class="nametag-preview" id="nametagPreview">
            <!-- 名札内容がここに表示される -->
          </div>
          <div class="nametag-actions">
            <button class="btn btn-secondary" onclick="closeNametagModal()">キャンセル</button>
            <button class="btn btn-primary" onclick="printNametag()">
              🖨️ 印刷
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 名札CSS生成
function createNametagCSS() {
  return `
    <style id="nametagCSS">
      /* 名札モーダルスタイル */
      .nametag-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .nametag-modal-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
      }

      .nametag-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 25px;
        border-bottom: 1px solid #eee;
        background: #f8f9fa;
        
      }

      .nametag-modal-header h3 {
        margin: 0;
        color: #333;
        font-size: 1.4em;
      }

      .nametag-close-btn {
        background: none;
        border: none;
        font-size: 28px;
        color: #666;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;
      }

      .nametag-close-btn:hover {
        background-color: #f0f0f0;
        color: #333;
      }

      .nametag-modal-body {
        padding: 25px;
      }

      /* A6サイズ名札スタイル（105mm × 148mm） */
      .nametag-preview {
        width: 315px; /* 105mm × 3 */
        height: 444px; /* 148mm × 3 */
        border: 2px solid #007bff;
        margin: 0 auto 20px;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        position: relative;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      /* ヘッダー部分 */
      .nametag-header {
        background: linear-gradient(135deg, #007bff, #0056b3);
        color: white;
        padding: 15px;
        text-align: center;
        position: relative;
      }

      .nametag-project {
        font-size: 16px;
        font-weight: 600;
        letter-spacing: 1px;
        margin-bottom: 5px;
        text-transform: uppercase;
      }

      

      /* メイン情報部分 - 均等3分割レイアウト */
      .nametag-main {
        padding: 20px;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        height: calc(100% - 120px); /* ヘッダーとフッターを除いた高さ */
      }

      .nametag-company {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        color: #34495e;
        font-weight: 500;
        line-height: 1.3;
        word-wrap: break-word;
        text-align: center;
        border-bottom: 1px solid #e9ecef;
        padding: 10px 0;
      }

      .nametag-name {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        font-weight: 700;
        color: #2c3e50;
        line-height: 1.2;
        word-wrap: break-word;
        text-align: center;
        border-bottom: 1px solid #e9ecef;
        padding: 10px 0;
      }

      .nametag-qr-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 10px 0;
        max-height: 20%;
      }

      .nametag-qr-code {
        width: 80px;
        height: 80px;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        background: white;
        margin-bottom: 8px;
      }

      .nametag-id {
        font-size: 14px;
        color: #7f8c8d;
        font-family: 'Courier New', monospace;
        background: #f8f9fa;
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid #e9ecef;
      }

      /* フッター部分 */
      .nametag-footer {
        background: #f8f9fa;
        padding: 8px;
        text-align: center;
        border-top: 1px solid #e9ecef;
        position: absolute;
        bottom: 0;
        width: 100%;
        box-sizing: border-box;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
      }

      .nametag-project {
        font-size: 16px;
        font-weight: 300;
        text-align: center;
        letter-spacing: 1px;
        margin-bottom: 5px;
        text-transform: uppercase;
      }
      

      /* QRコード生成時のサイズ調整 */
      .nametag-qr-code {
        width: 80px;
        height: 80px;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        background: white;
        margin-bottom: 8px;
      }

      /* アクションボタン */
      .nametag-actions {
        display: flex;
        gap: 15px;
        justify-content: center;
        margin-top: 20px;
      }

      .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .btn-primary {
        background: #007bff;
        color: white;
      }

      .btn-primary:hover:not(:disabled) {
        background: #0056b3;
        transform: translateY(-1px);
      }

      .btn-primary:disabled {
        background: #6c757d;
        cursor: not-allowed;
        opacity: 0.6;
      }

      .btn-secondary {
        background: #6c757d;
        color: white;
      }

      .btn-secondary:hover {
        background: #545b62;
        transform: translateY(-1px);
      }

    </style>
  `;
}

// 名札HTML生成
function generateNametagHTML(nametagData) {
  return `
    <div class="nametag-header">
      <div class="nametag-role">${nametagData.userRole}</div>
    </div>

    <div class="nametag-main">
      <div class="nametag-company">${nametagData.companyName}</div>
      <div class="nametag-name">${nametagData.userName}</div>
      <div class="nametag-qr-section">
        <canvas id="qrCanvas" class="nametag-qr-code" width="80" height="80"></canvas>
        <div class="nametag-id">ID: ${nametagData.userId}</div>
      </div>
    </div>

    <div class="nametag-footer">
      <div class="nametag-project">${nametagData.projectName}</div>
    </div>
  `;
}

// 名札モーダル表示
function showNametagModal(userData, adminData = null) {
  console.log("名札モーダル表示:", userData);
  console.log("管理者データ:", adminData);

  // CSSが未追加の場合は追加
  if (!document.getElementById("nametagCSS")) {
    document.head.insertAdjacentHTML("beforeend", createNametagCSS());
  }

  // モーダルが未作成の場合は作成
  let modal = document.getElementById("nametagModal");
  if (!modal) {
    document.body.insertAdjacentHTML("beforeend", createNametagModalHTML());
    modal = document.getElementById("nametagModal");
  }

  // 名札データ作成（adminDataを渡す）
  const nametagData = new NametagData(userData, "", adminData);

  // 名札プレビュー更新
  const previewElement = document.getElementById("nametagPreview");
  previewElement.innerHTML = generateNametagHTML(nametagData);

  // QRコード生成（HTMLが挿入された後に実行）
  setTimeout(() => generateQRCode(nametagData), 100);

  // モーダル表示
  modal.style.display = "flex";

  // 現在の名札データを保存（印刷用）
  window.currentNametagData = nametagData;
}

// QRコード生成関数
function generateQRCode(nametagData) {
  try {
    const qrCanvas = document.getElementById("qrCanvas");
    if (!qrCanvas) {
      console.warn("QRコードキャンバスが見つかりません");
      return;
    }

    if (typeof QRious === "undefined") {
      console.warn("QRious ライブラリが読み込まれていません");
      return;
    }

    const qrUrl = nametagData.generateQRUrl();
    console.log("QRコード URL:", qrUrl);

    const qr = new QRious({
      element: qrCanvas,
      value: qrUrl,
      size: 100,
      level: "M",
      backgroundAlpha: 1,
      foreground: "#000",
      background: "#fff",
    });

    console.log("QRコード生成完了");
  } catch (error) {
    console.error("QRコード生成エラー:", error);
  }
}

// 名札モーダル閉じる
function closeNametagModal() {
  const modal = document.getElementById("nametagModal");
  if (modal) {
    modal.style.display = "none";
  }
  window.currentNametagData = null;
}

// 印刷機能
function printNametag() {
  if (!window.currentNametagData) {
    alert("印刷するデータがありません。");
    return;
  }

  try {
    // 印刷用のスタイルを追加
    const printStyles = `
            <style>
                @media print {
                    body * { visibility: hidden; }
                    .print-nametag, .print-nametag * { visibility: visible; }
                    .print-nametag {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 105mm !important;
                        height: 148mm !important;
                        page-break-after: always;
                        margin: 0;
                        padding: 0;
                    }
                    .nametag-modal { display: none !important; }
                    @page {
                        size: A6;
                        margin: 0;
                    }
                }
            </style>
        `;

    // 印刷用要素を作成
    const printElement = document.createElement("div");
    printElement.className = "print-nametag";
    printElement.innerHTML = generateNametagHTML(window.currentNametagData);

    // 印刷用スタイルを追加
    if (!document.getElementById("printStyles")) {
      const styleElement = document.createElement("div");
      styleElement.id = "printStyles";
      styleElement.innerHTML = printStyles;
      document.head.appendChild(styleElement);
    }

    // body に一時的に追加
    document.body.appendChild(printElement);

    // QRコードを再生成（印刷用）
    setTimeout(() => {
      const printQRCanvas = printElement.querySelector("#qrCanvas");
      if (printQRCanvas && typeof QRious !== "undefined") {
        const qrUrl = window.currentNametagData.generateQRUrl();
        new QRious({
          element: printQRCanvas,
          value: qrUrl,
          size: 80,
          level: "M",
        });
      }

      // 印刷実行
      setTimeout(() => {
        window.print();
        // 印刷後に一時要素を削除
        setTimeout(() => {
          document.body.removeChild(printElement);
        }, 1000);
      }, 500);
    }, 200);

    console.log("名札印刷開始:", window.currentNametagData);
  } catch (error) {
    console.error("印刷エラー:", error);
    alert("印刷中にエラーが発生しました: " + error.message);
  }
}

// ESC キーでモーダルを閉じる
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeNametagModal();
  }
});

// モーダル外クリックで閉じる
document.addEventListener("click", function (event) {
  const modal = document.getElementById("nametagModal");
  if (modal && event.target === modal) {
    closeNametagModal();
  }
});

// グローバル関数として公開
window.showNametagModal = showNametagModal;
window.closeNametagModal = closeNametagModal;
window.printNametag = printNametag;

console.log("名札作成機能が初期化されました");

// テスト用データ生成関数
function generateTestNametagData() {
  return {
    user_name: "山田 太郎",
    company_name: "株式会社サンプル",
    user_id: "U001",
    status: "入場中",
    user_role: "user",
  };
}

// デバッグ用：テスト表示関数
window.showTestNametag = function () {
  const testAdminData = {
    admin_id: "bbbbbb",
    event_id: "EXPO20250903",
  };
  showNametagModal(generateTestNametagData(), testAdminData);
};

// uketuke.jsから呼び出される関数
window.createNametag = function (userData, adminData = null) {
  console.log("名札作成リクエスト:", userData);
  console.log("管理者データ:", adminData);
  showNametagModal(userData, adminData);
};
