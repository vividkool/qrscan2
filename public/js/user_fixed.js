// User Page Functions (Firebase Auth専用・リファクタリング済み)
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import "./auth.js";
import "./smart-qr-scanner.js";

// Firebase Auth認証状態の確定を待機（maker.jsと同様）
async function waitForFirebaseAuth() {
    const auth = getAuth();

    return new Promise((resolve) => {
        if (auth.currentUser) {
            // 既に認証済みの場合
            resolve(auth.currentUser);
            return;
        }

        // 認証状態変更を監視
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log("Firebase Auth状態変更:", user ? "認証済み" : "未認証", user?.uid);
            unsubscribe(); // 一度だけ実行
            resolve(user);
        });

        // タイムアウト処理（10秒で諦める）
        setTimeout(() => {
            console.warn("Firebase Auth認証待機タイムアウト");
            unsubscribe();
            resolve(null);
        }, 10000);
    });
}

// ページロード時の初期化
document.addEventListener("DOMContentLoaded", async function () {
    // レガシーlocalStorageデータを完全削除（Firebase Auth専用）
    localStorage.removeItem("currentUser");
    localStorage.removeItem("session");
    localStorage.removeItem("loginTime");

    // ページ読み込み時のデバッグ情報
    console.log("=== user.htmlページ読み込み ===");
    console.log("現在のURL:", window.location.href);
    console.log("Firebase Auth currentUser:", getAuth().currentUser);
    console.log("================================");

    // Firebase Auth認証待機
    console.log("Firebase Auth認証を待機しています...");
    const firebaseUser = await waitForFirebaseAuth();

    if (!firebaseUser) {
        console.warn("Firebase Auth認証に失敗、ログイン画面にリダイレクト");
        window.location.href = "login.html";
        return;
    }

    console.log("Firebase Auth認証完了:", firebaseUser.uid);

    // ユーザー情報表示
    await displayUserInfo();

    // スキャン履歴の読み込み
    if (window.smartScanner && window.smartScanner.displayScanHistory) {
        await window.smartScanner.displayScanHistory();
    } else {
        const scanHistoryElement = document.getElementById("scanHistory");
        if (scanHistoryElement) {
            scanHistoryElement.innerHTML =
                '<span style="color: #4285f4; font-weight: bold;">スキャンボタンを押してスキャンしてください</span>';
        }
    }
});

// ユーザー情報表示
async function displayUserInfo() {
    const userInfoElement = document.getElementById("userInfo");
    if (userInfoElement) {
        try {
            let user = null;
            // UserSessionクラスから取得（Firebase Auth専用）
            if (window.UserSession && typeof UserSession.getCurrentUser === "function") {
                user = await UserSession.getCurrentUser();
                console.log("UserSession経由でユーザー情報取得:", user);
            }

            if (user) {
                console.log("取得したユーザー情報の詳細:", user);
                const companyName = user.company_name || user.companyName || "会社名未設定";
                const userName = user.user_name || user.userName || user.displayName || "ユーザー名未設定";

                userInfoElement.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <div style="display: flex; flex-direction: column;">
              <span style="font-weight: bold;">会社名：${companyName}様</span>
              <span style="font-weight: bold;">ご芳名：${userName}様</span>
            </div>
            <div style="font-size: 0.7em; color: #999; font-family: monospace;">
              DEBUG: user_id = ${user.user_id || user.id || "未設定"}<br>
              DEBUG: collection = users/${user.user_id || user.id || "未設定"}
            </div>
          </div>
        `;
            } else {
                userInfoElement.innerHTML = '<span style="color: #dc3545;">ユーザー情報を取得できませんでした</span>';
                console.warn("ユーザー情報が見つかりません");
            }
        } catch (error) {
            console.error("displayUserInfo エラー:", error);
            userInfoElement.innerHTML = '<span style="color: #dc3545;">ユーザー情報の表示でエラーが発生しました</span>';
        }
    } else {
        console.warn("userInfo要素が見つかりません");
    }
}

console.log("User page functions loaded");
