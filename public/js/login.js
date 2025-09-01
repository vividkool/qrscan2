import {
  getAuth,
  signInWithCustomToken,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

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

// DOM Elements
const loginForm = document.getElementById("loginForm");
const admin_idInput = document.getElementById("adminId");
const user_idInput = document.getElementById("userId");
const loginButton = document.getElementById("loginButton");
const loading = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");

function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.style.display = "block";
  successMessage.style.display = "none";
}

function showSuccess(msg) {
  successMessage.textContent = msg;
  successMessage.style.display = "block";
  errorMessage.style.display = "none";
}

function toggleLoading(show, text = "処理中...") {
  loading.style.display = show ? "flex" : "none";
  loadingText.textContent = text;
  loginButton.disabled = show;
}

// メインログイン関数
async function debugLogin(admin_id, user_id) {
  if (!admin_id || !user_id) {
    showError("admin_idとuser_idを入力してください");
    return;
  }

  toggleLoading(true, "ログイン中...");

  try {
    // Firestore から role を取得
    const userRef = doc(db, `admin_collections/${admin_id}/users/${user_id}`);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      showError("ユーザーが見つかりません");
      toggleLoading(false);
      return;
    }
    const userData = userSnap.data();
    const role = userData.role || "user";

    // カスタムトークン取得
    const tokenRes = await fetch(
      "https://createcustomtoken-ijui6cxhzq-an.a.run.app",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user_id, adminId: admin_id, role }),
      }
    );
    const tokenJson = await tokenRes.json();
    if (!tokenJson.success || !tokenJson.customToken) {
      throw new Error(tokenJson.error || "カスタムトークン取得失敗");
    }

    const customToken = tokenJson.customToken;

    // Firebase Auth サインイン
    const auth = getAuth();
    await signInWithCustomToken(auth, customToken);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Auth currentUser が取得できません");
    }

    // users/{uid} に情報を保存
    await setDoc(
      doc(db, `admin_collections/${admin_id}/users/${currentUser.uid}`),
      {
        admin_id,
        user_id: userData.user_id || userSnap.id,
        user_name: userData.user_name || userData.user_id || userSnap.id,
        role,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    showSuccess(
      `${userData.user_name || user_id
      } さんでログインしました。リダイレクトします...`
    );

    // Firebase Auth認証成功後、ロールベースでパラメータなしリダイレクト
    if (role === "maker") {
      window.location.href = "./maker.html";
    } else if (role === "staff") {
      window.location.href = "./staff.html";
    } else {
      window.location.href = "./user.html";
    }
  } catch (err) {
    showError("ログインエラー: " + (err.message || err));
  } finally {
    toggleLoading(false);
  }
}

// イベント登録
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const admin_id = admin_idInput.value.trim();
  const user_id = user_idInput.value.trim();
  debugLogin(admin_id, user_id);
});
