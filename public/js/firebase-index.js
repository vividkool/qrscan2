// ダウンロード結果モーダル表示・非表示
function showDownloadResultModal(message, type = "") {
  const modal = document.getElementById("downloadResultModal");
  const result = document.getElementById("downloadResult");
  result.textContent = message;
  result.className = `result ${type}`;
  result.style.display = "block";
  modal.style.display = "block";
}

function closeDownloadResultModal() {
  const modal = document.getElementById("downloadResultModal");
  const result = document.getElementById("downloadResult");
  result.textContent = "";
  result.className = "result";
  result.style.display = "none";
  modal.style.display = "none";
}
// Firebase Index Page Functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
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

// ユーティリティ関数
function showResult(elementId, message, type = "") {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `result ${type}`;
  element.style.display = "block";
}

function showLoading(elementId) {
  const element = document.getElementById(elementId);
  element.innerHTML = '<div class="loading"></div> 処理中...';
  element.className = "result";
}

function clearResults(elementId) {
  const element = document.getElementById(elementId);
  element.textContent = "";
  element.className = "result";
  element.style.display = "none";
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

    const data = {
      title: title,
      content: content,
      timestamp: new Date().toISOString(),
      createdAt: new Date(),
    };

    let docRef;
    if (documentId) {
      docRef = doc(db, "qrscans", documentId);
      await setDoc(docRef, data);
    } else {
      docRef = await addDoc(collection(db, "qrscans"), data);
    }

    showResult(
      "firestoreResult",
      `ドキュメントが正常に追加されました:\nID: ${
        docRef.id || documentId
      }\nタイトル: ${title}\n内容: ${content}`,
      "success"
    );

    // フォームをクリア
    document.getElementById("documentId").value = "";
    document.getElementById("dataTitle").value = "";
    document.getElementById("dataContent").value = "";
  } catch (error) {
    showResult("firestoreResult", `エラー: ${error.message}`, "error");
  }
}

async function getAllDocuments() {
  try {
    showLoading("firestoreResult");

    const querySnapshot = await getDocs(collection(db, "qrscans"));
    let result = "Firestore データ一覧:\n\n";

    if (querySnapshot.empty) {
      result += "データが見つかりませんでした。";
    } else {
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        result += `ID: ${doc.id}\n`;
        result += `タイトル: ${data.title || "N/A"}\n`;
        result += `内容: ${data.content || "N/A"}\n`;
        result += `作成日時: ${data.timestamp || "N/A"}\n`;
        result += "---\n\n";
      });
    }

    showResult("firestoreResult", result, "success");
  } catch (error) {
    showResult("firestoreResult", `エラー: ${error.message}`, "error");
  }
}

// Cloud Functions関数
async function callHelloWorld() {
  try {
    showLoading("functionResult");

    const response = await fetch(
      "https://asia-northeast1-qrscan2-99ffd.cloudfunctions.net/helloWorld"
    );
    const text = await response.text();

    showResult(
      "functionResult",
      `Function レスポンス:\nステータス: ${response.status}\n内容: ${text}`,
      "success"
    );
  } catch (error) {
    showResult("functionResult", `エラー: ${error.message}`, "error");
  }
}

// 静的テンプレートファイルをダウンロード
async function downloadItemsTemplateFromHosting() {
  try {
    showLoading("downloadResult");

    // 静的ファイルのパス
    const templateUrl = "./templates/items.xlsx";

    // ファイルの存在確認とダウンロード
    const response = await fetch(templateUrl);

    if (!response.ok) {
      // ファイルが存在しない場合はフォールバック
      console.log(
        "Static template file not found, falling back to dynamic generation"
      );
      await downloadItemsTemplate();
      return;
    }

    const blob = await response.blob();

    // ダウンロードリンクを作成
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "items.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // メモリクリーンアップ
    URL.revokeObjectURL(link.href);

    showDownloadResultModal(
      "items.xlsx をダウンロードしました\n\nアップロード用テンプレートファイルです。\n- 必要な項目: item_no, item_name, category, maker_code, price, standard, shape\n- データ入力後、このファイルをアップロードしてください",
      "success"
    );
  } catch (error) {
    console.log(
      "Static template download failed, falling back to dynamic generation:",
      error
    );
    // フォールバック: 動的生成
    //await downloadItemsTemplate();
  }
}

async function downloadUsersTemplateFromHosting() {
  try {
    showLoading("downloadResult");

    // 静的ファイルのパス
    const templateUrl = "./templates/users.xlsx";

    // ファイルの存在確認とダウンロード
    const response = await fetch(templateUrl);

    if (!response.ok) {
      // ファイルが存在しない場合はフォールバック
      console.log(
        "Static template file not found, falling back to dynamic generation"
      );
      await downloadUsersTemplate();
      return;
    }

    const blob = await response.blob();

    // ダウンロードリンクを作成
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "users.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // メモリクリーンアップ
    URL.revokeObjectURL(link.href);

    showDownloadResultModal(
      "users.xlsx をダウンロードしました\n\nアップロード用テンプレートファイルです。\n- 必要な項目: user_id, user_name, email, phone, department, status, role, print_status\n- データ入力後、このファイルをアップロードしてください",
      "success"
    );
  } catch (error) {
    console.log(
      "Static template download failed, falling back to dynamic generation:",
      error
    );
    // フォールバック: 動的生成
    //await downloadUsersTemplate();
  }
}

// テンプレートファイル ダウンロード関数（動的生成版 - フォールバック用）
async function downloadItemsTemplate() {
  try {
    showLoading("downloadResult");

    // XLSX ライブラリを動的に読み込み
    if (!window.XLSX) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js";
      document.head.appendChild(script);

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
    }

    // itemsコレクション用のテンプレートデータ
    const templateData = [
      {
        item_no: "商品番号を入力してください",
        item_name: "商品名を入力してください",
        category: "カテゴリを入力してください",
        maker_code: "メーカーコードを入力してください",
        price: "価格を数値で入力してください",
        standard: "規格を入力してください",
        shape: "形状を入力してください",
      },
      {
        item_no: "例: ITM001",
        item_name: "例: iPhone 15",
        category: "例: Electronics",
        maker_code: "例: APPLE",
        price: "例: 128000",
        standard: "例: 128GB",
        shape: "例: Rectangle",
      },
    ];

    const worksheet = window.XLSX.utils.json_to_sheet(templateData);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Items Template");

    // カラム幅を設定
    worksheet["!cols"] = [
      { width: 15 }, // item_no
      { width: 25 }, // item_name
      { width: 15 }, // category
      { width: 15 }, // maker_code
      { width: 12 }, // price
      { width: 15 }, // standard
      { width: 15 }, // shape
    ];

    const fileName = `items_template.xlsx`;
    window.XLSX.writeFile(workbook, fileName);

    showResult(
      "downloadResult",
      `${fileName} をダウンロードしました\n\nアップロード用テンプレートファイルです。\n- 必要な項目: item_no, item_name, category, maker_code, price, standard, shape\n- データ入力後、このファイルをアップロードしてください`,
      "success"
    );
  } catch (error) {
    showResult("downloadResult", `エラー: ${error.message}`, "error");
  }
}

async function downloadUsersTemplate() {
  try {
    showLoading("downloadResult");

    // XLSX ライブラリを動的に読み込み
    if (!window.XLSX) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js";
      document.head.appendChild(script);

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
    }

    // usersコレクション用のテンプレートデータ
    const templateData = [
      {
        user_id: "ユーザーIDを入力してください",
        user_name: "ユーザー名を入力してください",
        email: "メールアドレスを入力してください",
        phone: "電話番号を入力してください",
        department: "部署名を入力してください",
        status: "active/inactive",
        role: "admin/user/guest",
        print_status: "printed/not_printed",
      },
      {
        user_id: "例: USR001",
        user_name: "例: 田中太郎",
        email: "例: tanaka@example.com",
        phone: "例: 090-1234-5678",
        department: "例: 営業部",
        status: "例: active",
        role: "例: user",
        print_status: "例: not_printed",
      },
    ];

    const worksheet = window.XLSX.utils.json_to_sheet(templateData);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Users Template");

    // カラム幅を設定
    worksheet["!cols"] = [
      { width: 15 }, // user_id
      { width: 20 }, // user_name
      { width: 25 }, // email
      { width: 15 }, // phone
      { width: 15 }, // department
      { width: 12 }, // status
      { width: 12 }, // role
      { width: 15 }, // print_status
    ];

    const fileName = `users_template.xlsx`;
    window.XLSX.writeFile(workbook, fileName);

    showResult(
      "downloadResult",
      `${fileName} をダウンロードしました\n\nアップロード用テンプレートファイルです。\n- 必要な項目: user_id, user_name, email, phone, department, status, role, print_status\n- データ入力後、このファイルをアップロードしてください`,
      "success"
    );
  } catch (error) {
    showResult("downloadResult", `エラー: ${error.message}`, "error");
  }
}

// モーダル関数
function openAddDataModal(collectionType) {
  const modal = document.getElementById("addDataModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalForm = document.getElementById("modalForm");

  // モーダルタイトル設定
  modalTitle.textContent =
    collectionType === "items" ? "アイテム追加" : "ユーザー追加";

  // フォームフィールド生成
  modalForm.innerHTML = "";

  let fields;
  if (collectionType === "items") {
    fields = [
      { name: "item_no", label: "アイテム番号", type: "text", required: true },
      { name: "item_name", label: "アイテム名", type: "text", required: true },
      { name: "category", label: "カテゴリ", type: "text", required: false },
      {
        name: "maker_code",
        label: "メーカーコード",
        type: "text",
        required: false,
      },
      { name: "price", label: "価格", type: "number", required: false },
      { name: "standard", label: "規格", type: "text", required: false },
      { name: "shape", label: "形状", type: "text", required: false },
    ];
  } else {
    fields = [
      { name: "user_id", label: "ユーザーID", type: "text", required: true },
      { name: "user_name", label: "ユーザー名", type: "text", required: true },
      {
        name: "email",
        label: "メールアドレス",
        type: "email",
        required: false,
      },
      { name: "phone", label: "電話番号", type: "tel", required: false },
      { name: "department", label: "部署", type: "text", required: false },
      { name: "status", label: "ステータス", type: "text", required: false },
      { name: "role", label: "役割", type: "text", required: false },
      {
        name: "print_status",
        label: "印刷ステータス",
        type: "text",
        required: false,
      },
    ];
  }

  // フィールド作成
  fields.forEach((field) => {
    const div = document.createElement("div");
    div.className = "form-group";

    const label = document.createElement("label");
    label.textContent = field.label + (field.required ? " *" : "");
    label.setAttribute("for", field.name);

    const input = document.createElement("input");
    input.type = field.type;
    input.id = field.name;
    input.name = field.name;
    input.required = field.required;

    div.appendChild(label);
    div.appendChild(input);
    modalForm.appendChild(div);
  });

  // コレクションタイプを保存
  modal.dataset.collectionType = collectionType;

  // モーダル表示
  modal.style.display = "block";
}

function closeModal() {
  document.getElementById("addDataModal").style.display = "none";
}

async function submitAddData() {
  const modal = document.getElementById("addDataModal");
  const collectionType = modal.dataset.collectionType;
  const form = document.getElementById("modalForm");

  // フォームデータ取得
  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    // 価格フィールドの数値変換
    if (key === "price" && value) {
      data[key] = Number(value);
    } else {
      data[key] = value || "";
    }
  }

  try {
    showLoading("firestoreResult");

    // コレクション名とドキュメントID設定
    const collectionName = collectionType;
    const docId = collectionType === "items" ? data.item_no : data.user_id;

    if (!docId) {
      throw new Error(
        collectionType === "items"
          ? "アイテム番号は必須です"
          : "ユーザーIDは必須です"
      );
    }

    // Firestoreに保存
    await setDoc(doc(db, collectionName, docId), data);

    showResult(
      "firestoreResult",
      `${
        collectionType === "items" ? "アイテム" : "ユーザー"
      }を追加しました: ${docId}`,
      "success"
    );
    closeModal();
  } catch (error) {
    console.error("データ追加エラー:", error);
    showResult("firestoreResult", `エラー: ${error.message}`, "error");
  }
}

// Excel ファイルアップロード処理
async function uploadExcelFile(collectionType, fileInput) {
  const file = fileInput.files[0];
  if (!file) {
    showResult("firestoreResult", "ファイルが選択されていません", "error");
    return;
  }

  // ファイルタイプチェック
  if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
    showResult(
      "firestoreResult",
      "Excel ファイル (.xlsx または .xls) を選択してください",
      "error"
    );
    return;
  }

  showLoading("firestoreResult");

  try {
    // XLSXライブラリを動的にロード
    const XLSX = await loadXLSXLibrary();

    // ファイルを読み取り
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // 最初のシートを取得
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // シートをJSONに変換（ヘッダー行を使用）
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length < 2) {
      showResult(
        "firestoreResult",
        "データが不足しています。ヘッダー行とデータ行が必要です。",
        "error"
      );
      return;
    }

    // ヘッダー行とデータ行を分離
    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);

    // コレクションタイプに応じたバリデーション
    let expectedHeaders;
    let collectionName;

    if (collectionType === "items") {
      expectedHeaders = [
        "item_no",
        "item_name",
        "category",
        "maker_code",
        "price",
        "standard",
        "shape",
      ];
      collectionName = "items";
    } else if (collectionType === "users") {
      expectedHeaders = [
        "user_id",
        "user_name",
        "email",
        "phone",
        "department",
        "status",
        "role",
        "print_status",
      ];
      collectionName = "users";
    } else {
      showResult("firestoreResult", "無効なコレクションタイプです", "error");
      return;
    }

    // ヘッダーバリデーション
    const missingHeaders = expectedHeaders.filter(
      (header) => !headers.includes(header)
    );
    if (missingHeaders.length > 0) {
      showResult(
        "firestoreResult",
        `必要な列が不足しています: ${missingHeaders.join(", ")}\n` +
          `必要な列: ${expectedHeaders.join(", ")}\n` +
          `現在の列: ${headers.join(", ")}`,
        "error"
      );
      return;
    }

    // データをFirestoreに保存
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];

      // 空行をスキップ
      if (row.every((cell) => !cell && cell !== 0)) {
        continue;
      }

      try {
        // オブジェクトを作成
        const docData = {};
        expectedHeaders.forEach((header, index) => {
          const headerIndex = headers.indexOf(header);
          if (headerIndex !== -1) {
            let value = row[headerIndex];

            // 価格フィールドの数値変換
            if (header === "price" && value !== undefined && value !== "") {
              value = Number(value);
              if (isNaN(value)) {
                throw new Error(`行 ${i + 2}: 価格は数値である必要があります`);
              }
            }

            docData[header] = value || "";
          }
        });

        // 必須フィールドチェック
        if (collectionType === "items" && !docData.item_no) {
          throw new Error(`行 ${i + 2}: item_no は必須です`);
        }
        if (collectionType === "users" && !docData.user_id) {
          throw new Error(`行 ${i + 2}: user_id は必須です`);
        }

        // Firestoreに追加
        const docId =
          collectionType === "items" ? docData.item_no : docData.user_id;
        await setDoc(doc(db, collectionName, docId), docData);
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(`行 ${i + 2}: ${error.message}`);
      }
    }

    // 結果表示
    let resultMessage = `アップロード完了\n`;
    resultMessage += `成功: ${successCount} 件\n`;

    if (errorCount > 0) {
      resultMessage += `エラー: ${errorCount} 件\n\n`;
      resultMessage += `エラー詳細:\n${errors.slice(0, 10).join("\n")}`;
      if (errors.length > 10) {
        resultMessage += `\n... および ${errors.length - 10} 件のエラー`;
      }
      showResult("firestoreResult", resultMessage, "warning");
    } else {
      showResult("firestoreResult", resultMessage, "success");
    }

    // ファイル入力をクリア
    fileInput.value = "";
  } catch (error) {
    console.error("アップロードエラー:", error);
    showResult(
      "firestoreResult",
      `アップロードエラー: ${error.message}`,
      "error"
    );
    fileInput.value = "";
  }
}

// XLSXライブラリを動的にロード
async function loadXLSXLibrary() {
  if (window.XLSX) {
    return window.XLSX;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => {
      resolve(window.XLSX);
    };
    script.onerror = () => {
      reject(new Error("XLSXライブラリの読み込みに失敗しました"));
    };
    document.head.appendChild(script);
  });
}

// グローバル関数として公開
window.addDocument = addDocument;
window.getAllDocuments = getAllDocuments;
window.callHelloWorld = callHelloWorld;
window.downloadItemsTemplate = downloadItemsTemplateFromHosting;
window.downloadUsersTemplate = downloadUsersTemplateFromHosting;
window.downloadItemsTemplateDynamic = downloadItemsTemplate;
window.downloadUsersTemplateDynamic = downloadUsersTemplate;
window.showResult = showResult;
window.showLoading = showLoading;
window.clearResults = clearResults;
window.uploadExcelFile = uploadExcelFile;
window.openAddDataModal = openAddDataModal; // 追加
window.closeModal = closeModal; // 追加
window.closeDownloadResultModal = closeDownloadResultModal; // 追加
window.submitAddData = submitAddData; // 追加
window.downloadItemsTemplateFromHosting = downloadItemsTemplateFromHosting;
window.downloadUsersTemplateFromHosting = downloadUsersTemplateFromHosting;

// 初期化完了メッセージ
console.log("Firebase アプリが初期化されました");
