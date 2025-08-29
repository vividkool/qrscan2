// Firebase Index Page Functions (Admin別データ管理版)
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function () {
  const auth = getAuth();
  if (!auth.currentUser) {
    window.location.href = "./login.html";
  }
});

import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  where,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Admin認証チェック関数
function checkAdminAuthentication() {
  console.log("=== Admin認証チェック開始 ===");
  console.log("localStorage全体:", { ...localStorage });

  const adminData = localStorage.getItem("currentAdmin");
  console.log("取得したcurrentAdmin:", adminData);

  if (!adminData) {
    console.log("❌ Admin認証情報がありません");
    console.log("localStorage.length:", localStorage.length);
    console.log("利用可能なキー:", Object.keys(localStorage));
    /*
    // デバッグのため3秒待機
    setTimeout(() => {
      alert("管理者認証が必要です。ログイン画面に移動します。");
      window.location.href = "./index.html";
    }, 3000);
    */
    return null;
  }

  try {
    currentAdmin = JSON.parse(adminData);
    window.currentAdmin = currentAdmin; // グローバルに公開
    console.log("✅ Admin認証確認:", currentAdmin);

    if (!currentAdmin.admin_id) {
      alert("認証データが不正です。ログイン画面に戻ります。");
      localStorage.removeItem("currentAdmin");
      window.location.href = "./login.html";
      return null;
    }
    if (currentAdmin.role === "user") {
      alert("ユーザー権限で管理画面にアクセスしたため、ユーザーページに移動します。");
      window.location.href = `./user.html?admin_id=${currentAdmin.admin_id}&user_id=${currentAdmin.user_id}`;
      return null;
    }
    if (currentAdmin.role !== "admin") {
      alert("権限が不正です。ログイン画面に戻ります。");
      localStorage.removeItem("currentAdmin");
      window.location.href = "./login.html";
      return null;
    }
    return currentAdmin;
  } catch (error) {
    console.error("❌ Admin認証データが破損しています:", error);
    alert("認証データが破損しています。再ログインしてください。");
    localStorage.removeItem("currentAdmin");
    window.location.href = "./login.html";
    return null;
  }
}

// Admin用ログアウト処理
function handleAdminLogout() {
  localStorage.removeItem("currentAdmin");
  alert("ログアウトしました。");
  window.location.href = "./index.html";
}

// Admin別コレクション参照を取得する関数
function getAdminCollection(collectionName) {
  if (!currentAdmin || !currentAdmin.admin_id) {
    throw new Error("Admin認証が必要です");
  }

  const adminPath = `admin_collections/${currentAdmin.admin_id}/${collectionName}`;
  console.log(`[DEBUG] Admin collection path: ${adminPath}`);

  return collection(
    db,
    "admin_collections",
    currentAdmin.admin_id,
    collectionName
  );
}

// Admin別ドキュメント参照を取得する関数
function getAdminDoc(collectionName, docId) {
  if (!currentAdmin || !currentAdmin.admin_id) {
    throw new Error("Admin認証が必要です");
  }

  return doc(
    db,
    "admin_collections",
    currentAdmin.admin_id,
    collectionName,
    docId
  );
}

// ページ読み込み時の処理
document.addEventListener("DOMContentLoaded", function () {
  console.log("=== admin.htmlページ読み込み (Admin別データ管理版) ===");
  console.log("現在のURL:", window.location.href);
  console.log("読み込み時のlocalStorage:", { ...localStorage });

  // Admin認証チェック（古いセッションクリア前）
  const admin = checkAdminAuthentication();
  if (!admin) {
    return; // 認証失敗時はリダイレクト済み
  }

  console.log("✅ Admin認証成功:", admin);

  // Admin認証が成功した場合のみ、古いセッションをクリア
  if (localStorage.getItem("currentUser")) {
    console.log("🧹 古いcurrentUserセッションをクリアします");
    localStorage.removeItem("currentUser");
  }
  if (localStorage.getItem("qrscan_user_session")) {
    console.log("🧹 古いqrscan_user_sessionをクリアします");
    localStorage.removeItem("qrscan_user_session");
  }

  console.log("認証済みAdmin:", admin);

  console.log(
    "Admin別コレクションパス:",
    `admin_collections/${admin.admin_id}/`
  );
  console.log("クリア後のlocalStorage:", { ...localStorage });
  console.log("================================");

  // レガシーセッションシステムは無効化
  // UserSessionやauth.jsの機能は使用しない

  // auth.jsの自動認証チェックを無効化
  window.isRedirecting = true; // リダイレクトフラグでauth.jsをブロック

});

// 現在表示中のコレクション状態を管理
let currentCollectionType = null;

// ユーティリティ関数
function clearResults(elementId) {
  const element = document.getElementById(elementId);
  element.textContent = "";
  element.className = "result";
  element.style.display = "none";

  // Firestoreの結果をクリアする場合は追加ボタンも非表示
  if (elementId === "firestoreResult") {
    updateAddButton(null);
  }
}

// UUID生成関数
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}



// 追加ボタンの表示/非表示制御
function updateAddButton(collectionType) {
  currentCollectionType = collectionType;
  const addButton = document.getElementById("addDataButton");

  if (collectionType) {
    addButton.style.display = "block";
    let buttonText;
    if (collectionType === "items") {
      buttonText = "➕ アイテム追加";
    } else if (collectionType === "users") {
      buttonText = "➕ ユーザー追加";
    } else if (collectionType === "staff") {
      buttonText = "➕ スタッフ追加";
    } else if (collectionType === "maker") {
      buttonText = "➕ メーカー追加";
    } else {
      buttonText = "➕ データ追加";
    }
    addButton.innerHTML = buttonText;
  } else {
    addButton.style.display = "none";
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

    // Admin別のitemsコレクションからデータ取得
    const adminItemsCollection = getAdminCollection("items");
    const q = query(adminItemsCollection, orderBy("item_no", "asc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showResult(
        "firestoreResult",
        `${currentAdmin.admin_id}の管理するアイテムデータがありません`,
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
    document.getElementById("firestoreResult-collectionname").textContent =
      "itemsデータベース";
    document.getElementById(
      "firestoreResult-count"
    ).textContent = `${querySnapshot.size}件`;

    // 追加ボタンを更新
    updateAddButton("items");
    console.log("Items retrieved successfully");
  } catch (error) {
    console.error("getAllItems error:", error);
    showResult("firestoreResult", `取得エラー: ${error.message}`, "error");
  }
}

// usersコレクション一覧表示（user_role: "user"のみ）
async function getAllUsers() {
  try {
    showLoading("firestoreResult");

    // Admin別のusersコレクションからデータ取得
    const adminUsersCollection = getAdminCollection("users");
    const usersQueryPath = `admin_collections/${currentAdmin.admin_id}/users`;
    console.log(`[DEBUG] Querying path: ${usersQueryPath}`);

    const q = query(adminUsersCollection, where("user_role", "==", "user"));
    const querySnapshot = await getDocs(q);

    console.log(
      `[DEBUG] Query result from ${usersQueryPath}: ${querySnapshot.size} documents`
    );

    if (querySnapshot.empty) {
      showResult(
        "firestoreResult",
        `${currentAdmin.admin_id}の管理するユーザーデータがありません<br><small>📂 参照パス: ${usersQueryPath}</small>`,
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
    const usersAdminPath = `admin_collections/${currentAdmin.admin_id}/users`;
    document.getElementById(
      "firestoreResult-collectionname"
    ).textContent = `usersデータベース (${usersAdminPath})`;
    document.getElementById(
      "firestoreResult-count"
    ).textContent = `${sortedDocs.length}件`;

    // 追加ボタンを更新
    updateAddButton("users");

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

    // Admin別のscanItemsコレクションからデータ取得
    const adminScanItemsCollection = getAdminCollection("scanItems");
    const q = query(adminScanItemsCollection, orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showResult(
        "firestoreResult",
        `${currentAdmin.admin_id}の管理するスキャンデータがありません`,
        "info"
      );
      console.log(`Admin ${currentAdmin.admin_id}: スキャンデータなし`);
      return;
    }

    let html = "<table><thead><tr>";
    html +=
      "<th>user_id</th><th>会社名</th><th>氏名</th><th>No</th><th>商品名</th><th>役割</th><th>スキャナー</th><th>操作</th>";
    html += "</tr></thead><tbody>";

    querySnapshot.forEach((docSnap) => {
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
    updateAddButton(null); // scanItemsには追加ボタンは不要
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

    // Admin別のusersコレクションからstaffデータ取得
    const adminUsersCollection = getAdminCollection("users");
    const q = query(adminUsersCollection, where("user_role", "==", "staff"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showResult(
        "firestoreResult",
        `${currentAdmin.admin_id}の管理するスタッフデータがありません`,
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
    document.getElementById("firestoreResult-collectionname").textContent =
      "スタッフデータベース";
    document.getElementById(
      "firestoreResult-count"
    ).textContent = `${sortedDocs.length}件`;

    // 追加ボタンを更新（スタッフ用のボタンテキストにするため"staff"を設定）
    updateAddButton("staff");

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

    // Admin別のusersコレクションからmakerデータ取得
    const adminUsersCollection = getAdminCollection("users");
    const q = query(adminUsersCollection, where("user_role", "==", "maker"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showResult(
        "firestoreResult",
        `${currentAdmin.admin_id}の管理するメーカーデータがありません`,
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
    document.getElementById("firestoreResult-collectionname").textContent =
      "メーカーコレクション";
    document.getElementById(
      "firestoreResult-count"
    ).textContent = `${sortedDocs.length}件`;

    // 追加ボタンを更新（メーカー用のボタンテキストにするため"maker"を設定）
    updateAddButton("maker");

    console.log("Maker retrieved successfully");
  } catch (error) {
    console.error("getAllMaker error:", error);
    showResult("firestoreResult", `取得エラー: ${error.message}`, "error");
  }
}

// Firestore関数
async function addDocument() {
  const documentId = document.getElementById("documentId").value;
  const title = document.getElementById("dataTitle").value;
  const content = document.getElementById("dataContent").value;

  if (!title || !content) {
    showResult("firestoreResult", "タイトルと内容を入力してください", "error");
    return;
  }

  try {
    showLoading("firestoreResult");
    let docRef;

    const documentData = {
      title: title,
      content: content,
      createdAt: new Date(),
    };

    if (documentId) {
      // IDを指定してドキュメントを作成
      docRef = doc(db, "test", documentId);
      await setDoc(docRef, documentData);
    } else {
      // 自動生成IDでドキュメントを作成
      docRef = await addDoc(collection(db, "test"), documentData);
    }

    showResult(
      "firestoreResult",
      `ドキュメントが追加されました。ID: ${docRef.id}`,
      "success"
    );
    document.getElementById("documentId").value = "";
    document.getElementById("dataTitle").value = "";
    document.getElementById("dataContent").value = "";
  } catch (error) {
    showResult("firestoreResult", `エラー: ${error.message}`, "error");
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

// ドキュメント削除関数
async function deleteDocument(collectionName, docId, displayName) {
  if (
    !confirm(`「${displayName}」を削除しますか？\n\nこの操作は取り消せません。`)
  ) {
    return;
  }

  try {
    showLoading("firestoreResult");

    // Firestoreからドキュメントを削除
    await deleteDoc(doc(db, collectionName, docId));

    showResult(
      "firestoreResult",
      `「${displayName}」を削除しました。`,
      "success"
    );

    console.log(
      `Document deleted: ${collectionName}/${docId} (${displayName})`
    );

    // 削除後に適切なコレクション一覧を自動再表示
    setTimeout(() => {
      switch (collectionName) {
        case "items":
          getAllItems();
          break;
        case "users":
          // 現在のコレクションタイプによって表示を分ける
          if (currentCollectionType === "staff") {
            getAllStaff();
          } else if (currentCollectionType === "maker") {
            getAllMaker();
          } else {
            getAllUsers();
          }
          break;
        case "staff":
          getAllStaff();
          break;
        case "scanItems":
          getAllScanItems();
          break;
        default:
          console.warn(`Unknown collection name: ${collectionName}`);
      }
    }, 1000); // 1秒後に再表示（結果メッセージを表示する時間を確保）
  } catch (error) {
    console.error("削除エラー:", error);
    showResult("firestoreResult", `削除エラー: ${error.message}`, "error");
  }
}

// 現在のコレクションにデータを追加する関数
function addToCurrentCollection() {
  if (currentCollectionType && currentCollectionType !== "scanItems") {
    openAddDataModal(currentCollectionType);
  } else {
    showResult(
      "firestoreResult",
      "追加可能なコレクションが選択されていません",
      "error"
    );
  }
}

// モーダルを開く関数
function openAddDataModal(collectionType) {
  const modal = document.getElementById("addDataModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalForm = document.getElementById("modalForm");
  const submitBtn = document.getElementById("submitDataBtn");

  // モーダルタイトルを設定
  if (collectionType === "items") {
    modalTitle.textContent = "アイテム追加";
  } else if (collectionType === "users") {
    modalTitle.textContent = "ユーザー追加";
  } else if (collectionType === "staff") {
    modalTitle.textContent = "スタッフ追加";
  } else if (collectionType === "maker") {
    modalTitle.textContent = "メーカー追加";
  }

  // フォームフィールドを動的生成
  modalForm.innerHTML = generateFormFields(collectionType);

  // 追加モード用にボタンを設定
  if (submitBtn) {
    submitBtn.textContent = "追加";
    submitBtn.onclick = submitAddData;
  }

  // モーダルを表示
  modal.style.display = "block";
}

// フォームフィールドを生成する関数
function generateFormFields(collectionType) {
  let fields = "";

  if (collectionType === "items") {
    fields = `
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">アイテム番号 <span style="color:red;">*</span></label>
        <input type="text" id="modal_item_no" required style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">カテゴリ名</label>
        <input type="text" id="modal_category_name" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">会社名</label>
        <input type="text" id="modal_company_name" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">アイテム名 <span style="color:red;">*</span></label>
        <input type="text" id="modal_item_name" required style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">メーカーコード</label>
        <input type="text" id="modal_maker_code" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
      </div>
    `;
  } else if (collectionType === "users") {
    fields = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザーID <span style="color:red;">*</span></label>
          <input type="text" id="modal_user_id" required style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザー名 <span style="color:red;">*</span></label>
          <input type="text" id="modal_user_name" required style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">メールアドレス</label>
          <input type="email" id="modal_email" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">電話番号</label>
          <input type="tel" id="modal_phone" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">会社名</label>
          <input type="text" id="modal_company_name" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ステータス</label>
          <select id="modal_status" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="-">-</option>
            <option value="入場中">入場中</option>
            <option value="退場済">退場済</option>
          </select>
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザー権限</label>
          <select id="modal_user_role" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">印刷ステータス</label>
          <select id="modal_print_status" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="not_printed">未印刷</option>
            <option value="printed">印刷済み</option>
          </select>
        </div>
      </div>
    `;
  } else if (collectionType === "staff") {
    fields = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザーID <span style="color:red;">*</span></label>
          <input type="text" id="modal_user_id" required style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザー名 <span style="color:red;">*</span></label>
          <input type="text" id="modal_user_name" required style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">メールアドレス</label>
          <input type="email" id="modal_email" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">電話番号</label>
          <input type="tel" id="modal_phone" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">会社名</label>
          <input type="text" id="modal_company_name" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ステータス</label>
          <select id="modal_status" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="-">-</option>
            <option value="入場中">入場中</option>
            <option value="退場済">退場済</option>
          </select>
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザー権限</label>
          <select id="modal_user_role" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="staff" selected>Staff</option>
          </select>
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">印刷ステータス</label>
          <select id="modal_print_status" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="not_printed">未印刷</option>
            <option value="printed">印刷済み</option>
          </select>
        </div>
      </div>
    `;
  } else if (collectionType === "maker") {
    fields = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザーID <span style="color:red;">*</span></label>
          <input type="text" id="modal_user_id" required style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザー名 <span style="color:red;">*</span></label>
          <input type="text" id="modal_user_name" required style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">メールアドレス</label>
          <input type="email" id="modal_email" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">電話番号</label>
          <input type="tel" id="modal_phone" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">会社名</label>
          <input type="text" id="modal_company_name" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ステータス</label>
          <select id="modal_status" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="-">-</option>
            <option value="入場中">入場中</option>
            <option value="退場済">退場済</option>
          </select>
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザー権限</label>
          <select id="modal_user_role" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="maker" selected>Maker</option>
          </select>
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">印刷ステータス</label>
          <select id="modal_print_status" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="not_printed">未印刷</option>
            <option value="printed">印刷済み</option>
          </select>
        </div>
      </div>
    `;
  }

  return fields;
}

// モーダルを閉じる関数
function closeModal() {
  const modal = document.getElementById("addDataModal");
  modal.style.display = "none";

  // 編集モードのデータをクリア
  modal.removeAttribute("data-edit-mode");
  modal.removeAttribute("data-edit-collection");
  modal.removeAttribute("data-edit-docid");

  // フォームをリセット
  const modalForm = document.getElementById("modalForm");
  modalForm.innerHTML = "";

  // キャンセル時：ローディングスピナーを停止し、現在のコレクションを再表示
  if (currentCollectionType) {
    setTimeout(() => {
      switch (currentCollectionType) {
        case "items":
          getAllItems();
          break;
        case "users":
          getAllUsers();
          break;
        case "staff":
          getAllStaff();
          break;
        case "scanItems":
          getAllScanItems();
          break;
        default:
          // 現在のコレクションがない場合は結果をクリア
          showResult("firestoreResult", "", "");
          document.getElementById("firestoreResult").style.display = "none";
      }
    }, 100); // 短い遅延でモーダルが完全に閉じた後に実行
  } else {
    // currentCollectionTypeが設定されていない場合は結果をクリア
    showResult("firestoreResult", "", "");
    document.getElementById("firestoreResult").style.display = "none";
  }
}

// データ追加を実行する関数
async function submitAddData() {
  try {
    if (!currentCollectionType) {
      showResult(
        "firestoreResult",
        "コレクションが選択されていません",
        "error"
      );
      return;
    }

    showLoading("firestoreResult");

    const docId = generateUUID();
    const currentTime = new Date();
    let data = {
      createdAt: currentTime,
      updatedAt: currentTime,
    };

    // コレクションタイプに応じてデータを収集
    if (currentCollectionType === "items") {
      let itemNo = document.getElementById("modal_item_no")?.value;
      const itemName = document.getElementById("modal_item_name")?.value;

      if (!itemNo || !itemName) {
        showResult(
          "firestoreResult",
          "アイテム番号とアイテム名は必須です",
          "error"
        );
        return;
      }

      // item_noを4桁の文字列形式に変換
      if (itemNo && !isNaN(itemNo)) {
        // 数値の場合は4桁にパディングして文字列に変換
        itemNo = String(itemNo).padStart(4, "0");
      } else if (itemNo) {
        // 既に文字列の場合はそのまま使用
        itemNo = String(itemNo);
      }

      data = {
        ...data,
        item_no: itemNo,
        category_name:
          document.getElementById("modal_category_name")?.value || "",
        company_name:
          document.getElementById("modal_company_name")?.value || "",
        item_name: itemName,
        maker_code: document.getElementById("modal_maker_code")?.value || "",
      };
    } else if (
      currentCollectionType === "users" ||
      currentCollectionType === "staff" ||
      currentCollectionType === "maker"
    ) {
      const userId = document.getElementById("modal_user_id")?.value;
      const userName = document.getElementById("modal_user_name")?.value;

      if (!userId || !userName) {
        showResult(
          "firestoreResult",
          "ユーザーIDとユーザー名は必須です",
          "error"
        );
        return;
      }

      data = {
        ...data,
        user_id: userId,
        user_name: userName,
        email: document.getElementById("modal_email")?.value || "",
        phone: document.getElementById("modal_phone")?.value || "",
        company_name:
          document.getElementById("modal_company_name")?.value || "",
        status: document.getElementById("modal_status")?.value || "-",
        user_role:
          document.getElementById("modal_user_role")?.value ||
          (currentCollectionType === "staff"
            ? "staff"
            : currentCollectionType === "maker"
              ? "maker"
              : "user"),
        print_status:
          document.getElementById("modal_print_status")?.value || "not_printed",
      };
    }

    // Admin別Firestoreコレクションに追加
    const targetCollection =
      currentCollectionType === "staff" || currentCollectionType === "maker"
        ? "users"
        : currentCollectionType;

    // Admin別コレクションに保存
    const adminDocRef = getAdminDoc(targetCollection, docId);
    await setDoc(adminDocRef, data);

    console.log(
      `Admin ${currentAdmin.admin_id}: ${targetCollection}コレクションに${docId}を追加`
    );

    showResult(
      "firestoreResult",
      `${currentCollectionType === "items"
        ? "アイテム"
        : currentCollectionType === "users"
          ? "ユーザー"
          : currentCollectionType === "staff"
            ? "スタッフ"
            : "メーカー"
      }「${data.item_name || data.user_name}」を${currentAdmin.admin_id
      }の管理下に追加しました`,
      "success"
    ); // モーダルを閉じる
    closeModal();

    // 一覧を再表示
    setTimeout(() => {
      if (currentCollectionType === "items") {
        getAllItems();
      } else if (currentCollectionType === "users") {
        getAllUsers();
      } else if (currentCollectionType === "staff") {
        getAllStaff();
      } else if (currentCollectionType === "maker") {
        getAllMaker();
      }
    }, 1500);
  } catch (error) {
    console.error("データ追加エラー:", error);
    showResult("firestoreResult", `追加エラー: ${error.message}`, "error");
  }
}

// データ編集を実行する関数
async function editDocument(collectionName, docId, displayName) {
  try {
    // 現在のドキュメントデータを取得
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDocs(
      query(collection(db, collectionName), orderBy("user_id", "asc"))
    );

    let currentData = null;
    docSnap.forEach((doc) => {
      if (doc.id === docId) {
        currentData = doc.data();
      }
    });

    if (!currentData) {
      showResult("firestoreResult", "編集するデータが見つかりません", "error");
      return;
    }

    // モーダルを開く
    openEditDataModal(collectionName, docId, currentData, displayName);
  } catch (error) {
    console.error("編集データ取得エラー:", error);
    showResult(
      "firestoreResult",
      `編集データ取得エラー: ${error.message}`,
      "error"
    );
  }
}

// 編集モーダルを開く関数
function openEditDataModal(collectionType, docId, currentData, displayName) {
  const modal = document.getElementById("addDataModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalForm = document.getElementById("modalForm");
  const submitBtn = document.getElementById("submitDataBtn");

  // モーダルタイトルを設定
  if (collectionType === "items") {
    modalTitle.textContent = `アイテム編集: ${displayName}`;
  } else if (collectionType === "users") {
    modalTitle.textContent = `ユーザー編集: ${displayName}`;
  } else if (collectionType === "staff") {
    modalTitle.textContent = `スタッフ編集: ${displayName}`;
  } else if (collectionType === "maker") {
    modalTitle.textContent = `メーカー編集: ${displayName}`;
  }

  // フォームフィールドを動的生成（編集用）
  modalForm.innerHTML = generateEditFormFields(collectionType, currentData);

  // 編集モード用にボタンを設定
  if (submitBtn) {
    submitBtn.textContent = "更新";
    submitBtn.onclick = submitEditData;
  }

  // 編集モードの情報を保存
  modal.setAttribute("data-edit-mode", "true");
  modal.setAttribute("data-edit-collection", collectionType);
  modal.setAttribute("data-edit-docid", docId);

  // モーダルを表示
  modal.style.display = "block";
}

// 編集用フォームフィールドを生成する関数
function generateEditFormFields(collectionType, currentData) {
  let fields = "";

  if (collectionType === "items") {
    fields = `
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">アイテム番号 <span style="color:red;">*</span></label>
        <input type="text" id="modal_item_no" required value="${currentData.item_no || ""
      }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">カテゴリ名</label>
        <input type="text" id="modal_category_name" value="${currentData.category_name || ""
      }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">会社名</label>
        <input type="text" id="modal_company_name" value="${currentData.company_name || ""
      }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">アイテム名 <span style="color:red;">*</span></label>
        <input type="text" id="modal_item_name" required value="${currentData.item_name || ""
      }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">メーカーコード</label>
        <input type="text" id="modal_maker_code" value="${currentData.maker_code || ""
      }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
      </div>
    `;
  } else if (
    collectionType === "users" ||
    collectionType === "staff" ||
    collectionType === "maker"
  ) {
    fields = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザーID <span style="color:red;">*</span></label>
          <input type="text" id="modal_user_id" required value="${currentData.user_id || ""
      }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザー名 <span style="color:red;">*</span></label>
          <input type="text" id="modal_user_name" required value="${currentData.user_name || ""
      }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">メールアドレス</label>
          <input type="email" id="modal_email" value="${currentData.email || ""
      }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">電話番号</label>
          <input type="tel" id="modal_phone" value="${currentData.phone || ""
      }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">会社名</label>
          <input type="text" id="modal_company_name" value="${currentData.company_name || ""
      }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ステータス</label>
          <select id="modal_status" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="-" ${currentData.status === "-" ? "selected" : ""
      }>-</option>
            <option value="入場中" ${currentData.status === "入場中" ? "selected" : ""
      }>入場中</option>
            <option value="退場済" ${currentData.status === "退場済" ? "selected" : ""
      }>退場済</option>
          </select>
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザー権限</label>
          <select id="modal_user_role" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="user" ${currentData.user_role === "user" ? "selected" : ""
      }>User</option>
            <option value="admin" ${currentData.user_role === "admin" ? "selected" : ""
      }>Admin</option>
            <option value="staff" ${currentData.user_role === "staff" ? "selected" : ""
      }>Staff</option>
            <option value="maker" ${currentData.user_role === "maker" ? "selected" : ""
      }>Maker</option>
          </select>
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">印刷ステータス</label>
          <select id="modal_print_status" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="not_printed" ${currentData.print_status === "not_printed" ? "selected" : ""
      }>未印刷</option>
            <option value="printed" ${currentData.print_status === "printed" ? "selected" : ""
      }>印刷済み</option>
          </select>
        </div>
      </div>
    `;
  }

  return fields;
}

// データ編集を実行する関数
async function submitEditData() {
  try {
    const modal = document.getElementById("addDataModal");
    const collectionType = modal.getAttribute("data-edit-collection");
    const docId = modal.getAttribute("data-edit-docid");

    if (!collectionType || !docId) {
      showResult("firestoreResult", "編集情報が不正です", "error");
      return;
    }

    showLoading("firestoreResult");

    const currentTime = new Date();
    let data = {
      updatedAt: currentTime,
    };

    // コレクションタイプに応じてデータを収集
    if (collectionType === "items") {
      let itemNo = document.getElementById("modal_item_no")?.value;
      const itemName = document.getElementById("modal_item_name")?.value;

      if (!itemNo || !itemName) {
        showResult(
          "firestoreResult",
          "アイテム番号とアイテム名は必須です",
          "error"
        );
        return;
      }

      // item_noを4桁の文字列形式に変換
      if (itemNo && !isNaN(itemNo)) {
        // 数値の場合は4桁にパディングして文字列に変換
        itemNo = String(itemNo).padStart(4, "0");
      } else if (itemNo) {
        // 既に文字列の場合はそのまま使用
        itemNo = String(itemNo);
      }

      data = {
        ...data,
        item_no: itemNo,
        category_name:
          document.getElementById("modal_category_name")?.value || "",
        company_name:
          document.getElementById("modal_company_name")?.value || "",
        item_name: itemName,
        maker_code: document.getElementById("modal_maker_code")?.value || "",
      };
    } else if (
      collectionType === "users" ||
      collectionType === "staff" ||
      collectionType === "maker"
    ) {
      const userId = document.getElementById("modal_user_id")?.value;
      const userName = document.getElementById("modal_user_name")?.value;

      if (!userId || !userName) {
        showResult(
          "firestoreResult",
          "ユーザーIDとユーザー名は必須です",
          "error"
        );
        return;
      }

      data = {
        ...data,
        user_id: userId,
        user_name: userName,
        email: document.getElementById("modal_email")?.value || "",
        phone: document.getElementById("modal_phone")?.value || "",
        company_name:
          document.getElementById("modal_company_name")?.value || "",
        status: document.getElementById("modal_status")?.value || "-",
        user_role:
          document.getElementById("modal_user_role")?.value ||
          (collectionType === "staff"
            ? "staff"
            : collectionType === "maker"
              ? "maker"
              : "user"),
        print_status:
          document.getElementById("modal_print_status")?.value || "not_printed",
      };
    }

    // Firestoreで更新（スタッフとメーカーの場合もusersコレクションに保存）
    const targetCollection =
      collectionType === "staff" || collectionType === "maker"
        ? "users"
        : collectionType;
    await setDoc(doc(db, targetCollection, docId), data, { merge: true });

    showResult(
      "firestoreResult",
      `${collectionType === "items"
        ? "アイテム"
        : collectionType === "users"
          ? "ユーザー"
          : collectionType === "staff"
            ? "スタッフ"
            : "メーカー"
      }「${data.item_name || data.user_name}」を更新しました`,
      "success"
    );

    // モーダルを閉じる
    closeModal();

    // 一覧を再表示
    setTimeout(() => {
      if (collectionType === "items") {
        getAllItems();
      } else if (collectionType === "users") {
        getAllUsers();
      } else if (collectionType === "staff") {
        getAllStaff();
      } else if (collectionType === "maker") {
        getAllMaker();
      }
    }, 1500);
  } catch (error) {
    console.error("データ更新エラー:", error);
    showResult("firestoreResult", `更新エラー: ${error.message}`, "error");
  }
}

// グローバル関数として登録（Admin別データ管理版）
window.getAllItems = getAllItems;
window.getAllUsers = getAllUsers;
window.getAllStaff = getAllStaff;
window.getAllMaker = getAllMaker;
window.getAllScanItems = getAllScanItems;
window.addToCurrentCollection = addToCurrentCollection;
window.submitAddData = submitAddData;
window.closeModal = closeModal;
window.clearResults = clearResults;
window.callHelloWorld = callHelloWorld;
window.deleteDocument = deleteDocument;
window.editDocument = editDocument;
window.submitEditData = submitEditData;
window.showFileUploadModal = showFileUploadModal;
window.closeFileUploadModal = closeFileUploadModal;
window.clearSelectedFile = clearSelectedFile;
window.handleFileUpload = handleFileUpload;
window.processSelectedFile = processSelectedFile;
window.proceedWithUpload = proceedWithUpload;

// Admin別データ管理用関数
window.handleAdminLogout = handleAdminLogout;
window.checkAdminAuthentication = checkAdminAuthentication;
window.getAdminCollection = getAdminCollection;
window.getAdminDoc = getAdminDoc;

// デバッグ用：通常のusersコレクションと比較する関数
window.compareCollections = async function () {
  console.log("=== コレクション比較開始 ===");

  try {
    // 通常のusersコレクション
    const normalCollection = collection(db, "users");
    const normalSnapshot = await getDocs(normalCollection);
    console.log(`📊 通常のusersコレクション: ${normalSnapshot.size}件`);
    console.log(`📂 パス: users/`);

    // Admin別のusersコレクション
    if (currentAdmin) {
      const adminCollection = getAdminCollection("users");
      const adminSnapshot = await getDocs(adminCollection);
      console.log(`📊 Admin別usersコレクション: ${adminSnapshot.size}件`);
      console.log(`📂 パス: admin_collections/${currentAdmin.admin_id}/users/`);
    }

    console.log("=== 比較完了 ===");
  } catch (error) {
    console.error("比較エラー:", error);
  }
};

// ファイルアップロードモーダル関連の変数
let selectedFile = null;

// ファイルアップロードモーダルを表示
function showFileUploadModal() {
  const modal = document.getElementById("fileUploadModal");
  modal.style.display = "flex";
  setupDragDropEvents();
  setupFileInputEvent();
}

// ファイルアップロードモーダルを閉じる
function closeFileUploadModal() {
  const modal = document.getElementById("fileUploadModal");
  modal.style.display = "none";
  clearSelectedFile();
}

// 選択されたファイルをクリア
function clearSelectedFile() {
  console.log("[DEBUG] clearSelectedFile called");
  selectedFile = null;
  document.getElementById("selectedFileInfo").style.display = "none";
  document.getElementById("uploadAction").style.display = "none";
  document.getElementById("hiddenFileInput").value = "";
  resetDropZoneStyle();
  console.log("[DEBUG] selectedFile cleared, now:", selectedFile);
}

// ドロップゾーンのスタイルをリセット
function resetDropZoneStyle() {
  const dropZone = document.getElementById("dropZone");
  dropZone.style.border = "3px dashed #4285f4";
  dropZone.style.background = "#f8f9ff";
}

// ドラッグ&ドロップイベントのセットアップ
function setupDragDropEvents() {
  const dropZone = document.getElementById("dropZone");

  // ドラッグオーバー
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.border = "3px dashed #2196f3";
    dropZone.style.background = "#e3f2fd";
  });

  // ドラッグリーブ
  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    resetDropZoneStyle();
  });

  // ドロップ
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    resetDropZoneStyle();

    const files = e.dataTransfer.files;
    console.log("[DEBUG] Drop event - files received:", files);

    if (files.length > 0) {
      console.log("[DEBUG] Processing dropped file:", files[0]);
      handleFileSelect(files[0]);
    } else {
      console.log("[DEBUG] No files in drop event");
    }
  });

  // クリックイベント
  dropZone.addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") {
      document.getElementById("hiddenFileInput").click();
    }
  });
}

// ファイル入力イベントのセットアップ
function setupFileInputEvent() {
  const fileInput = document.getElementById("hiddenFileInput");
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });
}

// ファイル選択処理
function handleFileSelect(file) {
  console.log("[DEBUG] handleFileSelect called with file:", file);

  // ファイルタイプチェック
  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
  ];

  if (!file) {
    console.error("[ERROR] No file provided to handleFileSelect");
    alert("ファイルが選択されていません。");
    return;
  }

  if (!allowedTypes.includes(file.type)) {
    console.log("[DEBUG] Invalid file type:", file.type);
    alert("Excel ファイル（.xlsx または .xls）を選択してください。");
    return;
  }

  selectedFile = file;
  console.log("[DEBUG] selectedFile set to:", selectedFile);

  // ファイル情報表示
  document.getElementById("fileName").textContent = file.name;
  document.getElementById("fileSize").textContent = formatFileSize(file.size);
  document.getElementById("selectedFileInfo").style.display = "block";
  document.getElementById("uploadAction").style.display = "block";
}

// ファイルサイズをフォーマット
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// アップロード処理を開始（既存の確認モーダルを使用）
function proceedWithUpload() {
  console.log("[DEBUG] proceedWithUpload called");
  console.log("[DEBUG] Current selectedFile:", selectedFile);

  if (!selectedFile) {
    console.error("[ERROR] No selectedFile available");
    alert("ファイルが選択されていません。");
    return;
  }

  // ファイルの有効性を再チェック
  if (!selectedFile.name || !selectedFile.type) {
    console.error("[ERROR] Invalid selectedFile object:", selectedFile);
    alert("選択されたファイルが無効です。再度選択してください。");
    return;
  }

  // ファイルをローカル変数に保存（モーダルクローズでクリアされる前に）
  const fileToProcess = selectedFile;
  console.log("[DEBUG] File saved to local variable:", fileToProcess);

  // ドラッグ&ドロップモーダルを閉じる
  closeFileUploadModal();

  // 少し待ってから既存のファイル処理フローを実行
  setTimeout(() => {
    // ファイル入力に選択したファイルをセット
    const fileInput = document.getElementById("excelFileInput");

    try {
      const dataTransfer = new DataTransfer();
      const file = new File([fileToProcess], fileToProcess.name, {
        type: fileToProcess.type,
        lastModified: fileToProcess.lastModified || Date.now(),
      });
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      console.log("[DEBUG] FileInput.files set successfully");

      // 既存の確認モーダルを表示
      if (typeof showUploadOptionsModal === "function") {
        console.log("[DEBUG] Calling showUploadOptionsModal with fileInput");
        showUploadOptionsModal(fileInput);
      } else {
        console.error("[ERROR] showUploadOptionsModal function not found");
        alert(
          "アップロード機能の初期化に失敗しました。ページを再読み込みしてください。"
        );
      }
    } catch (error) {
      console.error("File processing error:", error);
      alert("ファイル処理中にエラーが発生しました。");
    }
  }, 300);
}

// 旧handleFileUpload関数（後方互換性のため保持）
function handleFileUpload(mode) {
  // 新しいフローにリダイレクト
  proceedWithUpload();
}

// 直接ファイル処理を行うフォールバック関数
function processSelectedFile(file, mode) {
  console.log("[DEBUG] processSelectedFile called with:", { file, mode });

  if (!file) {
    console.error("[ERROR] No file provided to processSelectedFile");
    alert("ファイルが選択されていません。");
    return;
  }

  // template-utils.jsの関数を直接呼び出し
  if (window.uploadExcelFile) {
    const uploadMode = mode === "append" ? "append" : "replace";
    console.log("[DEBUG] Calling uploadExcelFile with mode:", uploadMode);
    window.uploadExcelFile(file, uploadMode);
  } else {
    console.error("uploadExcelFile関数が見つかりません");
    alert(
      "アップロード機能の初期化に失敗しました。ページを再読み込みしてください。"
    );
  }
}

// Makerページを新しいタブで開く
function openMakerPage() {
  window.open("maker.html", "_blank");
}

// グローバル関数として公開
window.openMakerPage = openMakerPage;
