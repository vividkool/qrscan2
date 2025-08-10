// Firebase Index Page Functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
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

// 現在表示中のコレクション状態を管理
let currentCollectionType = null;

// ユーティリティ関数
function showResult(elementId, message, type = "") {
  const element = document.getElementById(elementId);
  element.innerHTML = message;
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

  // Firestoreの結果をクリアする場合は追加ボタンも非表示
  if (elementId === "firestoreResult") {
    updateAddButton(null);
  }
}

// UUID生成関数
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 現在のコレクションに応じた追加ボタンの表示制御
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

// 現在表示中のコレクションに新規データ追加
function addToCurrentCollection() {
  if (currentCollectionType) {
    openAddDataModal(currentCollectionType);
  }
}

// 選択式テンプレートダウンロード
function downloadSelectedTemplate() {
  const select = document.getElementById("templateSelect");
  const value = select.value;
  if (value === "items") {
    downloadItemsTemplateFromHosting();
  } else if (value === "users") {
    downloadUsersTemplateFromHosting();
  } else {
    showDownloadResultModal("未対応のコレクションです", "error");
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
      "<th>item_no</th><th>category_name</th><th>company_name</th><th>item_name</th><th>maker_code</th>";
    html += "</tr></thead><tbody>";
    querySnapshot.forEach((docSnap) => {
      const d = docSnap.data();
      html += `<tr><td>${d.item_no || ""}</td><td>${
        d.category_name || ""
      }</td><td>${d.company_name || ""}</td><td>${d.item_name || ""}</td><td>${
        d.maker_code || ""
      }</td></tr>`;
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
  } catch (error) {
    showResult("firestoreResult", `取得エラー: ${error.message}`, "error");
    updateAddButton(null);
  }
}

// usersコレクション一覧表示
async function getAllUsers() {
  try {
    showLoading("firestoreResult");
    const querySnapshot = await getDocs(collection(db, "users"));
    if (querySnapshot.empty) {
      showResult("firestoreResult", "ユーザーデータがありません", "error");
      return;
    }
    let html = "<table><thead><tr>";
    html +=
      "<th>user_id</th><th>company_name</th><th>user_name</th><th>email</th><th>phone</th><th>department</th><th>status</th><th>role</th><th>print_status</th>";
    html += "</tr></thead><tbody>";
    querySnapshot.forEach((docSnap) => {
      const d = docSnap.data();
      html += `<tr><td>${d.user_id || ""}</td><td>${
        d.company_name || ""
      }</td><td>${d.user_name || ""}</td><td>${d.email || ""}</td><td>${
        d.phone || ""
      }</td><td>${d.department || ""}</td><td>${d.status || ""}</td><td>${
        d.user_role || ""
      }</td><td>${d.print_status || ""}</td></tr>`;
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
  } catch (error) {
    showResult("firestoreResult", `取得エラー: ${error.message}`, "error");
    updateAddButton(null);
  }
}

async function getAllScanItems() {
  try {
    showLoading("firestoreResult");
    const querySnapshot = await getDocs(collection(db, "scanItems"));
    if (querySnapshot.empty) {
      showResult("firestoreResult", "アイテムデータがありません", "error");
      return;
    }
    let html = "<table><thead><tr>";
    html +=
      "<th>item_no</th><th>item_name</th><th>content</th><th>timestamp</th><th>company_name</th><th>maker_code</th><th>isiOS</th><th>isWebkit</th><th>scannerMode</th>";
    html += "</tr></thead><tbody>";
    querySnapshot.forEach((docSnap) => {
      const d = docSnap.data();
      html += `<tr><td>${d.item_no || ""}</td><td>${
        d.item_name || ""
      }</td><td>${d.content || ""}</td><td>${d.timestamp || ""}</td><td>${
        d.isMobile || ""
      }</td><td>${d.isWebkit || ""}</td><td>${d.isiOS || ""}</td><td>${
        d.platform || ""
      }</td><td>${d.scannerMode || ""}</td></tr>`;
    });
    html += "</tbody></table>";
    showResult("firestoreResult", html, "success");
    document.getElementById("firestoreResult-collectionname").textContent =
      "ScanItemsコレクション";
    document.getElementById(
      "firestoreResult-count"
    ).textContent = `${querySnapshot.size}件`;
  } catch (error) {
    showResult("firestoreResult", `取得エラー: ${error.message}`, "error");
  }
}

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
      {
        name: "category_name",
        label: "カテゴリ",
        type: "text",
        required: false,
      },
      { name: "company_name", label: "会社名", type: "text", required: true },
      {
        name: "maker_code",
        label: "メーカーコード",
        type: "text",
        required: false,
      },
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
    // UUIDを生成してドキュメントIDとして使用
    const docId = generateUUID();

    // 必須フィールドチェック
    const requiredId = collectionType === "items" ? data.item_no : data.user_id;
    if (!requiredId) {
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
      }を追加しました: ${requiredId} (ID: ${docId})`,
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
    let headers = jsonData[0];
    const dataRows = jsonData.slice(1);

    // デバッグ情報
    console.log("Headers type:", typeof headers);
    console.log("Headers:", headers);
    console.log("Is Array:", Array.isArray(headers));

    // ヘッダー行が配列でない場合は配列に変換
    if (!Array.isArray(headers)) {
      if (typeof headers === "object" && headers !== null) {
        headers = Object.values(headers);
        console.log("Converted headers to array:", headers);
      } else {
        showResult("firestoreResult", "ヘッダー行が不正です", "error");
        return;
      }
    }

    // コレクションタイプに応じたバリデーション
    let expectedHeaders;
    let collectionName;

    if (collectionType === "items") {
      expectedHeaders = [
        "item_no",
        "item_name",
        "category_name",
        "company_name",
        "maker_code",
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
    let resultMessage = "";
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      let row = dataRows[i];

      // rowが配列でない場合はObject.valuesで配列化
      if (!Array.isArray(row)) {
        if (typeof row === "object" && row !== null) {
          row = Object.values(row);
        } else {
          continue; // 不正な行はスキップ
        }
      }

      // 空行をスキップ
      if (row.every((cell) => !cell && cell !== 0)) continue;

      try {
        // 必要な項目のみ抽出（priceはexpectedHeadersに含めない）
        const docData = {};
        expectedHeaders.forEach((header) => {
          const headerIndex = headers.indexOf(header);
          if (headerIndex !== -1 && headerIndex < row.length) {
            docData[header] = row[headerIndex] || "";
          } else {
            docData[header] = ""; // ヘッダーが見つからない場合は空文字
          }
        });

        // 必須フィールドチェック
        if (collectionType === "items" && !docData.item_no) {
          throw new Error(`行 ${i + 2}: item_no は必須です`);
        }
        if (collectionType === "users" && !docData.user_id) {
          throw new Error(`行 ${i + 2}: user_id は必須です`);
        }

        // UUIDを生成してFirestoreに追加
        const docId = generateUUID();
        const displayId =
          collectionType === "items" ? docData.item_no : docData.user_id;
        console.log(
          `Saving to Firestore: UUID(${docId}) for ${displayId}`,
          docData
        );
        await setDoc(doc(db, collectionName, docId), docData);
        successCount++;
        console.log(`Successfully saved: ${displayId} with UUID ${docId}`);
      } catch (error) {
        console.error(`Error in row ${i + 2}:`, error);
        errorCount++;
        errors.push(`行 ${i + 2}: ${error.message}`);
      }
    }

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
window.getAllScanItems = getAllScanItems;
window.getAllItems = getAllItems;
window.getAllUsers = getAllUsers;
window.callHelloWorld = callHelloWorld;
window.downloadItemsTemplate = downloadItemsTemplateFromHosting;
window.downloadUsersTemplate = downloadUsersTemplateFromHosting;
window.showResult = showResult;
window.showLoading = showLoading;
window.clearResults = clearResults;
window.uploadExcelFile = uploadExcelFile;
window.openAddDataModal = openAddDataModal;
window.closeModal = closeModal;
window.closeDownloadResultModal = closeDownloadResultModal;
window.submitAddData = submitAddData;
window.addToCurrentCollection = addToCurrentCollection;

window.downloadItemsTemplateFromHosting = downloadItemsTemplateFromHosting;
window.downloadUsersTemplateFromHosting = downloadUsersTemplateFromHosting;
window.downloadSelectedTemplate = downloadSelectedTemplate;

// 初期化完了メッセージ
console.log("Firebase アプリが初期化されました");
