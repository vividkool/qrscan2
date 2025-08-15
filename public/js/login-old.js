// Login Page Functions with Invite Code Support
import "./auth.js";

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

// ローディング表示切り替え
function toggleLoading(show, text = "認証中...") {
  loading.style.display = show ? "block" : "none";
  loadingText.textContent = text;

  if (loginButton) loginButton.disabled = show;
  if (registerSubmitButton) registerSubmitButton.disabled = show;
  if (googleRegisterButton) googleRegisterButton.disabled = show;

  if (show) {
    if (loginButton) loginButton.textContent = "認証中...";
    if (registerSubmitButton) registerSubmitButton.textContent = "登録中...";
  } else {
    if (loginButton) loginButton.textContent = "ログイン";
    if (registerSubmitButton) registerSubmitButton.textContent = "登録する";
  }
}

// 招待コード検出・表示
function detectAndShowInviteCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get("invite") || urlParams.get("code");

  if (inviteCode && FirebaseAuthManager.isValidInviteCode(inviteCode)) {
    currentInviteCode = inviteCode;

    // 招待情報を表示
    inviteCodeDisplay.textContent = inviteCode;
    inviteInfo.style.display = "block";

    // 新規登録ボタンを表示
    registerPrompt.style.display = "block";

    // デモユーザーを非表示
    demoUsers.style.display = "none";

    // タイトルを変更
    pageTitle.textContent = "イベント招待 - 新規登録";

    // 招待コードに応じたメッセージ
    const roleMessages = {
      STAFF2024: "スタッフとしてご招待されています",
      MAKER2024: "メーカー関係者としてご招待されています",
      GUEST2024: "ゲストとしてご招待されています",
      ADMIN_INVITE: "管理者としてご招待されています",
    };

    const currentMonth = new Date().toISOString().slice(0, 7).replace("-", "");
    if (
      inviteCode === `INVITE_${currentMonth}` ||
      inviteCode === `QR_${currentMonth}`
    ) {
      inviteMessage.textContent = `${new Date().getFullYear()}年${
        new Date().getMonth() + 1
      }月のイベントへの招待です`;
    } else {
      inviteMessage.textContent =
        roleMessages[inviteCode] ||
        "イベントへの招待です。新規登録してご参加ください。";
    }

    console.log("招待コードを検出:", inviteCode);
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
  if (!userId) {
    showError("ユーザーIDを入力してください");
    return;
  }

  hideMessages();
  toggleLoading(true);

  try {
    const result = await UserSession.login(userId);

    if (result.success) {
      // ログイン成功 - リダイレクト
      showSuccess("ログイン成功！リダイレクトしています...");
      setTimeout(() => {
        window.location.href = result.redirectUrl;
      }, 1000);
    } else {
      showError(result.error || "ログインに失敗しました");
    }
  } catch (error) {
    console.error("Login error:", error);
    showError("ログイン処理中にエラーが発生しました");
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
    const result = await FirebaseAuthManager.signInWithGoogle();

    if (result.success) {
      // Google認証成功後、追加情報フォームを表示
      showGoogleRegistrationForm(result.user);
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
    const result = await FirebaseAuthManager.updateUserAdditionalInfo(
      name,
      department,
      currentInviteCode
    );

    if (result.success) {
      if (result.autoApproved) {
        showSuccess("登録完了！自動承認されました。リダイレクトしています...");
        setTimeout(() => {
          const redirectUrl = UserSession.getRedirectUrl(result.user.user_role);
          window.location.href = redirectUrl;
        }, 2000);
      } else {
        showSuccess("登録申請を受け付けました。管理者の承認をお待ちください。");
        document.getElementById("registerForm").reset();
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
      showError(result.error || "メール認証登録に失敗しました");
    }
  } catch (error) {
// ユーザーID自動入力
window.fillUserId = function (userId) {
  userIdInput.value = userId;
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

// ページ初期化
document.addEventListener("DOMContentLoaded", function () {
  // 既にログイン済みかチェック
  const session = UserSession.getSession();
  if (session) {
    const redirectUrl = UserSession.getRedirectUrl(session.role);
    window.location.href = redirectUrl;
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

console.log("Login page with invite code support loaded");
