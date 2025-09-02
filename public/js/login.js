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
  showToast(msg, 'error');
  errorMessage.textContent = msg;
  errorMessage.style.display = "block";
  successMessage.style.display = "none";
}

function showSuccess(msg) {
  showToast(msg, 'success');
  successMessage.textContent = msg;
  successMessage.style.display = "block";
  errorMessage.style.display = "none";
}

// トーストメッセージ表示機能
function showToast(message, type = 'error') {
  const toast = document.getElementById('toast');

  // トーストの内容とスタイルを設定
  toast.textContent = message;
  toast.className = `toast ${type}`;

  // トーストを表示
  toast.classList.add('show');

  // 4秒後に自動で非表示
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// 新規管理者登録ページへ遷移
function goToAdminRegister() {
  window.location.href = 'index.html';
}

// グローバル関数として公開
window.goToAdminRegister = goToAdminRegister;

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

    if (role === "maker") {
      window.location.href = `./maker.html?admin_id=${admin_id}&user_id=${user_id}`;
    } else {
      window.location.href = `./user.html?admin_id=${admin_id}&user_id=${user_id}`;
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

// QRコード表示関数
function addDivider(text) {
  return `
    <div style="position: relative; margin: 20px 0;">
      <div style="height: 1px; background: #ddd; z-index: 1;"></div>
      <div style="background: white; padding: 0 15px; z-index: 2; position: relative; display: inline-block; color: #666; font-size: 14px;">${text}</div>
    </div>
  `;
}

function generateQRDisplay(role, demoUrl) {
  const qrDisplay = document.getElementById('qrDisplay');
  const roleIcons = {
    user: '👤',
    maker: '🔧',
    staff: '👷'
  };
  const roleNames = {
    user: 'ユーザー',
    maker: '製造者',
    staff: 'スタッフ'
  };
  const roleColors = {
    user: '#28a745',
    maker: '#17a2b8',
    staff: '#ffc107'
  };

  qrDisplay.innerHTML = `
    <div style="text-align: center; padding: 60px 20px; background: #f5f5f5; border: 2px dashed #ddd; border-radius: 8px;">
      <div style="font-size: 48px; margin-bottom: 10px;">${roleIcons[role]}</div>
      <div style="color: #666; margin-bottom: 15px;">${roleNames[role]}用QRコード</div>
      <div style="font-size: 12px; word-break: break-all; background: white; padding: 10px; border-radius: 4px; color: #333;">${demoUrl}</div>
    </div>
    ${addDivider('または直接アクセス')}
    <div style="text-align: center; margin-top: 15px;">
      <button onclick="window.location.href='${demoUrl}'" style="background: ${roleColors[role]}; color: ${role === 'staff' ? '#212529' : 'white'}; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">${roleNames[role]}ページへ</button>
    </div>
  `;
}

// DOMContentLoaded後の初期化処理
document.addEventListener('DOMContentLoaded', function () {
  // デモボタンのイベントリスナー設定
  document.getElementById('demoUser').addEventListener('click', function () {
    const demoUrl = 'https://qrscan2-99ffd.web.app/user.html?uid=demo_user_001';
    generateQRDisplay('user', demoUrl);
  });

  document.getElementById('demoMaker').addEventListener('click', function () {
    const demoUrl = 'https://qrscan2-99ffd.web.app/maker.html?uid=demo_maker_001';
    generateQRDisplay('maker', demoUrl);
  });

  document.getElementById('demoStaff').addEventListener('click', function () {
    const demoUrl = 'https://qrscan2-99ffd.web.app/staff.html?uid=demo_staff_001';
    generateQRDisplay('staff', demoUrl);
  });
});
