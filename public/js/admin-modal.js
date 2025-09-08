// Admin Modal & Data Management Functions (Firebase Auth専用版)
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ===============================
// 廃止: collection_type関連機能
// 新構造ではコレクション分離により不要
// ===============================

// Firebaseの設定を取得（admin.jsから）
let db, currentAdmin;
// collection_type廃止により不要
// let currentCollectionType;

// admin.jsからの依存関数を受け取る初期化関数
export function initializeAdminModal(firestore, adminData) {
  db = firestore;
  currentAdmin = adminData;
  // collection_type廃止により不要
  // currentCollectionType = collectionType;
}

// 共通UI関数（admin.jsと共有）
function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<div class="loading">読み込み中...</div>';
  }
}

function showResult(elementId, message, type) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<div class="${type}">${message}</div>`;
  }
}

// admin.jsからコレクション参照を取得（4セグメント構造対応）
function getAdminCollection(collectionName) {
  if (!currentAdmin || !currentAdmin.admin_id || !currentAdmin.event_id) {
    throw new Error("Admin認証またはevent_idが必要です");
  }

  // collectionNameをそのまま使用（呼び出し元で既に適切に構築済み）
  const adminPath = `admin_collections/${currentAdmin.admin_id}/${collectionName}`;
  console.log(`[DEBUG] Admin collection path (4セグメント): ${adminPath}`);

  return collection(
    db,
    "admin_collections",
    currentAdmin.admin_id,
    collectionName
  );
}

// UUID生成
function generateUUID() {
  return (
    Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  ).toUpperCase();
}

// ============================================================================
// データ追加・編集・削除関数
// ============================================================================

// Firestoreドキュメント追加
export async function addDocument() {
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

    if (documentId) {
      // IDが指定されている場合は、そのIDでドキュメントを作成
      docRef = doc(db, "users", documentId);
      await setDoc(docRef, {
        title: title,
        content: content,
        timestamp: serverTimestamp(),
        uid: auth.currentUser ? auth.currentUser.uid : "anonymous",
      });
    } else {
      // IDが指定されていない場合は自動生成
      docRef = await addDoc(collection(db, "users"), {
        title: title,
        content: content,
        timestamp: serverTimestamp(),
        uid: auth.currentUser ? auth.currentUser.uid : "anonymous",
      });
    }

    showResult(
      "firestoreResult",
      `ドキュメントが追加されました: ${docRef.id}`,
      "success"
    );
    document.getElementById("documentId").value = "";
    document.getElementById("dataTitle").value = "";
    document.getElementById("dataContent").value = "";
  } catch (error) {
    console.error("addDocument error:", error);
    showResult("firestoreResult", `追加エラー: ${error.message}`, "error");
  }
}

// ドキュメント削除
export async function deleteDocument(collectionName, docId, displayName) {
  if (!confirm(`本当に「${displayName}」を削除しますか？`)) {
    return;
  }

  try {
    showLoading("firestoreResult");

    // Admin別コレクション参照を正しく取得（4セグメント構造）
    const collectionKey = `${currentAdmin.event_id}_${collectionName}`;
    const docRef = doc(
      db,
      "admin_collections",
      currentAdmin.admin_id,
      collectionKey,
      docId
    );

    await deleteDoc(docRef);

    showResult(
      "firestoreResult",
      `「${displayName}」を削除しました`,
      "success"
    );

    // 該当コレクションを再表示
    if (collectionName === "items") {
      // admin.jsのgetAllItems()を呼び出す
      if (typeof window.getAllItems === "function") {
        window.getAllItems();
      }
    } else if (collectionName === "users") {
      if (typeof window.getAllUsers === "function") {
        window.getAllUsers();
      }
    } else if (collectionName === "scanItems") {
      if (typeof window.getAllScanItems === "function") {
        window.getAllScanItems();
      }
    } else if (collectionName === "staff") {
      if (typeof window.getAllStaff === "function") {
        window.getAllStaff();
      }
    } else if (collectionName === "maker") {
      if (typeof window.getAllMaker === "function") {
        window.getAllMaker();
      }
    }
  } catch (error) {
    console.error("deleteDocument error:", error);
    showResult("firestoreResult", `削除エラー: ${error.message}`, "error");
  }
}

// ドキュメント編集モーダルを開く
export async function openEditModal(collectionType, docId) {
  console.log(`編集モーダル開始: ${collectionType}/${docId}`);

  if (!currentAdmin || !currentAdmin.admin_id || !currentAdmin.event_id) {
    alert("管理者情報が設定されていません。");
    return;
  }

  // デバッグ情報を出力
  console.log(`[DEBUG] currentAdmin.event_id: ${currentAdmin.event_id}`);
  console.log(`[DEBUG] collectionType: ${collectionType}`);

  try {
    // コレクション名の重複を避けるため、event_idが既にcollectionTypeを含んでいるかチェック
    let collectionName;
    if (currentAdmin.event_id.endsWith(`_${collectionType}`)) {
      // 既にcollectionTypeが含まれている場合はそのまま使用
      collectionName = currentAdmin.event_id;
    } else {
      // 含まれていない場合は追加
      collectionName = `${currentAdmin.event_id}_${collectionType}`;
    }

    console.log(`[DEBUG] Final collection name: ${collectionName}`);

    // 既存ドキュメントのデータを取得
    const collectionRef = getAdminCollection(collectionName);
    const docRef = doc(collectionRef, docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      alert("ドキュメントが見つかりません。");
      return;
    }

    const data = docSnap.data();

    // 編集モーダルを表示
    showEditModal(collectionType, docId, data);
  } catch (error) {
    console.error("openEditModal error:", error);
    alert(`データの取得中にエラーが発生しました: ${error.message}`);
  }
}

// 編集モーダルを表示
function showEditModal(collectionType, docId, data) {
  // 編集モーダルのHTMLを動的生成
  const modalHTML = `
    <div id="editDataModal" class="modal" style="display: block;">
      <div class="modal-content">
        <div class="modal-header">
          <h2>データ編集 - ${collectionType}</h2>
          <span class="close" onclick="closeEditModal()">&times;</span>
        </div>
        <div class="modal-body">
          <form id="editDataForm">
            <div id="editFormFields">
              ${generateEditFormFields(collectionType, data)}
            </div>
            <div class="form-actions">
              <button type="button" onclick="saveEditedDocument('${collectionType}', '${docId}')" class="save-btn">保存</button>
              <button type="button" onclick="closeEditModal()" class="cancel-btn">キャンセル</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // 既存のモーダルがあれば削除
  const existingModal = document.getElementById("editDataModal");
  if (existingModal) {
    existingModal.remove();
  }

  // 新しいモーダルを追加
  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

// コレクションタイプに応じた編集フォームフィールドを生成
function generateEditFormFields(collectionType, data) {
  let fieldsHTML = "";

  switch (collectionType) {
    case "users":
      fieldsHTML = `
        <div class="form-group">
          <label for="edit_user_id">ユーザーID:</label>
          <input type="text" id="edit_user_id" value="${
            data.user_id || ""
          }" required>
        </div>
        <div class="form-group">
          <label for="edit_user_name">ユーザー名:</label>
          <input type="text" id="edit_user_name" value="${
            data.user_name || ""
          }" required>
        </div>
        <div class="form-group">
          <label for="edit_company_name">会社名:</label>
          <input type="text" id="edit_company_name" value="${
            data.company_name || ""
          }">
        </div>
        <div class="form-group">
          <label for="edit_department">部署:</label>
          <input type="text" id="edit_department" value="${
            data.department || ""
          }">
        </div>
        <div class="form-group">
          <label for="edit_email">メールアドレス:</label>
          <input type="email" id="edit_email" value="${data.email || ""}">
        </div>
        <div class="form-group">
          <label for="edit_tantou">担当者:</label>
          <input type="text" id="edit_tantou" value="${data.tantou || ""}">
        </div>
        <div class="form-group">
          <label for="edit_user_role">ロール:</label>
          <select id="edit_user_role">
            <option value="user" ${
              data.user_role === "user" ? "selected" : ""
            }>user</option>
            <option value="staff" ${
              data.user_role === "staff" ? "selected" : ""
            }>staff</option>
            <option value="admin" ${
              data.user_role === "admin" ? "selected" : ""
            }>admin</option>
            <option value="uketuke" ${
              data.user_role === "uketuke" ? "selected" : ""
            }>uketuke</option>
          </select>
        </div>
        <div class="form-group">
          <label for="edit_status">ステータス:</label>
          <select id="edit_status">
            <option value="未設定" ${
              data.status === "未設定" ? "selected" : ""
            }>未設定</option>
            <option value="入場中" ${
              data.status === "入場中" ? "selected" : ""
            }>入場中</option>
            <option value="退場済" ${
              data.status === "退場済" ? "selected" : ""
            }>退場済</option>
          </select>
        </div>
        <div class="form-group">
          <label for="edit_print_status">印刷ステータス:</label>
          <select id="edit_print_status">
            <option value="未" ${
              data.print_status === "未" ? "selected" : ""
            }>未</option>
            <option value="済" ${
              data.print_status === "済" ? "selected" : ""
            }>済</option>
          </select>
        </div>
      `;
      break;

    case "items":
      fieldsHTML = `
        <div class="form-group">
          <label for="edit_item_id">アイテムID:</label>
          <input type="text" id="edit_item_id" value="${
            data.item_id || ""
          }" required>
        </div>
        <div class="form-group">
          <label for="edit_item_name">アイテム名:</label>
          <input type="text" id="edit_item_name" value="${
            data.item_name || ""
          }" required>
        </div>
        <div class="form-group">
          <label for="edit_description">説明:</label>
          <textarea id="edit_description">${data.description || ""}</textarea>
        </div>
        <div class="form-group">
          <label for="edit_category">カテゴリ:</label>
          <input type="text" id="edit_category" value="${data.category || ""}">
        </div>
        <div class="form-group">
          <label for="edit_location">場所:</label>
          <input type="text" id="edit_location" value="${data.location || ""}">
        </div>
      `;
      break;

    case "staff":
    case "maker":
      fieldsHTML = `
        <div class="form-group">
          <label for="edit_user_id">ユーザーID:</label>
          <input type="text" id="edit_user_id" value="${
            data.user_id || ""
          }" required>
        </div>
        <div class="form-group">
          <label for="edit_user_name">ユーザー名:</label>
          <input type="text" id="edit_user_name" value="${
            data.user_name || ""
          }" required>
        </div>
        <div class="form-group">
          <label for="edit_company_name">会社名:</label>
          <input type="text" id="edit_company_name" value="${
            data.company_name || ""
          }">
        </div>
        <div class="form-group">
          <label for="edit_email">メールアドレス:</label>
          <input type="email" id="edit_email" value="${data.email || ""}">
        </div>
        <div class="form-group">
          <label for="edit_tantou">担当者:</label>
          <input type="text" id="edit_tantou" value="${data.tantou || ""}">
        </div>
      `;
      break;

    case "scanItems":
      fieldsHTML = `
        <div class="form-group">
          <label for="edit_content">QRコード内容:</label>
          <textarea id="edit_content" required>${data.content || ""}</textarea>
        </div>
        <div class="form-group">
          <label for="edit_description">説明:</label>
          <textarea id="edit_description">${data.description || ""}</textarea>
        </div>
      `;
      break;

    default:
      fieldsHTML = `
        <div class="form-group">
          <label for="edit_content">内容:</label>
          <textarea id="edit_content">${JSON.stringify(
            data,
            null,
            2
          )}</textarea>
        </div>
      `;
  }

  return fieldsHTML;
}

// 編集されたドキュメントを保存
async function saveEditedDocument(collectionType, docId) {
  try {
    showLoading("firestoreResult");

    // フォームデータを収集
    const updatedData = collectEditFormData(collectionType);

    if (!updatedData) {
      return; // バリデーションエラー
    }

    // タイムスタンプを追加
    updatedData.updated_at = serverTimestamp();

    // コレクション名の重複を避けるため、event_idが既にcollectionTypeを含んでいるかチェック
    let collectionName;
    if (currentAdmin.event_id.endsWith(`_${collectionType}`)) {
      // 既にcollectionTypeが含まれている場合はそのまま使用
      collectionName = currentAdmin.event_id;
    } else {
      // 含まれていない場合は追加
      collectionName = `${currentAdmin.event_id}_${collectionType}`;
    }

    console.log(`[DEBUG] Save - Final collection name: ${collectionName}`);

    // ドキュメントを更新
    const collectionRef = getAdminCollection(collectionName);
    const docRef = doc(collectionRef, docId);
    await updateDoc(docRef, updatedData);

    showResult(
      "firestoreResult",
      `${collectionType} ドキュメントを更新しました。`,
      "success"
    );

    // モーダルを閉じる
    closeEditModal();

    // 該当コレクションを再表示
    refreshCollectionDisplay(collectionType);
  } catch (error) {
    console.error("saveEditedDocument error:", error);
    showResult("firestoreResult", `更新エラー: ${error.message}`, "error");
  }
}

// フォームデータを収集
function collectEditFormData(collectionType) {
  const data = {};

  switch (collectionType) {
    case "users":
    case "staff":
    case "maker":
      const userId = document.getElementById("edit_user_id")?.value;
      const userName = document.getElementById("edit_user_name")?.value;

      if (!userId || !userName) {
        alert("ユーザーIDとユーザー名は必須です。");
        return null;
      }

      data.user_id = userId;
      data.user_name = userName;
      data.company_name =
        document.getElementById("edit_company_name")?.value || "";
      data.department = document.getElementById("edit_department")?.value || "";
      data.email = document.getElementById("edit_email")?.value || "";
      data.tantou = document.getElementById("edit_tantou")?.value || "";

      if (collectionType === "users") {
        data.user_role =
          document.getElementById("edit_user_role")?.value || "user";
        data.status = document.getElementById("edit_status")?.value || "未設定";
        data.print_status =
          document.getElementById("edit_print_status")?.value || "未";
      } else {
        data.user_role = collectionType; // staff or maker
      }
      break;

    case "items":
      const itemId = document.getElementById("edit_item_id")?.value;
      const itemName = document.getElementById("edit_item_name")?.value;

      if (!itemId || !itemName) {
        alert("アイテムIDとアイテム名は必須です。");
        return null;
      }

      data.item_id = itemId;
      data.item_name = itemName;
      data.description =
        document.getElementById("edit_description")?.value || "";
      data.category = document.getElementById("edit_category")?.value || "";
      data.location = document.getElementById("edit_location")?.value || "";
      break;

    case "scanItems":
      const content = document.getElementById("edit_content")?.value;

      if (!content) {
        alert("QRコード内容は必須です。");
        return null;
      }

      data.content = content;
      data.description =
        document.getElementById("edit_description")?.value || "";
      break;

    default:
      data.content = document.getElementById("edit_content")?.value || "";
  }

  return data;
}

// コレクション表示を更新
function refreshCollectionDisplay(collectionType) {
  if (collectionType === "items") {
    if (typeof window.getAllItems === "function") {
      window.getAllItems();
    }
  } else if (collectionType === "users") {
    if (typeof window.getAllUsers === "function") {
      window.getAllUsers();
    }
  } else if (collectionType === "scanItems") {
    if (typeof window.getAllScanItems === "function") {
      window.getAllScanItems();
    }
  } else if (collectionType === "staff") {
    if (typeof window.getAllStaff === "function") {
      window.getAllStaff();
    }
  } else if (collectionType === "maker") {
    if (typeof window.getAllMaker === "function") {
      window.getAllMaker();
    }
  }
}

// 編集モーダルを閉じる
function closeEditModal() {
  const modal = document.getElementById("editDataModal");
  if (modal) {
    modal.remove();
  }
}

// ドキュメントを削除
export async function deleteDocumentById(collectionType, docId) {
  console.log(`削除実行: ${collectionType}/${docId}`);

  if (!currentAdmin || !currentAdmin.admin_id || !currentAdmin.event_id) {
    alert("管理者情報が設定されていません。");
    return;
  }

  try {
    showLoading("firestoreResult");

    // コレクション名の重複を避けるため、event_idが既にcollectionTypeを含んでいるかチェック
    let collectionName;
    if (currentAdmin.event_id.endsWith(`_${collectionType}`)) {
      // 既にcollectionTypeが含まれている場合はそのまま使用
      collectionName = currentAdmin.event_id;
    } else {
      // 含まれていない場合は追加
      collectionName = `${currentAdmin.event_id}_${collectionType}`;
    }

    console.log(`[DEBUG] Delete - Final collection name: ${collectionName}`);

    // 4セグメント構造でコレクション参照を取得
    const collectionRef = getAdminCollection(collectionName);
    const docRef = doc(collectionRef, docId);

    await deleteDoc(docRef);

    showResult(
      "firestoreResult",
      `${collectionType} ドキュメントを削除しました。`,
      "success"
    );

    // 該当コレクションを再表示
    if (collectionType === "items") {
      if (typeof window.getAllItems === "function") {
        window.getAllItems();
      }
    } else if (collectionType === "users") {
      if (typeof window.getAllUsers === "function") {
        window.getAllUsers();
      }
    } else if (collectionType === "scanItems") {
      if (typeof window.getAllScanItems === "function") {
        window.getAllScanItems();
      }
    } else if (collectionType === "staff") {
      if (typeof window.getAllStaff === "function") {
        window.getAllStaff();
      }
    } else if (collectionType === "maker") {
      if (typeof window.getAllMaker === "function") {
        window.getAllMaker();
      }
    }
  } catch (error) {
    console.error("deleteDocumentById error:", error);
    showResult("firestoreResult", `削除エラー: ${error.message}`, "error");
  }
}

// モーダルを閉じる（これは collection_type に依存しないため残す）
export function closeModal() {
  const modal = document.getElementById("addDataModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// グローバル公開
if (typeof window !== "undefined") {
  window.openEditModal = openEditModal;
  window.deleteDocumentById = deleteDocumentById;
  window.closeModal = closeModal;
  window.showEditModal = showEditModal;
  window.saveEditedDocument = saveEditedDocument;
  window.closeEditModal = closeEditModal;
}
