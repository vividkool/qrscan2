// Maker Page Functions
import "./auth.js";
import "./smart-qr-scanner.js";

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  getCountFromServer,
  doc,
  writeBatch,
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

// ページロード時の初期化
document.addEventListener("DOMContentLoaded", async function () {
  // ページ読み込み時のデバッグ情報
  console.log("=== maker.htmlページ読み込み ===");
  console.log("現在のURL:", window.location.href);
  console.log("セッション存在確認:", !!localStorage.getItem("currentUser"));
  console.log("セッションデータ:", localStorage.getItem("currentUser"));
  console.log("================================");

  // ユーザー情報表示
  await displayUserInfo(); // await追加

  // スキャン履歴の読み込み
  if (window.smartScanner && window.smartScanner.displayScanHistory) {
    window.smartScanner.displayScanHistory();
  }
});

// ユーザー情報表示とメーカー関連アイテム表示
async function displayUserInfo() {
  const userInfoElement = document.getElementById("userInfo");
  if (userInfoElement) {
    try {
      // 複数の方法でユーザー情報を取得試行
      let user = null;

      // 方法1: UserSessionクラスから取得
      if (
        window.UserSession &&
        typeof UserSession.getCurrentUser === "function"
      ) {
        user = await UserSession.getCurrentUser(); // await追加
        console.log("UserSession経由でユーザー情報取得:", user);
      }

      // 方法2: getSessionから取得
      if (
        !user &&
        window.UserSession &&
        typeof UserSession.getSession === "function"
      ) {
        user = UserSession.getSession();
        console.log("getSession経由でユーザー情報取得:", user);
      }

      // 方法3: localStorageから直接取得
      if (!user) {
        const sessionData = localStorage.getItem("currentUser");
        if (sessionData) {
          user = JSON.parse(sessionData);
          console.log("localStorage経由でユーザー情報取得:", user);
        }
      }

      if (user) {
        // company_nameが未定義の場合のフォールバック処理
        const companyName = user.company_name || user.companyName || "未設定";

        // ローディング表示
        userInfoElement.innerHTML = `
          <div class="user-card">
            <div class="user-header">
              <h3>👨‍💼 ${user.user_name || user.name || "ユーザー"}</h3>
              <span class="user-id">ID: ${user.user_id || user.uid}</span>
            </div>
            <div class="user-details">
              <div class="detail-item">
                <span class="label">🏢 会社名:</span>
                <span class="value">${companyName}</span>
              </div>
              <div class="detail-item">
                <span class="label">👤 ロール:</span>
                <span class="value role-${user.role}">${user.role}</span>
              </div>
              ${
                user.department
                  ? `
                <div class="detail-item">
                  <span class="label">🏭 部署:</span>
                  <span class="value">${user.department}</span>
                </div>
              `
                  : ""
              }
              <div class="detail-item">
                <span class="label">⏰ ログイン時刻:</span>
                <span class="value">${new Date(
                  user.timestamp
                ).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div class="loading-container">
            <div class="spinner"></div>
            <span>メーカー関連アイテムを読み込み中...</span>
          </div>
        `;

        // メーカー関連アイテムを取得・表示
        await displayMakerItems(user);

        console.log("Maker情報表示完了:", user);
      } else {
        console.error("ユーザー情報を取得できませんでした");
        userInfoElement.innerHTML = `
          <div class="user-card error">
            <div class="user-header">
              <h3>⚠️ エラー</h3>
            </div>
            <div class="user-details">
              <p>ユーザー情報を取得できませんでした。再ログインしてください。</p>
              <button onclick="handleLogout()" class="logout-btn">ログアウト</button>
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error("ユーザー情報表示エラー:", error);
      userInfoElement.innerHTML = `
        <div class="user-card error">
          <div class="user-header">
            <h3>⚠️ エラー</h3>
          </div>
          <div class="user-details">
            <p>ユーザー情報の表示中にエラーが発生しました: ${error.message}</p>
            <button onclick="handleLogout()" class="logout-btn">ログアウト</button>
          </div>
        </div>
      `;
    }
  }
}

// メーカー関連アイテム表示
async function displayMakerItems(user) {
  const userInfoElement = document.getElementById("userInfo");
  const userId = user.user_id || user.uid;

  try {
    console.log("メーカー関連アイテムクエリ開始:", userId);

    // データ検証を実行
    await debugDataVerification(userId);

    // user_idとmaker_codeが一致するitemsを取得
    const itemsQuery = query(
      collection(db, "items"),
      where("maker_code", "==", userId),
      orderBy("item_no", "asc")
    );

    const itemsSnapshot = await getDocs(itemsQuery);
    console.log("取得したアイテム数:", itemsSnapshot.size);

    // Aggregation Queriesを使用して効率的なカウント取得
    console.log("=== Aggregation Queries パフォーマンステスト開始 ===");
    const startTime = performance.now();

    const scanCounts = {};
    let totalQueries = 0;

    // 各アイテムごとに個別にカウントを取得（並列処理）
    // 文字列と数値の両方の型に対応するため、複数のクエリを実行
    const countPromises = [];
    const itemNumbers = [];
    const queryItemMapping = []; // どのクエリがどのアイテムに対応するかのマッピング

    itemsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.item_no) {
        itemNumbers.push(data.item_no);

        // デバッグ: item_noの型をログ出力
        console.log(`アイテム ${data.item_no} の型: ${typeof data.item_no}`);

        // 元の値でそのまま検索
        const originalQuery = query(
          collection(db, "scanItems"),
          where("item_no", "==", data.item_no)
        );
        countPromises.push(getCountFromServer(originalQuery));
        queryItemMapping.push({
          itemNo: data.item_no,
          type: `original_${typeof data.item_no}`,
        });
        totalQueries++;

        // 型変換して検索
        if (typeof data.item_no === "number") {
          // 数値 → 文字列
          const stringValue = data.item_no.toString();
          console.log(
            `数値 ${data.item_no} を文字列 "${stringValue}" として検索`
          );
          const stringQuery = query(
            collection(db, "scanItems"),
            where("item_no", "==", stringValue)
          );
          countPromises.push(getCountFromServer(stringQuery));
          queryItemMapping.push({
            itemNo: data.item_no,
            type: "number_to_string",
          });
          totalQueries++;
        } else if (typeof data.item_no === "string") {
          // 文字列 → 数値（変換可能な場合）
          const numberValue = parseInt(data.item_no, 10);
          if (!isNaN(numberValue) && numberValue.toString() === data.item_no) {
            console.log(
              `文字列 "${data.item_no}" を数値 ${numberValue} として検索`
            );
            const numberQuery = query(
              collection(db, "scanItems"),
              where("item_no", "==", numberValue)
            );
            countPromises.push(getCountFromServer(numberQuery));
            queryItemMapping.push({
              itemNo: data.item_no,
              type: "string_to_number",
            });
            totalQueries++;
          }
        }
      }
    });

    // 全てのカウントクエリを並列実行
    const countResults = await Promise.all(countPromises);

    // 結果をマッピング（文字列と数値の結果を合計）
    queryItemMapping.forEach((mapping, index) => {
      const count = countResults[index].data().count;
      if (!scanCounts[mapping.itemNo]) {
        scanCounts[mapping.itemNo] = 0;
      }
      scanCounts[mapping.itemNo] += count;

      // デバッグログ
      if (count > 0) {
        console.log(`${mapping.itemNo} (${mapping.type}型): ${count}件`);
      }
    });

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    console.log("=== Aggregation Queries パフォーマンス結果 ===");
    console.log(`実行時間: ${executionTime.toFixed(2)}ms`);
    console.log(`アイテム数: ${itemNumbers.length}`);
    console.log(`クエリ数: ${totalQueries}`);
    console.log(
      `平均クエリ時間: ${(executionTime / totalQueries).toFixed(2)}ms`
    );
    console.log("スキャンカウント結果:", scanCounts);
    console.log("=============================================");

    // 現在のユーザー情報を保持してアイテム情報を追加
    const company_name = user.company_name || user.companyName || "未設定";
    let html = `
      <div class="user-card">
        <div class="user-header">
          <h3>👨‍💼 ${user.user_name || user.name || "ユーザー"}</h3>
          <span class="user-id">ID: ${userId}</span>
        </div>
        <div class="user-details">
          <div class="detail-item">
            <span class="label">🏢 会社名:</span>
            <span class="value">${company_name}</span>
          </div>
          <div class="detail-item">
            <span class="label">👤 ロール:</span>
            <span class="value role-${user.role}">${user.role}</span>
          </div>
          ${
            user.department
              ? `
            <div class="detail-item">
              <span class="label">🏭 部署:</span>
              <span class="value">${user.department}</span>
            </div>
          `
              : ""
          }
          <div class="detail-item">
            <span class="label">⏰ ログイン時刻:</span>
            <span class="value">${new Date(
              user.timestamp
            ).toLocaleString()}</span>
          </div>
        </div>
      </div>
    `;

    // アイテム情報の表示
    if (itemsSnapshot.empty) {
      html += `
        <div class="user-card">
          <div class="user-header">
            <h3>📦 メーカー関連アイテム</h3>
            <span class="user-id">メーカーコード: ${userId}</span>
          </div>
          <div class="user-details">
            <p>該当するアイテムが見つかりませんでした。</p>
          </div>
        </div>
      `;
    } else {
      // テーブル形式で表示
      html += `
        <div class="user-card">
          <div class="user-header">
            <h3>📦 メーカー関連アイテム (${itemsSnapshot.size}件)</h3>
            <span class="user-id">メーカーコード: ${userId}</span>
          </div>
          <div class="items-table-container">
            <table class="items-table">
              <thead>
                <tr>
                  <th>アイテム番号</th>
                  <th>カテゴリ</th>
                  <th>会社名</th>
                  <th>アイテム名</th>
                  <th>スキャン回数</th>
                </tr>
              </thead>
              <tbody>
      `;

      itemsSnapshot.forEach((doc) => {
        const data = doc.data();
        const scanCount = scanCounts[data.item_no] || 0;

        html += `
          <tr>
            <td><strong>${data.item_no || "未設定"}</strong></td>
            <td>${data.category_name || "未分類"}</td>
            <td>${data.company_name || "未設定"}</td>
            <td>${data.item_name || "未設定"}</td>
            <td><span class="scan-count">${scanCount}</span></td>
          </tr>
        `;
      });

      html += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    userInfoElement.innerHTML = html;
    console.log("メーカー関連アイテム表示完了");
  } catch (error) {
    console.error("メーカー関連アイテム取得エラー:", error);

    // エラー時はユーザー情報だけ表示してエラーメッセージを追加
    const company_name = user.company_name || user.companyName || "未設定";
    userInfoElement.innerHTML = `
      <div class="user-card">
        <div class="user-header">
          <h3>👨‍💼 ${user.user_name || user.name || "ユーザー"}</h3>
          <span class="user-id">ID: ${userId}</span>
        </div>
        <div class="user-details">
          <div class="detail-item">
            <span class="label">🏢 会社名:</span>
            <span class="value">${company_name}</span>
          </div>
          <div class="detail-item">
            <span class="label">👤 ロール:</span>
            <span class="value role-${user.role}">${user.role}</span>
          </div>
          ${
            user.department
              ? `
            <div class="detail-item">
              <span class="label">🏭 部署:</span>
              <span class="value">${user.department}</span>
            </div>
          `
              : ""
          }
          <div class="detail-item">
            <span class="label">⏰ ログイン時刻:</span>
            <span class="value">${new Date(
              user.timestamp
            ).toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div class="user-card error">
        <div class="user-header">
          <h3>⚠️ アイテム取得エラー</h3>
        </div>
        <div class="user-details">
          <p>メーカー関連アイテムの取得中にエラーが発生しました: ${
            error.message
          }</p>
          <button onclick="displayUserInfo()" style="background-color: #9c27b0; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">再試行</button>
        </div>
      </div>
    `;
  }
}

// ログアウト処理
function handleLogout() {
  if (confirm("ログアウトしますか？")) {
    // セッション削除
    localStorage.removeItem("currentUser");
    localStorage.removeItem("firebaseSessionData");

    // ログイン画面に戻る
    window.location.href = "login.html";
  }
}

// データ修正用ユーティリティ関数
async function fixDataConsistency() {
  console.log("🔧 === データ整合性修正開始 ===");

  try {
    // scanItemsの型を統一（例：全て文字列に統一）
    const scanItemsSnapshot = await getDocs(collection(db, "scanItems"));
    console.log(`scanItems総数: ${scanItemsSnapshot.size}`);

    let fixedCount = 0;
    const batch = [];

    scanItemsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.item_no && typeof data.item_no === "number") {
        // 数値を文字列に変換
        const newData = { ...data, item_no: data.item_no.toString() };
        batch.push({ doc: doc, newData: newData });
        fixedCount++;
      }
    });

    console.log(`修正が必要なドキュメント数: ${fixedCount}`);

    if (
      fixedCount > 0 &&
      confirm(
        `${fixedCount}件のscanItemsのitem_noを数値から文字列に変換しますか？`
      )
    ) {
      // バッチ処理で更新（Firestoreの制限により500件ずつ）
      for (let i = 0; i < batch.length; i += 500) {
        const batchChunk = batch.slice(i, i + 500);
        const writeBatch = writeBatch(db);

        batchChunk.forEach(({ doc, newData }) => {
          writeBatch.update(doc.ref, newData);
        });

        await writeBatch.commit();
        console.log(
          `${Math.min(i + 500, batch.length)}/${batch.length} 件処理完了`
        );
      }

      console.log("✅ データ修正完了");
    }
  } catch (error) {
    console.error("データ修正エラー:", error);
  }

  console.log("🔧 === データ整合性修正終了 ===");
}

// テストデータ生成関数
async function generateTestScanData(userId, itemNo, count = 5) {
  console.log(
    `📝 テストデータ生成開始: ${itemNo} に ${count} 件のスキャンデータを追加`
  );

  try {
    const batch = [];
    for (let i = 0; i < count; i++) {
      const testData = {
        item_no: itemNo.toString(), // 文字列として統一
        user_id: userId,
        timestamp: new Date().toISOString(),
        scan_type: "test_data",
        created_at: new Date(),
      };

      const docRef = doc(collection(db, "scanItems"));
      batch.push({ ref: docRef, data: testData });
    }

    // バッチで追加
    const writeBatch = writeBatch(db);
    batch.forEach(({ ref, data }) => {
      writeBatch.set(ref, data);
    });

    await writeBatch.commit();
    console.log(
      `✅ ${count} 件のテストデータを追加しました (item_no: "${itemNo.toString()}")`
    );
  } catch (error) {
    console.error("テストデータ生成エラー:", error);
  }
}

// 便利なテストデータ生成関数（デバッグ結果に基づいて）
async function generateTestDataForFoundItems() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) {
    console.error("ユーザー情報が見つかりません");
    return;
  }

  const userId = user.user_id || user.uid;
  console.log("🚀 検出されたアイテムのテストデータ生成開始");

  // デバッグで見つかったアイテム番号（69, 70, 71）にテストデータを生成
  const testItems = [69, 70, 71, 622, 623, 624, 625]; // number型のitem_no

  for (const itemNo of testItems) {
    console.log(`\n📝 item_no ${itemNo} のテストデータ生成中...`);
    await generateTestScanData(userId, itemNo, 3); // 各アイテムに3件のスキャンデータ

    // 少し待機
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("🎉 全てのテストデータ生成完了！");
  console.log("ページを再読み込みしてカウント数を確認してください。");
}

// データ検証用のデバッグ関数
async function debugDataVerification(userId) {
  console.log("🔍 === データ検証開始 ===");

  try {
    // 1. メーカー関連アイテムのデータを詳細確認
    console.log("📦 Items コレクションの確認:");
    const itemsQuery = query(
      collection(db, "items"),
      where("maker_code", "==", userId),
      orderBy("item_no", "asc")
    );
    const itemsSnapshot = await getDocs(itemsQuery);

    const itemDetails = [];
    itemsSnapshot.forEach((doc) => {
      const data = doc.data();
      itemDetails.push({
        docId: doc.id,
        item_no: data.item_no,
        item_no_type: typeof data.item_no,
        item_name: data.item_name,
        maker_code: data.maker_code,
      });
    });

    console.table(itemDetails);

    // 2. scanItemsコレクションの全データをサンプル確認
    console.log("📊 ScanItems コレクションのサンプル確認:");
    const scanItemsSnapshot = await getDocs(collection(db, "scanItems"));
    console.log(`scanItems総数: ${scanItemsSnapshot.size}`);

    // item_noの型と値の分布を確認
    const scanItemTypes = {};
    const scanItemValues = new Set();
    let sampleCount = 0;

    scanItemsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.item_no && sampleCount < 10) {
        // 最初の10件をサンプル表示
        const type = typeof data.item_no;
        scanItemTypes[type] = (scanItemTypes[type] || 0) + 1;
        scanItemValues.add(data.item_no);

        if (sampleCount < 5) {
          console.log(`scanItem サンプル ${sampleCount + 1}:`, {
            docId: doc.id,
            item_no: data.item_no,
            type: type,
            timestamp: data.timestamp,
          });
        }
        sampleCount++;
      }
    });

    console.log("scanItems item_no 型分布:", scanItemTypes);
    console.log(
      "scanItems item_no 値サンプル:",
      Array.from(scanItemValues).slice(0, 10)
    );

    // 3. 具体的なマッチング確認
    console.log("🔗 マッチング確認:");
    for (const item of itemDetails.slice(0, 3)) {
      // 最初の3件をテスト
      console.log(`\n--- ${item.item_no} のマッチング確認 ---`);

      // 文字列として検索
      const stringQuery = query(
        collection(db, "scanItems"),
        where("item_no", "==", item.item_no)
      );
      const stringCount = await getCountFromServer(stringQuery);
      console.log(
        `文字列検索 (${item.item_no}): ${stringCount.data().count}件`
      );

      // 数値として検索
      const itemNoAsNumber = parseInt(item.item_no, 10);
      if (!isNaN(itemNoAsNumber)) {
        const numberQuery = query(
          collection(db, "scanItems"),
          where("item_no", "==", itemNoAsNumber)
        );
        const numberCount = await getCountFromServer(numberQuery);
        console.log(
          `数値検索 (${itemNoAsNumber}): ${numberCount.data().count}件`
        );
      }

      // 実際のドキュメントをいくつか取得して内容確認
      const sampleQuery = query(
        collection(db, "scanItems"),
        where("item_no", "==", item.item_no)
      );
      const sampleSnapshot = await getDocs(sampleQuery);
      if (!sampleSnapshot.empty) {
        console.log("マッチしたscanItem例:", sampleSnapshot.docs[0].data());
      }
    }
  } catch (error) {
    console.error("データ検証エラー:", error);
  }

  console.log("🔍 === データ検証完了 ===\n");
}

// パフォーマンステスト関数（従来の方法）
async function testLegacyMethod(userId) {
  console.log("=== 従来方法 パフォーマンステスト開始 ===");
  const startTime = performance.now();

  try {
    // 従来の方法: scanItemsコレクション全体を取得
    const scanItemsSnapshot = await getDocs(collection(db, "scanItems"));
    console.log("取得したスキャンアイテム数:", scanItemsSnapshot.size);

    const scanCounts = {};
    scanItemsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.item_no) {
        scanCounts[data.item_no] = (scanCounts[data.item_no] || 0) + 1;
      }
    });

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    console.log("=== 従来方法 パフォーマンス結果 ===");
    console.log(`実行時間: ${executionTime.toFixed(2)}ms`);
    console.log(`読み取りドキュメント数: ${scanItemsSnapshot.size}`);
    console.log(
      `スキャンカウント結果サンプル:`,
      Object.entries(scanCounts).slice(0, 5)
    );
    console.log("=========================================");

    return {
      method: "legacy",
      time: executionTime,
      docCount: scanItemsSnapshot.size,
      results: scanCounts,
    };
  } catch (error) {
    console.error("従来方法テストエラー:", error);
    return { method: "legacy", error: error.message };
  }
}

// パフォーマンステスト関数（Aggregation Queries方法）
async function testAggregationMethod(userId) {
  console.log("=== Aggregation Queries パフォーマンステスト開始 ===");
  const startTime = performance.now();

  try {
    // まずメーカー関連アイテムを取得
    const itemsQuery = query(
      collection(db, "items"),
      where("maker_code", "==", userId),
      orderBy("item_no", "asc")
    );

    const itemsSnapshot = await getDocs(itemsQuery);
    const scanCounts = {};
    let totalQueries = 0;

    // 各アイテムごとに個別にカウントを取得（並列処理）
    // 文字列と数値の両方の型に対応するため、複数のクエリを実行
    const countPromises = [];
    const itemNumbers = [];
    const queryItemMapping = []; // どのクエリがどのアイテムに対応するかのマッピング

    itemsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.item_no) {
        itemNumbers.push(data.item_no);

        // 元の値でそのまま検索
        const originalQuery = query(
          collection(db, "scanItems"),
          where("item_no", "==", data.item_no)
        );
        countPromises.push(getCountFromServer(originalQuery));
        queryItemMapping.push({
          itemNo: data.item_no,
          type: `original_${typeof data.item_no}`,
        });
        totalQueries++;

        // 型変換して検索
        if (typeof data.item_no === "number") {
          // 数値 → 文字列
          const stringValue = data.item_no.toString();
          const stringQuery = query(
            collection(db, "scanItems"),
            where("item_no", "==", stringValue)
          );
          countPromises.push(getCountFromServer(stringQuery));
          queryItemMapping.push({
            itemNo: data.item_no,
            type: "number_to_string",
          });
          totalQueries++;
        } else if (typeof data.item_no === "string") {
          // 文字列 → 数値（変換可能な場合）
          const numberValue = parseInt(data.item_no, 10);
          if (!isNaN(numberValue) && numberValue.toString() === data.item_no) {
            const numberQuery = query(
              collection(db, "scanItems"),
              where("item_no", "==", numberValue)
            );
            countPromises.push(getCountFromServer(numberQuery));
            queryItemMapping.push({
              itemNo: data.item_no,
              type: "string_to_number",
            });
            totalQueries++;
          }
        }
      }
    });

    // 全てのカウントクエリを並列実行
    const countResults = await Promise.all(countPromises);

    // 結果をマッピング（文字列と数値の結果を合計）
    queryItemMapping.forEach((mapping, index) => {
      const count = countResults[index].data().count;
      if (!scanCounts[mapping.itemNo]) {
        scanCounts[mapping.itemNo] = 0;
      }
      scanCounts[mapping.itemNo] += count;

      // デバッグログ
      if (count > 0) {
        console.log(`${mapping.itemNo} (${mapping.type}型): ${count}件`);
      }
    });

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    console.log("=== Aggregation Queries パフォーマンス結果 ===");
    console.log(`実行時間: ${executionTime.toFixed(2)}ms`);
    console.log(`アイテム数: ${itemNumbers.length}`);
    console.log(`クエリ数: ${totalQueries} (文字列+数値検索含む)`);
    console.log(
      `平均クエリ時間: ${(executionTime / totalQueries).toFixed(2)}ms`
    );
    console.log("スキャンカウント結果:", scanCounts);
    console.log("=============================================");

    return {
      method: "aggregation",
      time: executionTime,
      itemCount: itemNumbers.length,
      queryCount: totalQueries,
      results: scanCounts,
    };
  } catch (error) {
    console.error("Aggregation Queriesテストエラー:", error);
    return { method: "aggregation", error: error.message };
  }
}

// 両方のパフォーマンステストを実行
async function runPerformanceComparison() {
  console.log("🚀 パフォーマンス比較テスト開始 🚀");

  // ユーザー情報を取得
  const sessionData = localStorage.getItem("currentUser");
  if (!sessionData) {
    console.error("ユーザー情報が見つかりません");
    return;
  }

  const user = JSON.parse(sessionData);
  const userId = user.user_id || user.uid;

  console.log(`テスト対象ユーザー: ${userId}`);

  // 両方のテストを実行
  const legacyResult = await testLegacyMethod(userId);
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機
  const aggregationResult = await testAggregationMethod(userId);

  // 比較結果を表示
  console.log("\n📊 パフォーマンス比較結果 📊");
  console.log("=====================================");

  if (legacyResult.error) {
    console.log("❌ 従来方法: エラー -", legacyResult.error);
  } else {
    console.log(
      `⏱️ 従来方法: ${legacyResult.time.toFixed(2)}ms (${
        legacyResult.docCount
      }件読み取り)`
    );
  }

  if (aggregationResult.error) {
    console.log("❌ Aggregation方法: エラー -", aggregationResult.error);
  } else {
    console.log(
      `⚡ Aggregation方法: ${aggregationResult.time.toFixed(2)}ms (${
        aggregationResult.queryCount
      }クエリ)`
    );
  }

  if (!legacyResult.error && !aggregationResult.error) {
    const improvement =
      ((legacyResult.time - aggregationResult.time) / legacyResult.time) * 100;
    console.log(
      `📈 パフォーマンス改善: ${
        improvement > 0 ? "+" : ""
      }${improvement.toFixed(1)}%`
    );

    if (improvement > 0) {
      console.log(
        `🎉 Aggregation Queriesが ${(
          legacyResult.time / aggregationResult.time
        ).toFixed(1)}倍高速！`
      );
    } else {
      console.log(
        `⚠️ 従来方法が ${(aggregationResult.time / legacyResult.time).toFixed(
          1
        )}倍高速`
      );
    }
  }

  console.log("=====================================\n");
  return { legacy: legacyResult, aggregation: aggregationResult };
}

// グローバル関数として公開
window.handleLogout = handleLogout;
window.displayUserInfo = displayUserInfo;
window.runPerformanceComparison = runPerformanceComparison;
window.testLegacyMethod = testLegacyMethod;
window.testAggregationMethod = testAggregationMethod;
window.debugDataVerification = debugDataVerification;
window.fixDataConsistency = fixDataConsistency;
window.generateTestScanData = generateTestScanData;
window.generateTestDataForFoundItems = generateTestDataForFoundItems;

console.log("Maker page functions loaded");
