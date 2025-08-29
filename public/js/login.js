import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
const firebaseConfig = {
  apiKey: "AIzaSyCWFL91baSHkjkvU_k-yTUv6QS191YTFlg",
  authDomain: "qrscan2-99ffd.firebaseapp.com",
  projectId: "qrscan2-99ffd",
  storageBucket: "qrscan2-99ffd.firebasestorage.app",
  messagingSenderId: "1089215781575",
  appId: "1:1089215781575:web:bf9d05f6930b7123813ce2",
  measurementId: "G-QZZWT3HW0W",
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM取得
const loginForm = document.getElementById("loginForm");
const admin_idInput = document.getElementById("adminId");
const user_idInput = document.getElementById("userId");
const loginButton = document.getElementById("loginButton");
const loading = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");

// メッセージ表示
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
  successMessage.style.display = "none";
}

function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.style.display = "block";
  errorMessage.style.display = "none";
}

function toggleLoading(show, text = "処理中...") {
  if (show) {
    loading.style.display = "flex";
    loadingText.textContent = text;
    loginButton.disabled = true;
  } else {
    loading.style.display = "none";
    loginButton.disabled = false;
  }
}

// シンプルなadmin_id/user_idログイン
async function debugLogin(admin_id, user_id) {
  try {
    if (!admin_id || !user_id) {
      showError("admin_idとuser_idを入力してください");
      return;
    }
    toggleLoading(true, "ログイン中...");
    const userRef = doc(db, `admin_collections/${admin_id}/users/${user_id}`);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      showError("ユーザーが見つかりません");
      toggleLoading(false);
      return;
    }
    const userData = userSnap.data();
    // カスタムトークン取得API
    let customToken;
    console.log({ userId: user_id, adminId: admin_id, role: userData.role });

    try {
      const tokenRes = await fetch(
        "https://createcustomtoken-ijui6cxhzq-an.a.run.app",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user_id,           // ユーザーID
            adminId: admin_id,         // 管理者ID
            role: userData.role       // Firestoreから取得したrole
          }),
        }
      );
      const tokenJson = await tokenRes.json();
      if (!tokenJson.success || !tokenJson.customToken) {
        throw new Error(tokenJson.error || "カスタムトークン取得失敗");
      }
      customToken = tokenJson.customToken;
    } catch (err) {
      showError("トークン取得失敗: " + (err.message || err));
      toggleLoading(false);
      return;
    }

    // Firebase Auth認証
    try {
      const auth = getAuth();
      await signInWithCustomToken(auth, customToken);

      // currentUserがセットされるまで待機
      function waitForAuthUser(auth, timeout = 3000) {
        return new Promise((resolve, reject) => {
          const start = Date.now();
          (function check() {
            if (auth.currentUser) return resolve(auth.currentUser);
            if (Date.now() - start > timeout) return reject(new Error("Auth timeout"));
            setTimeout(check, 100);
          })();
        });
      }
      await waitForAuthUser(auth);
    } catch (err) {
      showError("Firebase認証失敗: " + (err.message || err));
      toggleLoading(false);
      return;
    }

    // localStorage保存
    localStorage.setItem("currentUser", JSON.stringify({
      admin_id: admin_id,
      user_id: userData.user_id || userSnap.id, // コレクションのuser_idフィールドを優先
      user_name: userData.user_name || userData.user_id || userSnap.id,
      role: userData.role || "user",
      timestamp: Date.now(),
    }));

    // localStorageのcurrentUserがセットされるまで待機（100ms間隔でチェック）
    async function waitForCurrentUser(timeout = 3000) {
      const start = Date.now();
      while (true) {
        const user = localStorage.getItem("currentUser");
        if (user) return JSON.parse(user);
        if (Date.now() - start > timeout) throw new Error("currentUser timeout");
        await new Promise(res => setTimeout(res, 100));
      }
    }
    await waitForCurrentUser();

    showSuccess(`${userData.user_name || user_id}さんでログインしました。リダイレクトします...`);
    window.location.href = `./user.html?admin_id=${admin_id}&user_id=${user_id}`;
  } catch (error) {
    showError("ログインエラー: " + (error.message || error));
    toggleLoading(false);
  }
}

// ログインボタンイベント
loginForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const admin_id = admin_idInput.value.trim();
  const user_id = user_idInput.value.trim();
  debugLogin(admin_id, user_id);
});



