// Maker Page Functions
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import "./auth.js";
import "./smart-qr-scanner.js";
import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
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
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

import { AuthManager, USER_ROLES } from "./auth.js";

console.log("=== maker.html ページ初期化 ===");

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("user_id");

  if (!userId) {
    console.error("user_id が URL にありません");
    window.location.href = "login.html";
    return;
  }

  const user = await AuthManager.fetchUser(userId);
  if (!user) {
    console.error("ユーザー情報が取得できません:", userId);
    window.location.href = "login.html";
    return;
  }

  // makerページ専用アクセスチェック
  if (user.role !== USER_ROLES.MAKER) {
    console.warn("アクセス権限がありません:", user.role);
    window.location.href = AuthManager.getRedirectUrl(user.role);
    return;
  }

  console.log("[DEBUG] 現在のユーザー:", user);

  // 初期化処理
  if (window.SmartQRScanner) {
    console.log("[Smart QR Scanner] スキャン履歴表示開始");
    SmartQRScanner.init(user);
  }

  // デバッグボタン
  const debugBtn = document.createElement("button");
  debugBtn.textContent = "デバッグ: 現在ユーザー情報";
  debugBtn.style.position = "fixed";
  debugBtn.style.bottom = "10px";
  debugBtn.style.right = "10px";
  debugBtn.style.zIndex = 9999;
  debugBtn.onclick = () => {
    console.log("[DEBUG] user object:", user);
    alert(JSON.stringify(user, null, 2));
  };
  document.body.appendChild(debugBtn);
});

// ユーザー情報HTML生成関数（user.js からコピー）
function generateUserInfoHTML(user, userId) {
  const companyName = user.company_name || user.companyName || "未設定";
  return `
    <div class="user-card">
      <div class="user-details">
        <div class="detail-item">
          <span class="label">🏢 会社名:</span>
          <span class="value">${companyName}</span>
        </div>
      </div>
      <div class="user-header">
        <h3>👨‍💼 ${user.user_name || user.name || "ユーザー"}</h3>
      </div>
    </div>
  `;
}

// エラー表示HTML
function generateErrorHTML(title, message) {
  return `
    <div class="user-card error">
      <div class="user-header">
        <h3>⚠️ ${title}</h3>
      </div>
      <div class="user-details">
        <p>${message}</p>
        <button onclick="handleLogout()" class="logout-btn">ログアウト</button>
      </div>
    </div>
  `;
}

// ユーザー情報表示とメーカーアイテム表示
async function displayUserInfo(userId) {
  const userInfoElement = document.getElementById("userInfo");
  if (!userInfoElement) return;

  try {
    // Firestoreからユーザー情報取得
    const userQuery = query(
      collection(db, "users"),
      where("user_id", "==", userId)
    );
    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
      userInfoElement.innerHTML = generateErrorHTML(
        "エラー",
        "ユーザーが見つかりません"
      );
      return;
    }

    const userDoc = userSnapshot.docs[0];
    const user = userDoc.data();

    // 表示準備
    userInfoElement.innerHTML =
      generateUserInfoHTML(user, userId) +
      `
      <div class="loading-container">
        <div class="spinner"></div>
        <span>メーカー関連アイテムを読み込み中...</span>
      </div>
    `;

    // メーカー関連アイテム表示
    await displayMakerItems(user);
  } catch (error) {
    console.error("ユーザー情報表示エラー:", error);
    userInfoElement.innerHTML = generateErrorHTML(
      "エラー",
      `ユーザー情報取得中にエラーが発生しました: ${error.message}`
    );
  }
}

// メーカー関連アイテム取得・表示（簡略版）
async function displayMakerItems(user) {
  const userInfoElement = document.getElementById("userInfo");
  const userId = user.user_id || user.uid;

  try {
    const itemsQuery = query(
      collection(db, "items"),
      where("maker_code", "==", userId),
      orderBy("item_no", "asc")
    );
    const itemsSnapshot = await getDocs(itemsQuery);

    let html = generateUserInfoHTML(user, userId);

    if (itemsSnapshot.empty) {
      html += `<div class="user-card">
        <div class="user-header"><h3>📦 メーカー関連アイテム</h3></div>
        <div class="user-details"><p>該当するアイテムが見つかりません。</p></div>
      </div>`;
    } else {
      // 簡易集計: scanItems 全取得してメモリ上でカウント
      const scanSnapshot = await getDocs(collection(db, "scanItems"));
      const scanCounts = {};
      scanSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.item_no != null) {
          const key = data.item_no.toString();
          scanCounts[key] = (scanCounts[key] || 0) + 1;
        }
      });

      html += `<div class="user-card">
        <div class="user-header"><h3>📦 メーカー関連アイテム (${itemsSnapshot.size}件)</h3></div>
        <div class="items-table-container">
          <table class="items-table">
            <thead>
              <tr>
                <th>アイテム番号</th>
                <th>カテゴリ</th>
                <th>会社名</th>
                <th>アイテム名</th>
                <th>スキャン回数</th>
              </tr>
            </thead>
            <tbody>`;

      itemsSnapshot.forEach((doc) => {
        const data = doc.data();
        const scanCount = scanCounts[data.item_no?.toString()] || 0;

        let scanCountClass = "";
        if (scanCount > 10)
          scanCountClass =
            'style="background-color:#28a745;color:white;font-weight:bold;"';
        else if (scanCount > 5)
          scanCountClass =
            'style="background-color:#ffc107;color:black;font-weight:bold;"';
        else if (scanCount > 0)
          scanCountClass = 'style="background-color:#9cf2aeff;"';
        else scanCountClass = 'style="background-color:#ffffff;"';

        html += `<tr>
          <td><strong>${data.item_no || "未設定"}</strong></td>
          <td>${data.category_name || "未分類"}</td>
          <td>${data.company_name || "未設定"}</td>
          <td>${data.item_name || "未設定"}</td>
          <td class="content-cell" ${scanCountClass}>${scanCount}回</td>
        </tr>`;
      });

      html += `</tbody></table></div></div>`;
    }

    userInfoElement.innerHTML = html;
  } catch (error) {
    console.error("メーカー関連アイテム取得エラー:", error);
    userInfoElement.innerHTML =
      generateUserInfoHTML(user, userId) +
      generateErrorHTML(
        "アイテム取得エラー",
        `取得中にエラーが発生しました: ${error.message}`
      );
  }
}

// ログアウト処理
function handleLogout() {
  if (confirm("ログアウトしますか？")) {
    window.location.href = "login.html";
  }
}

window.handleLogout = handleLogout;
window.displayUserInfo = displayUserInfo;

console.log("Maker page functions loaded");
