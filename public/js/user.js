// User Page Functions
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function () {
  const auth = getAuth();
  onAuthStateChanged(auth, (user) => {
    if (!user) {

      window.location.href = "./login.html";
    }
    // 認証済みなら何もしない

  });
});



import "./auth.js";
import "./smart-qr-scanner.js";

// ページロード時の初期化
document.addEventListener("DOMContentLoaded", async function () {
  // ページ読み込み時のデバッグ情報
  console.log("=== user.htmlページ読み込み ===");
  console.log("現在のURL:", window.location.href);
  console.log("Firebase Auth currentUser:", getAuth().currentUser);
  console.log("================================");

  // ユーザー情報表示
  await displayUserInfo();

  // スキャン履歴の読み込み
  if (window.smartScanner && window.smartScanner.displayScanHistory) {
    window.smartScanner.displayScanHistory();
  } else {
    const scanHistoryElement = document.getElementById("scanHistory");
    if (scanHistoryElement) {
      scanHistoryElement.innerHTML =
        '<span style="color: #4285f4; font-weight: bold;">スキャンボタンを押してスキャンしてください</span>';
    }
  }
});

// ユーザー情報表示
async function displayUserInfo() {

  const userInfoElement = document.getElementById("userInfo");
  if (userInfoElement) {
    try {
      let user = null;
      // UserSessionクラスから取得（localStorageは使わない）
      if (window.UserSession && typeof UserSession.getCurrentUser === "function") {
        user = await UserSession.getCurrentUser();
        console.log("UserSession経由でユーザー情報取得:", user);
      }
      if (user) {
        console.log("取得したユーザー情報の詳細:", user);
        const companyName = user.company_name || user.companyName || "会社名未設定";
        const userName = user.user_name || user.userName || user.displayName || "ユーザー名未設定";
        userInfoElement.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <div style="display: flex; flex-direction: column;">
              <span style="font-weight: bold;">会社名：${companyName}様</span>
              <span style="font-weight: bold;">ご芳名：${userName}様</span>
            </div>
            <div style="font-size: 0.7em; color: #999; font-family: monospace;">
              DEBUG: user_id = ${user.user_id || user.id || "未設定"}<br>
              DEBUG: collection = users/${user.user_id || user.id || "未設定"}
            </div>
          </div>
        `;
      } else {
        userInfoElement.innerHTML = '<span style="color: #dc3545;">ユーザー情報を取得できませんでした</span>';
        console.warn("ユーザー情報が見つかりません");
      }
    } catch (error) {
      console.error("displayUserInfo エラー:", error);
      userInfoElement.innerHTML = '<span style="color: #dc3545;">ユーザー情報の表示でエラーが発生しました</span>';
    }
  } else {
    console.warn("userInfo要素が見つかりません");
  }
}

// 成功モーダル表示関数
function showSuccessModal(qrData, docId) {
  const modal = document.getElementById("successModal");
  const modalBody = document.getElementById("modalBody");

  modalBody.innerHTML = `
    <div><strong>スキャン結果:</strong></div>
    <div style="margin: 10px 0; padding: 10px; background: #e8f5e8; border-radius: 4px; font-family: monospace;">${qrData}</div>
    <div style="font-size: 12px; color: #666;">ドキュメントID: ${docId}</div>
  `;

  modal.classList.add("show");
}

// エラーモーダル表示関数
function showErrorModal(title, message) {
  const modal = document.getElementById("errorModal");
  const titleElement = document.getElementById("errorTitle");
  const modalBody = document.getElementById("errorModalBody");

  titleElement.textContent = title;
  modalBody.innerHTML = `
    <div style="white-space: pre-line; line-height: 1.5;">${message}</div>
  `;

  modal.classList.add("show");
}

// 成功モーダル閉じる
function closeModal() {
  const modal = document.getElementById("successModal");
  modal.classList.remove("show");
}

// エラーモーダル閉じる
function closeErrorModal() {
  const modal = document.getElementById("errorModal");
  modal.classList.remove("show");
}

// グローバル関数として登録
window.showSuccessModal = showSuccessModal;
window.showErrorModal = showErrorModal;
window.closeModal = closeModal;
window.closeErrorModal = closeErrorModal;
window.displayUserInfo = displayUserInfo;

// ログアウト処理
window.handleLogout = async function () {
  try {
    console.log("ログアウト処理開始");

    // 確認ダイアログ
    if (!confirm("ログアウトしますか？")) {
      return;
    }

    // auth.jsのログアウト機能を呼び出し
    if (window.UserSession && typeof UserSession.logout === "function") {
      UserSession.logout();
    } else if (
      window.FirebaseAuth &&
      typeof FirebaseAuth.signOut === "function"
    ) {
      const result = await FirebaseAuth.signOut();
      if (result.success) {
        window.location.href = "login.html";
      } else {
        console.error("ログアウトエラー:", result.error);
        alert("ログアウトに失敗しました: " + result.error);
      }
    } else {
      // フォールバック: 直接ログイン画面へ
      console.warn(
        "ログアウト機能が見つかりません。直接ログイン画面へリダイレクトします。"
      );
      localStorage.clear();
      window.location.href = "login.html";
    }
  } catch (error) {
    console.error("ログアウト処理エラー:", error);
    alert("ログアウト処理でエラーが発生しました: " + error.message);

    // エラーが発生してもログイン画面へリダイレクト
    localStorage.clear();
    window.location.href = "login.html";
  }
};

console.log("User page functions loaded");
