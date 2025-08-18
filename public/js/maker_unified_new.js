console.log("Maker page loaded");

// Firebase関数が利用可能になるまで待つ
let retryCount = 0;
const maxRetries = 100; // 10秒間待機

const waitForFirebase = () => {
    console.log(`Firebase関数チェック中... (${retryCount}/${maxRetries})`);
    console.log("window.db:", typeof window.db);
    console.log("window.collection:", typeof window.collection);
    console.log("window.query:", typeof window.query);
    console.log("window.getDocs:", typeof window.getDocs);

    if (typeof window.db !== 'undefined' &&
        typeof window.collection !== 'undefined' &&
        typeof window.query !== 'undefined' &&
        typeof window.getDocs !== 'undefined') {
        console.log("Firebase関数が利用可能になりました");
        // メーカー関連アイテムの表示
        displayMakerItems();

        // QRコードスキャナーの初期化
        if (window.smartScanner && typeof window.smartScanner.init === "function") {
            console.log("Smart QR Scanner initializing...");
            window.smartScanner.init();
            window.smartScanner.displayScanHistory();
        }
        return;
    }

    retryCount++;
    if (retryCount < maxRetries) {
        console.log(`Firebase初期化を待機中... (${retryCount}/${maxRetries})`);
        setTimeout(waitForFirebase, 100);
    } else {
        console.error("Firebase関数の初期化がタイムアウトしました");
        const userInfoElement = document.getElementById("userInfo");
        if (userInfoElement) {
            userInfoElement.innerHTML = `
        <div class="user-card error">
          <div class="user-header">
            <h3>⚠️ 初期化エラー</h3>
          </div>
          <div class="user-details">
            <p>Firebaseの初期化に失敗しました。ページを再読み込みしてください。</p>
            <p><small>デバッグ情報:<br>
            window.db: ${typeof window.db}<br>
            window.collection: ${typeof window.collection}<br>
            window.query: ${typeof window.query}<br>
            window.getDocs: ${typeof window.getDocs}</small></p>
            <button onclick="location.reload()" style="background-color: #9c27b0; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">再読み込み</button>
          </div>
        </div>
      `;
        }
    }
};

// DOMContentLoadedイベントでページ初期化
document.addEventListener("DOMContentLoaded", async function () {
    console.log("DOMContentLoaded for maker page");

    // ユーザー認証チェック
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
        alert("ログインが必要です。");
        window.location.href = "login.html";
        return;
    }

    // 少し待ってからFirebase関数の確認開始（他のモジュールの読み込み完了を待つ）
    setTimeout(waitForFirebase, 1000);
});

// メーカー関連アイテム表示
async function displayMakerItems() {
    console.log("=== displayMakerItems開始 ===");

    const userInfoElement = document.getElementById("userInfo");
    if (!userInfoElement) {
        console.error("userInfo要素が見つかりません");
        return;
    }

    try {
        // 現在のユーザー情報を取得
        let currentUser = null;

        console.log("ユーザー情報取得を開始...");

        // まず localStorage から直接取得
        const sessionData = localStorage.getItem("currentUser");
        console.log("localStorage currentUser raw:", sessionData);

        if (sessionData) {
            try {
                currentUser = JSON.parse(sessionData);
                console.log("localStorage解析結果:", currentUser);
            } catch (parseError) {
                console.error("localStorage JSON解析エラー:", parseError);
            }
        }

        // localStorage から取得できなかった場合のみ UserSession を試行
        if (!currentUser && window.UserSession && typeof UserSession.getCurrentUser === "function") {
            currentUser = UserSession.getCurrentUser();
            console.log("UserSession.getCurrentUser()結果:", currentUser);
        }

        if (!currentUser && window.UserSession && typeof UserSession.getSession === "function") {
            currentUser = UserSession.getSession();
            console.log("UserSession.getSession()結果:", currentUser);
        }

        console.log("最終的なユーザー情報:", currentUser);

        if (!currentUser || !currentUser.user_id) {
            console.error("ユーザー情報またはuser_idが見つかりません");
            throw new Error("ユーザー情報が不正です");
        }

        console.log("使用するuser_id:", currentUser.user_id);

        // ローディング表示
        userInfoElement.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <span>メーカー関連アイテムを読み込み中...</span>
      </div>
    `;

        console.log("Firestore クエリを開始: maker_code ==", currentUser.user_id);

        // user_idとmaker_codeが一致するitemsを取得
        const itemsQuery = window.query(
            window.collection(window.db, "items"),
            window.where("maker_code", "==", currentUser.user_id),
            window.orderBy("item_no", "asc")
        );

        console.log("itemsクエリ実行中...");
        const itemsSnapshot = await window.getDocs(itemsQuery);
        console.log("itemsクエリ結果:", itemsSnapshot.size, "件");

        // scanItemsコレクション全体を取得してカウント用にキャッシュ
        console.log("scanItemsクエリ実行中...");
        const scanItemsSnapshot = await window.getDocs(window.collection(window.db, "scanItems"));
        console.log("scanItemsクエリ結果:", scanItemsSnapshot.size, "件");

        const scanCounts = {};

        scanItemsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.item_no) {
                scanCounts[data.item_no] = (scanCounts[data.item_no] || 0) + 1;
            }
        });

        // ユーザー情報表示用のHTML（常に表示）
        let html = `
      <div class="user-card">
        <div class="user-header">
          <h3>👤 ユーザー情報</h3>
        </div>
        <div class="user-details">
          <p><strong>ユーザーID:</strong> ${currentUser.user_id}</p>
          <p><strong>ユーザー名:</strong> ${currentUser.user_name || "未設定"}</p>
          <p><strong>会社名:</strong> ${currentUser.company_name || "未設定"}</p>
          <p><strong>部署:</strong> ${currentUser.department || "未設定"}</p>
          <p><strong>権限:</strong> ${currentUser.role || "未設定"}</p>
        </div>
      </div>
    `;

        // アイテム情報の表示
        if (itemsSnapshot.empty) {
            html += `
        <div class="user-card">
          <div class="user-header">
            <h3>📦 メーカー関連アイテム</h3>
            <span class="user-id">メーカーコード: ${currentUser.user_id}</span>
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
            <span class="user-id">メーカーコード: ${currentUser.user_id}</span>
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
        console.log("=== displayMakerItems完了 ===");

    } catch (error) {
        console.error("=== displayMakerItemsエラー ===");
        console.error("エラー詳細:", error);
        console.error("エラーメッセージ:", error.message);
        console.error("エラースタック:", error.stack);

        const userInfoElement = document.getElementById("userInfo");
        if (userInfoElement) {
            userInfoElement.innerHTML = `
        <div class="user-card error">
          <div class="user-header">
            <h3>⚠️ エラー</h3>
          </div>
          <div class="user-details">
            <p>メーカー関連アイテムの取得中にエラーが発生しました:</p>
            <p><strong>${error.message}</strong></p>
            <button onclick="handleLogout()" class="logout-btn">ログアウト</button>
            <button onclick="displayMakerItems()" style="background-color: #9c27b0; margin-left: 10px; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">再試行</button>
          </div>
        </div>
      `;
        }
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

// グローバル関数として公開
window.handleLogout = handleLogout;
window.displayMakerItems = displayMakerItems;

console.log("Maker page functions loaded");
