// テンプレートダウンロード、アップロード、結果モーダル関連のユーティリティ

// Firebase imports - このファイル単体でも動作するようにimport
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ====== モーダル関連関数 ======

function showResult(elementId, message, type = "") {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<div class="${type}">${message}</div>`;
  }
}

function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<div class="loading">読み込み中...</div>';
  }
}

function showDownloadResultModal(message, type = "") {
  showResult("firestoreResult", message, type);
}

function closeDownloadResultModal() {
  const modal = document.getElementById("downloadResultModal");
  const result = document.getElementById("downloadResult");
  if (modal) {
    modal.style.display = "none";
  }
  if (result) {
    result.textContent = "";
    result.className = "result";
    result.style.display = "none";
  }
}

function openAddDataModal(collectionType) {
  const modal = document.getElementById("addDataModal");
  const titleElement = document.getElementById("modalTitle");
  const instructionElement = document.getElementById("modalInstruction");

  if (modal && titleElement && instructionElement) {
    titleElement.textContent = `${collectionType} データを追加`;

    if (collectionType === "items") {
      instructionElement.textContent =
        "アイテム情報を入力してください（名前、説明、カテゴリなど）";
    } else if (collectionType === "users") {
      instructionElement.textContent =
        "ユーザー情報を入力してください（名前、メール、役割など）";
    } else {
      instructionElement.textContent = "データを入力してください";
    }

    modal.style.display = "block";
  }
}

function closeModal() {
  const modal = document.getElementById("addDataModal");
  if (modal) {
    modal.style.display = "none";
  }
  // フォームをクリア
  const form = document.getElementById("modalForm");
  if (form) {
    form.innerHTML = "";
  }
}

function submitAddData() {
  // この関数は firebase-index-new.js で実装される予定
  console.warn("submitAddData function not implemented yet");
}

// ====== テンプレートダウンロード関数 ======

function downloadSelectedTemplate() {
  const select = document.getElementById("templateSelect");
  const selectedValue = select.value;
  if (selectedValue === "items") {
    downloadItemsTemplateFromHosting();
  } else if (selectedValue === "users") {
    downloadUsersTemplateFromHosting();
  } else {
    showDownloadResultModal("未対応のコレクションです", "error");
  }
}

async function downloadItemsTemplateFromHosting() {
  try {
    showLoading("firestoreResult");

    // Firestoreからアイテムデータを取得
    const querySnapshot = await getDocs(collection(db, "items"));

    if (querySnapshot.empty) {
      showResult("firestoreResult", "アイテムデータがありません", "error");
      return;
    }

    const data = [];
    querySnapshot.forEach((doc) => {
      const docData = doc.data();
      data.push({
        id: doc.id,
        name: docData.name || "",
        description: docData.description || "",
        category: docData.category || "",
        price: docData.price || "",
        stock: docData.stock || "",
        createdAt: docData.createdAt ? docData.createdAt.toDate() : new Date(),
      });
    });

    // Excel形式でダウンロード
    await downloadItemsTemplate();

    const html = `
            <div style="color: green;">
                ✅ アイテムテンプレート (${data.length}件) をダウンロードしました<br>
                <small>テンプレートファイルを編集して、アップロード機能で一括登録できます</small>
            </div>
        `;
    showResult("firestoreResult", html, "success");

    console.log("Items template download completed:", data.length, "items");
  } catch (error) {
    console.error("Items template download error:", error);
    showResult("firestoreResult", `取得エラー: ${error.message}`, "error");
  }
}

async function downloadUsersTemplateFromHosting() {
  try {
    showLoading("firestoreResult");

    // Firestoreからユーザーデータを取得
    const querySnapshot = await getDocs(collection(db, "users"));

    if (querySnapshot.empty) {
      showResult("firestoreResult", "ユーザーデータがありません", "error");
      return;
    }

    const data = [];
    querySnapshot.forEach((doc) => {
      const docData = doc.data();
      data.push({
        id: doc.id,
        user_id: docData.user_id || "",
        user_name: docData.user_name || "",
        email: docData.email || "",
        role: docData.role || "",
        department: docData.department || "",
        createdAt: docData.createdAt ? docData.createdAt.toDate() : new Date(),
      });
    });

    // Excel形式でダウンロード
    await downloadUsersTemplate();

    const html = `
            <div style="color: green;">
                ✅ ユーザーテンプレート (${data.length}件) をダウンロードしました<br>
                <small>テンプレートファイルを編集して、アップロード機能で一括登録できます</small>
            </div>
        `;
    showResult("firestoreResult", html, "success");

    console.log("Users template download completed:", data.length, "users");
  } catch (error) {
    console.error("Users template download error:", error);
    showResult("firestoreResult", `取得エラー: ${error.message}`, "error");
  }
}

// ====== Excel テンプレート生成関数 ======

async function downloadItemsTemplate() {
  try {
    const response = await fetch("templates/items.xlsx");
    if (!response.ok) {
      throw new Error("テンプレートファイルが見つかりません");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "items.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log("Items template file downloaded");
  } catch (error) {
    console.error("Items template download error:", error);
    throw error;
  }
}

async function downloadUsersTemplate() {
  try {
    const response = await fetch("templates/users.xlsx");
    if (!response.ok) {
      throw new Error("テンプレートファイルが見つかりません");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "users.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log("Users template file downloaded");
  } catch (error) {
    console.error("Users template download error:", error);
    throw error;
  }
}

// ====== Excel ファイルアップロード処理 ======

async function uploadExcelFile(collectionType, fileInput) {
  if (!fileInput.files || fileInput.files.length === 0) {
    showResult("firestoreResult", "ファイルが選択されていません", "error");
    return;
  }

  const file = fileInput.files[0];
  const fileExtension = file.name.split(".").pop().toLowerCase();

  if (fileExtension !== "xlsx" && fileExtension !== "xls") {
    showResult(
      "firestoreResult",
      "Excelファイル (.xlsx または .xls) を選択してください",
      "error"
    );
    return;
  }

  try {
    showLoading("firestoreResult");

    // SheetJS ライブラリを動的に読み込み
    if (typeof XLSX === "undefined") {
      await loadSheetJS();
    }

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      showResult(
        "firestoreResult",
        "Excelファイルにデータがありません",
        "error"
      );
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // データを1件ずつFirestoreに保存
    for (const [index, row] of jsonData.entries()) {
      try {
        let documentData;

        if (collectionType === "items") {
          documentData = {
            name: row["name"] || row["名前"] || "",
            description: row["description"] || row["説明"] || "",
            category: row["category"] || row["カテゴリ"] || "",
            price: row["price"] || row["価格"] || 0,
            stock: row["stock"] || row["在庫"] || 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        } else if (collectionType === "users") {
          documentData = {
            user_id: row["user_id"] || row["ユーザーID"] || "",
            user_name: row["user_name"] || row["ユーザー名"] || "",
            email: row["email"] || row["メール"] || "",
            role: row["role"] || row["役割"] || "",
            department: row["department"] || row["部署"] || "",
            password: row["password"] || row["パスワード"] || "password123",
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        } else {
          throw new Error(`未対応のコレクションタイプ: ${collectionType}`);
        }

        await addDoc(collection(db, collectionType), documentData);
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(`行 ${index + 2}: ${error.message}`);
        console.error(`Row ${index + 2} error:`, error);
      }
    }

    // 結果表示
    let resultMessage = `アップロード完了<br>`;
    resultMessage += `成功: ${successCount}件<br>`;
    if (errorCount > 0) {
      resultMessage += `エラー: ${errorCount}件<br>`;
      resultMessage += `<details><summary>エラー詳細</summary>${errors
        .slice(0, 10)
        .join("<br>")}</details>`;
    }

    showResult(
      "firestoreResult",
      resultMessage,
      successCount > 0 ? "success" : "error"
    );

    // ファイル入力をクリア
    fileInput.value = "";

    console.log(
      `Upload completed: ${successCount} success, ${errorCount} errors`
    );
  } catch (error) {
    console.error("Upload error:", error);
    showResult(
      "firestoreResult",
      `アップロードエラー: ${error.message}`,
      "error"
    );
  }
}

// SheetJS ライブラリを動的に読み込む関数
async function loadSheetJS() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ====== グローバル関数として公開 ======

// モーダル関数
window.showResult = showResult;
window.showLoading = showLoading;
window.showDownloadResultModal = showDownloadResultModal;
window.closeDownloadResultModal = closeDownloadResultModal;
window.openAddDataModal = openAddDataModal;
window.closeModal = closeModal;
window.submitAddData = submitAddData;

// テンプレートダウンロード関数
window.downloadSelectedTemplate = downloadSelectedTemplate;
window.downloadItemsTemplate = downloadItemsTemplateFromHosting;
window.downloadUsersTemplate = downloadUsersTemplateFromHosting;

// アップロード関数
window.uploadExcelFile = uploadExcelFile;

console.log(
  "Template Utils (テンプレート・モーダル・アップロード機能) が初期化されました"
);

// ES6モジュールとしてもエクスポート
export {
  showResult,
  showLoading,
  showDownloadResultModal,
  closeDownloadResultModal,
  openAddDataModal,
  closeModal,
  submitAddData,
  downloadSelectedTemplate,
  downloadItemsTemplateFromHosting,
  downloadUsersTemplateFromHosting,
  uploadExcelFile,
};
