// Maker Page Functions (Firebase Auth専用・パラメータ削除版)
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import "./auth.js";
import "./smart-qr-scanner.js";

console.log("=== maker.html ページ初期化 ===");

// Firebase Auth認証状態の確定を待機
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
    // URLパラメータをクリーンアップ（レガシーパラメータ削除）
    const url = new URL(window.location.href);
    if (url.search) {
        console.log("レガシーURLパラメータを削除:", url.search);
        // パラメータを削除してURLを更新
        window.history.replaceState({}, '', url.pathname);
    }

    // レガシーlocalStorageデータを削除
    localStorage.removeItem("currentUser");
    localStorage.removeItem("session");
    localStorage.removeItem("loginTime");

    // Firebase Auth認証待機
    console.log("Firebase Auth認証を待機しています...");
    const firebaseUser = await waitForFirebaseAuth();

    if (!firebaseUser) {
        console.warn("Firebase Auth認証に失敗、ログイン画面にリダイレクト");
        window.location.href = "login.html";
        return;
    }

    console.log("Firebase Auth認証完了:", firebaseUser.uid);

    // ユーザー情報表示とメーカー関連アイテム表示
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

// ユーザー情報表示とメーカー関連アイテム表示
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

                // ロールチェック
                if (user.role !== "maker") {
                    console.warn("アクセス権限がありません:", user.role);
                    const redirectUrl = user.role === "staff" ? "staff.html" : user.role === "admin" ? "admin.html" : "user.html";
                    window.location.href = redirectUrl;
                    return;
                }

                userInfoElement.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <div style="display: flex; flex-direction: column;">
              <span style="font-weight: bold;">会社名：${companyName}様</span>
              <span style="font-weight: bold;">ご芳名：${userName}様 (Maker)</span>
            </div>
            <div style="font-size: 0.7em; color: #999; font-family: monospace;">
              DEBUG: user_id = ${user.user_id || user.id || "未設定"}<br>
              DEBUG: role = ${user.role || "未設定"}
            </div>
          </div>
        `;

                console.log("Maker情報表示完了:", user);

                // メーカー関連アイテム表示
                await displayMakerItems(user);
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

// メーカー関連アイテム表示
async function displayMakerItems(user) {
    const makerItemsElement = document.getElementById("makerItems");
    if (makerItemsElement && user.user_name) {
        try {
            makerItemsElement.innerHTML = '<div class="loading">関連アイテムを読み込み中...</div>';

            // TODO: メーカー関連アイテムの表示ロジックを実装
            // 現在は基本的な表示のみ
            makerItemsElement.innerHTML = `
        <div style="padding: 20px; background: #f8f9fa; border-radius: 8px;">
          <h3 style="margin-top: 0;">🏭 ${user.user_name} 関連アイテム</h3>
          <p>メーカー関連アイテムの表示機能を準備中です。</p>
        </div>
      `;

            console.log("メーカー関連アイテム表示完了");
        } catch (error) {
            console.error("メーカー関連アイテム表示エラー:", error);
            makerItemsElement.innerHTML = '<div class="error">関連アイテムの表示でエラーが発生しました</div>';
        }
    }
}

console.log("Maker page functions loaded");
