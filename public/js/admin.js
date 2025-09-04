// Firebase Index Page Functions (Firebase Auth専用版)
import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import "./auth.js"; // UserSession機能を利用
import { initializeAdminModal } from "./admin-modal.js"; // モーダル・データ操作機能

// Firebase Auth認証チェック（admin.js専用）
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

// 初期認証チェック（Firebase Auth対応）
document.addEventListener("DOMContentLoaded", async function () {
  console.log("=== admin.js DOMContentLoaded ===");

  // 現在のページをチェック
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  console.log("現在のページ:", currentPage);

  // index.htmlの場合は認証処理をスキップ
  if (currentPage === "index.html") {
    console.log("index.htmlのため認証処理をスキップします");
    return;
  }

  console.log("=== admin.htmlページ読み込み (Firebase Auth版) ===");

  // Firebase Auth認証待機
  const firebaseUser = await waitForFirebaseAuth();

  if (!firebaseUser) {
    console.warn("Firebase Auth認証に失敗、ログイン画面にリダイレクト");
    window.location.href = "superuser.html";
    return;
  }

  // UserSessionの読み込み待機
  let retryCount = 0;
  const maxRetries = 20; // 最大2秒待機
  while (!window.UserSession && retryCount < maxRetries) {
    console.log(`UserSession読み込み待機中... (${retryCount + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 100));
    retryCount++;
  }

  if (!window.UserSession) {
    console.error("❌ UserSessionの読み込みに失敗しました");
    alert("システムの初期化に失敗しました。ページを再読み込みしてください。");
    return;
  }

  console.log("✅ UserSession読み込み完了");

  // ユーザー情報取得と管理者権限チェック
  let userData = null;
  if (window.UserSession && typeof window.UserSession.getCurrentUser === "function") {
    userData = await window.UserSession.getCurrentUser();
    console.log("Firebase Auth ユーザーデータ取得:", userData);
  } else {
    console.warn("❌ window.UserSession.getCurrentUserが利用できません");
    console.log("- window.UserSession存在:", !!window.UserSession);
    console.log("- UserSession.getCurrentUser存在:", typeof window.UserSession?.getCurrentUser);
  }

  // 管理者権限チェック（adminのみ許可）
  if (!userData || userData.role !== "admin") {
    console.warn("管理者権限なし:", userData?.role);

    // 適切なメッセージを表示
    if (userData?.role === "superuser") {
      alert("SuperUserは管理画面にアクセスできません。");
    } else if (userData?.role) {
      alert("管理者権限が必要です。");
    } else {
      alert("認証が必要です。");
    }

    // auth.jsのgetRedirectUrlを使用して統一的にリダイレクト
    const redirectUrl =
      window.UserSession?.getRedirectUrl?.(userData?.role) || "superuser.html";
    console.log(
      `${userData?.role || "未認証"}ユーザーを${redirectUrl}にリダイレクト`
    );
    window.location.href = redirectUrl;
    return;
  }

  console.log("✅ 管理者認証成功:", userData);

  // currentAdminをFirebase Authデータ（Firestore admin_settingsを含む）で設定
  currentAdmin = {
    admin_id: userData.admin_id || firebaseUser.uid, // Firestoreのadmin_idを優先、なければUID
    user_name: userData.user_name,
    role: userData.role,
    uid: firebaseUser.uid,
    // その他のFirestoreデータも含める
    ...(userData.admin_name && { admin_name: userData.admin_name }),
    ...(userData.company_name && { company_name: userData.company_name }),
    ...(userData.email && { email: userData.email }),
    ...(userData.project_name && { project_name: userData.project_name }),
    ...(userData.event_date && { event_date: userData.event_date }),
    ...(userData.event_id && { event_id: userData.event_id }), // event_id追加
  };
  window.currentAdmin = currentAdmin;

  // admin-modal.jsの初期化（currentCollectionTypeは初期値null）
  initializeAdminModal(db, currentAdmin, null);

  console.log(
    "Admin別コレクションパス:",
    `admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id || "NO_EVENT_ID"
    }/`
  );

  // デバッグ：admin_idとevent_idの詳細を表示
  console.log("🔍 currentAdmin.admin_id:", currentAdmin.admin_id);
  console.log("🔍 currentAdmin.event_id:", currentAdmin.event_id);
  console.log("🔍 userData.admin_id:", userData.admin_id);
  console.log("🔍 userData.event_id:", userData.event_id);
  console.log("🔍 firebaseUser.uid:", firebaseUser.uid);

  // ES6モジュール読み込み完了後に関数をグローバル登録
  setTimeout(() => {
    registerGlobalFunctions();
  }, 100);
});

// グローバル関数登録を行う関数
function registerGlobalFunctions() {
  console.log("=== グローバル関数登録開始 ===");

  // 関数の存在確認
  const functions = {
    getAllItems,
    getAllUsers,
    getAllStaff,
    getAllMaker,
    getAllScanItems,
    clearResults,
    callHelloWorld,
    uketukelogin,
    handleAdminLogout,
    checkAdminAuthentication,
    getAdminCollection,
    getAdminDoc
  };

  // 未定義関数をチェック
  for (const [name, func] of Object.entries(functions)) {
    if (typeof func === 'undefined') {
      console.error(`❌ 関数 ${name} が未定義です`);
    } else {
      console.log(`✅ 関数 ${name} が定義されています`);
    }
  }

  // グローバル関数として登録
  window.getAllItems = getAllItems;
  window.getAllUsers = getAllUsers;
  window.getAllStaff = getAllStaff;
  window.getAllMaker = getAllMaker;
  window.getAllScanItems = getAllScanItems;
  window.clearResults = clearResults;
  window.callHelloWorld = callHelloWorld;
  window.uketukelogin = uketukelogin;
  window.handleAdminLogout = handleAdminLogout;
  window.checkAdminAuthentication = checkAdminAuthentication;
  window.getAdminCollection = getAdminCollection;
  window.getAdminDoc = getAdminDoc;

  console.log("=== グローバル関数登録完了 ===");
  console.log("uketukelogin:", typeof window.uketukelogin);
  console.log("getAllUsers:", typeof window.getAllUsers);
}

// テンプレート・モーダル・アップロード機能をインポート
import "./template-utils.js";

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

// 現在のAdmin情報を管理
let currentAdmin = null;

// currentAdminをグローバルに公開
window.currentAdmin = currentAdmin;

// Admin認証チェック関数（Firebase Auth版）
async function checkAdminAuthentication() {
  console.log("=== Admin認証チェック開始 (Firebase Auth版) ===");

  const auth = getAuth();
  if (!auth.currentUser) {
    console.log("❌ Firebase Auth認証なし");
    return null;
  }

  // UserSessionから管理者情報取得
  let userData = null;
  if (window.UserSession && typeof UserSession.getCurrentUser === "function") {
    userData = await UserSession.getCurrentUser();
  }

  if (!userData || userData.role !== "admin") {
    console.log("❌ 管理者権限なし:", userData?.role);
    return null;
  }

  console.log("✅ Admin認証確認:", userData);

  // currentAdminデータを更新
  currentAdmin = {
    admin_id: userData.admin_id || auth.currentUser.uid, // Firestoreのadmin_idを優先、なければUID
    user_name: userData.user_name,
    role: userData.role,
    uid: auth.currentUser.uid,
    // その他のFirestoreデータも含める
    ...(userData.admin_name && { admin_name: userData.admin_name }),
    ...(userData.company_name && { company_name: userData.company_name }),
    ...(userData.email && { email: userData.email }),
    ...(userData.project_name && { project_name: userData.project_name }),
    ...(userData.event_date && { event_date: userData.event_date }),
    ...(userData.event_id && { event_id: userData.event_id }), // event_id追加
  };
  window.currentAdmin = currentAdmin;

  // admin-modal.jsの初期化（currentCollectionTypeは動的に更新される）
  initializeAdminModal(db, currentAdmin, null);

  // デバッグ：admin_idの詳細を表示
  console.log(
    "🔍 checkAdminAuth currentAdmin.admin_id:",
    currentAdmin.admin_id
  );
  console.log("🔍 checkAdminAuth userData.admin_id:", userData.admin_id);
  console.log("🔍 checkAdminAuth auth.currentUser.uid:", auth.currentUser.uid);

  return currentAdmin;
}

// Admin用ログアウト処理（Firebase Auth版）
async function handleAdminLogout() {
  const auth = getAuth();
  try {
    await auth.signOut();
    alert("ログアウトしました。");
    window.location.href = "index.html";
  } catch (error) {
    console.error("ログアウトエラー:", error);
    alert("ログアウト中にエラーが発生しました。");
  }
}

// グローバルスコープに即座に公開
window.handleAdminLogout = handleAdminLogout;

// Admin別コレクション参照を取得する関数（3層構造対応）
function getAdminCollection(collectionName) {
  if (!currentAdmin || !currentAdmin.admin_id || !currentAdmin.event_id) {
    const errorDetail = {
      hasCurrentAdmin: !!currentAdmin,
      hasAdminId: !!(currentAdmin && currentAdmin.admin_id),
      hasEventId: !!(currentAdmin && currentAdmin.event_id),
      currentAdmin: currentAdmin,
    };
    console.error("Admin認証またはevent_id が不足:", errorDetail);
    throw new Error(
      `Admin認証またはevent_id が必要です。admin_id: ${currentAdmin?.admin_id || "なし"
      }, event_id: ${currentAdmin?.event_id || "なし"}`
    );
  }

  // コレクション名の正規化（scanItems -> scanitemsなど）
  const collectionMapping = {
    'scanItems': 'scanitems',
    'items': 'items',
    'users': 'users'
  };

  const normalizedCollectionName = collectionMapping[collectionName] || collectionName;

  // 新しい構造: admin_collections/{admin_id}/{event_id}_{collectionName}
  const collectionKey = `${currentAdmin.event_id}_${normalizedCollectionName}`;
  const adminPath = `admin_collections/${currentAdmin.admin_id}/${collectionKey}`;
  console.log(`[DEBUG] Admin collection path (コレクション分離構造): ${adminPath}`);

  return collection(
    db,
    "admin_collections",
    currentAdmin.admin_id,
    collectionKey
  );
}

// Admin別ドキュメント参照を取得する関数（3層構造対応）
function getAdminDoc(collectionName, docId) {
  if (!currentAdmin || !currentAdmin.admin_id || !currentAdmin.event_id) {
    console.error("Admin認証またはevent_id が不足:", {
      hasCurrentAdmin: !!currentAdmin,
      hasAdminId: !!(currentAdmin && currentAdmin.admin_id),
      hasEventId: !!(currentAdmin && currentAdmin.event_id),
      currentAdmin: currentAdmin,
    });
    throw new Error(
      `Admin認証またはevent_id が必要です。admin_id: ${currentAdmin?.admin_id || "なし"
      }, event_id: ${currentAdmin?.event_id || "なし"}`
    );
  }

  return doc(
    db,
    "admin_collections",
    currentAdmin.admin_id,
    currentAdmin.event_id,
    collectionName,
    docId
  );
}


// ユーティリティ関数
function clearResults(elementId) {
  const element = document.getElementById(elementId);
  element.textContent = "";
  element.className = "result";
  element.style.display = "none";

}

// UUID生成関数
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Firestoreエラーメッセージからインデックス作成URLを抽出
function extractIndexUrl(errorMessage) {
  try {
    const urlMatch = errorMessage.match(
      /https:\/\/console\.firebase\.google\.com[^\s\)]+/
    );
    return urlMatch ? urlMatch[0] : null;
  } catch (e) {
    console.warn("インデックスURL抽出エラー:", e);
    return null;
  }
}



// ローディング表示関数
function showLoading(elementId) {
  const element = document.getElementById(elementId);
  element.innerHTML = '<div class="loading"></div> データを処理中...';
  element.className = "result";
  element.style.display = "block";
}

// 結果表示関数
function showResult(elementId, message, type) {
  const element = document.getElementById(elementId);
  element.innerHTML = message;
  element.className = `result ${type}`;
  element.style.display = "block";
}

// itemsコレクション一覧表示
async function getAllItems() {
  try {
    showLoading("firestoreResult");

    // 新しい構造: admin_collections/{admin_id}/{event_id}_items
    const adminCollection = getAdminCollection("items");

    const q = query(adminCollection, orderBy("item_no", "asc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showResult(
        "firestoreResult",
        `${currentAdmin.admin_id}の管理するアイテムデータがありません<br><small>📂 参照パス: admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id}_items/</small>`,
        "info"
      );
      console.log(`Admin ${currentAdmin.admin_id}: アイテムデータなし`);
      return;
    }

    console.log(
      `Admin ${currentAdmin.admin_id}: ${querySnapshot.size}件のアイテムデータを取得`
    );

    let html = "<table><thead><tr>";
    html +=
      "<th>item_no</th><th>category_name</th><th>company_name</th><th>item_name</th><th>maker_code</th><th>操作</th>";
    html += "</tr></thead><tbody>";
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const displayName = data.item_name || data.item_no || "無名アイテム";
      html += `<tr>
                <td>${data.item_no || ""}</td>
                <td>${data.category_name || ""}</td>
                <td>${data.company_name || ""}</td>
                <td>${data.item_name || ""}</td>
                <td>${data.maker_code || ""}</td>
                <td style="white-space: nowrap;">
                  <button class="action-button" onclick="editDocument('items', '${docId}', '${displayName}')" style="background:#4285f4; color:white; padding:5px 10px; margin-right:5px; font-size:12px;">編集</button>
                  <button class="delete-btn" onclick="deleteDocument('items', '${docId}', '${displayName}')">削除</button>
                </td>
              </tr>`;
    });
    html += "</tbody></table>";

    showResult("firestoreResult", html, "success");
    document.getElementById(
      "firestoreResult-collectionname"
    ).textContent = `itemsデータベース (admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id}_items/)`;
    document.getElementById(
      "firestoreResult-count"
    ).textContent = `${querySnapshot.size}件`;


    console.log("Items retrieved successfully");
  } catch (error) {
    console.error("getAllItems error:", error);

    // Firestoreインデックスエラーの場合は専用メッセージを表示
    if (
      error.code === "failed-precondition" &&
      error.message.includes("index")
    ) {
      const indexUrl = extractIndexUrl(error.message);
      const indexMessage = `
        <div style="background:#fff3cd; border:1px solid #ffeaa7; padding:15px; border-radius:5px; margin:10px 0;">
          <h4 style="color:#856404; margin-top:0;">⚡ 高速化のためのインデックス作成</h4>
          <p style="color:#856404; margin:5px 0;">
            データ量が多いため、高速表示にはFirestoreインデックスの作成が必要です。
          </p>
          <p style="color:#856404; margin:5px 0;">
            <strong>作成手順:</strong><br>
            1. 下記リンクをクリック<br>
            2. 「インデックスを作成」ボタンをクリック<br>
            3. 作成完了後（約1-2分）にページを再読み込み
          </p>
          ${indexUrl
          ? `<a href="${indexUrl}" target="_blank" style="background:#007bff; color:white; padding:10px 15px; text-decoration:none; border-radius:5px; display:inline-block; margin:10px 0;">📊 Firestoreインデックスを作成</a>`
          : ""
        }
          <br>
          <button onclick="location.reload()" style="background:#28a745; color:white; padding:8px 12px; border:none; border-radius:3px; margin:5px 0;">🔄 ページを再読み込み</button>
        </div>
      `;
      showResult("firestoreResult", indexMessage, "warning");
    } else {
      showResult("firestoreResult", `取得エラー: ${error.message}`, "error");
    }
  }
}

// usersコレクション一覧表示（user_role: "user"のみ）
async function getAllUsers() {
  try {
    showLoading("firestoreResult");

    // 新しい構造: admin_collections/{admin_id}/{event_id}_users
    const adminCollection = getAdminCollection("users");

    // user_role が "user" のドキュメントのみを取得
    const q = query(
      adminCollection,
      where("user_role", "==", "user"),
      orderBy("user_id", "asc")
    );
    const querySnapshot = await getDocs(q);

    const usersQueryPath = `admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id}_users`;
    console.log(
      `[DEBUG] Query result from ${usersQueryPath}: ${querySnapshot.size} documents`
    );

    if (querySnapshot.empty) {
      showResult(
        "firestoreResult",
        `${currentAdmin.admin_id}の管理するユーザーデータがありません<br><small>📂 参照パス: ${usersQueryPath} (user_role="user")</small>`,
        "info"
      );
      console.log(`Admin ${currentAdmin.admin_id}: ユーザーデータなし`);
      return;
    }

    console.log(
      `Admin ${currentAdmin.admin_id}: ${querySnapshot.size}件のユーザーデータを取得`
    );

    // クライアント側でソート
    const sortedDocs = querySnapshot.docs.sort((a, b) => {
      const aUserId = String(a.data().user_id || "").toLowerCase();
      const bUserId = String(b.data().user_id || "").toLowerCase();
      return aUserId.localeCompare(bUserId);
    });

    let html = "<table><thead><tr>";
    html +=
      "<th>user_id</th><th>company_name</th><th>user_name</th><th>email</th><th>phone</th><th>status</th><th>user_role</th><th>print_status</th><th>操作</th>";
    html += "</tr></thead><tbody>";
    sortedDocs.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const displayName = data.user_name || data.user_id || "無名ユーザー";
      html += `<tr>
                <td>${data.user_id || ""}</td>
                <td>${data.company_name || ""}</td>
                <td>${data.user_name || ""}</td>
                <td>${data.email || ""}</td>
                <td>${data.phone || ""}</td>
                <td>${data.status || ""}</td>
                <td>${data.user_role || ""}</td>
                <td>${data.print_status || ""}</td>
                <td style="white-space: nowrap;">
                  <button class="action-button" onclick="editDocument('users', '${docId}', '${displayName}')" style="background:#34a853; color:white; padding:5px 10px; margin-right:5px; font-size:12px;">編集</button>
                  <button class="delete-btn" onclick="deleteDocument('users', '${docId}', '${displayName}')">削除</button>
                </td>
              </tr>`;
    });
    html += "</tbody></table>";

    showResult("firestoreResult", html, "success");
    document.getElementById(
      "firestoreResult-collectionname"
    ).textContent = `usersデータベース (${usersQueryPath})`;
    document.getElementById(
      "firestoreResult-count"
    ).textContent = `${sortedDocs.length}件`;



    console.log("Users retrieved successfully");
  } catch (error) {
    console.error("getAllUsers error:", error);
    showResult("firestoreResult", `取得エラー: ${error.message}`, "error");
  }
}

// Admin別scanItemsコレクション一覧表示
async function getAllScanItems() {
  try {
    showLoading("firestoreResult");

    // 新しい構造: admin_collections/{admin_id}/{event_id}_scanitems
    const adminCollection = getAdminCollection("scanItems");

    // scanItemsデータを取得（非正規化データなので1クエリで関連情報も含む）
    const q = query(adminCollection, orderBy("scan_time", "desc"));
    const querySnapshot = await getDocs(q);

    // _initドキュメントは除外
    const filteredDocs = querySnapshot.docs.filter(
      (doc) => !doc.id.startsWith("_")
    );

    if (filteredDocs.length === 0) {
      showResult(
        "firestoreResult",
        `${currentAdmin.admin_id}の管理するスキャンデータがありません<br><small>📂 参照パス: admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id}_scanitems/</small>`,
        "info"
      );
      console.log(`Admin ${currentAdmin.admin_id}: スキャンデータなし`);
      return;
    }

    let html = "<table><thead><tr>";
    html +=
      "<th>user_id</th><th>会社名</th><th>氏名</th><th>No</th><th>商品名</th><th>役割</th><th>スキャナー</th><th>操作</th>";
    html += "</tr></thead><tbody>";

    filteredDocs.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const timestamp = data.timestamp || data.createdAt;
      const timeStr = timestamp
        ? new Date(
          timestamp.seconds ? timestamp.toDate() : timestamp
        ).toLocaleString("ja-JP")
        : "不明";
      const content = data.content || "データなし";
      const userName = data.user_name || data.user_id || "不明";
      const role = data.role || "不明";
      const userid = data.user_id || "不明";
      const itemname = data.item_name || "不明";
      const company = data.company_name || "不明";
      const scannerMode = data.scannerMode || "不明";

      html += `<tr>
                <td>${userid}</td>
                <td>${company}</td>
                <td>${userName}</td>
                <td>${content}</td>
                <td>${itemname}</td>
                <td>${role}</td>
                <td>${scannerMode}</td>
                <td style="white-space: nowrap;">
                  <button class="delete-btn" onclick="deleteDocument('scanItems', '${docId}', '${content.substring(
        0,
        20
      )}...')">削除</button>
                </td>
              </tr>`;
    });
    html += "</tbody></table>";

    showResult("firestoreResult", html, "success");
    document.getElementById(
      "firestoreResult-collectionname"
    ).textContent = `scanItemsデータベース (admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id}_scanitems/)`;
    document.getElementById(
      "firestoreResult-count"
    ).textContent = `${filteredDocs.length}件`;

    console.log("Scan items retrieved successfully");
  } catch (error) {
    console.error("getAllScanItems error:", error);
    showResult("firestoreResult", `取得エラー: ${error.message}`, "error");
  }
}

// Admin別staffコレクション一覧表示（usersコレクションのuser_role: "staff"のみ）
async function getAllStaff() {
  try {
    showLoading("firestoreResult");

    // 新しい構造: admin_collections/{admin_id}/{event_id}_users
    const adminCollection = getAdminCollection("users");

    // user_role が "staff" または "uketuke" のドキュメントを取得
    const q = query(
      adminCollection,
      where("user_role", "in", ["staff", "uketuke"]),
      orderBy("user_id", "asc")
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showResult(
        "firestoreResult",
        `${currentAdmin.admin_id}の管理するスタッフデータがありません<br><small>📂 参照パス: admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id}_users/ (user_role="staff" or "uketuke")</small>`,
        "info"
      );
      console.log(`Admin ${currentAdmin.admin_id}: スタッフデータなし`);
      return;
    }

    // クライアント側でソート
    const sortedDocs = querySnapshot.docs.sort((a, b) => {
      const aUserId = String(a.data().user_id || "").toLowerCase();
      const bUserId = String(b.data().user_id || "").toLowerCase();
      return aUserId.localeCompare(bUserId);
    });

    let html = "<table><thead><tr>";
    html +=
      "<th>user_id</th><th>user_name</th><th>email</th><th>phone</th><th>company_name</th><th>status</th><th>user_role</th><th>print_status</th><th>操作</th>";
    html += "</tr></thead><tbody>";

    sortedDocs.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const displayName = data.user_name || data.user_id || "無名スタッフ";
      html += `<tr>
                <td>${data.user_id || ""}</td>
                <td>${data.user_name || ""}</td>
                <td>${data.email || ""}</td>
                <td>${data.phone || ""}</td>
                <td>${data.company_name || ""}</td>
                <td>${data.status || ""}</td>
                <td>${data.user_role || ""}</td>
                <td>${data.print_status || ""}</td>
                <td style="white-space: nowrap;">
                  <button class="action-button" onclick="editDocument('users', '${docId}', '${displayName}')" style="background:#34a853; color:white; padding:5px 10px; margin-right:5px; font-size:12px;">編集</button>
                  <button class="delete-btn" onclick="deleteDocument('users', '${docId}', '${displayName}')">削除</button>
                </td>
              </tr>`;
    });
    html += "</tbody></table>";

    showResult("firestoreResult", html, "success");
    document.getElementById(
      "firestoreResult-collectionname"
    ).textContent = `スタッフ・受付データベース (admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id}/)`;
    document.getElementById(
      "firestoreResult-count"
    ).textContent = `${sortedDocs.length}件`;

    console.log("Staff retrieved successfully");
  } catch (error) {
    console.error("getAllStaff error:", error);
    showResult("firestoreResult", `取得エラー: ${error.message}`, "error");
  }
}

// Admin別makerコレクション一覧表示（usersコレクションのuser_role: "maker"のみ）
async function getAllMaker() {
  try {
    showLoading("firestoreResult");

    // 新しい構造: admin_collections/{admin_id}/{event_id}_users
    const adminCollection = getAdminCollection("users");

    // user_role が "maker" のドキュメントのみを取得
    const q = query(
      adminCollection,
      where("user_role", "==", "maker"),
      orderBy("user_id", "asc")
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showResult(
        "firestoreResult",
        `${currentAdmin.admin_id}の管理するメーカーデータがありません<br><small>📂 参照パス: admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id}_users/ (user_role="maker")</small>`,
        "info"
      );
      console.log(`Admin ${currentAdmin.admin_id}: メーカーデータなし`);
      return;
    }

    // クライアント側でソート
    const sortedDocs = querySnapshot.docs.sort((a, b) => {
      const aUserId = String(a.data().user_id || "").toLowerCase();
      const bUserId = String(b.data().user_id || "").toLowerCase();
      return aUserId.localeCompare(bUserId);
    });

    let html = "<table><thead><tr>";
    html +=
      "<th>user_id</th><th>user_name</th><th>email</th><th>phone</th><th>company_name</th><th>status</th><th>user_role</th><th>print_status</th><th>操作</th>";
    html += "</tr></thead><tbody>";

    sortedDocs.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const displayName = data.user_name || data.user_id || "無名メーカー";
      html += `<tr>
                <td>${data.user_id || ""}</td>
                <td>${data.user_name || ""}</td>
                <td>${data.email || ""}</td>
                <td>${data.phone || ""}</td>
                <td>${data.company_name || ""}</td>
                <td>${data.status || ""}</td>
                <td>${data.user_role || ""}</td>
                <td>${data.print_status || ""}</td>
                <td style="white-space: nowrap;">
                  <button class="action-button" onclick="editDocument('users', '${docId}', '${displayName}')" style="background:#ff9800; color:white; padding:5px 10px; margin-right:5px; font-size:12px;">編集</button>
                  <button class="delete-btn" onclick="deleteDocument('users', '${docId}', '${displayName}')">削除</button>
                </td>
              </tr>`;
    });
    html += "</tbody></table>";

    showResult("firestoreResult", html, "success");
    document.getElementById(
      "firestoreResult-collectionname"
    ).textContent = `メーカーコレクション (admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id}/)`;
    document.getElementById(
      "firestoreResult-count"
    ).textContent = `${sortedDocs.length}件`;

    console.log("Maker retrieved successfully");
  } catch (error) {
    console.error("getAllMaker error:", error);
    showResult("firestoreResult", `取得エラー: ${error.message}`, "error");
  }
}

// Cloud Functions呼び出し
async function callHelloWorld() {
  try {
    showLoading("functionResult");
    const response = await fetch(
      "https://asia-northeast1-qrscan2-99ffd.cloudfunctions.net/helloWorld"
    );
    const result = await response.text();
    showResult("functionResult", result, "success");
  } catch (error) {
    showResult("functionResult", `エラー: ${error.message}`, "error");
  }
}

// 受付ユーザーテストログイン機能
async function uketukelogin() {
  try {
    console.log("=== 受付ユーザーテストログイン開始 ===");

    // 現在の管理者情報を確認
    if (!currentAdmin || !currentAdmin.admin_id || !currentAdmin.event_id) {
      alert("管理者情報が不足しています。画面を再読み込みしてください。");
      return;
    }

    console.log("現在の管理者:", currentAdmin);

    // 受付ユーザー情報を設定
    const testUketukeUser = {
      email: `uketuke-test-${currentAdmin.admin_id}@example.com`,
      password: "uketuke123", // テスト用固定パスワード
      user_id: `uketuke_test_${Date.now()}`, // 一意のユーザーID
      user_name: "受付テストユーザー",
      user_role: "uketuke",
      admin_id: currentAdmin.admin_id,
      event_id: currentAdmin.event_id,
    };

    console.log("作成する受付ユーザー:", testUketukeUser);

    const auth = getAuth();
    const db = getFirestore();

    // Firebase Authでテストユーザーを作成または既存ユーザーでサインイン
    let userCredential;
    try {
      // まずはサインインを試行
      userCredential = await signInWithEmailAndPassword(
        auth,
        testUketukeUser.email,
        testUketukeUser.password
      );
      console.log("既存の受付ユーザーでサインイン成功:", userCredential.user.uid);
    } catch (error) {
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        // ユーザーが存在しない場合は新規作成
        console.log("受付ユーザーが存在しないため新規作成します");
        userCredential = await createUserWithEmailAndPassword(
          auth,
          testUketukeUser.email,
          testUketukeUser.password
        );
        console.log("受付ユーザー新規作成成功:", userCredential.user.uid);
      } else {
        throw error; // その他のエラーは再スロー
      }
    }

    // Firestoreの新しい構造に受付ユーザーデータを保存
    // admin_collections/{admin_id}/{event_id}_users/{user_id}
    const userDocPath = `admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id}_users/${userCredential.user.uid}`;

    const userData = {
      uid: userCredential.user.uid,
      user_id: testUketukeUser.user_id,
      user_name: testUketukeUser.user_name,
      user_role: testUketukeUser.user_role,
      email: testUketukeUser.email,
      admin_id: currentAdmin.admin_id,
      event_id: currentAdmin.event_id,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      // 受付ユーザー特有の情報
      is_test_user: true,
      login_status: "active",
    };

    await setDoc(doc(db, userDocPath), userData);
    console.log("受付ユーザーデータをFirestoreに保存:", userDocPath);

    // 成功メッセージとリダイレクト確認
    const confirmRedirect = confirm(
      `受付ユーザーテストログインが完了しました！\n\n` +
      `ユーザー名: ${testUketukeUser.user_name}\n` +
      `役割: ${testUketukeUser.user_role}\n` +
      `UID: ${userCredential.user.uid}\n\n` +
      `uketuke.htmlにリダイレクトしますか？`
    );

    if (confirmRedirect) {
      console.log("uketuke.htmlにリダイレクトします");
      window.location.href = "uketuke.html";
    } else {
      console.log("リダイレクトをキャンセルしました");
      alert("受付ユーザーでログイン済みです。手動でuketuke.htmlにアクセスできます。");
    }

  } catch (error) {
    console.error("受付ユーザーログインエラー:", error);

    let errorMessage = "受付ユーザーログインに失敗しました。";
    if (error.code === "auth/email-already-in-use") {
      errorMessage = "このメールアドレスは既に使用されています。";
    } else if (error.code === "auth/weak-password") {
      errorMessage = "パスワードが弱すぎます。";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "無効なメールアドレスです。";
    }

    alert(errorMessage + "\n\n詳細: " + error.message);
  }
}

// ログアウト関数を即座に公開（ES6モジュール対応）
if (typeof window !== "undefined") {
  window.handleAdminLogout = handleAdminLogout;
  console.log("handleAdminLogout関数をグローバルスコープに公開しました");
}
