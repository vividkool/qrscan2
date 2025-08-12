// Firebase Index Page Functions (クリーンアップ版)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
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
    const buttonText =
      collectionType === "items" ? "➕ アイテム追加" : "➕ ユーザー追加";
    addButton.innerHTML = buttonText;
  } else {
    addButton.style.display = "none";
  }
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
      "itemsコレクション";
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

// usersコレクション一覧表示
async function getAllUsers() {
  try {
    showLoading("firestoreResult");

    // user_idで昇順ソートのクエリを作成
    const q = query(collection(db, "users"), orderBy("user_id", "asc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showResult("firestoreResult", "ユーザーデータがありません", "error");
      return;
    }

    let html = "<table><thead><tr>";
    html +=
      "<th>user_id</th><th>user_name</th><th>email</th><th>phone</th><th>company_name</th><th>status</th><th>user_role</th><th>print_status</th><th>操作</th>";
    html += "</tr></thead><tbody>";
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const displayName = data.user_name || data.user_id || "無名ユーザー";
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
      "usersコレクション";
    document.getElementById(
      "firestoreResult-count"
    ).textContent = `${querySnapshot.size}件`;

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
      "<th>時刻</th><th>内容</th><th>ユーザー</th><th>役割</th><th>会社</th><th>スキャナー</th><th>操作</th>";
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
      const company = data.company_name || "不明";
      const scannerMode = data.scannerMode || "不明";

      html += `<tr>
                <td>${timeStr}</td>
                <td style="max-width: 200px; word-break: break-all;">${content}</td>
                <td>${userName}</td>
                <td>${role}</td>
                <td>${company}</td>
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
          getAllUsers();
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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
  }

  return fields;
}

// モーダルを閉じる関数
function closeModal() {
  const modal = document.getElementById("addDataModal");
  modal.style.display = "none";

  // 編集モードのデータをクリア
  modal.removeAttribute('data-edit-mode');
  modal.removeAttribute('data-edit-collection');
  modal.removeAttribute('data-edit-docid');

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
      showResult("firestoreResult", "コレクションが選択されていません", "error");
      return;
    }

    showLoading("firestoreResult");

    const docId = generateUUID();
    const currentTime = new Date();
    let data = {
      createdAt: currentTime,
      updatedAt: currentTime
    };

    // コレクションタイプに応じてデータを収集
    if (currentCollectionType === "items") {
      const itemNo = document.getElementById("modal_item_no")?.value;
      const itemName = document.getElementById("modal_item_name")?.value;

      if (!itemNo || !itemName) {
        showResult("firestoreResult", "アイテム番号とアイテム名は必須です", "error");
        return;
      }

      data = {
        ...data,
        item_no: itemNo,
        category_name: document.getElementById("modal_category_name")?.value || "",
        company_name: document.getElementById("modal_company_name")?.value || "",
        item_name: itemName,
        maker_code: document.getElementById("modal_maker_code")?.value || ""
      };
    } else if (currentCollectionType === "users") {
      const userId = document.getElementById("modal_user_id")?.value;
      const userName = document.getElementById("modal_user_name")?.value;

      if (!userId || !userName) {
        showResult("firestoreResult", "ユーザーIDとユーザー名は必須です", "error");
        return;
      }

      data = {
        ...data,
        user_id: userId,
        user_name: userName,
        email: document.getElementById("modal_email")?.value || "",
        phone: document.getElementById("modal_phone")?.value || "",
        company_name: document.getElementById("modal_company_name")?.value || "",
        status: document.getElementById("modal_status")?.value || "active",
        user_role: document.getElementById("modal_user_role")?.value || "user",
        print_status: document.getElementById("modal_print_status")?.value || "not_printed"
      };
    }

    // Firestoreに追加
    await setDoc(doc(db, currentCollectionType, docId), data);

    showResult(
      "firestoreResult",
      `${currentCollectionType === "items" ? "アイテム" : "ユーザー"}「${data.item_name || data.user_name}」を追加しました`,
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
      }
    }, 1500);

  } catch (error) {
    console.error("データ追加エラー:", error);
    showResult("firestoreResult", `追加エラー: ${error.message}`, "error");
  }
}

// 結果表示関数
function showResult(elementId, message, type = "") {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = message;
    element.className = `result ${type}`;
    element.style.display = "block";
  }
}

// ローディング表示関数
function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<div class="loading"></div> 処理中...';
    element.className = "result";
    element.style.display = "block";
  }
}

// テストユーザー作成関数
/*
async function createTestUsers() {
  try {
    showLoading("firestoreResult");

    const testUsers = [
      {
        user_id: "admin001",
        user_name: "管理者",
        email: "admin@example.com",
        phone: "080-1234-5678",
        department: "管理部",
        status: "active",
        role: "admin",
        print_status: "printed",
      },
      {
        user_id: "staff001",
        user_name: "スタッフ1",
        email: "staff1@example.com",
        phone: "080-2345-6789",
        department: "営業部",
        status: "active",
        role: "staff",
        print_status: "not_printed",
      },
      {
        user_id: "user001",
        user_name: "一般ユーザー1",
        email: "user1@example.com",
        phone: "080-3456-7890",
        department: "開発部",
        status: "active",
        role: "user",
        print_status: "not_printed",
      },
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const userData of testUsers) {
      try {
        const docId = generateUUID();
        await setDoc(doc(db, "users", docId), {
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        successCount++;
        console.log(
          `Test user created: ${userData.user_id} with UUID ${docId}`
        );
      } catch (error) {
        errorCount++;
        console.error(`Error creating user ${userData.user_id}:`, error);
      }
    }

    showResult(
      "firestoreResult",
      `テストユーザー作成完了\n成功: ${successCount}件\nエラー: ${errorCount}件`,
      successCount > 0 ? "success" : "error"
    );

    // 作成後にユーザー一覧を表示
    if (successCount > 0) {
      setTimeout(() => {
        getAllUsers();
      }, 1500);
    }
  } catch (error) {
    console.error("テストユーザー作成エラー:", error);
    showResult("firestoreResult", `エラー: ${error.message}`, "error");
  }
}
*/
// ドキュメント編集機能
async function editDocument(collectionName, docId, displayName) {
  try {
    showLoading("firestoreResult");

    // ドキュメントデータを取得
    const querySnapshot = await getDocs(collection(db, collectionName));

    // IDが一致するドキュメントを検索
    let documentData = null;
    querySnapshot.forEach((docSnap) => {
      if (docSnap.id === docId) {
        documentData = docSnap.data();
      }
    });

    if (!documentData) {
      showResult("firestoreResult", "ドキュメントが見つかりません", "error");
      return;
    }

    // 編集モーダルを開く
    openEditDataModal(collectionName, docId, documentData, displayName);

  } catch (error) {
    console.error("編集データ取得エラー:", error);
    showResult("firestoreResult", `データ取得エラー: ${error.message}`, "error");
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
  } else if (collectionType === "scanItems") {
    modalTitle.textContent = `スキャンデータ編集: ${displayName}`;
  }

  // フォームフィールドを動的生成（編集用）
  modalForm.innerHTML = generateEditFormFields(collectionType, currentData);

  // 編集モード用のデータを保存
  modal.setAttribute('data-edit-mode', 'true');
  modal.setAttribute('data-edit-collection', collectionType);
  modal.setAttribute('data-edit-docid', docId);

  // submitボタンを編集モード用に変更
  if (submitBtn) {
    submitBtn.textContent = "更新";
    submitBtn.onclick = submitEditData;
  }

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
        <input type="text" id="modal_item_no" required style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;" value="${currentData.item_no || ''}">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">カテゴリ名</label>
        <input type="text" id="modal_category_name" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;" value="${currentData.category_name || ''}">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">会社名</label>
        <input type="text" id="modal_company_name" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;" value="${currentData.company_name || ''}">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">アイテム名 <span style="color:red;">*</span></label>
        <input type="text" id="modal_item_name" required style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;" value="${currentData.item_name || ''}">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">メーカーコード</label>
        <input type="text" id="modal_maker_code" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;" value="${currentData.maker_code || ''}">
      </div>
    `;
  } else if (collectionType === "users") {
    fields = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザーID <span style="color:red;">*</span></label>
          <input type="text" id="modal_user_id" required style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;" value="${currentData.user_id || ''}">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザー名 <span style="color:red;">*</span></label>
          <input type="text" id="modal_user_name" required style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;" value="${currentData.user_name || ''}">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">メールアドレス</label>
          <input type="email" id="modal_email" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;" value="${currentData.email || ''}">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">電話番号</label>
          <input type="tel" id="modal_phone" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;" value="${currentData.phone || ''}">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">会社名</label>
          <input type="text" id="modal_company_name" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;" value="${currentData.company_name || ''}">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ステータス</label>
          <select id="modal_status" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="active" ${currentData.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${currentData.status === 'inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザー権限</label>
          <select id="modal_user_role" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="user" ${currentData.user_role === 'user' ? 'selected' : ''}>User</option>
            <option value="admin" ${currentData.user_role === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="staff" ${currentData.user_role === 'staff' ? 'selected' : ''}>Staff</option>
          </select>
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; font-weight:bold;">印刷ステータス</label>
          <select id="modal_print_status" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="not_printed" ${currentData.print_status === 'not_printed' ? 'selected' : ''}>未印刷</option>
            <option value="printed" ${currentData.print_status === 'printed' ? 'selected' : ''}>印刷済み</option>
          </select>
        </div>
      </div>
    `;
  } else if (collectionType === "scanItems") {
    fields = `
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">スキャン内容 <span style="color:red;">*</span></label>
        <textarea id="modal_content" required style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; height:80px;">${currentData.content || ''}</textarea>
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">ユーザー名</label>
        <input type="text" id="modal_user_name" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;" value="${currentData.user_name || ''}">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">役割</label>
        <input type="text" id="modal_role" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;" value="${currentData.role || ''}">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">会社名</label>
        <input type="text" id="modal_company_name" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;" value="${currentData.company_name || ''}">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-weight:bold;">スキャナーモード</label>
        <input type="text" id="modal_scannerMode" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;" value="${currentData.scannerMode || ''}">
      </div>
    `;
  }

  return fields;
}

// データ更新を実行する関数
async function submitEditData() {
  try {
    const modal = document.getElementById("addDataModal");
    const collectionType = modal.getAttribute('data-edit-collection');
    const docId = modal.getAttribute('data-edit-docid');

    if (!collectionType || !docId) {
      showResult("firestoreResult", "編集データが不正です", "error");
      return;
    }

    showLoading("firestoreResult");

    const currentTime = new Date();
    let data = {
      updatedAt: currentTime
    };

    // コレクションタイプに応じてデータを収集
    if (collectionType === "items") {
      const itemNo = document.getElementById("modal_item_no")?.value;
      const itemName = document.getElementById("modal_item_name")?.value;

      if (!itemNo || !itemName) {
        showResult("firestoreResult", "アイテム番号とアイテム名は必須です", "error");
        return;
      }

      data = {
        ...data,
        item_no: itemNo,
        category_name: document.getElementById("modal_category_name")?.value || "",
        company_name: document.getElementById("modal_company_name")?.value || "",
        item_name: itemName,
        maker_code: document.getElementById("modal_maker_code")?.value || ""
      };
    } else if (collectionType === "users") {
      const userId = document.getElementById("modal_user_id")?.value;
      const userName = document.getElementById("modal_user_name")?.value;

      if (!userId || !userName) {
        showResult("firestoreResult", "ユーザーIDとユーザー名は必須です", "error");
        return;
      }

      data = {
        ...data,
        user_id: userId,
        user_name: userName,
        email: document.getElementById("modal_email")?.value || "",
        phone: document.getElementById("modal_phone")?.value || "",
        company_name: document.getElementById("modal_company_name")?.value || "",
        status: document.getElementById("modal_status")?.value || "active",
        user_role: document.getElementById("modal_user_role")?.value || "user",
        print_status: document.getElementById("modal_print_status")?.value || "not_printed"
      };
    } else if (collectionType === "scanItems") {
      const content = document.getElementById("modal_content")?.value;

      if (!content) {
        showResult("firestoreResult", "スキャン内容は必須です", "error");
        return;
      }

      data = {
        ...data,
        content: content,
        user_name: document.getElementById("modal_user_name")?.value || "",
        role: document.getElementById("modal_role")?.value || "",
        company_name: document.getElementById("modal_company_name")?.value || "",
        scannerMode: document.getElementById("modal_scannerMode")?.value || ""
      };
    }

    // Firestoreで更新（マージ）
    await setDoc(doc(db, collectionType, docId), data, { merge: true });

    showResult(
      "firestoreResult",
      `${collectionType === "items" ? "アイテム" : collectionType === "users" ? "ユーザー" : "スキャンデータ"}「${data.item_name || data.user_name || data.content?.substring(0, 20)}」を更新しました`,
      "success"
    );

    // モーダルを閉じる
    closeEditModal();

    // 一覧を再表示
    setTimeout(() => {
      if (collectionType === "items") {
        getAllItems();
      } else if (collectionType === "users") {
        getAllUsers();
      } else if (collectionType === "scanItems") {
        getAllScanItems();
      }
    }, 1500);

  } catch (error) {
    console.error("データ更新エラー:", error);
    showResult("firestoreResult", `更新エラー: ${error.message}`, "error");
  }
}

// 編集モーダルを閉じる関数
function closeEditModal() {
  const modal = document.getElementById("addDataModal");
  modal.style.display = "none";

  // 編集モードのデータをクリア
  modal.removeAttribute('data-edit-mode');
  modal.removeAttribute('data-edit-collection');
  modal.removeAttribute('data-edit-docid');

  // フォームをリセット
  const modalForm = document.getElementById("modalForm");
  modalForm.innerHTML = "";

  // 編集完了時：現在のコレクションを再表示（更新されたデータを反映）
  if (currentCollectionType) {
    setTimeout(() => {
      switch (currentCollectionType) {
        case "items":
          getAllItems();
          break;
        case "users":
          getAllUsers();
          break;
        case "scanItems":
          getAllScanItems();
          break;
      }
    }, 100);
  }
}

// グローバル関数として公開
window.addDocument = addDocument;
window.getAllScanItems = getAllScanItems;
window.getAllItems = getAllItems;
window.getAllUsers = getAllUsers;
window.callHelloWorld = callHelloWorld;
window.clearResults = clearResults;
window.deleteDocument = deleteDocument;
window.selectCollection = selectCollection;
window.addToCurrentCollection = addToCurrentCollection;
window.createTestUsers = createTestUsers;
window.openAddDataModal = openAddDataModal;
window.closeModal = closeModal;
window.submitAddData = submitAddData;
window.editDocument = editDocument;
window.submitEditData = submitEditData;
window.closeEditModal = closeEditModal;
window.showResult = showResult;
window.showLoading = showLoading;

// 初期化完了メッセージ
console.log("Firebase Index (クリーンアップ版) が初期化されました");

// DOMContentLoaded後に関数をグローバルに登録
document.addEventListener('DOMContentLoaded', function () {
  // すべての関数をグローバルスコープに確実に登録
  window.addDocument = addDocument;
  window.getAllScanItems = getAllScanItems;
  window.getAllItems = getAllItems;
  window.getAllUsers = getAllUsers;
  window.callHelloWorld = callHelloWorld;
  window.clearResults = clearResults;
  window.deleteDocument = deleteDocument;
  window.selectCollection = selectCollection;
  window.addToCurrentCollection = addToCurrentCollection;
  window.createTestUsers = createTestUsers;
  window.openAddDataModal = openAddDataModal;
  window.closeModal = closeModal;
  window.submitAddData = submitAddData;
  window.editDocument = editDocument;
  window.submitEditData = submitEditData;
  window.closeEditModal = closeEditModal;
  window.showResult = showResult;
  window.showLoading = showLoading;

  console.log("Global functions registered successfully");
});
