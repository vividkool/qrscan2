// Login Page Functions
import "./auth.js";

// フォーム要素取得
const loginForm = document.getElementById("loginForm");
const userIdInput = document.getElementById("userId");
const loginButton = document.getElementById("loginButton");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");

// エラーメッセージ表示
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
}

// エラーメッセージ非表示
function hideError() {
    errorMessage.style.display = "none";
}

// ローディング表示切り替え
function toggleLoading(show) {
    loading.style.display = show ? "block" : "none";
    loginButton.disabled = show;
    if (show) {
        loginButton.textContent = "認証中...";
    } else {
        loginButton.textContent = "ログイン";
    }
}

// ログイン処理
async function handleLogin(event) {
    event.preventDefault();

    const userId = userIdInput.value.trim();
    if (!userId) {
        showError("ユーザーIDを入力してください");
        return;
    }

    hideError();
    toggleLoading(true);

    try {
        const result = await UserSession.login(userId);

        if (result.success) {
            // ログイン成功 - リダイレクト
            window.location.href = result.redirectUrl;
        } else {
            showError(result.error);
        }
    } catch (error) {
        console.error("Login error:", error);
        showError("ログインに失敗しました。再度お試しください。");
    } finally {
        toggleLoading(false);
    }
}

// ユーザーID自動入力
window.fillUserId = function (userId) {
    userIdInput.value = userId;
    hideError();
};

// イベントリスナー
loginForm.addEventListener("submit", handleLogin);

// 既にログイン済みかチェック
document.addEventListener("DOMContentLoaded", function () {
    const session = UserSession.getSession();
    if (session) {
        // 既にログイン済みの場合はリダイレクト
        const redirectUrl = UserSession.getRedirectUrl(session.role);
        window.location.href = redirectUrl;
    }
});

// Enterキーでログイン
userIdInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        handleLogin(event);
    }
});

console.log("Login page script loaded");
