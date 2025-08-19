// Firebase Index Page Functions (クリーンアップ版)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ページ読み込み時のデバッグ情報
document.addEventListener("DOMContentLoaded", function () {
  console.log("=== admin.htmlページ読み込み ===");
  console.log("現在のURL:", window.location.href);
  console.log("セッション存在確認:", !!localStorage.getItem("currentUser"));
  console.log("セッションデータ:", localStorage.getItem("currentUser"));

  // localStorage全体の内容を確認
  console.log("=== localStorage全体の内容 ===");
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    console.log(`${key}:`, value);
  }
  console.log("================================");

  // ヘッダーのユーザー情報を更新
  setTimeout(() => {
    console.log("updateHeaderUserInfo実行中...");
    updateHeaderUserInfo();
  }, 500);
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

// コレクション選択時の処理
function selectCollection() {
  const select = document.getElementById("collectionSelect");
  const value = select.value;
  currentCollectionType = value;

  if (value === "items") {
    getAllItems();
  } else if (value === "users") {
    getAllUsers();
  } else if (value === "scanItems") {
    getAllScanItems();
  } else {
    clearResults("firestoreResult");
  }
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

    // item_noで昇順ソートのクエリを作成
    const q = query(collection(db, "items"), orderBy("item_no", "asc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showResult("firestoreResult", "アイテムデータがありません", "error");
      return;
    }

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

    // user_roleが"user"のみを取得（一時的にソート無し）
    const q = query(collection(db, "users"), where("user_role", "==", "user"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showResult("firestoreResult", "ユーザーデータがありません", "error");
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
    document.getElementById("firestoreResult-collectionname").textContent =
      "usersデータベース";
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

// scanItemsコレクション一覧表示
async function getAllScanItems() {
  try {
    showLoading("firestoreResult");

    // timestampで降順ソートのクエリを作成
    const q = query(collection(db, "scanItems"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showResult("firestoreResult", "スキャンデータがありません", "error");
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

// staffコレクション一覧表示（usersコレクションのuser_role: "staff"のみ）
async function getAllStaff() {
  try {
    showLoading("firestoreResult");

    // user_roleが"staff"のみを取得（一時的にソート無し）
    const q = query(collection(db, "users"), where("user_role", "==", "staff"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showResult("firestoreResult", "スタッフデータがありません", "error");
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

// makerコレクション一覧表示（usersコレクションのuser_role: "maker"のみ）
async function getAllMaker() {
  try {
    showLoading("firestoreResult");

    // user_roleが"maker"のみを取得（一時的にソート無し）
    const q = query(collection(db, "users"), where("user_role", "==", "maker"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showResult("firestoreResult", "メーカーデータがありません", "error");
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

    // Firestoreに追加（スタッフとメーカーの場合もusersコレクションに保存）
    const targetCollection =
      currentCollectionType === "staff" || currentCollectionType === "maker"
        ? "users"
        : currentCollectionType;
    await setDoc(doc(db, targetCollection, docId), data);

    showResult(
      "firestoreResult",
      `${
        currentCollectionType === "items"
          ? "アイテム"
          : currentCollectionType === "users"
          ? "ユーザー"
          : currentCollectionType === "staff"
          ? "スタッフ"
          : "メーカー"
      }「${data.item_name || data.user_name}」を追加しました`,
      "success"
    );

    // モーダルを閉じる
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
        <input type="text" id="modal_item_no" required value="${
          currentData.item_no || ""
        }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">カテゴリ名</label>
        <input type="text" id="modal_category_name" value="${
          currentData.category_name || ""
        }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">会社名</label>
        <input type="text" id="modal_company_name" value="${
          currentData.company_name || ""
        }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">アイテム名 <span style="color:red;">*</span></label>
        <input type="text" id="modal_item_name" required value="${
          currentData.item_name || ""
        }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">メーカーコード</label>
        <input type="text" id="modal_maker_code" value="${
          currentData.maker_code || ""
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
          <input type="text" id="modal_user_id" required value="${
            currentData.user_id || ""
          }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザー名 <span style="color:red;">*</span></label>
          <input type="text" id="modal_user_name" required value="${
            currentData.user_name || ""
          }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">メールアドレス</label>
          <input type="email" id="modal_email" value="${
            currentData.email || ""
          }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">電話番号</label>
          <input type="tel" id="modal_phone" value="${
            currentData.phone || ""
          }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">会社名</label>
          <input type="text" id="modal_company_name" value="${
            currentData.company_name || ""
          }" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ステータス</label>
          <select id="modal_status" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="-" ${
              currentData.status === "-" ? "selected" : ""
            }>-</option>
            <option value="入場中" ${
              currentData.status === "入場中" ? "selected" : ""
            }>入場中</option>
            <option value="退場済" ${
              currentData.status === "退場済" ? "selected" : ""
            }>退場済</option>
          </select>
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザー権限</label>
          <select id="modal_user_role" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="user" ${
              currentData.user_role === "user" ? "selected" : ""
            }>User</option>
            <option value="admin" ${
              currentData.user_role === "admin" ? "selected" : ""
            }>Admin</option>
            <option value="staff" ${
              currentData.user_role === "staff" ? "selected" : ""
            }>Staff</option>
            <option value="maker" ${
              currentData.user_role === "maker" ? "selected" : ""
            }>Maker</option>
          </select>
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">印刷ステータス</label>
          <select id="modal_print_status" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="not_printed" ${
              currentData.print_status === "not_printed" ? "selected" : ""
            }>未印刷</option>
            <option value="printed" ${
              currentData.print_status === "printed" ? "selected" : ""
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
      `${
        collectionType === "items"
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

// グローバル関数として登録
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

// Aggregation Queriesパフォーマンステスト関数
async function runMakerPerformanceTest() {
  const resultElement = document.getElementById("firestoreResult");

  // セッション情報確認
  const sessionData = localStorage.getItem("currentUser");
  if (!sessionData) {
    resultElement.textContent =
      "❌ ユーザーセッションが見つかりません。ログインしてください。";
    resultElement.className = "result error";
    return;
  }

  const user = JSON.parse(sessionData);
  const userId = user.user_id || user.uid;

  resultElement.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div class="loading"></div>
      <h3>🚀 Aggregation Queries パフォーマンステスト実行中...</h3>
      <p>ユーザーID: ${userId}</p>
      <p>コンソールで詳細な結果を確認できます</p>
    </div>
  `;
  resultElement.className = "result";

  try {
    console.log("🚀 Admin画面からパフォーマンステスト開始");

    // maker.jsのテスト関数を動的インポート・実行
    const testResult = await runPerformanceTestForMaker(userId);

    // 結果を画面に表示
    let html = `
      <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
        <h3>📊 Aggregation Queries パフォーマンステスト結果</h3>
        <p><strong>テスト対象ユーザー:</strong> ${userId}</p>
        <p><strong>実行時刻:</strong> ${new Date().toLocaleString()}</p>
      </div>
    `;

    if (testResult.legacy && testResult.aggregation) {
      const legacy = testResult.legacy;
      const aggregation = testResult.aggregation;

      if (!legacy.error && !aggregation.error) {
        const improvement =
          ((legacy.time - aggregation.time) / legacy.time) * 100;
        const speedRatio = legacy.time / aggregation.time;

        html += `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="background: #fff3cd; padding: 15px; border-radius: 6px;">
              <h4>📊 従来方法</h4>
              <p><strong>実行時間:</strong> ${legacy.time.toFixed(2)}ms</p>
              <p><strong>読み取り件数:</strong> ${legacy.docCount.toLocaleString()}件</p>
              <p><strong>方法:</strong> 全scanItems取得</p>
            </div>
            <div style="background: #d4edda; padding: 15px; border-radius: 6px;">
              <h4>⚡ Aggregation Queries</h4>
              <p><strong>実行時間:</strong> ${aggregation.time.toFixed(2)}ms</p>
              <p><strong>対象アイテム:</strong> ${aggregation.itemCount}件</p>
              <p><strong>クエリ数:</strong> ${aggregation.queryCount}</p>
              <p><strong>平均クエリ時間:</strong> ${(
                aggregation.time / aggregation.queryCount
              ).toFixed(2)}ms</p>
            </div>
          </div>
          
          <div style="background: ${
            improvement > 0 ? "#d4edda" : "#f8d7da"
          }; padding: 20px; border-radius: 8px; text-align: center;">
            <h3>${improvement > 0 ? "🎉" : "⚠️"} パフォーマンス比較結果</h3>
            <p style="font-size: 18px; margin: 10px 0;">
              <strong>改善率: ${
                improvement > 0 ? "+" : ""
              }${improvement.toFixed(1)}%</strong>
            </p>
            ${
              improvement > 0
                ? `<p style="font-size: 16px; color: #155724;">✅ Aggregation Queriesが <strong>${speedRatio.toFixed(
                    1
                  )}倍高速</strong>です！</p>`
                : `<p style="font-size: 16px; color: #721c24;">⚠️ 従来方法の方が高速でした</p>`
            }
          </div>
        `;

        // データ量の予測と推奨事項
        const currentDataSize = legacy.docCount;
        const futureDataSize = currentDataSize * 3.5; // 3-4倍の中間値

        html += `
          <div style="background: #e2e3e5; padding: 20px; border-radius: 8px; margin-top: 15px;">
            <h4>📈 スケーラビリティ分析</h4>
            <p><strong>現在のデータ量:</strong> ${currentDataSize.toLocaleString()}件</p>
            <p><strong>予想データ量:</strong> ${Math.round(
              futureDataSize
            ).toLocaleString()}件 (3-4倍増加)</p>
            <p><strong>推奨事項:</strong> 
              ${
                improvement > 0
                  ? "✅ Aggregation Queriesの実装をお勧めします"
                  : "⚠️ データ量増加に備えてCloud Functionsでのカウンター管理を検討してください"
              }
            </p>
          </div>
        `;
      } else {
        html += `<div style="background: #f8d7da; padding: 15px; border-radius: 6px;">❌ テスト中にエラーが発生しました</div>`;
      }
    } else {
      html += `<div style="background: #f8d7da; padding: 15px; border-radius: 6px;">❌ テスト実行に失敗しました</div>`;
    }

    html += `<div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
      <p><strong>💡 詳細:</strong> ブラウザのコンソール(F12)で詳細なログを確認できます</p>
    </div>`;

    resultElement.innerHTML = html;
    resultElement.className = "result success";

    console.log("✅ パフォーマンステスト完了");
  } catch (error) {
    console.error("パフォーマンステストエラー:", error);
    resultElement.innerHTML = `
      <div style="background: #f8d7da; padding: 20px; border-radius: 8px;">
        <h3>❌ テスト実行エラー</h3>
        <p><strong>エラー:</strong> ${error.message}</p>
        <p>ブラウザのコンソールで詳細を確認してください。</p>
      </div>
    `;
    resultElement.className = "result error";
  }
}

// Maker専用のパフォーマンステスト実行（maker.jsの機能を再実装）
async function runPerformanceTestForMaker(userId) {
  // Firebase imports (ローカルで使用)
  const { getCountFromServer } = await import(
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
  );

  console.log("🚀 パフォーマンス比較テスト開始 🚀");
  console.log(`テスト対象ユーザー: ${userId}`);

  // 従来方法のテスト
  const legacyResult = await testLegacyMethodLocal(userId);
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機
  const aggregationResult = await testAggregationMethodLocal(
    userId,
    getCountFromServer
  );

  // 比較結果をログ出力
  console.log("\n📊 パフォーマンス比較結果 📊");
  console.log("=====================================");

  if (legacyResult.error) {
    console.log("❌ 従来方法: エラー -", legacyResult.error);
  } else {
    console.log(
      `⏱️ 従来方法: ${legacyResult.time.toFixed(2)}ms (${
        legacyResult.docCount
      }件読み取り)`
    );
  }

  if (aggregationResult.error) {
    console.log("❌ Aggregation方法: エラー -", aggregationResult.error);
  } else {
    console.log(
      `⚡ Aggregation方法: ${aggregationResult.time.toFixed(2)}ms (${
        aggregationResult.queryCount
      }クエリ)`
    );
  }

  if (!legacyResult.error && !aggregationResult.error) {
    const improvement =
      ((legacyResult.time - aggregationResult.time) / legacyResult.time) * 100;
    console.log(
      `📈 パフォーマンス改善: ${
        improvement > 0 ? "+" : ""
      }${improvement.toFixed(1)}%`
    );

    if (improvement > 0) {
      console.log(
        `🎉 Aggregation Queriesが ${(
          legacyResult.time / aggregationResult.time
        ).toFixed(1)}倍高速！`
      );
    } else {
      console.log(
        `⚠️ 従来方法が ${(aggregationResult.time / legacyResult.time).toFixed(
          1
        )}倍高速`
      );
    }
  }

  console.log("=====================================\n");
  return { legacy: legacyResult, aggregation: aggregationResult };
}

// 従来方法テスト（ローカル実装）
async function testLegacyMethodLocal(userId) {
  console.log("=== 従来方法 パフォーマンステスト開始 ===");
  const startTime = performance.now();

  try {
    const scanItemsSnapshot = await getDocs(collection(db, "scanItems"));
    console.log("取得したスキャンアイテム数:", scanItemsSnapshot.size);

    const scanCounts = {};
    scanItemsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.item_no) {
        scanCounts[data.item_no] = (scanCounts[data.item_no] || 0) + 1;
      }
    });

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    console.log("=== 従来方法 パフォーマンス結果 ===");
    console.log(`実行時間: ${executionTime.toFixed(2)}ms`);
    console.log(`読み取りドキュメント数: ${scanItemsSnapshot.size}`);
    console.log("=========================================");

    return {
      method: "legacy",
      time: executionTime,
      docCount: scanItemsSnapshot.size,
      results: scanCounts,
    };
  } catch (error) {
    console.error("従来方法テストエラー:", error);
    return { method: "legacy", error: error.message };
  }
}

// Aggregation方法テスト（ローカル実装）
async function testAggregationMethodLocal(userId, getCountFromServer) {
  console.log("=== Aggregation Queries パフォーマンステスト開始 ===");
  const startTime = performance.now();

  try {
    // まずメーカー関連アイテムを取得
    const itemsQuery = query(
      collection(db, "items"),
      where("maker_code", "==", userId),
      orderBy("item_no", "asc")
    );

    const itemsSnapshot = await getDocs(itemsQuery);
    const scanCounts = {};
    let totalQueries = 0;

    // 各アイテムごとに個別にカウントを取得（並列処理）
    const countPromises = [];
    const itemNumbers = [];

    itemsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.item_no) {
        itemNumbers.push(data.item_no);
        const countQuery = query(
          collection(db, "scanItems"),
          where("item_no", "==", data.item_no)
        );
        countPromises.push(getCountFromServer(countQuery));
        totalQueries++;
      }
    });

    // 全てのカウントクエリを並列実行
    const countResults = await Promise.all(countPromises);

    // 結果をマッピング
    itemNumbers.forEach((itemNo, index) => {
      scanCounts[itemNo] = countResults[index].data().count;
    });

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    console.log("=== Aggregation Queries パフォーマンス結果 ===");
    console.log(`実行時間: ${executionTime.toFixed(2)}ms`);
    console.log(`アイテム数: ${itemNumbers.length}`);
    console.log(`クエリ数: ${totalQueries}`);
    console.log(
      `平均クエリ時間: ${(executionTime / totalQueries).toFixed(2)}ms`
    );
    console.log("=============================================");

    return {
      method: "aggregation",
      time: executionTime,
      itemCount: itemNumbers.length,
      queryCount: totalQueries,
      results: scanCounts,
    };
  } catch (error) {
    console.error("Aggregation Queriesテストエラー:", error);
    return { method: "aggregation", error: error.message };
  }
}

// Makerページを新しいタブで開く
function openMakerPage() {
  window.open("maker.html", "_blank");
}

// ===== プロフィール機能 =====

// プロフィールモーダルを開く
async function showProfileModal() {
  console.log("=== プロフィールモーダル開始 ===");

  // 複数の方法でユーザー情報を取得
  let user = null;

  // 方法1: UserSessionクラスから取得
  console.log("UserSession確認:", !!window.UserSession);
  if (window.UserSession && typeof UserSession.getCurrentUser === "function") {
    try {
      user = await UserSession.getCurrentUser(); // awaitを追加
      console.log("UserSession経由でユーザー情報取得成功:", user);
    } catch (error) {
      console.log("UserSession取得エラー:", error);
    }
  } else {
    console.log("UserSessionが利用できません");
  }

  // 方法2: localStorageから直接取得
  if (!user) {
    console.log("localStorageから取得を試行...");
    try {
      const sessionData = localStorage.getItem("currentUser");
      console.log("localStorageの生データ:", sessionData);
      if (sessionData) {
        user = JSON.parse(sessionData);
        console.log("localStorage経由でユーザー情報取得成功:", user);
        console.log("user.user_id:", user.user_id);
        console.log("user.user_name:", user.user_name);
        console.log("user.company_name:", user.company_name);
      } else {
        console.log("localStorageにcurrentUserデータが存在しません");
      }
    } catch (error) {
      console.log("localStorage解析エラー:", error);
    }
  }

  // 方法3: 他のキーも試行
  if (!user) {
    console.log("他のlocalStorageキーを確認中...");
    const keys = Object.keys(localStorage);
    console.log("利用可能なlocalStorageキー:", keys);

    // firebaseSessionDataも確認
    const firebaseSession = localStorage.getItem("firebaseSessionData");
    if (firebaseSession) {
      console.log("firebaseSessionData:", firebaseSession);
      try {
        const fbUser = JSON.parse(firebaseSession);
        if (fbUser && (fbUser.user_id || fbUser.uid)) {
          user = fbUser;
          console.log("firebaseSessionDataから取得:", user);
        }
      } catch (error) {
        console.log("firebaseSessionData解析エラー:", error);
      }
    }
  }

  console.log("最終的に取得したユーザー情報:", user);

  if (!user) {
    console.error("ユーザー情報を取得できませんでした");
    alert("ユーザー情報を取得できませんでした。再ログインしてください。");
    return;
  }

  const profileContent = document.getElementById("profileContent");
  if (!profileContent) {
    console.error("profileContent要素が見つかりません");
    return;
  }

  profileContent.innerHTML = `
    <div class="profile-item">
      <span class="profile-label">ユーザーID:</span>
      <span class="profile-value">${user.user_id || user.uid || "未設定"}</span>
    </div>
    <div class="profile-item">
      <span class="profile-label">ユーザー名:</span>
      <span class="profile-value">${
        user.user_name || user.name || "未設定"
      }</span>
    </div>
    <div class="profile-item">
      <span class="profile-label">会社名:</span>
      <span class="profile-value">${
        user.company_name || user.companyName || "未設定"
      }</span>
    </div>
    
    <div class="profile-item">
      <span class="profile-label">権限:</span>
      <span class="profile-value">${user.role || "未設定"}</span>
    </div>
    <div class="profile-item">
      <span class="profile-label">メール:</span>
      <span class="profile-value">${user.email || "未設定"}</span>
    </div>
    <div class="profile-item">
      <span class="profile-label">電話番号:</span>
      <span class="profile-value">${user.phone || "未設定"}</span>
    </div>
    
  `;

  console.log("プロフィールモーダル内容設定完了");
  document.getElementById("profileModal").style.display = "block";
  console.log("=== プロフィールモーダル完了 ===");
}

// プロフィールモーダルを閉じる
function closeProfileModal() {
  document.getElementById("profileModal").style.display = "none";
}

// プロフィール編集モーダルを開く
async function editProfile() {
  try {
    console.log("editProfile関数開始");

    // 複数の方法でユーザー情報を取得
    let user = null;

    // 方法1: UserSessionクラスから取得
    if (
      window.UserSession &&
      typeof UserSession.getCurrentUser === "function"
    ) {
      try {
        user = await UserSession.getCurrentUser(); // awaitを追加
      } catch (error) {
        console.log("UserSession取得エラー:", error);
      }
    }

    // 方法2: localStorageから直接取得
    if (!user) {
      try {
        const sessionData = localStorage.getItem("currentUser");
        if (sessionData) {
          user = JSON.parse(sessionData);
        }
      } catch (error) {
        console.log("localStorage解析エラー:", error);
      }
    }

    if (!user) {
      console.error("ユーザー情報を取得できませんでした");
      alert("ユーザー情報を取得できませんでした。再ログインしてください。");
      return;
    }

    // 現在のユーザー情報を表示セクションに設定
    const currentUserDetails = document.getElementById("currentUserDetails");
    if (currentUserDetails) {
      console.log("プロフィール編集モーダル用ユーザー情報:", user);
      currentUserDetails.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
        <div>
          <strong>ユーザーID:</strong><br>
          <span style="color: #666;">${
            user.user_id || user.uid || "未設定"
          }</span>
        </div>
        <div>
          <strong>ユーザー名:</strong><br>
          <span style="color: #666;">${
            user.user_name || user.name || "未設定"
          }</span>
        </div>
        <div>
          <strong>会社名:</strong><br>
          <span style="color: #666;">${
            user.company_name || user.companyName || "未設定"
          }</span>
        </div>
        
      </div>
      <div style="margin-top: 10px; font-size: 14px;">
        <strong>メール:</strong> <span style="color: #666;">${
          user.email || "未設定"
        }</span><br>
        <strong>電話番号:</strong> <span style="color: #666;">${
          user.phone || "未設定"
        }</span>
      </div>
    `;
    } else {
      console.log("currentUserDetails要素が見つかりません");
    }

    // フォームに現在の値を設定（要素の存在確認を追加）
    const elements = {
      edit_user_id: user.user_id || user.uid || "",
      edit_user_name: user.user_name || user.name || "",
      edit_company_name: user.company_name || user.companyName || "",
      edit_department: user.department || "",
      edit_email: user.email || "",
      edit_phone: user.phone || "",
    };

    // 要素の存在確認とエラーハンドリング
    Object.entries(elements).forEach(([elementId, value]) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.value = value;
      } else {
        console.error(`要素が見つかりません: ${elementId}`);
      }
    });

    // プロフィールモーダルを閉じて編集モーダルを開く
    closeProfileModal();

    const profileEditModal = document.getElementById("profileEditModal");
    if (profileEditModal) {
      profileEditModal.style.display = "block";
      console.log("editProfile関数正常完了");
    } else {
      console.error("profileEditModal要素が見つかりません");
      alert(
        "プロフィール編集モーダルが見つかりません。ページを再読み込みしてください。"
      );
    }
  } catch (error) {
    console.error("editProfile関数でエラーが発生:", error);
    alert(`プロフィール編集を開く際にエラーが発生しました: ${error.message}`);
  }
}

// プロフィール編集モーダルを閉じる
function closeProfileEditModal() {
  document.getElementById("profileEditModal").style.display = "none";
}

// プロフィールを保存
async function saveProfile() {
  try {
    // 複数の方法でユーザー情報を取得
    let currentUser = null;

    // 方法1: UserSessionクラスから取得
    if (
      window.UserSession &&
      typeof UserSession.getCurrentUser === "function"
    ) {
      try {
        currentUser = UserSession.getCurrentUser();
      } catch (error) {
        console.log("UserSession取得エラー:", error);
      }
    }

    // 方法2: localStorageから直接取得
    if (!currentUser) {
      try {
        const sessionData = localStorage.getItem("currentUser");
        if (sessionData) {
          currentUser = JSON.parse(sessionData);
        }
      } catch (error) {
        console.log("localStorage解析エラー:", error);
      }
    }

    if (!currentUser) {
      alert("ユーザー情報を取得できませんでした");
      return;
    }

    const updatedData = {
      user_name: document.getElementById("edit_user_name").value,
      company_name: document.getElementById("edit_company_name").value,
      email: document.getElementById("edit_email").value,
      phone: document.getElementById("edit_phone").value,
      updatedAt: new Date(),
    };

    // Firestoreのusersコレクションを更新
    const userQuery = query(
      collection(db, "users"),
      where("user_id", "==", currentUser.user_id)
    );

    const querySnapshot = await getDocs(userQuery);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      await setDoc(doc(db, "users", userDoc.id), updatedData, { merge: true });

      // セッションデータを更新
      const newUserData = { ...currentUser, ...updatedData };
      UserSession.updateSession(newUserData);

      alert("プロフィールを更新しました");
      closeProfileEditModal();

      // ヘッダーのユーザー情報を更新
      updateHeaderUserInfo();
    } else {
      alert("ユーザー情報の更新に失敗しました");
    }
  } catch (error) {
    console.error("プロフィール更新エラー:", error);
    alert("プロフィールの更新中にエラーが発生しました: " + error.message);
  }
}

// ===== 設定機能 =====

// 設定モーダルを閉じる
function closeSettingsModal() {
  document.getElementById("settingsModal").style.display = "none";
}

// 設定を保存
async function saveSettings() {
  let projectName = document
    .getElementById("setting_project_name")
    .value.trim();
  const password = document.getElementById("setting_password").value.trim();

  // プロジェクト名が空の場合はデフォルト値を使用
  if (!projectName) {
    projectName = generateDefaultProjectName();
    console.log("プロジェクト名が空のため、デフォルト値を使用:", projectName);
  }

  if (!password) {
    alert("パスワードは必須です");
    return;
  }

  try {
    // Firestoreに管理者設定を保存
    const settingsRef = doc(db, "admin_settings", "config");
    await setDoc(settingsRef, {
      project_name: projectName,
      admin_password: password, // 実際のプロダクションではハッシュ化が必要
      updated_at: new Date(),
      updated_by: getCurrentUserId(),
    });

    // localStorage にもバックアップ保存（下位互換性のため）
    localStorage.setItem("qr_project_name", projectName);
    localStorage.setItem("qr_password", password);

    alert(`設定をFirestoreに保存しました\nプロジェクト名: ${projectName}`);
    closeSettingsModal();
  } catch (error) {
    console.error("設定保存エラー:", error);
    alert("設定の保存中にエラーが発生しました: " + error.message);
  }
}

// 現在のユーザーIDを取得
function getCurrentUserId() {
  try {
    const sessionData = localStorage.getItem("currentUser");
    if (sessionData) {
      const user = JSON.parse(sessionData);
      return user.user_id || user.uid || "unknown";
    }
    return "unknown";
  } catch (error) {
    console.error("現在のユーザーID取得エラー:", error);
    return "unknown";
  }
}

// URLプレビューを更新
function updateUrlPreview() {
  const projectName = document
    .getElementById("setting_project_name")
    .value.trim();
  const urlPreviewElement = document.getElementById("urlPreview");

  if (!urlPreviewElement) return;

  // プロジェクト名が空の場合はデフォルト値を使用
  const displayProjectName = projectName || generateDefaultProjectName();
  const isDefault = !projectName;

  const baseUrl = window.location.origin;
  const sampleUrls = [
    `${baseUrl}/?project=${encodeURIComponent(displayProjectName)}`,
  ];

  const defaultMessage = isDefault
    ? `<div style="color: #28a745; font-size: 12px; margin-bottom: 8px;">💡 プロジェクト名が空の場合、自動生成される値: <strong>${displayProjectName}</strong></div>`
    : "";

  urlPreviewElement.innerHTML = `
    ${defaultMessage}
    <div style="margin-bottom: 8px;"><strong>生成されるQRコードURL例:</strong></div>
    <div style="margin: 5px 0; padding: 5px; background-color: #e9ecef; border-radius: 3px;">
      <strong>ユーザー:</strong><br>
      <span style="font-size: 12px;">${sampleUrls[0]}</span>
    </div>
  `;
}

// デフォルトプロジェクト名を生成する関数
function generateDefaultProjectName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // 月は0から始まるので+1
  const day = String(now.getDate()).padStart(2, "0");

  return `EXPO${year}${month}${day}`;
}

// 設定モーダルを開く
async function showSettingsModal() {
  try {
    // Firestoreから設定を読み込み
    const settingsRef = doc(db, "admin_settings", "config");
    const settingsDoc = await getDoc(settingsRef);

    let projectName = "";
    let password = "";

    if (settingsDoc.exists()) {
      const settings = settingsDoc.data();
      projectName = settings.project_name || "";
      password = settings.admin_password || "";
      console.log("Firestoreから設定を読み込み:", {
        projectName,
        hasPassword: !!password,
      });
    } else {
      // Firestoreに設定がない場合、localStorageから読み込み（移行対応）
      projectName = localStorage.getItem("qr_project_name") || "";
      password = localStorage.getItem("qr_password") || "";
      console.log("localStorageから設定を読み込み:", {
        projectName,
        hasPassword: !!password,
      });
    }

    // プロジェクト名が空の場合、デフォルト値を設定
    if (!projectName) {
      projectName = generateDefaultProjectName();
      console.log("デフォルトプロジェクト名を生成:", projectName);
    }

    document.getElementById("setting_project_name").value = projectName;
    document.getElementById("setting_password").value = password;

    // URLプレビューを更新
    updateUrlPreview();

    // プロジェクト名入力時のリアルタイムプレビュー
    const projectNameInput = document.getElementById("setting_project_name");
    if (projectNameInput) {
      projectNameInput.removeEventListener("input", updateUrlPreview); // 重複防止
      projectNameInput.addEventListener("input", updateUrlPreview);
    }

    // モーダルを表示
    document.getElementById("settingsModal").style.display = "block";
  } catch (error) {
    console.error("設定読み込みエラー:", error);
    // エラーが発生してもモーダルは表示する
    document.getElementById("settingsModal").style.display = "block";
    alert("設定の読み込み中にエラーが発生しました: " + error.message);
  }
} // ヘッダーのユーザー情報を更新
function updateHeaderUserInfo() {
  const userInfoElement = document.getElementById("userInfo");
  if (!userInfoElement) {
    console.log("userInfo要素が見つかりません");
    return;
  }

  // 複数の方法でユーザー情報を取得
  let user = null;

  // 方法1: UserSessionクラスから取得
  if (window.UserSession && typeof UserSession.getCurrentUser === "function") {
    try {
      user = UserSession.getCurrentUser();
      console.log("UserSession経由でユーザー情報取得:", user);
    } catch (error) {
      console.log("UserSession取得エラー:", error);
    }
  }

  // 方法2: localStorageから直接取得
  if (!user) {
    try {
      const sessionData = localStorage.getItem("currentUser");
      if (sessionData) {
        user = JSON.parse(sessionData);
        console.log("localStorage経由でユーザー情報取得:", user);
      }
    } catch (error) {
      console.log("localStorage解析エラー:", error);
    }
  }

  if (user && userInfoElement) {
    const displayName = user.user_name || user.name || "ユーザー";
    const displayRole = user.role || "未設定";
    //userInfoElement.textContent = `${displayName} (${displayRole})`;
    console.log("ヘッダーのユーザー情報を更新:", userInfoElement.textContent);
  } else {
    console.log("ユーザー情報が取得できませんでした");
    userInfoElement.textContent = "未ログイン";
  }
}

// グローバル関数として公開
window.runMakerPerformanceTest = runMakerPerformanceTest;
window.openMakerPage = openMakerPage;
window.showProfileModal = showProfileModal;
window.closeProfileModal = closeProfileModal;
window.editProfile = editProfile;
window.closeProfileEditModal = closeProfileEditModal;
window.saveProfile = saveProfile;
window.showSettingsModal = showSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.saveSettings = saveSettings;
window.updateUrlPreview = updateUrlPreview;
