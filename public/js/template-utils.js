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
  console.log("[DEBUG] showUploadOptionsModal called with:", inputElement);
  const file = inputElement.files[0];
  console.log("[DEBUG] Selected file from input:", file);

  if (!file) {
    console.error("[DEBUG] No file found in input element");
    return;
  }

  selectedFile = file;
  console.log("[DEBUG] selectedFile set to:", selectedFile);
  console.log("[DEBUG] selectedFile name:", selectedFile.name);
  console.log("[DEBUG] selectedFile size:", selectedFile.size);

  // ファイル名を表示
  const fileNameDisplay = document.getElementById("uploadFileName");
  if (fileNameDisplay) {
    fileNameDisplay.textContent = `ファイル: ${file.name}`;
    console.log("[DEBUG] File name displayed in modal");
  } else {
    console.warn("[DEBUG] uploadFileName element not found");
  }

  // モーダルを表示
  const modal = document.getElementById("uploadOptionsModal");
  if (modal) {
    modal.style.display = "block";
    console.log("[DEBUG] Upload options modal displayed");
  } else {
    console.error("[DEBUG] uploadOptionsModal element not found");
  }
}

function closeUploadOptionsModal() {
  const modal = document.getElementById("uploadOptionsModal");
  if (modal) {
    modal.style.display = "none";
  }
  // selectedFile = null; // アップロード完了後までnullにしない
  console.log(
    "[DEBUG] Upload options modal closed, selectedFile preserved:",
    selectedFile
  );

  // ファイル入力はクリアしない（アップロード完了後にクリア）
  // const fileInput = document.getElementById("excelFileInput");
  // if (fileInput) {
  //   fileInput.value = "";
  // }
}

function handleUploadOption(mode) {
  console.log("[DEBUG] handleUploadOption called with mode:", mode);
  console.log("[DEBUG] selectedFile:", selectedFile);

  if (!selectedFile) {
    console.error("[DEBUG] selectedFile is null or undefined");
    alert("ファイルが選択されていません。");
    return;
  }

  // replaceモードでusersファイルの場合、特別な警告を表示
  if (mode === "replace" && selectedFile.name.toLowerCase().includes("user")) {
    const confirmMessage = `⚠️ 重要な警告 ⚠️

「完全上書き」モードでユーザーファイルをアップロードしようとしています。

🛡️ セーフティ機能:
• adminロールのユーザーは自動的に保護されます
• 既存のadmin以外のユーザーは全て削除されます

このまま続行しますか？`;

    if (!confirm(confirmMessage)) {
      closeUploadOptionsModal();
      return;
    }
  }

  // モーダルを閉じる
  closeUploadOptionsModal();

  // アップロード実行
  console.log("[DEBUG] Calling uploadExcelFile with:", {
    file: selectedFile,
    mode,
  });
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

  if (selectedValue === "scanItems") {
    console.log("Calling downloadScanItemsTemplateFromHosting...");
    downloadScanItemsTemplateFromHosting();
  } else if (selectedValue === "items") {
    downloadItemsTemplateFromHosting();
  } else if (selectedValue === "users") {
    downloadUsersTemplateFromHosting();
  } else if (selectedValue === "staff") {
    console.log("Calling downloadStaffTemplateFromHosting...");
    downloadStaffTemplateFromHosting();
  } else if (selectedValue === "maker") {
    console.log("Calling downloadMakerTemplateFromHosting...");
    downloadMakerTemplateFromHosting();
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
        user_id: String(docData.user_id || ""), // 文字列に変換
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
        user_id: String(docData.user_id || ""), // 文字列に変換
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

async function downloadMakerTemplateFromHosting() {
  try {
    showLoading("firestoreResult");

    // 静的テンプレートファイルをダウンロード（空のコレクションでも対応）
    try {
      console.log("Downloading static maker template...");
      const response = await fetch("templates/maker.xlsx");

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "maker_template.xlsx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        const html = `
          <div style="color: green;">
              ✅ Makerテンプレートをダウンロードしました<br>
              <small>テンプレートファイルを編集して、アップロード機能で一括登録できます（usersコレクションに追加されます）</small>
          </div>
        `;
        showResult("firestoreResult", html, "success");
        console.log("Maker template download completed (static file)");
        return;
      }
    } catch (staticError) {
      console.log(
        "Static template download failed, creating dynamic template:",
        staticError
      );
    }

    // 静的ファイルがない場合は動的に生成
    await downloadMakerTemplate();

    const html = `
            <div style="color: green;">
                ✅ Makerテンプレートを生成してダウンロードしました<br>
                <small>テンプレートファイルを編集して、アップロード機能で一括登録できます（usersコレクションに追加されます）</small>
            </div>
        `;
    showResult("firestoreResult", html, "success");

    console.log("Maker template generation completed");
  } catch (error) {
    console.error("Maker template download error:", error);
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

async function downloadMakerTemplate() {
  try {
    console.log("Attempting to download maker template...");
    const response = await fetch("templates/maker.xlsx");
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
    a.download = "maker.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log("Maker template file downloaded successfully");
  } catch (error) {
    console.error("Maker template download error:", error);
    throw error;
  }
}

async function downloadScanItemsTemplateFromHosting() {
  try {
    showLoading("firestoreResult");

    // 静的テンプレートファイルをダウンロード
    try {
      console.log("Downloading static scanItems template...");

      // scanItemsテンプレートが存在しない場合は動的に作成
      const response = await fetch("templates/scanItems.xlsx");
      let blob;

      if (response.ok) {
        blob = await response.blob();
      } else {
        // テンプレートファイルが存在しない場合は動的作成
        console.log("Static template not found, creating dynamic template...");
        blob = await createScanItemsTemplate();
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "scanItems_template.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      const html = `
        <div style="color: green;">
            ✅ ScanItemsテンプレートをダウンロードしました<br>
            <small>テンプレートファイルを編集して、アップロード機能でテストデータを一括登録できます（scanItemsコレクションに追加されます）</small>
        </div>
      `;
      showResult("firestoreResult", html);
    } catch (err) {
      console.error("Template download failed:", err);
      throw err;
    }
  } catch (error) {
    console.error("ScanItems template download error:", error);
    showResult("firestoreResult", `取得エラー: ${error.message}`, "error");
  }
}

// scanItemsのテンプレートを動的作成
async function createScanItemsTemplate() {
  // ExcelJSを使用してテンプレートを作成（シンプルバージョン）
  const templateData = [
    ["scan_id", "item_no", "user_id", "user_name", "scan_time", "location"],
    [
      "SCAN001",
      "ITEM001",
      "USER001",
      "テストユーザー1",
      "2025-01-01T10:00:00",
      "倉庫A",
    ],
    [
      "SCAN002",
      "ITEM002",
      "USER002",
      "テストユーザー2",
      "2025-01-01T11:00:00",
      "倉庫B",
    ],
    [
      "SCAN003",
      "ITEM001",
      "USER003",
      "テストユーザー3",
      "2025-01-01T12:00:00",
      "倉庫A",
    ],
    // 追加のサンプルデータ
    [
      "SCAN004",
      "ITEM003",
      "USER001",
      "テストユーザー1",
      "2025-01-01T13:00:00",
      "倉庫C",
    ],
    [
      "SCAN005",
      "ITEM002",
      "USER004",
      "テストユーザー4",
      "2025-01-01T14:00:00",
      "倉庫B",
    ],
  ];

  // CSV形式の文字列を作成
  const csvContent = templateData.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  return blob;
}

// ====== Excel ファイルアップロード処理 ======

async function uploadExcelFile(file, mode = "add") {
  console.log("[DEBUG] uploadExcelFile called with:", {
    fileName: file?.name,
    mode,
  });

  // 変数の初期化
  let protectedAdminCount = 0; // admin保護数を追跡

  if (!file) {
    console.error("[DEBUG] No file provided");
    showResult("firestoreResult", "ファイルが選択されていません", "error");
    return;
  }

  const fileExtension = file.name.split(".").pop().toLowerCase();
  const fileName = file.name.toLowerCase();

  console.log("[DEBUG] File details:", {
    originalName: file.name,
    fileName,
    fileExtension,
    fileSize: file.size,
  });

  if (fileExtension !== "xlsx" && fileExtension !== "xls") {
    console.error("[DEBUG] Invalid file extension:", fileExtension);
    showResult(
      "firestoreResult",
      "Excelファイル (.xlsx または .xls) を選択してください",
      "error"
    );
    return;
  }

  try {
    console.log("[DEBUG] Starting file processing...");
    showLoading("firestoreResult");

    // SheetJS ライブラリを動的に読み込み
    if (typeof XLSX === "undefined") {
      await loadSheetJS();
    }

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });

    console.log("[DEBUG] Upload file processing:");
    console.log("- File name:", fileName);
    console.log("- Available sheets:", workbook.SheetNames);

    // ファイル名に基づいて適切なシートとコレクションを自動判定
    // 注意: より具体的な判定から先に行う（scanItems.xlsxがitems.xlsxにマッチしないように）
    let targetSheetName;
    let collectionType;

    if (
      fileName.includes("scanitems.xlsx") ||
      fileName.includes("scanItems.xlsx")
    ) {
      targetSheetName = "scanItems";
      collectionType = "scanItems";
      console.log("[DEBUG] Detected scanItems.xlsx file");
    } else if (fileName.includes("items.xlsx")) {
      targetSheetName = "items";
      collectionType = "items";
      console.log("[DEBUG] Detected items.xlsx file");
    } else if (fileName.includes("users.xlsx")) {
      targetSheetName = "users";
      collectionType = "users";
      console.log("[DEBUG] Detected users.xlsx file");
    } else if (fileName.includes("staff.xlsx")) {
      targetSheetName = "staff";
      collectionType = "users"; // staffはusersコレクションに保存
      console.log("[DEBUG] Detected staff.xlsx file");
    } else if (fileName.includes("maker.xlsx")) {
      targetSheetName = "maker";
      collectionType = "users"; // makerはusersコレクションに保存
      console.log("[DEBUG] Detected maker.xlsx file");
    } else {
      // ファイル名で判定できない場合は、最初のシートを使用
      targetSheetName = workbook.SheetNames[0];
      collectionType = "items"; // デフォルト
      console.log(
        "[DEBUG] Unknown file type, using first sheet:",
        targetSheetName
      );
    }

    console.log("[DEBUG] Target settings:");
    console.log("- Target sheet:", targetSheetName);
    console.log("- Collection type:", collectionType);

    // 指定したシートが存在するかチェック
    if (!workbook.SheetNames.includes(targetSheetName)) {
      console.error(
        "[DEBUG] Sheet not found:",
        targetSheetName,
        "Available:",
        workbook.SheetNames
      );
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

    console.log("[DEBUG] Sheet data processing:");
    console.log("- Worksheet found:", !!worksheet);
    console.log("- JSON data length:", jsonData.length);
    console.log("- First row sample:", jsonData[0]);

    if (jsonData.length === 0) {
      console.error("[DEBUG] No data found in sheet:", targetSheetName);
      showResult(
        "firestoreResult",
        `シート「${targetSheetName}」にデータがありません`,
        "error"
      );
      return;
    }

    console.log(
      `[DEBUG] Processing sheet: ${targetSheetName}, Collection: ${collectionType}, Rows: ${jsonData.length}, Mode: ${mode}`
    );

    // replaceモードの場合、既存データを全削除（adminユーザー除く）
    if (mode === "replace") {
      try {
        showLoading("firestoreResult");

        // 既存データを取得して削除
        const collectionRef = collection(db, collectionType);
        const snapshot = await getDocs(collectionRef);

        if (!snapshot.empty) {
          const deletePromises = [];

          // usersコレクションの場合、ファイル種別に応じて特定のロールのみ削除
          if (collectionType === "users") {
            let targetRole = null;
            let fileTypeDescription = "";

            // ファイル名に基づいて削除対象のロールを決定（より具体的な判定から先に）
            if (fileName.includes("staff.xlsx")) {
              targetRole = "staff";
              fileTypeDescription = "staffロール";
            } else if (fileName.includes("maker.xlsx")) {
              targetRole = "maker";
              fileTypeDescription = "makerロール";
            } else if (fileName.includes("users.xlsx")) {
              targetRole = "user";
              fileTypeDescription = "userロール";
            }

            console.log(
              `[DEBUG] Replace mode for users collection - Target role: ${targetRole}`
            );

            snapshot.docs.forEach((doc) => {
              const userData = doc.data();

              // adminロールのユーザーは常に保護
              if (userData.role === "admin" || userData.user_role === "admin") {
                protectedAdminCount++;
                console.log(
                  `Admin user protected: ${
                    userData.user_name || userData.name
                  } (ID: ${userData.user_id})`
                );
              }
              // 対象ロールのユーザーのみ削除
              else if (
                targetRole &&
                (userData.role === targetRole ||
                  userData.user_role === targetRole)
              ) {
                deletePromises.push(deleteDoc(doc.ref));
                console.log(
                  `${fileTypeDescription}ユーザーを削除対象に追加: ${
                    userData.user_name || userData.name
                  } (ID: ${userData.user_id})`
                );
              }
              // その他のロールは保持
              else {
                console.log(
                  `Other role user preserved: ${
                    userData.user_name || userData.name
                  } (Role: ${userData.role || userData.user_role})`
                );
              }
            });

            console.log(
              `[DEBUG] ${fileTypeDescription}の${deletePromises.length}件を削除対象に設定`
            );
          } else if (collectionType === "scanItems") {
            // scanItemsコレクションは全削除（adminプロテクションなし）
            snapshot.docs.forEach((doc) => {
              deletePromises.push(deleteDoc(doc.ref));
            });
            console.log(
              `[DEBUG] scanItemsコレクションの${deletePromises.length}件を削除対象に設定`
            );
          } else {
            // その他のコレクションは全削除
            snapshot.docs.forEach((doc) => {
              deletePromises.push(deleteDoc(doc.ref));
            });
          }

          await Promise.all(deletePromises);
          console.log(
            `Deleted ${deletePromises.length} documents from ${collectionType} collection`
          );

          if (protectedAdminCount > 0) {
            console.log(
              `Protected ${protectedAdminCount} admin users from deletion`
            );
          }
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
        console.log(`[DEBUG] Processing row ${index + 1}:`, row);

        let documentData;

        if (collectionType === "items") {
          // item_noを4桁の文字列形式に変換
          let itemNo = row["item_no"] || row["アイテム番号"] || "";
          if (itemNo && !isNaN(itemNo)) {
            // 数値の場合は4桁にパディングして文字列に変換
            itemNo = String(itemNo).padStart(4, "0");
          } else if (itemNo) {
            // 既に文字列の場合はそのまま使用
            itemNo = String(itemNo);
          }

          documentData = {
            item_no: itemNo,
            item_name: row["item_name"] || row["アイテム名"] || "",
            category_name: row["category_name"] || row["カテゴリ名"] || "",
            company_name: row["company_name"] || row["会社名"] || "",
            maker_code: row["maker_code"] || row["メーカーコード"] || "",
          };
          console.log(
            `[DEBUG] Created items document with formatted item_no:`,
            documentData
          );
        } else if (collectionType === "scanItems") {
          // scanItemsコレクション用のデータ処理
          documentData = {
            scan_id:
              row["scan_id"] ||
              row["スキャンID"] ||
              `SCAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            item_no: String(row["item_no"] || row["アイテム番号"] || ""),
            user_id: String(row["user_id"] || row["ユーザーID"] || ""),
            user_name: row["user_name"] || row["ユーザー名"] || "",
            scan_time:
              row["scan_time"] ||
              row["スキャン時間"] ||
              new Date().toISOString(),
            location: row["location"] || row["場所"] || "",
            // 追加フィールド
            timestamp: row["timestamp"] || new Date().toISOString(),
            device_info:
              row["device_info"] || row["デバイス情報"] || "Excel Upload",
          };
          console.log(`[DEBUG] Created scanItems document:`, documentData);
        } else if (collectionType === "users") {
          // ファイル名に基づいて適切なroleを設定（より具体的な判定から先に）
          let defaultRole = "";
          if (fileName.includes("staff.xlsx")) {
            defaultRole = "staff";
          } else if (fileName.includes("maker.xlsx")) {
            defaultRole = "maker";
          } else if (fileName.includes("users.xlsx")) {
            defaultRole = "user";
          }

          documentData = {
            user_id: String(row["user_id"] || row["ユーザーID"] || ""), // 文字列に変換
            user_name: row["user_name"] || row["ユーザー名"] || "",
            email: row["email"] || row["メール"] || "",
            phone: row["phone"] || row["電話番号"] || "",
            company_name: row["company_name"] || row["会社名"] || "",
            department: row["department"] || row["部署"] || "",
            status: row["status"] || row["ステータス"] || "",
            // Excelファイルで指定されたroleがあればそれを使用、なければファイル種別に基づくデフォルトroleを使用
            user_role: row["user_role"] || row["役割"] || defaultRole,
            role: row["role"] || row["user_role"] || row["役割"] || defaultRole, // roleフィールドも設定
            print_status: row["print_status"] || row["印刷状況"] || "",
          };
          console.log(
            `[DEBUG] Created users document with role '${documentData.role}':`,
            documentData
          );
        } else {
          console.error(`[DEBUG] Unsupported collection type:`, collectionType);
          throw new Error(`未対応のコレクションタイプ: ${collectionType}`);
        }

        console.log(
          `[DEBUG] Saving to Firestore collection '${collectionType}':`,
          documentData
        );
        await addDoc(collection(db, collectionType), documentData);
        successCount++;
        console.log(
          `[DEBUG] Successfully saved row ${index + 1} to ${collectionType}`
        );

        // デバッグ情報
        const displayId =
          documentData.item_no || documentData.user_id || `Row ${index + 1}`;
        console.log(
          `[DEBUG] Saved document: ${displayId} to ${collectionType}`
        );
      } catch (error) {
        errorCount++;
        console.error(`[DEBUG] Error processing row ${index + 2}:`, error);
        console.error(`[DEBUG] Row data:`, row);
        console.error(`[DEBUG] Target collection:`, collectionType);
        errors.push(`行 ${index + 2}: ${error.message}`);
      }
    }

    console.log(
      `[DEBUG] Upload completed - Success: ${successCount}, Errors: ${errorCount}`
    );
    console.log(`[DEBUG] Final results for ${collectionType} collection`);

    // 結果表示
    let modeText = "";
    if (mode === "replace") {
      if (collectionType === "users") {
        let targetRoleText = "";
        if (fileName.includes("staff.xlsx")) {
          targetRoleText = "staffロール";
        } else if (fileName.includes("maker.xlsx")) {
          targetRoleText = "makerロール";
        } else if (fileName.includes("users.xlsx")) {
          targetRoleText = "userロール";
        }
        modeText = `（${targetRoleText}のみ削除後追加）`;
      } else {
        modeText = "（全消去後）";
      }
    } else {
      modeText = "（追加）";
    }

    let resultMessage = `シート「${targetSheetName}」のアップロード完了${modeText}<br>`;
    resultMessage += `コレクション: ${collectionType}<br>`;
    resultMessage += `成功: ${successCount}件<br>`;

    // admin保護の情報を表示
    if (
      mode === "replace" &&
      collectionType === "users" &&
      protectedAdminCount > 0
    ) {
      resultMessage += `🛡️ 保護されたadminユーザー: ${protectedAdminCount}件<br>`;
    }

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
      `[DEBUG] Upload summary - Collection: ${collectionType}, Success: ${successCount}, Errors: ${errorCount}`
    );

    // アップロード完了後にファイル情報をクリア
    selectedFile = null;
    const fileInput = document.getElementById("excelFileInput");
    if (fileInput) {
      fileInput.value = "";
    }
    console.log(
      "[DEBUG] selectedFile and file input cleared after upload completion"
    );
  } catch (error) {
    console.error("[DEBUG] Upload error occurred:", error);

    // エラー時もファイル情報をクリア
    selectedFile = null;
    const fileInput = document.getElementById("excelFileInput");
    if (fileInput) {
      fileInput.value = "";
    }

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
window.downloadMakerTemplate = downloadMakerTemplateFromHosting;
window.downloadScanItemsTemplate = downloadScanItemsTemplateFromHosting;

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
  downloadMakerTemplateFromHosting,
  downloadScanItemsTemplateFromHosting,
  uploadExcelFile,
  showUploadOptionsModal,
  closeUploadOptionsModal,
  handleUploadOption,
};
