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

    // 4セグメント構造: admin_collections/{admin_id}/{event_id}_{collectionName}
    const collectionKey = `${currentAdmin.event_id}_${collectionName}`;
    const adminPath = `admin_collections/${currentAdmin.admin_id}/${collectionKey}`;
    console.log(`[DEBUG] Admin collection path (4セグメント): ${adminPath}`);

    return collection(
        db,
        "admin_collections",
        currentAdmin.admin_id,
        collectionKey
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



// モーダルを閉じる（これは collection_type に依存しないため残す）
export function closeModal() {
    const modal = document.getElementById("addDataModal");
    if (modal) {
        modal.style.display = "none";
    }
}
