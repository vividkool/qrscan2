// Uketuke Page Functions - 受付管理システム
import "./auth.js";

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  where,
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

// グローバル変数
let allUsers = [];
let filteredUsers = [];
let currentAction = null;
let currentUserId = null;

// ページロード時の初期化
document.addEventListener("DOMContentLoaded", async function () {
  console.log("=== uketuke.htmlページ読み込み ===");
  console.log("現在のURL:", window.location.href);
  console.log("セッション存在確認:", !!localStorage.getItem("currentUser"));

  // 権限チェック
  if (!checkUketukeRole()) {
    return;
  }

  // ユーザー一覧の読み込み
  await loadUsersList();

  // 検索機能の設定
  setupSearch();

  // モーダルの設定
  setupModal();

  console.log("受付管理システム初期化完了");
});

// 受付権限チェック
function checkUketukeRole() {
  try {
    const sessionData = localStorage.getItem("currentUser");
    if (!sessionData) {
      alert("セッション情報が見つかりません。再ログインしてください。");
      window.location.href = "login.html";
      return false;
    }

    const user = JSON.parse(sessionData);

    if (user.role !== "uketuke") {
      alert(
        `このページは受付担当者専用です。\n現在のロール: ${user.role}\n\nログイン画面に戻ります。`
      );
      window.location.href = "login.html";
      return false;
    }

    console.log("受付権限確認完了:", user.user_name);
    return true;
  } catch (error) {
    console.error("権限チェックエラー:", error);
    alert("権限チェック中にエラーが発生しました。再ログインしてください。");
    window.location.href = "login.html";
    return false;
  }
}

// ユーザー一覧の読み込み
async function loadUsersList() {
  const container = document.getElementById("usersTableContainer");

  try {
    container.innerHTML =
      '<div class="loading">ユーザー一覧を読み込み中...</div>';

    // usersコレクションからrole:userのユーザーのみを取得
    const usersQuery = query(
      collection(db, "users"),
      where("role", "==", "user"),
      orderBy("user_id")
    );

    const querySnapshot = await getDocs(usersQuery);

    if (querySnapshot.empty) {
      container.innerHTML = `
        <div class="error">
          <p>ユーザーが登録されていません。</p>
        </div>
      `;
      return;
    }

    // データを配列に格納
    allUsers = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      userData.docId = doc.id; // Firestoreドキュメントidを保存
      allUsers.push(userData);
    });

    filteredUsers = [...allUsers];

    // テーブル表示
    displayUsersTable();

    // 統計情報更新
    updateStatistics();

    console.log(`ユーザー一覧読み込み完了: ${allUsers.length}人`);
  } catch (error) {
    console.error("ユーザー一覧読み込みエラー:", error);
    container.innerHTML = `
      <div class="error">
        <p>ユーザー一覧の読み込み中にエラーが発生しました。</p>
        <p style="font-size: 12px;">${error.message}</p>
      </div>
    `;
  }
}

// ユーザーテーブル表示
function displayUsersTable() {
  const container = document.getElementById("usersTableContainer");

  if (filteredUsers.length === 0) {
    container.innerHTML = `
      <div class="error">
        <p>検索条件に一致するユーザーが見つかりません。</p>
      </div>
    `;
    return;
  }

  let html = `
    <div class="users-table-container">
      <table class="users-table">
        <thead style="position: sticky; top: 100px; z-index: 999; background-color: #007bff;">
          <tr>
            
            <th>ユーザーID</th>
            <th>会社名</th>
            <th>ユーザー名</th>
            <th>担当者</th>
            <th>入退場ステータス</th>
            <th>印刷ステータス</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
  `;

  filteredUsers.forEach((userData) => {
    const status = userData.status || "未設定";
    const printStatus = userData.print_status || "未";
    const tantou = userData.tantou || "-";

    html += `
      <tr>
        
        <td>${userData.user_id || "-"}</td>
        <td>${userData.company_name || "未設定"}</td>
        <td><strong>${userData.user_name || "未設定"}</strong></td>
        <td>${tantou}</td>
        <td>
          <span class="status-badge status-${status}">${status}</span>
        </td>
        <td>
          <span class="print-badge print-${printStatus}">${printStatus}</span>
        </td>
        
        <td>
          <button 
            class="action-btn btn-success" 
            onclick="changeStatus('${userData.docId}', '${
      userData.user_name
    }', '入場中')"
            ${status === "入場中" ? "disabled" : ""}
          >
            入場
          </button>
          <button 
            class="action-btn btn-danger" 
            onclick="changeStatus('${userData.docId}', '${
      userData.user_name
    }', '退場済')"
            ${status === "退場済" ? "disabled" : ""}
          >
            退場
          </button>
          <button 
            class="action-btn btn-warning" 
            onclick="changePrintStatus('${userData.docId}', '${
      userData.user_name
    }', '済')"
            ${printStatus === "済" ? "disabled" : ""}
          >
            印刷済
          </button>
          <button 
            class="action-btn btn-secondary" 
            onclick="changePrintStatus('${userData.docId}', '${
      userData.user_name
    }', '未')"
            ${printStatus === "未" ? "disabled" : ""}
          >
            印刷取消
          </button>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

// 統計情報更新
function updateStatistics() {
  const totalUsers = allUsers.length;
  const checkedInUsers = allUsers.filter(
    (user) => user.status === "入場中"
  ).length;
  const checkedOutUsers = allUsers.filter(
    (user) => user.status === "退場済"
  ).length;
  const printedUsers = allUsers.filter(
    (user) => user.print_status === "済"
  ).length;

  document.getElementById("totalUsers").textContent = totalUsers;
  document.getElementById("checkedInUsers").textContent = checkedInUsers;
  document.getElementById("checkedOutUsers").textContent = checkedOutUsers;
  document.getElementById("printedUsers").textContent = printedUsers;
}

// 検索機能の設定
function setupSearch() {
  const searchInput = document.getElementById("searchInput");

  searchInput.addEventListener("input", function () {
    const searchTerm = this.value.toLowerCase().trim();

    if (searchTerm === "") {
      filteredUsers = [...allUsers];
    } else {
      filteredUsers = allUsers.filter((user) => {
        const userName = (user.user_name || "").toLowerCase();
        const companyName = (user.company_name || "").toLowerCase();
        const userId = (user.user_id || "").toLowerCase();

        return (
          userName.includes(searchTerm) ||
          companyName.includes(searchTerm) ||
          userId.includes(searchTerm)
        );
      });
    }

    displayUsersTable();
  });
}

// 入退場ステータス変更
async function changeStatus(docId, userName, newStatus) {
  currentAction = {
    type: "status",
    docId: docId,
    userName: userName,
    newValue: newStatus,
  };

  showConfirmModal(
    `ステータス変更確認`,
    `${userName}さんのステータスを「${newStatus}」に変更しますか？`,
    executeStatusChange
  );
}

// 印刷ステータス変更
async function changePrintStatus(docId, userName, newPrintStatus) {
  currentAction = {
    type: "print_status",
    docId: docId,
    userName: userName,
    newValue: newPrintStatus,
  };

  showConfirmModal(
    `印刷ステータス変更確認`,
    `${userName}さんの印刷ステータスを「${newPrintStatus}」に変更しますか？`,
    executePrintStatusChange
  );
}

// ステータス変更実行
async function executeStatusChange() {
  if (!currentAction) return;

  try {
    const userRef = doc(db, "users", currentAction.docId);
    await updateDoc(userRef, {
      status: currentAction.newValue,
      updated_at: new Date(),
    });

    // ローカルデータも更新
    const userIndex = allUsers.findIndex(
      (user) => user.docId === currentAction.docId
    );
    if (userIndex !== -1) {
      allUsers[userIndex].status = currentAction.newValue;
    }

    showSuccessMessage(
      `${currentAction.userName}さんのステータスを「${currentAction.newValue}」に変更しました。`
    );

    // 表示を更新
    displayUsersTable();
    updateStatistics();
  } catch (error) {
    console.error("ステータス変更エラー:", error);
    showErrorMessage(`ステータスの変更に失敗しました: ${error.message}`);
  }

  currentAction = null;
}

// 印刷ステータス変更実行
async function executePrintStatusChange() {
  if (!currentAction) return;

  try {
    const userRef = doc(db, "users", currentAction.docId);
    await updateDoc(userRef, {
      print_status: currentAction.newValue,
      updated_at: new Date(),
    });

    // ローカルデータも更新
    const userIndex = allUsers.findIndex(
      (user) => user.docId === currentAction.docId
    );
    if (userIndex !== -1) {
      allUsers[userIndex].print_status = currentAction.newValue;
    }

    showSuccessMessage(
      `${currentAction.userName}さんの印刷ステータスを「${currentAction.newValue}」に変更しました。`
    );

    // 表示を更新
    displayUsersTable();
    updateStatistics();
  } catch (error) {
    console.error("印刷ステータス変更エラー:", error);
    showErrorMessage(`印刷ステータスの変更に失敗しました: ${error.message}`);
  }

  currentAction = null;
}

// モーダル設定
function setupModal() {
  const modal = document.getElementById("confirmModal");
  const noBtn = document.getElementById("confirmNo");

  noBtn.addEventListener("click", function () {
    modal.classList.remove("show");
    currentAction = null;
  });

  // モーダル外クリックで閉じる
  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      modal.classList.remove("show");
      currentAction = null;
    }
  });
}

// 確認モーダル表示
function showConfirmModal(title, message, callback) {
  const modal = document.getElementById("confirmModal");
  const titleElement = document.getElementById("confirmTitle");
  const messageElement = document.getElementById("confirmMessage");
  const yesBtn = document.getElementById("confirmYes");

  titleElement.textContent = title;
  messageElement.textContent = message;

  // 既存のイベントリスナーを削除
  const newYesBtn = yesBtn.cloneNode(true);
  yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);

  // 新しいイベントリスナーを追加
  newYesBtn.addEventListener("click", function () {
    modal.classList.remove("show");
    callback();
  });

  modal.classList.add("show");
}

// 成功メッセージ表示
function showSuccessMessage(message) {
  const element = document.getElementById("successMessage");
  element.textContent = message;
  element.style.display = "block";

  setTimeout(() => {
    element.style.display = "none";
  }, 3000);
}

// エラーメッセージ表示
function showErrorMessage(message) {
  const element = document.getElementById("errorMessage");
  element.textContent = message;
  element.style.display = "block";

  setTimeout(() => {
    element.style.display = "none";
  }, 5000);
}

// ユーザー一覧更新
async function refreshUsersList() {
  await loadUsersList();
  showSuccessMessage("ユーザー一覧を更新しました。");
}

// CSV エクスポート
function exportUsersList() {
  try {
    let csvContent =
      "ユーザー名,ユーザーID,会社名,部署,ロール,入退場ステータス,印刷ステータス,担当者\n";

    filteredUsers.forEach((user) => {
      const row = [
        user.user_name || "",
        user.user_id || "",
        user.company_name || "",
        user.department || "",
        user.role || user.user_role || "",
        user.status || "未設定",
        user.print_status || "未",
        user.tantou || "",
      ]
        .map((field) => `"${field}"`)
        .join(",");

      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `users_list_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccessMessage("ユーザー一覧をCSVファイルでエクスポートしました。");
  } catch (error) {
    console.error("エクスポートエラー:", error);
    showErrorMessage("エクスポート中にエラーが発生しました。");
  }
}

// ログアウト処理
function handleLogout() {
  if (confirm("ログアウトしますか？")) {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("firebaseSessionData");
    window.location.href = "login.html";
  }
}

// グローバル関数として公開
window.changeStatus = changeStatus;
window.changePrintStatus = changePrintStatus;
window.refreshUsersList = refreshUsersList;
window.exportUsersList = exportUsersList;
window.handleLogout = handleLogout;

console.log("Uketuke page functions loaded");
