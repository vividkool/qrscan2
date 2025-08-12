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

// アップロードオプション選択モーダル
let selectedFile = null;

function showUploadOptionsModal(inputElement) {
  const file = inputElement.files[0];
  if (!file) return;

  selectedFile = file;

  // ファイル名を表示
  const fileNameDisplay = document.getElementById("uploadFileName");
  if (fileNameDisplay) {
    fileNameDisplay.textContent = `ファイル: ${file.name}`;
  }

  // モーダルを表示
  const modal = document.getElementById("uploadOptionsModal");
  if (modal) {
    modal.style.display = "block";
  }
}

function closeUploadOptionsModal() {
  const modal = document.getElementById("uploadOptionsModal");
  if (modal) {
    modal.style.display = "none";
  }
  selectedFile = null;

  // ファイル入力をクリア
  const fileInput = document.getElementById("excelFileInput");
  if (fileInput) {
    fileInput.value = "";
  }
}

function handleUploadOption(mode) {
  if (!selectedFile) {
    alert("ファイルが選択されていません。");
    return;
  }

  // モーダルを閉じる
  closeUploadOptionsModal();

  // アップロード実行
  uploadExcelFile(selectedFile, mode);
}

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
    } else if (collectionType === "staff") {
      instructionElement.textContent =
        "スタッフ情報を入力してください（名前、メール、役割など）";
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
  console.log("Selected template:", selectedValue);

  if (selectedValue === "items") {
    downloadItemsTemplateFromHosting();
  } else if (selectedValue === "users") {
    downloadUsersTemplateFromHosting();
  } else if (selectedValue === "staff") {
    console.log("Calling downloadStaffTemplateFromHosting...");
    downloadStaffTemplateFromHosting();
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
      console.log("No items data found, downloading empty template file...");
      // データが存在しない場合は、静的なテンプレートファイルをダウンロード
      await downloadItemsTemplate();

      const html = `
            <div style="color: green;">
                ✅ アイテムテンプレート (空) をダウンロードしました<br>
                <small>テンプレートファイルを編集して、アップロード機能で一括登録できます</small>
            </div>
        `;
      showResult("firestoreResult", html, "success");
      console.log("Empty items template download completed");
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
      console.log("No users data found, downloading empty template file...");
      // データが存在しない場合は、静的なテンプレートファイルをダウンロード
      await downloadUsersTemplate();

      const html = `
            <div style="color: green;">
                ✅ ユーザーテンプレート (空) をダウンロードしました<br>
                <small>テンプレートファイルを編集して、アップロード機能で一括登録できます</small>
            </div>
        `;
      showResult("firestoreResult", html, "success");
      console.log("Empty users template download completed");
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

async function downloadStaffTemplateFromHosting() {
  try {
    console.log("Starting staff template download from hosting...");
    showLoading("firestoreResult");

    // Firestoreからスタッフデータを取得
    const querySnapshot = await getDocs(collection(db, "staff"));
    console.log("Staff data query result:", querySnapshot.size, "documents");

    if (querySnapshot.empty) {
      console.log("No staff data found, downloading empty template file...");
      // データが存在しない場合は、静的なテンプレートファイルをダウンロード
      await downloadStaffTemplate();

      const html = `
            <div style="color: green;">
                ✅ スタッフテンプレート (空) をダウンロードしました<br>
                <small>テンプレートファイルを編集して、アップロード機能で一括登録できます</small>
            </div>
        `;
      showResult("firestoreResult", html, "success");
      console.log("Empty staff template download completed");
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
        phone: docData.phone || "",
        company_name: docData.company_name || "",
        status: docData.status || "",
        user_role: docData.user_role || "",
        print_status: docData.print_status || "",
        createdAt: docData.createdAt ? docData.createdAt.toDate() : new Date(),
      });
    });

    console.log("Staff data processed:", data.length, "items");

    // Excel形式でダウンロード
    await downloadStaffTemplate();

    const html = `
            <div style="color: green;">
                ✅ スタッフテンプレート (${data.length}件) をダウンロードしました<br>
                <small>テンプレートファイルを編集して、アップロード機能で一括登録できます</small>
            </div>
        `;
    showResult("firestoreResult", html, "success");

    console.log("Staff template download completed:", data.length, "staff");
  } catch (error) {
    console.error("Staff template download error:", error);
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

async function downloadStaffTemplate() {
  try {
    console.log("Attempting to download staff template...");
    const response = await fetch("templates/staff.xlsx");
    console.log("Fetch response:", response.status, response.statusText);

    if (!response.ok) {
      throw new Error(
        `テンプレートファイルが見つかりません (${response.status}: ${response.statusText})`
      );
    }

    const blob = await response.blob();
    console.log("Blob created:", blob.size, "bytes");

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "staff.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log("Staff template file downloaded successfully");
  } catch (error) {
    console.error("Staff template download error:", error);
    throw error;
  }
}

// ====== Excel ファイルアップロード処理 ======

async function uploadExcelFile(file, mode = "add") {
  if (!file) {
    showResult("firestoreResult", "ファイルが選択されていません", "error");
    return;
  }

  const fileExtension = file.name.split(".").pop().toLowerCase();
  const fileName = file.name.toLowerCase();

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

    // ファイル名に基づいて適切なシートとコレクションを自動判定
    let targetSheetName;
    let collectionType;

    if (fileName.includes("items.xlsx")) {
      targetSheetName = "items";
      collectionType = "items";
    } else if (fileName.includes("users.xlsx")) {
      targetSheetName = "users";
      collectionType = "users";
    } else if (fileName.includes("staff.xlsx")) {
      targetSheetName = "staff";
      collectionType = "users"; // staffはusersコレクションに保存
    } else {
      // ファイル名で判定できない場合は、最初のシートを使用
      targetSheetName = workbook.SheetNames[0];
      collectionType = "items"; // デフォルト
    }

    // 指定したシートが存在するかチェック
    if (!workbook.SheetNames.includes(targetSheetName)) {
      showResult(
        "firestoreResult",
        `指定されたシート「${targetSheetName}」が見つかりません。\n利用可能なシート: ${workbook.SheetNames.join(
          ", "
        )}`,
        "error"
      );
      return;
    }

    const worksheet = workbook.Sheets[targetSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      showResult(
        "firestoreResult",
        `シート「${targetSheetName}」にデータがありません`,
        "error"
      );
      return;
    }

    console.log(
      `Processing sheet: ${targetSheetName}, Collection: ${collectionType}, Rows: ${jsonData.length}, Mode: ${mode}`
    );

    // replaceモードの場合、既存データを全削除
    if (mode === "replace") {
      try {
        showLoading("firestoreResult");

        // 既存データを取得して削除
        const collectionRef = collection(db, collectionType);
        const snapshot = await getDocs(collectionRef);

        if (!snapshot.empty) {
          const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
          console.log(
            `Deleted ${snapshot.docs.length} existing documents from ${collectionType} collection`
          );
        }
      } catch (deleteError) {
        console.error("Error deleting existing data:", deleteError);
        showResult(
          "firestoreResult",
          `既存データの削除中にエラーが発生しました: ${deleteError.message}`,
          "error"
        );
        return;
      }
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
            item_no: row["item_no"] || row["アイテム番号"] || "",
            item_name: row["item_name"] || row["アイテム名"] || "",
            category_name: row["category_name"] || row["カテゴリ名"] || "",
            company_name: row["company_name"] || row["会社名"] || "",
            maker_code: row["maker_code"] || row["メーカーコード"] || "",
            price: row["price"] || row["価格"] || 0,
            standard: row["standard"] || row["規格"] || "",
            shape: row["shape"] || row["形状"] || "",
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        } else if (collectionType === "users") {
          documentData = {
            user_id: row["user_id"] || row["ユーザーID"] || "",
            user_name: row["user_name"] || row["ユーザー名"] || "",
            email: row["email"] || row["メール"] || "",
            phone: row["phone"] || row["電話番号"] || "",
            company_name: row["company_name"] || row["会社名"] || "",
            department: row["department"] || row["部署"] || "",
            status: row["status"] || row["ステータス"] || "",
            user_role: row["user_role"] || row["役割"] || "",
            print_status: row["print_status"] || row["印刷状況"] || "",
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        } else {
          throw new Error(`未対応のコレクションタイプ: ${collectionType}`);
        }

        await addDoc(collection(db, collectionType), documentData);
        successCount++;

        // デバッグ情報
        const displayId =
          documentData.item_no || documentData.user_id || `Row ${index + 1}`;
        console.log(`Saved to ${collectionType}: ${displayId}`);
      } catch (error) {
        errorCount++;
        errors.push(`行 ${index + 2}: ${error.message}`);
        console.error(`Row ${index + 2} error:`, error);
      }
    }

    // 結果表示
    const modeText = mode === "replace" ? "（全消去後）" : "（追加）";
    let resultMessage = `シート「${targetSheetName}」のアップロード完了${modeText}<br>`;
    resultMessage += `コレクション: ${collectionType}<br>`;
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
window.downloadStaffTemplate = downloadStaffTemplateFromHosting;

// アップロード関数
window.uploadExcelFile = uploadExcelFile;
window.showUploadOptionsModal = showUploadOptionsModal;
window.closeUploadOptionsModal = closeUploadOptionsModal;
window.handleUploadOption = handleUploadOption;

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
  downloadStaffTemplateFromHosting,
  uploadExcelFile,
  showUploadOptionsModal,
  closeUploadOptionsModal,
  handleUploadOption,
};
