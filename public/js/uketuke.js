// Uketuke Page Functions - 受付管理システム
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import "./auth.js";
import "./nametag.js";

// Firebase imports
import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  where,
  getDoc, // 追加: 管理者データ取得用
  addDoc, // 追加: Firebase Extensions用
  serverTimestamp, // 追加: Firebase Extensions用
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

// テストユーザー用: currentAdminからadminデータを取得する関数
function getAvailableAdminData() {
  // 1. window.currentAdmin（最優先）
  if (
    window.currentAdmin &&
    window.currentAdmin.admin_id &&
    window.currentAdmin.event_id
  ) {
    console.log(
      "✅ window.currentAdminからadminデータ取得:",
      window.currentAdmin
    );
    return {
      admin_id: window.currentAdmin.admin_id,
      event_id: window.currentAdmin.event_id,
      company_name: window.currentAdmin.company_name,
      project_name: window.currentAdmin.project_name,
      event_date: window.currentAdmin.event_date,
    };
  }

  // 2. URL parameters（admin.htmlから直接遷移の場合）
  const urlParams = new URLSearchParams(window.location.search);
  const adminId = urlParams.get("admin_id");
  const eventId = urlParams.get("event_id");
  if (adminId && eventId) {
    console.log("✅ URLパラメータからadminデータ取得:", {
      admin_id: adminId,
      event_id: eventId,
    });
    return { admin_id: adminId, event_id: eventId };
  }

  console.warn("❌ 利用可能なadminデータが見つかりません");
  return null;
}

// グローバル変数
let allUsers = [];
let filteredUsers = [];
let currentAction = null;
let currentUserId = null;
let currentAdmin = null; // admin.jsと同様のcurrentAdmin変数を追加

// Firebase Auth認証状態の確定を待機（user.jsと同様）
async function waitForFirebaseAuth() {
  const auth = getAuth();

  return new Promise((resolve) => {
    if (auth.currentUser) {
      // 既に認証済みの場合
      resolve(auth.currentUser);
      return;
    }

    // 認証状態変更を監視
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log(
        "Firebase Auth状態変更:",
        user ? "認証済み" : "未認証",
        user?.uid
      );
      unsubscribe(); // 一度だけ実行
      resolve(user);
    });

    // タイムアウト処理（10秒で諦める）
    setTimeout(() => {
      console.warn("Firebase Auth認証待機タイムアウト");
      unsubscribe();
      resolve(null);
    }, 10000);
  });
}

// ページロード時の初期化
document.addEventListener("DOMContentLoaded", async function () {
  console.log("=== uketuke.htmlページ読み込み (Firebase Auth版) ===");
  console.log("現在のURL:", window.location.href);

  // Firebase Auth認証待機
  const firebaseUser = await waitForFirebaseAuth();

  if (!firebaseUser) {
    console.warn("Firebase Auth認証に失敗、ログイン画面にリダイレクト");
    window.location.href = "index.html";
  }

  // ユーザー情報取得と受付権限チェック
  let userData = null;
  if (window.UserSession && typeof UserSession.getCurrentUser === "function") {
    userData = await UserSession.getCurrentUser();
    console.log("Firebase Auth ユーザーデータ取得:", userData);
  }

  // デバッグ: userDataとwindow.currentAdminの詳細を表示
  console.log("🔍 uketuke.js デバッグ情報:");
  console.log("- userData:", userData);
  console.log("- userData.role:", userData?.role);
  console.log("- userData.user_role:", userData?.user_role);
  console.log("- firebaseUser.uid:", firebaseUser.uid);
  console.log("- window.currentAdmin存在:", !!window.currentAdmin);
  console.log("- window.currentAdmin:", window.currentAdmin);
  console.log("- window.currentAdmin.admin_id:", window.currentAdmin?.admin_id);
  console.log("- window.currentAdmin.event_id:", window.currentAdmin?.event_id);

  // 一時的なroleマッピング（テストユーザー用）
  let userRole = userData?.role || userData?.user_role;

  // テストユーザーのUID kF5eX2FYyBUpxeNxfo6Jvlya38P2 に一時的にuketuke権限を付与
  if (firebaseUser.uid === "kF5eX2FYyBUpxeNxfo6Jvlya38P2" && !userRole) {
    userRole = "uketuke";
    console.log("🔧 テストユーザーに一時的にuketuke権限を付与:", userRole);
  }

  // テストユーザーの場合、window.currentAdminから直接admin_idとevent_idを取得
  let inheritedAdminData = null;
  if (firebaseUser.uid === "kF5eX2FYyBUpxeNxfo6Jvlya38P2") {
    console.log("🔍 テストユーザー用: window.currentAdminをチェック中...");

    // 直接window.currentAdminを確認
    if (
      window.currentAdmin &&
      window.currentAdmin.admin_id &&
      window.currentAdmin.event_id
    ) {
      inheritedAdminData = {
        admin_id: window.currentAdmin.admin_id,
        event_id: window.currentAdmin.event_id,
        company_name: window.currentAdmin.company_name,
        project_name: window.currentAdmin.project_name,
        event_date: window.currentAdmin.event_date,
      };
      console.log(
        "✅ window.currentAdminから直接取得成功:",
        inheritedAdminData
      );
    } else {
      // フォールバック: URLパラメータまたは他の方法
      inheritedAdminData = getAvailableAdminData();
    }

    if (!inheritedAdminData) {
      console.warn("⚠️ 利用可能なadminデータが見つかりませんでした");
      // 管理者に確認を求める
      if (
        confirm(
          "受付機能を利用するために管理者の情報が必要です。\n\n管理画面(admin.html)を別タブで開いてログインしてからこのページを再読み込みしてください。\n\n今すぐ管理画面を開きますか？"
        )
      ) {
        window.open("admin.html", "_blank");
        return; // 初期化を中断
      } else {
        // ユーザーが拒否した場合は警告表示して継続
        console.warn("⚠️ adminデータなしで継続します（機能制限あり）");
      }
    } else {
      console.log(
        "✅ テストユーザー用adminデータ設定完了:",
        inheritedAdminData
      );
    }
  } // 受付権限チェック（uketukeまたはadminを許可、デバッグモード追加）
  const allowedRoles = ["uketuke", "admin"]; // 一時的にadminも許可

  if (!userData || !allowedRoles.includes(userRole)) {
    console.warn("受付権限なし:", userRole);

    // 適切なメッセージを表示
    if (userRole) {
      alert(
        `このページは受付担当者専用です。\n現在のロール: ${userRole}\n\nログイン画面に戻ります。`
      );
    } else {
      alert(
        `認証が必要です。roleが設定されていません。\n\nUID: ${firebaseUser.uid}\n\n管理者にお問い合わせください。`
      );
    }

    // auth.jsのgetRedirectUrlを使用して統一的にリダイレクト
    const redirectUrl =
      window.UserSession?.getRedirectUrl?.(userRole) || "index.html";
    console.log(
      `${userRole || "未認証"}ユーザーを${redirectUrl}にリダイレクト`
    );
    window.location.href = redirectUrl;
    return;
  }

  console.log("✅ 受付認証成功 - userRole:", userRole);

  // admin.jsと同様に、Firestoreから管理者データを直接取得
  let adminData = null;
  try {
    console.log("🔍 admin_settingsからデータ取得を試行中...");
    const adminDoc = await getDoc(doc(db, "admin_settings", firebaseUser.uid));
    if (adminDoc.exists()) {
      adminData = adminDoc.data();
      console.log("✅ admin_settingsからデータ取得成功:", adminData);
    } else {
      if (firebaseUser.uid === "kF5eX2FYyBUpxeNxfo6Jvlya38P2") {
        console.log(
          "ℹ️ テストユーザーのため admin_settingsスキップ（正常動作）"
        );
      } else {
        console.warn(
          "⚠️ admin_settingsにドキュメントが見つかりません:",
          firebaseUser.uid
        );
      }
    }
  } catch (error) {
    console.error("❌ admin_settingsデータ取得エラー:", error);
  }

  // currentAdminをFirebase Authデータ + admin_settingsデータ + 継承adminデータで設定
  currentAdmin = {
    // テストユーザーの場合は継承したadmin_idとevent_idを優先使用
    admin_id:
      firebaseUser.uid === "kF5eX2FYyBUpxeNxfo6Jvlya38P2" &&
        inheritedAdminData?.admin_id
        ? inheritedAdminData.admin_id
        : adminData?.admin_id || userData?.admin_id || firebaseUser.uid,

    user_name:
      adminData?.admin_name ||
      userData?.user_name ||
      userData?.user_id ||
      firebaseUser.uid,
    role: userRole, // 上で処理したuserRoleを使用
    uid: firebaseUser.uid,

    // テストユーザーの場合は継承したevent_idを優先使用
    event_id:
      firebaseUser.uid === "kF5eX2FYyBUpxeNxfo6Jvlya38P2" &&
        inheritedAdminData?.event_id
        ? inheritedAdminData.event_id
        : adminData?.event_id || userData?.event_id,

    // admin_settingsから取得したデータを優先的に使用
    ...(adminData && {
      admin_name: adminData.admin_name,
      company_name: adminData.company_name,
      email: adminData.email,
      phone: adminData.phone_number,
      project_name: adminData.project_name,
      event_date: adminData.event_date,
      status: adminData.status,
      plan_type: adminData.plan_type,
      is_active: adminData.is_active,
    }),

    // 継承したadminデータから追加情報を取得（テストユーザーの場合）
    ...(firebaseUser.uid === "kF5eX2FYyBUpxeNxfo6Jvlya38P2" &&
      inheritedAdminData && {
      ...(inheritedAdminData.company_name && {
        company_name: inheritedAdminData.company_name,
      }),
      ...(inheritedAdminData.project_name && {
        project_name: inheritedAdminData.project_name,
      }),
      ...(inheritedAdminData.event_date && {
        event_date: inheritedAdminData.event_date,
      }),
    }),

    // userDataからのフォールバック（admin_settingsが無い場合）
    ...(!adminData &&
      userData && {
      ...(userData.admin_name && { admin_name: userData.admin_name }),
      ...(userData.company_name && { company_name: userData.company_name }),
      ...(userData.email && { email: userData.email }),
      ...(userData.project_name && { project_name: userData.project_name }),
      ...(userData.event_date && { event_date: userData.event_date }),
    }),
  };
  window.currentAdmin = currentAdmin;

  console.log("🔍 currentAdmin設定完了:");
  console.log("- admin_id:", currentAdmin.admin_id);
  console.log("- event_id:", currentAdmin.event_id);
  console.log("- role:", currentAdmin.role);
  console.log("- user_name:", currentAdmin.user_name);
  console.log("- admin_settingsから取得:", !!adminData);
  console.log("- 継承adminデータから取得:", !!inheritedAdminData);

  console.log(
    "Admin別コレクションパス:",
    `admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id || "NO_EVENT_ID"
    }/`
  );

  // event_idが無い場合の警告とユーザーデータ読み込みスキップ
  if (!currentAdmin.event_id) {
    console.error(
      "❌ event_idが設定されていません。ユーザー一覧を表示できません。"
    );
    const container = document.getElementById("usersTableContainer");
    if (container) {
      container.innerHTML = `
        <div class="error">
          <h3>⚠️ イベント設定エラー</h3>
          <p>event_idが設定されていないため、ユーザー一覧を表示できません。</p>
          <p><strong>管理者情報:</strong></p>
          <ul style="text-align: left;">
            <li>UID: ${firebaseUser.uid}</li>
            <li>admin_id: ${currentAdmin.admin_id}</li>
            <li>event_id: ${currentAdmin.event_id || "未設定"}</li>
            <li>admin_settingsからデータ取得: ${!!adminData ? "成功" : "失敗"
        }</li>
          </ul>
          <p>管理者にadmin_settingsコレクションの設定をご確認ください。</p>
        </div>
      `;
    }

    // 検索機能とモーダルの設定は継続
    setupSearch();
    setupModal();
    console.log(
      "受付管理システム初期化完了（event_idエラーのため一部機能制限）"
    );
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

// ユーザー一覧の読み込み（admin.jsと同様のfetchロジックに更新）
async function loadUsersList() {
  const container = document.getElementById("usersTableContainer");

  try {
    container.innerHTML =
      '<div class="loading">ユーザー一覧を読み込み中...</div>';

    // currentAdminが設定されているかチェック
    if (!currentAdmin || !currentAdmin.admin_id || !currentAdmin.event_id) {
      throw new Error("管理者情報またはイベントIDが設定されていません");
    }

    // admin.jsと同様のadmin_collections構造でusersコレクションから取得
    const usersCollectionPath = `admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id}_users`;
    console.log("ユーザーコレクションパス:", usersCollectionPath);

    const usersQuery = query(
      collection(db, usersCollectionPath),
      where("user_role", "==", "user"), // user_roleでフィルタ
      orderBy("user_id")
    );

    const querySnapshot = await getDocs(usersQuery);

    if (querySnapshot.empty) {
      container.innerHTML = `
        <div class="error">
          <p>ユーザーが登録されていません。</p>
          <p style="font-size: 12px;">コレクションパス: ${usersCollectionPath}</p>
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
        <p style="font-size: 10px;">Admin ID: ${currentAdmin?.admin_id || "未設定"
      }</p>
        <p style="font-size: 10px;">Event ID: ${currentAdmin?.event_id || "未設定"
      }</p>
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
        <thead style="background-color: #007bff;">
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
            onclick="changeStatus('${userData.docId}', '${userData.user_name
      }', '入場中')"
            ${status === "入場中" ? "disabled" : ""}
          >
            入場
          </button>
          <button 
            class="action-btn btn-danger" 
            onclick="changeStatus('${userData.docId}', '${userData.user_name
      }', '退場済')"
            ${status === "退場済" ? "disabled" : ""}
          >
            退場
          </button>
          <button 
            class="action-btn btn-warning" 
            onclick="changePrintStatus('${userData.docId}', '${userData.user_name
      }', '済')"
            ${printStatus === "済" ? "disabled" : ""}
          >
            印刷済
          </button>
          <button 
            class="action-btn btn-secondary" 
            onclick="changePrintStatus('${userData.docId}', '${userData.user_name
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

// ステータス変更実行（admin.jsと同様のfetchロジックに更新）
async function executeStatusChange() {
  if (!currentAction) return;

  try {
    // currentAdminが設定されているかチェック
    if (!currentAdmin || !currentAdmin.admin_id || !currentAdmin.event_id) {
      throw new Error("管理者情報またはイベントIDが設定されていません");
    }

    // admin.jsと同様のadmin_collections構造でドキュメントを更新
    const usersCollectionPath = `admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id}_users`;
    const userRef = doc(db, usersCollectionPath, currentAction.docId);

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

    // 名札作成：ステータスが「入場中」になった場合
    if (currentAction.newValue === "入場中" && userIndex !== -1) {
      const userData = allUsers[userIndex];

      // 担当者メール送信
      await sendTantouNotification(userData);

      // 名札作成
      if (window.createNametag && typeof window.createNametag === "function") {
        // currentAdminデータも一緒に渡す
        window.createNametag(userData, currentAdmin);
      }
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

// 印刷ステータス変更実行（admin.jsと同様のfetchロジックに更新）
async function executePrintStatusChange() {
  if (!currentAction) return;

  try {
    // currentAdminが設定されているかチェック
    if (!currentAdmin || !currentAdmin.admin_id || !currentAdmin.event_id) {
      throw new Error("管理者情報またはイベントIDが設定されていません");
    }

    // admin.jsと同様のadmin_collections構造でドキュメントを更新
    const usersCollectionPath = `admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id}_users`;
    const userRef = doc(db, usersCollectionPath, currentAction.docId);

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

// ログアウト処理（Firebase Authベースに更新）
function handleLogout() {
  if (confirm("ログアウトしますか？")) {
    // レガシーlocalStorageデータを削除
    localStorage.removeItem("currentUser");
    localStorage.removeItem("firebaseSessionData");

    // Firebase Authからサインアウト
    const auth = getAuth();
    if (auth.currentUser) {
      auth
        .signOut()
        .then(() => {
          console.log("Firebase Authからサインアウト完了");
        })
        .catch((error) => {
          console.error("Firebase Authサインアウトエラー:", error);
        });
    }

    window.location.href = "superuser.html";
  }
}

// 担当者通知機能（Firebase Extensions版）
async function sendTantouNotification(userData) {
  try {
    console.log("=== 担当者通知処理開始（統合版） ===");
    console.log("来場者データ:", userData);

    const tantou = userData.tantou;
    if (!tantou) {
      console.log("担当者が設定されていません。通知送信をスキップします。");
      return;
    }

    // 管理者設定からスタッフ通知方法を確認
    let staffNotificationMethod = 'lineworks'; // デフォルト値

    try {
      if (window.getAdminSetting) {
        staffNotificationMethod = await window.getAdminSetting('staffNotification');
        console.log("スタッフ通知設定:", staffNotificationMethod);
      } else {
        console.warn('getAdminSetting関数が利用できません。デフォルト設定を使用します。');
      }
    } catch (settingError) {
      console.warn('設定取得エラー:', settingError);
      console.log('デフォルト設定（LINEWORKS）を使用します。');
    }

    console.log("担当者:", tantou);
    console.log(`通知方法: ${staffNotificationMethod}`);

    // 統合通知API呼び出し
    try {
      let requestBody = {
        userData: userData,
        notificationMethod: staffNotificationMethod
      };

      if (staffNotificationMethod === 'lineworks') {
        // LINEWORKS設定を管理者設定から取得
        let lineworksConfig = null;
        try {
          if (window.getAdminSetting) {
            const fullSettings = await window.getAdminSetting('lineworksSettings');
            if (fullSettings && fullSettings.apiId && fullSettings.botToken && fullSettings.channelId) {
              lineworksConfig = fullSettings;
              console.log("LINEWORKS設定を取得しました:", {
                apiId: lineworksConfig.apiId.substring(0, 8) + '...',
                channelId: lineworksConfig.channelId
              });
            }
          }
        } catch (settingError) {
          console.warn('LINEWORKS設定取得エラー:', settingError);
        }

        if (!lineworksConfig) {
          console.warn('LINEWORKS設定が未設定です。管理者設定で設定してください。');
          showSuccessMessage(
            `${userData.user_name}様の入場を記録しました。LINEWORKS設定が未設定のため通知を送信できませんでした。`
          );
          return;
        }

        requestBody.botToken = lineworksConfig.botToken;
        requestBody.channelId = lineworksConfig.channelId;
        requestBody.apiId = lineworksConfig.apiId;
        requestBody.accessToken = lineworksConfig.accessToken;

        console.log("LINEWORKS通知を送信します");
      } else if (staffNotificationMethod === 'mail') {
        // スタッフのメールアドレスを取得
        const staffEmail = await findStaffEmail(tantou);
        if (!staffEmail) {
          console.warn(`担当者「${tantou}」のメールアドレスが見つかりません。`);
          showSuccessMessage(
            `${userData.user_name}様の入場を記録しました。担当者「${tantou}」のメールアドレスが未設定です。`
          );
          return;
        }
        requestBody.emailTo = staffEmail;
        console.log("メール通知を送信します。宛先:", staffEmail);
      }

      const response = await fetch('https://sendunifiednotification-ijui6cxhzq-an.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ 通知送信成功:", result);
        console.log(`- 通知方法: ${result.method}`);
        console.log(`- 担当者: ${tantou}`);
        console.log(`- 来場者: ${userData.user_name || ""}`);

        // 成功メッセージを表示
        const methodText = staffNotificationMethod === 'lineworks' ? 'LINEWORKS' : 'メール';
        showSuccessMessage(
          `${userData.user_name}様の入場を記録し、担当者「${tantou}」に${methodText}通知を送信しました。`
        );
      } else {
        const errorData = await response.json().catch(() => null);
        throw new Error(`通知送信API エラー: ${response.status} - ${errorData?.details || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("通知送信エラー:", error);

      // フォールバック処理
      if (staffNotificationMethod === 'mail') {
        const staffEmail = await findStaffEmail(tantou);
        if (staffEmail) {
          // フォールバック: mailtoリンク生成
          const subject = "来場者到着通知";
          const body = `${userData.company_name || ""}の${userData.user_name || ""}様が来場しました。\n\n` +
            `詳細情報:\n` +
            `- ユーザーID: ${userData.user_id || ""}\n` +
            `- 会社名: ${userData.company_name || ""}\n` +
            `- 担当者: ${tantou}\n` +
            `- 入場時刻: ${new Date().toLocaleString("ja-JP")}\n\n` +
            `受付システムより自動送信`;

          const mailtoUrl = `mailto:${encodeURIComponent(staffEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          console.log("フォールバック: mailtoリンク生成", mailtoUrl);
        }
      }

      // エラーメッセージを表示
      showSuccessMessage(
        `${userData.user_name}様の入場を記録しました。通知の送信中にエラーが発生しました。`
      );
    }
  } catch (error) {
    console.error("担当者通知処理エラー:", error);
    // エラーが発生してもシステム全体は継続
    showSuccessMessage(
      `${userData.user_name}様の入場を記録しました。通知処理中にエラーが発生しました。`
    );
  }
}

// スタッフコレクションから担当者のメールアドレスを検索（Firebase Extensions対応版）
async function findStaffEmail(tantouName) {
  try {
    if (!currentAdmin || !currentAdmin.admin_id || !currentAdmin.event_id) {
      throw new Error("管理者情報が設定されていません");
    }

    // スタッフコレクションを検索
    const usersCollectionPath = `admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id}_users`;
    console.log("スタッフ検索パス:", usersCollectionPath);

    const staffQuery = query(
      collection(db, usersCollectionPath),
      where("user_role", "==", "staff"),
      where("tantou", "==", tantouName)
    );

    const querySnapshot = await getDocs(staffQuery);

    if (querySnapshot.empty) {
      // tantouフィールドでの検索で見つからない場合、user_nameでも検索
      const nameQuery = query(
        collection(db, usersCollectionPath),
        where("user_role", "==", "staff"),
        where("user_name", "==", tantouName)
      );

      const nameSnapshot = await getDocs(nameQuery);

      if (nameSnapshot.empty) {
        console.warn(
          `担当者「${tantouName}」がスタッフコレクションに見つかりません`
        );
        return null;
      }

      const staffDoc = nameSnapshot.docs[0];
      const staffData = staffDoc.data();
      console.log("担当者データ（user_name検索）:", staffData);
      return staffData.email || null;
    }

    const staffDoc = querySnapshot.docs[0];
    const staffData = staffDoc.data();
    console.log("担当者データ（tantou検索）:", staffData);
    return staffData.email || null;
  } catch (error) {
    console.error("スタッフメールアドレス検索エラー:", error);
    return null;
  }
}



// グローバル関数として公開
window.changeStatus = changeStatus;
window.changePrintStatus = changePrintStatus;
window.refreshUsersList = refreshUsersList;
window.exportUsersList = exportUsersList;
window.handleLogout = handleLogout;

console.log("Uketuke page functions loaded");
