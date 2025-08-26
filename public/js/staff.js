// Staff Page Functions
import "./auth.js";
import "./smart-qr-scanner.js";

// Firebase imports for user management
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
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

// QRコードからの直接アクセス処理（index.htmlにリダイレクト）
async function handleQRCodeRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("user_id");

  if (!userId) {
    return false; // user_idパラメータがない場合は通常処理
  }

  console.log(
    "Staff page - QRコード直接アクセス検出 - index.htmlにリダイレクト - user_id:",
    userId
  );

  // QRコードからの直接アクセスはindex.htmlにリダイレクト
  window.location.href = `/?user_id=${userId}`;
  return true;
}

// 役割に応じたリダイレクトURL取得は LoginAuth.getRedirectUrl を使用

// ページロード時の初期化
document.addEventListener("DOMContentLoaded", async function () {
  // ページ読み込み時のデバッグ情報
  console.log("=== staff.htmlページ読み込み ===");
  console.log("現在のURL:", window.location.href);
  console.log("セッション存在確認:", !!localStorage.getItem("currentUser"));
  console.log("セッションデータ:", localStorage.getItem("currentUser"));
  console.log("================================");

  // QRコードからの直接アクセス処理
  const qrRedirectHandled = await handleQRCodeRedirect();

  if (qrRedirectHandled) {
    // QRコード直接アクセスの場合はindex.htmlにリダイレクト済み
    return;
  } // ユーザー情報表示
  await displayUserInfo();

  // スキャン履歴の読み込み
  if (window.smartScanner && window.smartScanner.displayScanHistory) {
    window.smartScanner.displayScanHistory();
  }

  // 担当者一覧表示機能の初期化
  await initializeTantouUsersList();
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
        // admin_collectionsパス表示用
        const adminId = user.admin_context && user.admin_context.admin_id ? user.admin_context.admin_id : "未設定";
        const adminCollectionPath = `admin_collections/${adminId}/`;

        userInfoElement.innerHTML = `
          <div class="user-card">
            <div class="user-header">
            <div class="detail-item">
                <span class="label">🏢 会社名:</span>
                <span class="value">${companyName}</span>
              </div>
              <h3>👨‍💼 ${user.user_name || user.name || "ユーザー"}</h3>
              <span class="user-id">ID: ${user.user_id || user.uid}</span>
              <div class="detail-item">
                <span class="label">📂 Adminコレクションパス:</span>
                <span class="value">${adminCollectionPath}</span>
              </div>
            </div>
            <div class="user-details">
              
            </div>
          </div>
        `;

        console.log("Staff情報表示完了:", user);
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

// 担当者一覧表示機能の初期化
async function initializeTantouUsersList() {
  // 現在のスタッフ情報を取得
  const currentUser = getCurrentUserInfo();
  if (!currentUser || !currentUser.user_name) {
    console.log("現在のユーザー情報が取得できません");
    return;
  }

  // 担当者一覧表示ボタンを追加
  const controlsContainer = document.querySelector(".scan-controls");
  if (controlsContainer && !document.getElementById("toggleTantouListBtn")) {
    const toggleButton = document.createElement("button");
    toggleButton.id = "toggleTantouListBtn";
    toggleButton.textContent = "📋 担当者一覧表示";
    toggleButton.onclick = toggleTantouUsersList;
    controlsContainer.appendChild(toggleButton);
  }

  // 担当者一覧表示エリアを追加
  if (!document.getElementById("tantouUsersSection")) {
    const existingContainer = document.querySelector(".container:last-of-type");
    if (existingContainer) {
      const tantouSection = document.createElement("div");
      tantouSection.id = "tantouUsersSection";
      tantouSection.className = "container";
      tantouSection.style.display = "none";
      tantouSection.innerHTML = `
        <h2>👥 担当者一覧 (${currentUser.user_name})</h2>
        <div id="tantouUsersContainer">
          <div class="loading">担当者一覧を読み込み中...</div>
        </div>
      `;
      existingContainer.parentNode.insertBefore(
        tantouSection,
        existingContainer.nextSibling
      );
    }
  }
}

// 現在のユーザー情報を取得
function getCurrentUserInfo() {
  try {
    const sessionData = localStorage.getItem("currentUser");
    if (sessionData) {
      return JSON.parse(sessionData);
    }
  } catch (error) {
    console.error("ユーザー情報取得エラー:", error);
  }
  return null;
}

// 担当者一覧の表示切り替え
async function toggleTantouUsersList() {
  const tantouSection = document.getElementById("tantouUsersSection");
  const toggleButton = document.getElementById("toggleTantouListBtn");

  if (!tantouSection) return;

  if (tantouSection.style.display === "none") {
    // 表示する
    tantouSection.style.display = "block";
    toggleButton.textContent = "🔼 担当者一覧を隠す";

    // データを読み込み
    await loadTantouUsersList();
  } else {
    // 隠す
    tantouSection.style.display = "none";
    toggleButton.textContent = "📋 担当者一覧表示";
  }
}

// 担当者一覧データの読み込み
async function loadTantouUsersList() {
  const currentUser = getCurrentUserInfo();
  if (!currentUser || !currentUser.user_name) {
    console.error("現在のユーザー情報が取得できません");
    return;
  }

  const tantouContainer = document.getElementById("tantouUsersContainer");
  if (!tantouContainer) return;

  try {
    tantouContainer.innerHTML =
      '<div class="loading">担当者一覧を読み込み中...</div>';

    console.log("担当者一覧検索開始 - staff_name:", currentUser.user_name);

    // usersコレクションから tantou が現在のstaff_name と一致するユーザーを検索
    const usersQuery = query(
      collection(db, "users"),
      where("tantou", "==", currentUser.user_name),
      orderBy("user_name")
    );

    const querySnapshot = await getDocs(usersQuery);

    if (querySnapshot.empty) {
      tantouContainer.innerHTML = `
        <div class="no-data">
          <p>担当者「${currentUser.user_name}」に割り当てられたユーザーはいません。</p>
        </div>
      `;
      return;
    }

    // テーブル作成
    let tableHTML = `
      <div class="history-table-container">
        <table class="history-table">
          <thead>
            <tr>
              <th>会社名</th>
              <th>ユーザー名</th>
              <th>ステータス</th>
              <th>スキャン回数</th>
            </tr>
          </thead>
          <tbody>
    `;

    let userCount = 0;
    const userDataWithScans = [];

    // 各ユーザーのスキャン回数を並行取得
    const scanCountPromises = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      userDataWithScans.push(userData);

      // scanItemsコレクションからuser_idと一致するスキャン回数を取得
      const scanCountPromise = getScanCountForUser(userData.user_id);
      scanCountPromises.push(scanCountPromise);
    });

    // 全ユーザーのスキャン回数を並行で取得
    const scanCounts = await Promise.all(scanCountPromises);

    // テーブル行を作成
    userDataWithScans.forEach((userData, index) => {
      userCount++;
      const scanCount = scanCounts[index];

      // ステータス表示の色分け
      let statusClass = "";
      let statusText = userData.status || "未設定";
      switch (statusText) {
        case "入場中":
          statusClass = 'style="color: #28a745; font-weight: bold;"';
          break;
        case "退場済":
          statusClass = 'style="color: #dc3545;"';
          break;
        case "-":
          statusClass = 'style="color: #ffc107;"';
          break;
        default:
          statusClass = 'style="color: #666;"';
      }

      // スキャン回数の色分け
      let scanCountClass = "";
      if (scanCount > 10) {
        scanCountClass =
          'style="background-color: #28a745; font-weight: bold;"'; // 緑：多い
      } else if (scanCount > 5) {
        scanCountClass =
          'style="background-color: #ffc107; font-weight: bold;"'; // 黄：中程度
      } else if (scanCount > 0) {
        scanCountClass = 'style="background-color: #ffffffff;"'; // 青：少し
      } else {
        scanCountClass = 'style="background-color: #ffffffff;"'; // 赤：なし
      }

      tableHTML += `
        <tr>
          <td class="content-cell">${userData.company_name || "未設定"}</td>
          <td class="content-cell">${userData.user_name || "未設定"}</td>
          <td class="content-cell" ${statusClass}>${statusText}</td>
          <td class="content-cell" ${scanCountClass}>${scanCount}回</td>
        </tr>
      `;
    });

    tableHTML += `
          </tbody>
        </table>
      </div>
      <div class="history-footer">
        担当ユーザー数: ${userCount}人 | 担当者: ${currentUser.user_name}
      </div>
    `;

    tantouContainer.innerHTML = tableHTML;
    console.log(`担当者一覧表示完了 - ${userCount}人のユーザーを表示`);
  } catch (error) {
    console.error("担当者一覧読み込みエラー:", error);
    tantouContainer.innerHTML = `
      <div class="error">
        <p>担当者一覧の読み込み中にエラーが発生しました。</p>
        <p style="font-size: 12px; color: #666;">${error.message}</p>
      </div>
    `;
  }
}

// 特定ユーザーのスキャン回数を取得
async function getScanCountForUser(userId) {
  try {
    if (!userId) return 0;

    // scanItemsコレクションからuser_idと一致する記録を検索
    const scanQuery = query(
      collection(db, "scanItems"),
      where("user_id", "==", String(userId))
    );

    const scanSnapshot = await getDocs(scanQuery);
    const scanCount = scanSnapshot.size;

    console.log(`ユーザー ${userId} のスキャン回数: ${scanCount}`);
    return scanCount;
  } catch (error) {
    console.error(`ユーザー ${userId} のスキャン回数取得エラー:`, error);
    return 0;
  }
}

// 表示状態管理
let isShowingScanner = false; // 初期状態はスキャン履歴表示

// 表示切り替え機能
function toggleView() {
  const cameraContainer = document.getElementById("cameraContainer");
  const scanHistory = document.getElementById("scanHistory");
  const toggleBtn = document.getElementById("toggleBtn");

  if (!cameraContainer || !scanHistory || !toggleBtn) {
    console.error("必要な要素が見つかりません");
    return;
  }

  isShowingScanner = !isShowingScanner;

  if (isShowingScanner) {
    // スキャナー表示モード
    cameraContainer.style.display = "block";
    scanHistory.style.display = "none";
    toggleBtn.textContent = "📋 担当者一覧表示";
    console.log("スキャナー表示モードに切り替え");
  } else {
    // 履歴表示モード
    cameraContainer.style.display = "none";
    scanHistory.style.display = "block";
    toggleBtn.textContent = "📷 スキャナー表示";
    console.log("履歴表示モードに切り替え");
  }
}

// 初期表示設定（履歴表示）
function initializeView() {
  const cameraContainer = document.getElementById("cameraContainer");
  const scanHistory = document.getElementById("scanHistory");
  const toggleBtn = document.getElementById("toggleBtn");

  if (cameraContainer && scanHistory && toggleBtn) {
    // 初期状態：履歴表示、スキャナー非表示
    cameraContainer.style.display = "none";
    scanHistory.style.display = "block";
    toggleBtn.textContent = "📷 スキャナー表示";
    isShowingScanner = false;
    console.log("初期表示設定完了：履歴表示モード");
  }
}

// ページロード後に初期表示を設定
document.addEventListener("DOMContentLoaded", function () {
  // 少し遅延させて確実に要素が読み込まれてから実行
  setTimeout(initializeView, 100);
});

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
window.toggleView = toggleView;
window.isShowingScanner = isShowingScanner;

console.log("Staff page functions loaded");
