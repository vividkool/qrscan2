// User Page Functions (Firebase Auth専用・リファクタリング済み)
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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
      console.log(
        "Firebase Auth状態変更:",
        user ? "認証済み" : "未認証",
        user?.uid
      );
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
  // QRコード用のuidパラメータとuser_idパラメータをチェック
  const urlParams = new URLSearchParams(window.location.search);
  const qrUid = urlParams.get("uid");
  const userId = urlParams.get("user_id");

  if (qrUid || userId) {
    console.log("QRコードからのアクセス検出:", { qrUid, userId });

    // QRコード用の簡易認証処理
    if (qrUid && qrUid.startsWith("demo_")) {
      // デモユーザーの場合は認証をスキップして直接アクセスを許可
      console.log("デモQRコードからのアクセス - 認証スキップ");

      // URLからパラメータを除去
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);

      // デモユーザー情報を設定
      const roleFromUid = qrUid.includes("maker")
        ? "maker"
        : qrUid.includes("staff")
        ? "staff"
        : "user";

      // 役割に応じたページリダイレクト
      if (
        roleFromUid === "maker" &&
        window.location.pathname.includes("user.html")
      ) {
        window.location.href = "maker.html?uid=" + qrUid;
        return;
      } else if (
        roleFromUid === "staff" &&
        window.location.pathname.includes("user.html")
      ) {
        window.location.href = "staff.html?uid=" + qrUid;
        return;
      }

      // ページ表示処理を続行
      initializePage();
      return;
    }

    // user_idパラメータの場合、URLパラメータを保持してFirebase認証を実行
    if (userId) {
      console.log("user_idパラメータでのアクセス:", userId);
      // user_idを一時的に保存
      sessionStorage.setItem("direct_user_id", userId);

      // URLからパラメータを除去（認証後に使用）
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }

  // URLパラメータをクリーンアップ（レガシーパラメータ削除）
  const url = new URL(window.location.href);
  if (url.search && !qrUid) {
    console.log("レガシーURLパラメータを削除:", url.search);
    // パラメータを削除してURLを更新
    window.history.replaceState({}, "", url.pathname);
  }

  // レガシーlocalStorageデータを完全削除（Firebase Auth専用）
  localStorage.removeItem("currentUser");
  localStorage.removeItem("session");
  localStorage.removeItem("loginTime");

  // ページ読み込み時のデバッグ情報
  console.log("=== user.htmlページ読み込み ===");
  console.log("現在のURL:", window.location.href);
  console.log("Firebase Auth currentUser:", getAuth().currentUser);
  console.log("================================");

  // Firebase Auth認証処理を実行
  await performFirebaseAuth();
});

// Firebase Auth認証処理（既存処理）
async function performFirebaseAuth() {
  // Firebase Auth認証待機
  console.log("Firebase Auth認証を待機しています...");
  const firebaseUser = await waitForFirebaseAuth();

  if (!firebaseUser) {
    console.warn("Firebase Auth認証に失敗、ログイン画面にリダイレクト");
    window.location.href = "superuser.html";
    return;
  }

  console.log("Firebase Auth認証完了:", firebaseUser.uid);

  // ユーザー情報取得と役割チェック
  let userData = null;
  if (window.UserSession && typeof UserSession.getCurrentUser === "function") {
    userData = await UserSession.getCurrentUser();
    console.log("Firebase Auth ユーザーデータ取得:", userData);
  }

  // sessionStorageから直リンクのuser_idをチェック
  const directUserIdFromSession = sessionStorage.getItem("direct_user_id");
  if (directUserIdFromSession) {
    console.log(
      "sessionStorageから直リンクuser_id検出:",
      directUserIdFromSession
    );

    // 直リンクでアクセスした場合は、ロールに関係なくuser.htmlで表示
    console.log("ユーザー直リンクのため、ロールリダイレクトをスキップします");

    // 使用後は削除
    sessionStorage.removeItem("direct_user_id");

    // 認証完了後のページ初期化
    initializePage();
    return;
  }

  // URLパラメータをチェック（ユーザー直リンクの場合）
  const urlParams = new URLSearchParams(window.location.search);
  const directAccessUserId = urlParams.get("user_id");
  const directAccessAdminId = urlParams.get("admin_id");
  const directAccessEventId = urlParams.get("event_id");

  // ユーザー直リンクでアクセスした場合の処理
  if (directAccessUserId && directAccessAdminId && directAccessEventId) {
    console.log("ユーザー直リンクからのアクセス検出:");
    console.log("- user_id:", directAccessUserId);
    console.log("- admin_id:", directAccessAdminId);
    console.log("- event_id:", directAccessEventId);

    // 直リンクでアクセスした場合は、ロールに関係なくuser.htmlで表示
    console.log("ユーザー直リンクのため、ロールリダイレクトをスキップします");

    // 認証完了後のページ初期化
    initializePage();
    return;
  }

  // 役割に応じたページリダイレクト処理
  if (userData && userData.role) {
    const currentPage = window.location.pathname.split("/").pop();
    console.log("現在のページ:", currentPage, "ユーザー役割:", userData.role);

    // 役割とページの整合性チェック
    if (userData.role === "maker" && currentPage === "user.html") {
      console.log("makerユーザーをmaker.htmlにリダイレクト");
      window.location.href = "maker.html";
      return;
    } else if (userData.role === "staff" && currentPage === "user.html") {
      console.log("staffユーザーをstaff.htmlにリダイレクト");
      window.location.href = "staff.html";
      return;
    } else if (userData.role === "admin" && currentPage === "user.html") {
      console.log("adminユーザーをstaff.htmlにリダイレクト");
      window.location.href = "staff.html";
      return;
    } else if (userData.role !== "user" && currentPage === "user.html") {
      console.log(
        `${userData.role}ユーザーのためuser.htmlから適切なページにリダイレクト`
      );
      // デフォルトで適切なページにリダイレクト
      if (userData.role === "maker") {
        window.location.href = "maker.html";
      } else if (userData.role === "staff" || userData.role === "admin") {
        window.location.href = "staff.html";
      }
      return;
    }
  }

  // 認証完了後のページ初期化
  initializePage();
}

// ページ初期化処理
async function initializePage() {
  console.log("ページ初期化処理を開始");

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
}

// ユーザー情報表示
async function displayUserInfo() {
  const userInfoElement = document.getElementById("userInfo");
  if (userInfoElement) {
    try {
      let user = null;
      // UserSessionクラスから取得（Firebase Auth専用）
      if (
        window.UserSession &&
        typeof UserSession.getCurrentUser === "function"
      ) {
        user = await UserSession.getCurrentUser();
        console.log("UserSession経由でユーザー情報取得:", user);
      }

      if (user) {
        console.log("取得したユーザー情報の詳細:", user);
        const companyName =
          user.company_name || user.companyName || "会社名未設定";
        const userName =
          user.user_name ||
          user.userName ||
          user.displayName ||
          "ユーザー名未設定";

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
        userInfoElement.innerHTML =
          '<span style="color: #dc3545;">ユーザー情報を取得できませんでした</span>';
        console.warn("ユーザー情報が見つかりません");
      }
    } catch (error) {
      console.error("displayUserInfo エラー:", error);
      userInfoElement.innerHTML =
        '<span style="color: #dc3545;">ユーザー情報の表示でエラーが発生しました</span>';
    }
  } else {
    console.warn("userInfo要素が見つかりません");
  }
}

// ログアウト処理（Firebase Auth対応）
async function handleLogout() {
  if (confirm("ログアウトしますか？")) {
    try {
      // UserSessionのログアウト処理を使用
      if (window.UserSession && typeof UserSession.logout === "function") {
        await UserSession.logout();
      } else {
        // フォールバック：直接ログイン画面にリダイレクト
        window.location.href = "superuser.html";
      }
    } catch (error) {
      console.error("ログアウトエラー:", error);
      // エラーが発生してもログイン画面にリダイレクト
      window.location.href = "index.html";
    }
  }
}

// グローバル関数として公開
window.handleLogout = handleLogout;

console.log("User page functions loaded");
