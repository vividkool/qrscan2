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
  const addButton = document.getElementById("addButton");
  if (addButton) {
    if (collectionType && collectionType !== "scanItems") {
      addButton.style.display = "inline-block";
      addButton.onclick = () => openAddDataModal(collectionType);
    } else {
      addButton.style.display = "none";
    }
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
                <td>
                  <button class="delete-btn" onclick="deleteDocument('items', '${docId}', '${displayName}')">削除</button>
                </td>
              </tr>`;
    });
    html += "</tbody></table>";

    showResult("firestoreResult", html, "success");
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
                <td>
                  <button class="delete-btn" onclick="deleteDocument('users', '${docId}', '${displayName}')">削除</button>
                </td>
              </tr>`;
    });
    html += "</tbody></table>";

    showResult("firestoreResult", html, "success");
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
                <td>
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
      "https://us-central1-qrscan2-99ffd.cloudfunctions.net/helloWorld"
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

// テストユーザー作成関数
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

// 初期化完了メッセージ
console.log("Firebase Index (クリーンアップ版) が初期化されました");
