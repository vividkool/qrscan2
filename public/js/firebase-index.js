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

// グローバル変数
let currentCollection = null;

// ユーティリティ関数
function showResult(elementId, message, type = "") {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `result ${type}`;
}

function showLoading(elementId) {
  const element = document.getElementById(elementId);
  element.innerHTML = '<div class="loading"></div> 処理中...';
  element.className = "result";
}

function clearResults(elementId) {
  document.getElementById(elementId).textContent = "";
  document.getElementById(elementId).className = "result";

  // firestoreResultをクリアする場合は、コレクション名と件数もクリア
  if (elementId === "firestoreResult") {
    document.getElementById("firestoreResult-collectionname").innerHTML = "";
    document.getElementById("firestoreResult-count").innerHTML = "";
  }
}

// モーダル制御関数
function openAddDataModal() {
  if (!currentCollection) {
    alert("先にitemsまたはusersコレクションを表示してください。");
    return;
  }

  const modal = document.getElementById("addDataModal");
  const modalTitle = document.getElementById("modalTitle");
  const formFields = document.getElementById("formFields");

  // モーダルタイトルを設定
  if (currentCollection === "items") {
    modalTitle.textContent = "📦 Items データを追加";
    formFields.innerHTML = `
      <div class="form-group">
        <label for="item_no">商品No *</label>
        <input type="text" id="item_no" name="item_no" required>
      </div>
      <div class="form-group">
        <label for="item_name">商品名 *</label>
        <input type="text" id="item_name" name="item_name" required>
      </div>
      <div class="form-group">
        <label for="category">カテゴリ</label>
        <input type="text" id="category" name="category">
      </div>
      <div class="form-group">
        <label for="maker_code">メーカーコード</label>
        <input type="text" id="maker_code" name="maker_code">
      </div>
      <div class="form-group">
        <label for="price">価格</label>
        <input type="number" id="price" name="price">
      </div>
      <div class="form-group">
        <label for="standard">規格</label>
        <input type="text" id="standard" name="standard">
      </div>
      <div class="form-group">
        <label for="shape">形状</label>
        <input type="text" id="shape" name="shape">
      </div>
    `;
  } else if (currentCollection === "users") {
    modalTitle.textContent = "👥 Users データを追加";
    formFields.innerHTML = `
      <div class="form-group">
        <label for="user_id">ユーザーID *</label>
        <input type="text" id="user_id" name="user_id" required>
      </div>
      <div class="form-group">
        <label for="user_name">ユーザー名 *</label>
        <input type="text" id="user_name" name="user_name" required>
      </div>
      <div class="form-group">
        <label for="email">メール</label>
        <input type="email" id="email" name="email">
      </div>
      <div class="form-group">
        <label for="phone">電話番号</label>
        <input type="tel" id="phone" name="phone">
      </div>
      <div class="form-group">
        <label for="department">部署</label>
        <input type="text" id="department" name="department">
      </div>
      <div class="form-group">
        <label for="status">ステータス</label>
        <select id="status" name="status">
          <option value="">選択してください</option>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
      </div>
      <div class="form-group">
        <label for="role">権限</label>
        <select id="role" name="role">
          <option value="">選択してください</option>
          <option value="admin">admin</option>
          <option value="user">user</option>
          <option value="guest">guest</option>
        </select>
      </div>
      <div class="form-group">
        <label for="print_status">印刷ステータス</label>
        <select id="print_status" name="print_status">
          <option value="">選択してください</option>
          <option value="printed">printed</option>
          <option value="not_printed">not_printed</option>
        </select>
      </div>
    `;
  }

  modal.style.display = "block";
}

function closeModal() {
  document.getElementById("addDataModal").style.display = "none";
  document.getElementById("addDataForm").reset();
}

// モーダル外クリックで閉じる
window.onclick = function (event) {
  const modal = document.getElementById("addDataModal");
  if (event.target === modal) {
    closeModal();
  }
}; // Firestore関数
async function addDocument() {
  openAddDataModal();
}

// フォーム送信処理
async function submitAddData(event) {
  event.preventDefault();

  if (!currentCollection) {
    alert("コレクションが選択されていません。");
    return;
  }

  try {
    showLoading("firestoreResult");
    closeModal();

    const formData = new FormData(event.target);
    const data = {};

    // フォームデータを取得
    for (const [key, value] of formData.entries()) {
      if (value.trim()) {
        data[key] = value.trim();
      }
    }

    // 作成日時を追加
    data.createdAt = new Date();
    data.timestamp = new Date().toISOString();

    // Firestoreに追加
    const docRef = await addDoc(collection(db, currentCollection), data);

    showResult(
      "firestoreResult",
      `${currentCollection}コレクションにデータが正常に追加されました:\nID: ${docRef.id}`,
      "success"
    );

    // データを再取得して表示を更新
    if (currentCollection === "items") {
      setTimeout(() => getAllItems(), 1000);
    } else if (currentCollection === "users") {
      setTimeout(() => getAllUsers(), 1000);
    }
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

async function getAllItems() {
  try {
    showLoading("firestoreResult");
    currentCollection = "items"; // 現在のコレクションを設定

    const querySnapshot = await getDocs(collection(db, "items"));

    if (querySnapshot.empty) {
      document.getElementById("firestoreResult-collectionname").innerHTML = "";
      document.getElementById("firestoreResult-count").innerHTML = "";
      showResult(
        "firestoreResult",
        "itemsコレクションにデータが見つかりませんでした。",
        "error"
      );
      return;
    }

    document.getElementById("firestoreResult-collectionname").innerHTML =
      "📦 items コレクション データ一覧";

    let count = 0;
    let tableHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>商品No</th>
              <th>商品名</th>
              <th>カテゴリ</th>
              <th>メーカーコード</th>
              <th>価格</th>
              <th>規格</th>
              <th>形状</th>
              <th>作成日時</th>
            </tr>
          </thead>
          <tbody>
    `;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      count++;
      const createdAt = data.createdAt
        ? new Date(data.createdAt.seconds * 1000).toLocaleString("ja-JP")
        : data.timestamp || "N/A";

      tableHTML += `
        <tr>
          <td>${count}</td>
          <td>${data.item_no || "N/A"}</td>
          <td>${data.item_name || "N/A"}</td>
          <td>${data.category || "N/A"}</td>
          <td>${data.maker_code || "N/A"}</td>
          <td>${data.price || "N/A"}</td>
          <td>${data.standard || "N/A"}</td>
          <td>${data.shape || "N/A"}</td>
          <td>${createdAt}</td>
        </tr>
      `;
    });

    tableHTML += `
          </tbody>
        </table>
      </div>
    `;

    // 件数をヘッダー部分に表示
    document.getElementById("firestoreResult-count").innerHTML = `${count}件`;
    document.getElementById("firestoreResult").innerHTML = tableHTML;
    document.getElementById("firestoreResult").className = "result success";
  } catch (error) {
    document.getElementById("firestoreResult-collectionname").innerHTML = "";
    document.getElementById("firestoreResult-count").innerHTML = "";
    showResult("firestoreResult", `エラー: ${error.message}`, "error");
  }
}

async function getAllUsers() {
  try {
    showLoading("firestoreResult");
    currentCollection = "users"; // 現在のコレクションを設定

    const querySnapshot = await getDocs(collection(db, "users"));

    if (querySnapshot.empty) {
      document.getElementById("firestoreResult-collectionname").innerHTML = "";
      document.getElementById("firestoreResult-count").innerHTML = "";
      showResult(
        "firestoreResult",
        "usersコレクションにデータが見つかりませんでした。",
        "error"
      );
      return;
    }

    document.getElementById("firestoreResult-collectionname").innerHTML =
      "👥 users コレクション データ一覧";

    let count = 0;
    let tableHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>ユーザーID</th>
              <th>ユーザー名</th>
              <th>メール</th>
              <th>電話番号</th>
              <th>部署</th>
              <th>ステータス</th>
              <th>権限</th>
              <th>印刷ステータス</th>
              <th>作成日時</th>
            </tr>
          </thead>
          <tbody>
    `;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      count++;
      const createdAt = data.createdAt
        ? new Date(data.createdAt.seconds * 1000).toLocaleString("ja-JP")
        : data.timestamp || "N/A";

      tableHTML += `
        <tr>
          <td>${count}</td>
          <td>${data.user_id || "N/A"}</td>
          <td>${data.user_name || "N/A"}</td>
          <td>${data.email || "N/A"}</td>
          <td>${data.phone || "N/A"}</td>
          <td>${data.department || "N/A"}</td>
          <td>${data.status || "N/A"}</td>
          <td>${data.role || "N/A"}</td>
          <td>${data.print_status || "N/A"}</td>
          <td>${createdAt}</td>
        </tr>
      `;
    });

    tableHTML += `
          </tbody>
        </table>
      </div>
    `;

    // 件数をヘッダー部分に表示
    document.getElementById("firestoreResult-count").innerHTML = `${count}件`;
    document.getElementById("firestoreResult").innerHTML = tableHTML;
    document.getElementById("firestoreResult").className = "result success";
  } catch (error) {
    document.getElementById("firestoreResult-collectionname").innerHTML = "";
    document.getElementById("firestoreResult-count").innerHTML = "";
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

// テンプレートExcel ダウンロード関数
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
        タイトル: "商品名を入力してください",
        内容: "商品の詳細説明を入力してください",
        カテゴリ: "カテゴリを入力してください",
        価格: "価格を数値で入力してください",
        ステータス: "active/inactive",
        作成者: "作成者名を入力してください",
      },
      {
        タイトル: "例: iPhone 15",
        内容: "例: 最新のスマートフォン",
        カテゴリ: "例: Electronics",
        価格: "例: 128000",
        ステータス: "例: active",
        作成者: "例: 管理者",
      },
    ];

    const worksheet = window.XLSX.utils.json_to_sheet(templateData);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Items Template");

    // カラム幅を設定
    worksheet["!cols"] = [
      { width: 20 }, // タイトル
      { width: 30 }, // 内容
      { width: 15 }, // カテゴリ
      { width: 10 }, // 価格
      { width: 12 }, // ステータス
      { width: 15 }, // 作成者
    ];

    const fileName = `items_template.xlsx`;
    window.XLSX.writeFile(workbook, fileName);

    showResult(
      "downloadResult",
      `${fileName} をダウンロードしました\n\nアップロード用テンプレートファイルです。\n- 1行目: サンプル入力例\n- 2行目: 実際の例\n- データ入力後、このファイルをアップロードしてください`,
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
        名前: "ユーザー名を入力してください",
        メール: "メールアドレスを入力してください",
        電話番号: "電話番号を入力してください",
        部署: "部署名を入力してください",
        役職: "役職を入力してください",
        ステータス: "active/inactive",
        権限: "admin/user/guest",
      },
      {
        名前: "例: 田中太郎",
        メール: "例: tanaka@example.com",
        電話番号: "例: 090-1234-5678",
        部署: "例: 営業部",
        役職: "例: 主任",
        ステータス: "例: active",
        権限: "例: user",
      },
    ];

    const worksheet = window.XLSX.utils.json_to_sheet(templateData);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Users Template");

    // カラム幅を設定
    worksheet["!cols"] = [
      { width: 15 }, // 名前
      { width: 25 }, // メール
      { width: 15 }, // 電話番号
      { width: 12 }, // 部署
      { width: 12 }, // 役職
      { width: 12 }, // ステータス
      { width: 12 }, // 権限
    ];

    const fileName = `users_template.xlsx`;
    window.XLSX.writeFile(workbook, fileName);

    showResult(
      "downloadResult",
      `${fileName} をダウンロードしました\n\nアップロード用テンプレートファイルです。\n- 1行目: サンプル入力例\n- 2行目: 実際の例\n- データ入力後、このファイルをアップロードしてください`,
      "success"
    );
  } catch (error) {
    showResult("downloadResult", `エラー: ${error.message}`, "error");
  }
}

// グローバル関数として公開
window.addDocument = addDocument;
window.getAllDocuments = getAllDocuments;
window.getAllItems = getAllItems;
window.getAllUsers = getAllUsers;
window.callHelloWorld = callHelloWorld;
window.downloadItemsTemplate = downloadItemsTemplate;
window.downloadUsersTemplate = downloadUsersTemplate;
window.showResult = showResult;
window.showLoading = showLoading;
window.clearResults = clearResults;
window.openAddDataModal = openAddDataModal;
window.closeModal = closeModal;

// フォームイベントリスナーを追加
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("addDataForm");
  if (form) {
    form.addEventListener("submit", submitAddData);
  }
});

// 初期化完了メッセージ
console.log("Firebase アプリが初期化されました");
