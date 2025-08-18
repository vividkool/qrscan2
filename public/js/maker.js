// Maker Page Functions
import "./auth.js";
import "./smart-qr-scanner.js";

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

// ユーザー情報表示とメーカー関連アイテム表示
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

        // ローディング表示
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
              ${user.department
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
          <div class="loading-container">
            <div class="spinner"></div>
            <span>メーカー関連アイテムを読み込み中...</span>
          </div>
        `;

        // メーカー関連アイテムを取得・表示
        await displayMakerItems(user);

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

// メーカー関連アイテム表示
async function displayMakerItems(user) {
  const userInfoElement = document.getElementById("userInfo");
  const userId = user.user_id || user.uid;

  try {
    console.log("メーカー関連アイテムクエリ開始:", userId);

    // user_idとmaker_codeが一致するitemsを取得
    const itemsQuery = query(
      collection(db, "items"),
      where("maker_code", "==", userId),
      orderBy("item_no", "asc")
    );

    const itemsSnapshot = await getDocs(itemsQuery);
    console.log("取得したアイテム数:", itemsSnapshot.size);

    // scanItemsコレクション全体を取得してカウント用にキャッシュ
    const scanItemsSnapshot = await getDocs(collection(db, "scanItems"));
    console.log("取得したスキャンアイテム数:", scanItemsSnapshot.size);

    const scanCounts = {};
    scanItemsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.item_no) {
        scanCounts[data.item_no] = (scanCounts[data.item_no] || 0) + 1;
      }
    });

    // 現在のユーザー情報を保持してアイテム情報を追加
    const company_name = user.company_name || user.companyName || "未設定";
    let html = `
      <div class="user-card">
        <div class="user-header">
          <h3>👨‍💼 ${user.user_name || user.name || "ユーザー"}</h3>
          <span class="user-id">ID: ${userId}</span>
        </div>
        <div class="user-details">
          <div class="detail-item">
            <span class="label">🏢 会社名:</span>
            <span class="value">${company_name}</span>
          </div>
          <div class="detail-item">
            <span class="label">👤 ロール:</span>
            <span class="value role-${user.role}">${user.role}</span>
          </div>
          ${user.department
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
            <span class="value">${new Date(user.timestamp).toLocaleString()}</span>
          </div>
        </div>
      </div>
    `;

    // アイテム情報の表示
    if (itemsSnapshot.empty) {
      html += `
        <div class="user-card">
          <div class="user-header">
            <h3>📦 メーカー関連アイテム</h3>
            <span class="user-id">メーカーコード: ${userId}</span>
          </div>
          <div class="user-details">
            <p>該当するアイテムが見つかりませんでした。</p>
          </div>
        </div>
      `;
    } else {
      // テーブル形式で表示
      html += `
        <div class="user-card">
          <div class="user-header">
            <h3>📦 メーカー関連アイテム (${itemsSnapshot.size}件)</h3>
            <span class="user-id">メーカーコード: ${userId}</span>
          </div>
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
              <tbody>
      `;

      itemsSnapshot.forEach((doc) => {
        const data = doc.data();
        const scanCount = scanCounts[data.item_no] || 0;

        html += `
          <tr>
            <td><strong>${data.item_no || "未設定"}</strong></td>
            <td>${data.category_name || "未分類"}</td>
            <td>${data.company_name || "未設定"}</td>
            <td>${data.item_name || "未設定"}</td>
            <td><span class="scan-count">${scanCount}</span></td>
          </tr>
        `;
      });

      html += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    userInfoElement.innerHTML = html;
    console.log("メーカー関連アイテム表示完了");

  } catch (error) {
    console.error("メーカー関連アイテム取得エラー:", error);

    // エラー時はユーザー情報だけ表示してエラーメッセージを追加
    const company_name = user.company_name || user.companyName || "未設定";
    userInfoElement.innerHTML = `
      <div class="user-card">
        <div class="user-header">
          <h3>👨‍💼 ${user.user_name || user.name || "ユーザー"}</h3>
          <span class="user-id">ID: ${userId}</span>
        </div>
        <div class="user-details">
          <div class="detail-item">
            <span class="label">🏢 会社名:</span>
            <span class="value">${company_name}</span>
          </div>
          <div class="detail-item">
            <span class="label">👤 ロール:</span>
            <span class="value role-${user.role}">${user.role}</span>
          </div>
          ${user.department
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
            <span class="value">${new Date(user.timestamp).toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div class="user-card error">
        <div class="user-header">
          <h3>⚠️ アイテム取得エラー</h3>
        </div>
        <div class="user-details">
          <p>メーカー関連アイテムの取得中にエラーが発生しました: ${error.message}</p>
          <button onclick="displayUserInfo()" style="background-color: #9c27b0; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">再試行</button>
        </div>
      </div>
    `;
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
window.displayUserInfo = displayUserInfo;

console.log("Maker page functions loaded");
