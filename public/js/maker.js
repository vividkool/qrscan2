// Maker Page Functions
import "./auth.js";
import "./smart-qr-scanner.js";

// ページロード時の初期化
document.addEventListener("DOMContentLoaded", async function () {
  // ページ読み込み時のデバッグ情報
  console.log("=== maker.htmlページ読み込み ===");
  console.log("現在のURL:", window.location.href);
  console.log("セッション存在確認:", !!localStorage.getItem("currentUser"));
  console.log("セッションデータ:", localStorage.getItem("currentUser"));
  console.log("================================");

  // ユーザー情報表示
  await displayUserInfo(); // await追加

  // スキャン履歴の読み込み
  if (window.smartScanner && window.smartScanner.displayScanHistory) {
    window.smartScanner.displayScanHistory();
  }
});

// ユーザー情報表示
async function displayUserInfo() {
  const userInfoElement = document.getElementById("userInfo");
  if (userInfoElement) {
    try {
      // 複数の方法でユーザー情報を取得試行
      let user = null;

      // 方法1: UserSessionクラスから取得
      if (
        window.UserSession &&
        typeof UserSession.getCurrentUser === "function"
      ) {
        user = await UserSession.getCurrentUser(); // await追加
        console.log("UserSession経由でユーザー情報取得:", user);
      }

      // 方法2: getSessionから取得
      if (
        !user &&
        window.UserSession &&
        typeof UserSession.getSession === "function"
      ) {
        user = UserSession.getSession();
        console.log("getSession経由でユーザー情報取得:", user);
      }

      // 方法3: localStorageから直接取得
      if (!user) {
        const sessionData = localStorage.getItem("currentUser");
        if (sessionData) {
          user = JSON.parse(sessionData);
          console.log("localStorage経由でユーザー情報取得:", user);
        }
      }

      if (user) {
        // company_nameが未定義の場合のフォールバック処理
        const companyName = user.company_name || user.companyName || "未設定";

        userInfoElement.innerHTML = `
          <div class="user-card">
            <div class="user-header">
              <h3>👨‍💼 ${user.user_name || user.name || "ユーザー"}</h3>
              <span class="user-id">ID: ${user.user_id || user.uid}</span>
            </div>
            <div class="user-details">
              <div class="detail-item">
                <span class="label">🏢 会社名:</span>
                <span class="value">${companyName}</span>
              </div>
              <div class="detail-item">
                <span class="label">👤 ロール:</span>
                <span class="value role-${user.role}">${user.role}</span>
              </div>
              ${
                user.department
                  ? `
                <div class="detail-item">
                  <span class="label">🏭 部署:</span>
                  <span class="value">${user.department}</span>
                </div>
              `
                  : ""
              }
              <div class="detail-item">
                <span class="label">⏰ ログイン時刻:</span>
                <span class="value">${new Date(
                  user.timestamp
                ).toLocaleString()}</span>
              </div>
            </div>
          </div>
        `;

        console.log("Maker情報表示完了:", user);
      } else {
        console.error("ユーザー情報を取得できませんでした");
        userInfoElement.innerHTML = `
          <div class="user-card error">
            <div class="user-header">
              <h3>⚠️ エラー</h3>
            </div>
            <div class="user-details">
              <p>ユーザー情報を取得できませんでした。再ログインしてください。</p>
              <button onclick="handleLogout()" class="logout-btn">ログアウト</button>
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error("ユーザー情報表示エラー:", error);
      userInfoElement.innerHTML = `
        <div class="user-card error">
          <div class="user-header">
            <h3>⚠️ エラー</h3>
          </div>
          <div class="user-details">
            <p>ユーザー情報の表示中にエラーが発生しました: ${error.message}</p>
            <button onclick="handleLogout()" class="logout-btn">ログアウト</button>
          </div>
        </div>
      `;
    }
  }
}

// ログアウト処理
function handleLogout() {
  if (confirm("ログアウトしますか？")) {
    // セッション削除
    localStorage.removeItem("currentUser");
    localStorage.removeItem("firebaseSessionData");

    // ログイン画面に戻る
    window.location.href = "login.html";
  }
}

// グローバル関数として公開
window.handleLogout = handleLogout;

console.log("Maker page functions loaded");
