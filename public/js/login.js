// Login Page Functions with Invite Code Support (Passwordless)
import "./login-auth.js";

// DOM要素取得
const loginForm = document.getElementById("loginForm");
const userIdInput = document.getElementById("userId");
const loginButton = document.getElementById("loginButton");
const loading = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");

// セクション要素
const loginSection = document.getElementById("loginSection");
const registerSection = document.getElementById("registerSection");
const demoUsers = document.getElementById("demoUsers");
const inviteInfo = document.getElementById("inviteInfo");
const inviteCodeDisplay = document.getElementById("inviteCodeDisplay");
const inviteMessage = document.getElementById("inviteMessage");
const registerPrompt = document.getElementById("registerPrompt");
const pageTitle = document.getElementById("pageTitle");

// 新規登録要素
const showRegisterButton = document.getElementById("showRegisterButton");
const backToLoginButton = document.getElementById("backToLoginButton");
const googleRegisterButton = document.getElementById("googleRegisterButton");
const registerForm = document.getElementById("registerForm");
const registerSubmitButton = document.getElementById("registerSubmitButton");

// 現在の招待コード
let currentInviteCode = null;

// エラーメッセージ表示
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
  successMessage.style.display = "none";
}

// 成功メッセージ表示
function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.style.display = "block";
  errorMessage.style.display = "none";
}

// メッセージ非表示
function hideMessages() {
  errorMessage.style.display = "none";
  successMessage.style.display = "none";
}

// ローディング状態切り替え
function toggleLoading(show, text = "処理中...") {
  if (show) {
    loading.style.display = "flex";
    loadingText.textContent = text;
    loginButton.disabled = true;
    if (registerSubmitButton) registerSubmitButton.disabled = true;
    if (googleRegisterButton) googleRegisterButton.disabled = true;
  } else {
    loading.style.display = "none";
    loginButton.disabled = false;
    if (registerSubmitButton) registerSubmitButton.disabled = false;
    if (googleRegisterButton) googleRegisterButton.disabled = false;
  }
}

// Admin認証処理
async function attemptAdminLogin(userId, password) {
  try {
    console.log("Admin認証開始:", userId);

    // パスワードが空の場合、一時的にパスワードチェックをスキップ（初回setup用）
    if (!password || password.trim() === "") {
      console.log("⚠️ パスワードが空のため、初回setup用の認証モードを使用");

      // Firestoreからユーザー情報を取得してadminロールのみ確認
      const { db, doc, getDoc } = await import('./auth.js');
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return {
          success: false,
          error: "ユーザーが見つかりません"
        };
      }

      const userData = userDoc.data();

      if (userData.role !== "admin") {
        return {
          success: false,
          error: "管理者権限がありません"
        };
      }

      // セッションデータを作成して保存
      const sessionData = {
        uid: userData.user_id,
        user_id: userData.user_id,
        user_name: userData.user_name,
        company_name: userData.company_name,
        department: userData.department || "",
        role: userData.role,
        timestamp: Date.now()
      };

      localStorage.setItem("currentUser", JSON.stringify(sessionData));
      console.log("✅ Admin セッションデータ保存完了（初回setup用）:", sessionData);

      return {
        success: true,
        user: userData,
        redirectUrl: "./admin.html"
      };
    }

    // 通常のパスワード認証
    let savedPassword = null;

    try {
      // Firestoreから管理者設定を取得
      const { db, doc, getDoc } = await import('./auth.js');
      const settingsRef = doc(db, "admin_settings", "config");
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        savedPassword = settingsDoc.data().admin_password;
        console.log("Firestoreから管理者パスワードを取得");
      } else {
        // Firestoreに設定がない場合、localStorageから読み込み（移行対応）
        savedPassword = localStorage.getItem("qr_password");
        console.log("localStorageから管理者パスワードを取得");
      }
    } catch (firestoreError) {
      console.log("Firestore読み込みエラー、localStorageから読み込み:", firestoreError.message);
      savedPassword = localStorage.getItem("qr_password");
    }

    if (!savedPassword) {
      console.log("Admin認証失敗: パスワードが設定されていません");
      return {
        success: false,
        error: "管理者パスワードが設定されていません。admin画面でパスワードを設定してください。"
      };
    }

    // パスワードチェック
    if (password !== savedPassword) {
      console.log("Admin認証失敗: パスワード不一致");
      return {
        success: false,
        error: "管理者パスワードが正しくありません"
      };
    }

    // Firestoreからユーザー情報を取得
    const { db, doc, getDoc } = await import('./auth.js');
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.log("Admin認証失敗: ユーザーが存在しません");
      return {
        success: false,
        error: "ユーザーが見つかりません"
      };
    }

    const userData = userDoc.data();

    // adminロールチェック
    if (userData.role !== "admin") {
      console.log("Admin認証失敗: adminロールではありません", userData.role);
      return {
        success: false,
        error: "管理者権限がありません"
      };
    }

    // セッションデータを作成して保存
    const sessionData = {
      uid: userData.user_id,
      user_id: userData.user_id,
      user_name: userData.user_name,
      company_name: userData.company_name,
      department: userData.department || "",
      role: userData.role,
      timestamp: Date.now()
    };

    localStorage.setItem("currentUser", JSON.stringify(sessionData));
    console.log("Admin セッションデータ保存完了:", sessionData);

    return {
      success: true,
      user: userData,
      redirectUrl: "./admin.html"
    };

  } catch (error) {
    console.error("Admin認証エラー:", error);
    return {
      success: false,
      error: "認証中にエラーが発生しました: " + error.message
    };
  }
}

// 招待コード検出と表示
function detectAndShowInviteCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get("invite");

  if (inviteCode) {
    currentInviteCode = inviteCode;
    inviteCodeDisplay.textContent = inviteCode;
    inviteInfo.style.display = "block";
    registerPrompt.style.display = "block";

    // 招待コード別のメッセージ設定
    const inviteMessages = {
      STAFF2024: "スタッフとしてイベントに参加いただけます",
      MAKER2024: "制作者として参加いただけます",
      GUEST2024: "ゲストとして参加いただけます",
      ADMIN_INVITE: "管理者権限が付与されます",
      INVITE_202408: "2024年8月イベントへの招待です",
    };

    inviteMessage.textContent =
      inviteMessages[inviteCode] ||
      "イベントへの招待です。新規登録してご参加ください。";
    return true;
  }

  return false;
}

// セクション切り替え
function showLoginSection() {
  loginSection.style.display = "block";
  registerSection.style.display = "none";
  hideMessages();
}

function showRegisterSection() {
  loginSection.style.display = "none";
  registerSection.style.display = "block";
  hideMessages();
}

// ログイン処理
async function handleLogin(event) {
  event.preventDefault();

  const userId = userIdInput.value.trim();
  const password = document.getElementById("password").value.trim();

  if (!userId) {
    showError("ユーザーIDを入力してください");
    return;
  }

  hideMessages();
  toggleLoading(true);

  try {
    // パスワードが入力されている場合、admin認証を試行
    if (password) {
      console.log("Admin認証を試行中...");
      const adminResult = await attemptAdminLogin(userId, password);

      if (adminResult.success) {
        showSuccess("管理者ログイン成功！admin画面にリダイレクトしています...");

        console.log("=== Admin ログイン成功デバッグ情報 ===");
        console.log("Admin ユーザー情報:", adminResult.user);
        console.log("Admin リダイレクトURL:", adminResult.redirectUrl);
        console.log("Admin セッションデータ:", localStorage.getItem("currentUser"));
        console.log("=====================================");

        setTimeout(() => {
          console.log("Admin リダイレクト実行中...", adminResult.redirectUrl);
          window.location.href = adminResult.redirectUrl;
        }, 1000);
        return;
      } else {
        // admin認証失敗の場合、通常ログインは試行しない
        showError(adminResult.error || "管理者認証に失敗しました");
        return;
      }
    }

    // パスワードが入力されていない場合、通常ログインを実行
    const result = await window.LoginAuth.login(userId);

    if (result.success) {
      showSuccess("ログイン成功！リダイレクトしています...");

      // デバッグ用のアラートとログ
      console.log("=== ログイン成功デバッグ情報 ===");
      console.log("ユーザー情報:", result.user);
      console.log("リダイレクトURL:", result.redirectUrl);
      console.log("セッションデータ:", localStorage.getItem("currentUser"));
      console.log("================================");

      // 安全なリダイレクト処理
      setTimeout(() => {
        console.log("リダイレクト実行前の最終チェック:");
        console.log("- URL:", result.redirectUrl);
        console.log(
          "- セッション存在確認:",
          !!localStorage.getItem("currentUser")
        );

        // リダイレクト実行
        setTimeout(() => {
          console.log("リダイレクト実行中...", result.redirectUrl);
          window.location.href = result.redirectUrl;
        }, 500);
      }, 1000);
    } else {
      showError(result.error || "ログインに失敗しました");
    }
  } catch (error) {
    console.error("Login error:", error);
    showError("ログイン中にエラーが発生しました");
  } finally {
    toggleLoading(false);
  }
}

// Google認証での新規登録（パスワードレス）
async function handleGoogleRegister() {
  if (!currentInviteCode) {
    showError("有効な招待コードが必要です");
    return;
  }

  hideMessages();
  toggleLoading(true, "Google認証中...");

  try {
    const result = await window.LoginAuth.signInWithGoogle();

    if (result.success) {
      // Google認証成功後、追加情報フォームを表示
      showGoogleRegistrationForm(result.firebaseUser);
    } else {
      // Google認証が無効な場合のガイダンスを表示
      if (result.error.includes("operation-not-allowed")) {
        showError(
          "Google認証は現在設定中です。システム管理者にお問い合わせください。"
        );
      } else {
        showError(result.error || "Google認証に失敗しました");
      }
    }
  } catch (error) {
    console.error("Google register error:", error);
    showError("Google認証中にエラーが発生しました");
  } finally {
    toggleLoading(false);
  }
}

// Google認証後の追加情報入力フォーム表示
function showGoogleRegistrationForm(firebaseUser) {
  const registerForm = document.getElementById("registerForm");
  const nameInput = document.getElementById("registerName");

  // Googleアカウントの表示名を初期値として設定
  if (firebaseUser.displayName) {
    nameInput.value = firebaseUser.displayName;
  }

  registerForm.style.display = "block";
  showSuccess("Google認証成功！追加情報を入力してください。");
}

// 追加情報入力の完了ハンドラ（パスワードレス）
async function handleAdditionalInfoSubmit(event) {
  event.preventDefault();

  const name = document.getElementById("registerName").value.trim();
  const department = document.getElementById("registerDepartment").value.trim();

  if (!name) {
    showError("お名前を入力してください");
    return;
  }

  hideMessages();
  toggleLoading(true, "登録を完了しています...");

  try {
    // 現在のFirebaseユーザーに追加情報を設定
    const result = await window.LoginAuth.updateUserAdditionalInfo(
      name,
      department,
      currentInviteCode
    );

    if (result.success) {
      if (result.autoApproved) {
        showSuccess("登録完了！自動承認されました。リダイレクトしています...");

        // 安全なリダイレクト処理
        setTimeout(() => {
          const redirectUrl = window.LoginAuth.getRedirectUrl(result.user.user_role);
          console.log("登録完了後のリダイレクト:", redirectUrl);

          // リダイレクトフラグを設定
          window.isRedirecting = true;

          // リダイレクト実行
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 500);
        }, 2000);
      } else {
        showSuccess("登録申請を受け付けました。管理者の承認をお待ちください。");
        document.getElementById("registerForm").reset();
        // 承認待ちの場合はリダイレクトしない
      }
    } else {
      showError(result.error || "登録の完了に失敗しました");
    }
  } catch (error) {
    console.error("Additional info submit error:", error);
    showError("登録完了中にエラーが発生しました");
  } finally {
    toggleLoading(false);
  }
}

// ユーザーID自動入力
window.fillUserId = function (userId, password = null) {
  userIdInput.value = userId;

  // パスワードが指定されている場合、パスワードフィールドにも入力
  if (password) {
    const passwordInput = document.getElementById("password");
    if (passwordInput) {
      passwordInput.value = password;
    }
  }

  hideMessages();
};

// イベントリスナー設定
function setupEventListeners() {
  // ログインフォーム
  loginForm.addEventListener("submit", handleLogin);

  // 新規登録関連
  showRegisterButton.addEventListener("click", showRegisterSection);
  backToLoginButton.addEventListener("click", showLoginSection);
  googleRegisterButton.addEventListener("click", handleGoogleRegister);
  registerForm.addEventListener("submit", handleAdditionalInfoSubmit);

  // Enterキーでログイン
  userIdInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      handleLogin(event);
    }
  });
}

// QRコードからの自動ログイン処理
async function handleQRCodeAutoLogin() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("user_id");

  if (!userId) {
    return false; // user_idパラメータがない場合は通常のログイン処理
  }

  console.log("QRコードからのアクセス検出 - user_id:", userId);

  // UI要素を非表示にして処理中表示
  const loginContainer = document.querySelector('.login-container');
  if (loginContainer) {
    loginContainer.style.opacity = '0.7';
  }

  hideMessages();
  toggleLoading(true, "QRコードからログイン中...");

  try {
    // 自動ログイン実行（パスワードなしの通常ログイン）
    const result = await window.LoginAuth.login(userId);

    if (result.success) {
      showSuccess(`QRログイン成功！${result.user.user_name}さんでログインします...`);

      console.log("=== QR自動ログイン成功デバッグ情報 ===");
      console.log("ユーザー情報:", result.user);
      console.log("リダイレクトURL:", result.redirectUrl);
      console.log("セッションデータ:", localStorage.getItem("currentUser"));
      console.log("===================================");

      // 自動リダイレクト
      setTimeout(() => {
        console.log("QR自動リダイレクト実行中...", result.redirectUrl);
        window.location.href = result.redirectUrl;
      }, 1500);

      return true;
    } else {
      // 自動ログイン失敗時は通常のログイン画面を表示
      showError(`ユーザーID「${userId}」でのログインに失敗しました: ${result.error}`);

      // ユーザーIDを入力欄に自動設定
      userIdInput.value = userId;

      return false;
    }
  } catch (error) {
    console.error("QR自動ログインエラー:", error);
    showError("QRコードからのログイン中にエラーが発生しました");

    // エラー時もユーザーIDを入力欄に設定
    userIdInput.value = userId;

    return false;
  } finally {
    toggleLoading(false);

    // UI要素の透明度を戻す
    if (loginContainer) {
      loginContainer.style.opacity = '1';
    }
  }
}

// ページ初期化
document.addEventListener("DOMContentLoaded", async function () {
  // 既にログイン済みかチェック
  const session = window.LoginAuth.getSession();
  if (session) {
    const redirectUrl = window.LoginAuth.getRedirectUrl(session.role);
    window.location.href = redirectUrl;
    return;
  }

  // QRコードからの自動ログイン処理
  const autoLoginHandled = await handleQRCodeAutoLogin();

  if (autoLoginHandled) {
    // 自動ログインが成功した場合は他の処理をスキップ
    return;
  }

  // 招待コード検出
  const hasInviteCode = detectAndShowInviteCode();

  if (hasInviteCode) {
    console.log("招待コード付きアクセス:", currentInviteCode);
  } else {
    console.log("通常のログインページ");
  }

  // イベントリスナー設定
  setupEventListeners();
});

console.log("Login page with invite code support loaded (Passwordless)");
