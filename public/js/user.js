// user.js - localStorageなしバージョン

import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { AuthManager } from "./auth.js";

console.log("=== user.html ページ初期化 ===");
/*
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const paramUserId = params.get("user_id"); // URLパラメータ

  if (!paramUserId) {
    console.error("user_id が URL にありません");
    alert("stop");
    window.location.href = "login.html";
    return;
  }

  const auth = getAuth();
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      console.warn("Firebase Auth未ログイン");
      alert("stop");
      window.location.href = "login.html";
      return;
    }

    console.log("Firebase Auth currentUser:", firebaseUser);

    // UID一致チェック（セキュリティ強化）
    if (paramUserId !== firebaseUser.uid) {
      console.warn("URLの user_id と Firebase UID が一致しません");
      alert("stop");
      window.location.href = "login.html";
      return;
    }

    // Firestore からユーザー情報取得
    const user = await AuthManager.fetchUser(firebaseUser.uid);
    if (!user) {
      console.error("Firestoreからユーザー情報を取得できません");
      alert("stop");
      window.location.href = "login.html";
      return;
    }

    // 権限チェック
    const accessGranted = await AuthManager.checkAccess(user);
    if (!accessGranted) return;

    console.log("[DEBUG] 現在のユーザー:", user);

    // スキャン履歴表示
    if (window.SmartQRScanner) {
      SmartQRScanner.init(user);
    }

    // デバッグボタン
    const debugBtn = document.createElement("button");
    debugBtn.textContent = "デバッグ: 現在ユーザー情報";
    debugBtn.style.position = "fixed";
    debugBtn.style.bottom = "10px";
    debugBtn.style.right = "10px";
    debugBtn.style.zIndex = 9999;
    debugBtn.onclick = () => alert(JSON.stringify(user, null, 2));
    document.body.appendChild(debugBtn);
  });
});
*/
document.addEventListener("DOMContentLoaded", async () => {
  const auth = getAuth();

  // 認証状態を監視
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "./login.html";
      return;
    }

    console.log("=== user.htmlページ読み込み ===");
    console.log("現在のURL:", window.location.href);
    console.log("Firebase Auth currentUser:", user);
    console.log("================================");

    // ユーザー情報表示
    await displayUserInfo(user);

    // スキャン履歴表示
    if (
      window.smartScanner &&
      typeof window.smartScanner.displayScanHistory === "function"
    ) {
      window.smartScanner.displayScanHistory();
    } else {
      const scanHistoryElement = document.getElementById("scanHistory");
      if (scanHistoryElement) {
        scanHistoryElement.innerHTML =
          '<span style="color: #4285f4; font-weight: bold;">スキャンボタンを押してスキャンしてください</span>';
      }
    }
  });
});

// ユーザー情報取得・表示
async function displayUserInfo(user) {
  const userInfoElement = document.getElementById("userInfo");
  if (!userInfoElement) return console.warn("userInfo要素が見つかりません");

  try {
    const db = getFirestore();
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      userInfoElement.innerHTML =
        '<span style="color: #dc3545;">ユーザー情報を取得できませんでした</span>';
      console.warn("ユーザー情報が見つかりません");
      return;
    }

    const userData = userSnap.data();
    const companyName =
      userData.company_name || userData.companyName || "会社名未設定";
    const userName =
      userData.user_name ||
      userData.userName ||
      userData.displayName ||
      "ユーザー名未設定";

    userInfoElement.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 5px;">
        <div style="display: flex; flex-direction: column;">
          <span style="font-weight: bold;">会社名：${companyName}様</span>
          <span style="font-weight: bold;">ご芳名：${userName}様</span>
        </div>
        <div style="font-size: 0.7em; color: #999; font-family: monospace;">
          DEBUG: uid = ${user.uid}<br>
          DEBUG: collection = users/${user.uid}
        </div>
      </div>
    `;
  } catch (error) {
    console.error("displayUserInfo エラー:", error);
    userInfoElement.innerHTML =
      '<span style="color: #dc3545;">ユーザー情報の表示でエラーが発生しました</span>';
  }
}

// 成功モーダル表示
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

// エラーモーダル表示
function showErrorModal(title, message) {
  const modal = document.getElementById("errorModal");
  const titleElement = document.getElementById("errorTitle");
  const modalBody = document.getElementById("errorModalBody");

  titleElement.textContent = title;
  modalBody.innerHTML = `<div style="white-space: pre-line; line-height: 1.5;">${message}</div>`;
  modal.classList.add("show");
}

// モーダル閉じる
function closeModal() {
  document.getElementById("successModal").classList.remove("show");
}
function closeErrorModal() {
  document.getElementById("errorModal").classList.remove("show");
}

window.showSuccessModal = showSuccessModal;
window.showErrorModal = showErrorModal;
window.closeModal = closeModal;
window.closeErrorModal = closeErrorModal;
window.displayUserInfo = displayUserInfo;

// ログアウト処理
window.handleLogout = async function () {
  try {
    if (!confirm("ログアウトしますか？")) return;
    const auth = getAuth();
    await auth.signOut();
    window.location.href = "login.html";
  } catch (error) {
    console.error("ログアウト処理エラー:", error);
    alert("ログアウト処理でエラーが発生しました: " + error.message);
    window.location.href = "login.html";
  }
};

console.log("User page functions loaded");
