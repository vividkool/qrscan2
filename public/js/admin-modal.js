// Admin Modal & Data Management Functions (Firebase Auth専用版)
import {
    getFirestore,
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    setDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebaseの設定を取得（admin.jsから）
let db, currentAdmin, currentCollectionType;

// admin.jsからの依存関数を受け取る初期化関数
export function initializeAdminModal(firestore, adminData, collectionType) {
    db = firestore;
    currentAdmin = adminData;
    currentCollectionType = collectionType;
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

// admin.jsからコレクション参照を取得（3層構造対応）
function getAdminCollection(collectionName) {
    if (!currentAdmin || !currentAdmin.admin_id || !currentAdmin.event_id) {
        throw new Error("Admin認証またはevent_id が必要です");
    }

    const adminPath = `admin_collections/${currentAdmin.admin_id}/${currentAdmin.event_id}/${collectionName}`;
    console.log(`[DEBUG] Admin collection path (3-tier): ${adminPath}`);

    return collection(
        db,
        "admin_collections",
        currentAdmin.admin_id,
        currentAdmin.event_id,
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

        const adminCollection = getAdminCollection(collectionName);
        const docRef = doc(adminCollection._delegate._path.segments[0], adminCollection._delegate._path.segments[1], adminCollection._delegate._path.segments[2], docId);

        await deleteDoc(docRef);

        showResult(
            "firestoreResult",
            `「${displayName}」を削除しました`,
            "success"
        );

        // 該当コレクションを再表示
        if (collectionName === "items") {
            // admin.jsのgetAllItems()を呼び出す
            if (typeof window.getAllItems === 'function') {
                window.getAllItems();
            }
        } else if (collectionName === "users") {
            if (typeof window.getAllUsers === 'function') {
                window.getAllUsers();
            }
        } else if (collectionName === "scanItems") {
            if (typeof window.getAllScanItems === 'function') {
                window.getAllScanItems();
            }
        } else if (collectionName === "staff") {
            if (typeof window.getAllStaff === 'function') {
                window.getAllStaff();
            }
        } else if (collectionName === "maker") {
            if (typeof window.getAllMaker === 'function') {
                window.getAllMaker();
            }
        }
    } catch (error) {
        console.error("deleteDocument error:", error);
        showResult("firestoreResult", `削除エラー: ${error.message}`, "error");
    }
}

// ============================================================================
// モーダル関連関数
// ============================================================================

// データ追加ボタン処理
export function addToCurrentCollection() {
    // admin.jsからcurrentCollectionTypeを動的に取得
    const collectionType = window.currentCollectionType;

    if (!collectionType) {
        showResult("firestoreResult", "コレクションを選択してください", "error");
        return;
    }

    // モーダルを開く
    openAddDataModal(collectionType);
}

// モーダルを開く関数
export function openAddDataModal(collectionType) {
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
    } else if (collectionType === "users" || collectionType === "staff" || collectionType === "maker") {
        const roleOption = collectionType === "staff" ? "staff" : (collectionType === "maker" ? "maker" : "user");

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
            <option value="user" ${roleOption === 'user' ? 'selected' : ''}>User</option>
            <option value="admin">Admin</option>
            <option value="staff" ${roleOption === 'staff' ? 'selected' : ''}>Staff</option>
            <option value="maker" ${roleOption === 'maker' ? 'selected' : ''}>Maker</option>
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

// データ送信（追加）
export async function submitAddData() {
    try {
        showLoading("firestoreResult");

        // admin.jsからcurrentCollectionTypeを動的に取得
        const collectionType = window.currentCollectionType;

        if (!collectionType) {
            showResult("firestoreResult", "コレクションが選択されていません", "error");
            return;
        }

        let data = {};

        if (collectionType === "items") {
            const itemNo = document.getElementById("modal_item_no").value;
            const categoryName = document.getElementById("modal_category_name").value;
            const companyName = document.getElementById("modal_company_name").value;
            const itemName = document.getElementById("modal_item_name").value;
            const makerCode = document.getElementById("modal_maker_code").value;

            if (!itemNo || !itemName) {
                showResult("firestoreResult", "アイテム番号とアイテム名は必須です", "error");
                return;
            }

            data = {
                item_no: itemNo,
                category_name: categoryName,
                company_name: companyName,
                item_name: itemName,
                maker_code: makerCode,
                created_at: serverTimestamp(),
            };
        } else if (collectionType === "users" || collectionType === "staff" || collectionType === "maker") {
            const userId = document.getElementById("modal_user_id").value;
            const userName = document.getElementById("modal_user_name").value;
            const email = document.getElementById("modal_email").value;
            const phone = document.getElementById("modal_phone").value;
            const companyName = document.getElementById("modal_company_name").value;
            const status = document.getElementById("modal_status").value;
            const userRole = document.getElementById("modal_user_role").value;
            const printStatus = document.getElementById("modal_print_status").value;

            if (!userId || !userName) {
                showResult("firestoreResult", "ユーザーIDとユーザー名は必須です", "error");
                return;
            }

            data = {
                user_id: userId,
                user_name: userName,
                email: email,
                phone: phone,
                company_name: companyName,
                status: status,
                user_role: userRole,
                print_status: printStatus,
                created_at: serverTimestamp(),
            };
        }

        // Admin別コレクションにデータを追加
        const adminCollection = getAdminCollection(collectionType);
        const docRef = await addDoc(adminCollection, data);

        showResult(
            "firestoreResult",
            `データが追加されました: ${docRef.id}`,
            "success"
        );

        // モーダルを閉じる
        closeModal();

        // 該当コレクションを再表示
        if (collectionType === "items" && typeof window.getAllItems === 'function') {
            window.getAllItems();
        } else if (collectionType === "users" && typeof window.getAllUsers === 'function') {
            window.getAllUsers();
        } else if (collectionType === "staff" && typeof window.getAllStaff === 'function') {
            window.getAllStaff();
        } else if (collectionType === "maker" && typeof window.getAllMaker === 'function') {
            window.getAllMaker();
        }

    } catch (error) {
        console.error("submitAddData error:", error);
        showResult("firestoreResult", `追加エラー: ${error.message}`, "error");
    }
}

// 編集ドキュメント関数
export async function editDocument(collectionName, docId, displayName) {
    // 編集機能の実装（既存コードから移植）
    console.log(`編集機能: ${collectionName}, ${docId}, ${displayName}`);
    // TODO: 編集モーダルの実装
}

// 編集データ送信
export async function submitEditData() {
    // 編集送信の実装（既存コードから移植）
    console.log("編集データ送信");
    // TODO: 編集データ送信の実装
}

// モーダルを閉じる
export function closeModal() {
    const modal = document.getElementById("addDataModal");
    if (modal) {
        modal.style.display = "none";
    }
}

// グローバル関数として公開（下位互換性のため）
if (typeof window !== "undefined") {
    window.addDocument = addDocument;
    window.deleteDocument = deleteDocument;
    window.addToCurrentCollection = addToCurrentCollection;
    window.openAddDataModal = openAddDataModal;
    window.submitAddData = submitAddData;
    window.editDocument = editDocument;
    window.submitEditData = submitEditData;
    window.closeModal = closeModal;
}
