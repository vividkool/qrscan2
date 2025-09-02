// Firebase imports - Admin専用シンプル版
import {
    getAuth,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    initializeApp,
    getApps,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// auth.jsをインポートしてUserSession機能を利用
import "./auth.js";

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
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOMContentLoaded - 自動認証チェックを無効化
document.addEventListener("DOMContentLoaded", function () {
    console.log("=== index.html ページロード ===");
    console.log("自動認証チェックを無効化、手動ナビゲーションを有効化");

    // UI初期化のみ実行
    initIndexPage();
});

// Index ページの初期化（認証チェックなし）
function initIndexPage() {
    console.log("Index ページ初期化完了");
    // 必要に応じて初期UIの設定などを行う
}

// 一般ログインページへのナビゲーション
function navigateToLogin() {
    console.log("一般ログインページに移動");
    window.location.href = "login.html";
}

// 管理者ログインフォーム表示
function showAdminLoginForm() {
    console.log("管理者ログインフォーム表示");
    document.getElementById("landingView").style.display = "none";
    document.getElementById("adminRegisterForm").style.display = "none";
    document.getElementById("adminLoginView").style.display = "block";

    // 管理者ログインフォームのrequired属性を有効化
    const loginInputs = document.querySelectorAll(
        "#adminLoginForm input[data-required='true']"
    );
    loginInputs.forEach((input) => (input.required = true));

    // 管理者登録フォームのrequired属性を無効化
    const registerInputs = document.querySelectorAll(
        "#adminRegisterForm input[required]"
    );
    registerInputs.forEach((input) => {
        input.setAttribute("data-required", "true");
        input.required = false;
    });
}

// ランディング画面に戻る
function showLandingView() {
    console.log("ランディング画面表示");
    document.getElementById("adminLoginView").style.display = "none";
    document.getElementById("adminRegisterForm").style.display = "none";
    document.getElementById("landingView").style.display = "block";

    // 全フォームのrequired属性を無効化
    const allInputs = document.querySelectorAll(
        "#adminLoginForm input[required], #adminRegisterForm input[required]"
    );
    allInputs.forEach((input) => {
        input.setAttribute("data-required", "true");
        input.required = false;
    });
}
/*
// Admin専用ログイン処理（シンプル版）
async function initAdminLogin() {
    // 既にログイン済みかチェック
    const currentAdmin = localStorage.getItem("currentAdmin");
    if (currentAdmin) {
        try {
            const adminData = JSON.parse(currentAdmin);
            console.log("Admin認証済み:", adminData.admin_name || adminData.admin_id);
            window.location.href = "./admin.html";
            return;
        } catch (e) {
            localStorage.removeItem("currentAdmin");
        }
    }

    // ログインフォーム表示
    showAdminLoginForm();
}
*/
// Admin新規登録処理（シンプル版）
async function registerAdmin(formData) {
    try {
        const adminId = formData.adminId;
        const adminName = formData.adminName;
        const email = formData.email;
        const password = formData.password;

        // 管理者情報をFirestoreに保存
        const adminRef = doc(db, "admin_settings", adminId);
        const adminDoc = await getDoc(adminRef);

        if (adminDoc.exists()) {
            throw new Error("この管理者IDは既に使用されています");
        }

        // Firebase Authにも管理者ユーザー登録（必須）
        const auth = getAuth();
        let userCredential = null;
        try {
            userCredential = await import(
                "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
            ).then((mod) =>
                mod.createUserWithEmailAndPassword(auth, email, password)
            );
        } catch (e) {
            // Firebase Auth登録失敗時はエラーで終了
            let errorMessage = "";
            if (e.code === "auth/email-already-in-use") {
                errorMessage =
                    "このメールアドレスは既に使用されています。別のメールアドレスを使用してください。";
            } else if (e.code === "auth/weak-password") {
                errorMessage = "パスワードが弱すぎます。6文字以上で設定してください。";
            } else if (e.code === "auth/invalid-email") {
                errorMessage = "メールアドレスの形式が正しくありません。";
            } else {
                errorMessage =
                    "Firebase Auth登録でエラーが発生しました: " + (e.message || e);
            }
            throw new Error(errorMessage);
        }

        // Firebase Auth登録成功時のみFirestoreに保存
        await setDoc(adminRef, {
            admin_id: adminId,
            admin_name: adminName,
            email: email,
            password: password,
            role: adminId === "superuser" ? "superuser" : "admin", // superuserの場合は特別なrole
            is_active: true,
            account_status: adminId === "superuser" ? "developer" : "test",
            plan_type: "free",
            created_at: serverTimestamp(),
            uid: userCredential.user.uid, // Firebase AuthのUID（必須）
        });

        // 登録成功
        alert(
            "管理者登録が完了しました（Firebase Auth + Firestore両方に登録済み）"
        );
        return { success: true };
    } catch (error) {
        console.error("Admin登録エラー:", error);
        return { success: false, error: error.message };
    }
}

// Adminログイン処理（Firebase Auth統合版 + auth.js role判定）
async function loginAdmin(adminId, password) {
    try {
        const adminRef = doc(db, "admin_settings", adminId);
        const adminDoc = await getDoc(adminRef);

        if (!adminDoc.exists()) {
            throw new Error("Admin IDが見つかりません");
        }

        const adminData = adminDoc.data();

        // パスワードチェック（Firestore認証）
        if (adminData.password !== password) {
            throw new Error("パスワードが間違っています");
        }

        // Firestoreからemailを取得し、Firebase Auth認証
        const auth = getAuth();
        let firebaseUser = null;
        try {
            const userCredential = await import(
                "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
            ).then((mod) =>
                mod.signInWithEmailAndPassword(auth, adminData.email, password)
            );
            firebaseUser = userCredential.user;
        } catch (e) {
            throw new Error("Firebase Auth認証に失敗しました: " + (e.message || e));
        }

        // Firebase Auth認証成功後、auth.jsのUserSessionでrole判定
        // 少し待機してFirebase Authの状態が安定するのを待つ
        await new Promise(resolve => setTimeout(resolve, 1000));

        // UserSessionから現在のユーザー情報を取得
        let userData = null;
        if (window.UserSession && typeof UserSession.getCurrentUser === "function") {
            try {
                userData = await UserSession.getCurrentUser();
                console.log("Firebase Auth認証後のUserSession データ:", userData);
            } catch (error) {
                console.error("UserSession取得エラー:", error);
            }
        }

        // auth.jsのgetRedirectUrlでroleに応じたリダイレクト先を決定
        let redirectUrl = "admin.html"; // デフォルト
        if (userData && userData.role && window.UserSession?.getRedirectUrl) {
            redirectUrl = window.UserSession.getRedirectUrl(userData.role);
            console.log(`Role: ${userData.role} → Redirect: ${redirectUrl}`);
        }

        return {
            success: true,
            adminData: {
                admin_id: firebaseUser.uid,
                admin_name: adminData.admin_name || firebaseUser.uid,
                email: adminData.email,
                role: userData?.role || "admin",
                timestamp: Date.now(),
            },
            redirectUrl: redirectUrl,
        };
    } catch (error) {
        console.error("Adminログインエラー:", error);
        return { success: false, error: error.message };
    }
}

// UIコントロール関数
function showAdminRegisterForm() {
    document.getElementById("landingView").style.display = "none";
    document.getElementById("adminLoginView").style.display = "none";
    document.getElementById("adminRegisterForm").style.display = "block";

    // 管理者登録フォームのrequired属性を有効化
    const registerInputs = document.querySelectorAll(
        "#adminRegisterForm input[data-required='true']"
    );
    registerInputs.forEach((input) => (input.required = true));

    // 管理者ログインフォームのrequired属性を無効化
    const loginInputs = document.querySelectorAll(
        "#adminLoginForm input[required]"
    );
    loginInputs.forEach((input) => {
        input.setAttribute("data-required", "true");
        input.required = false;
    });
}

// フォーム送信処理
async function handleAdminRegister(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const adminData = {
        adminId: formData.get("adminId"),
        adminName: formData.get("adminName"),
        email: formData.get("email"),
        password: formData.get("password"),
    };

    const result = await registerAdmin(adminData);
    if (result.success) {
        alert("管理者登録が完了しました。ログイン画面に移動します。");
        showAdminLoginForm();
        form.reset();
    } else {
        alert("登録に失敗しました: " + result.error);
    }
}

async function handleAdminLogin(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const adminId = formData.get("adminId");
    const password = formData.get("password");

    const result = await loginAdmin(adminId, password);

    if (result.success) {
        window.location.href = result.redirectUrl;
    } else {
        alert("ログインに失敗しました: " + result.error);
    }
}

// グローバルスコープに関数を追加
window.showAdminRegisterForm = showAdminRegisterForm;
window.showAdminLoginForm = showAdminLoginForm;
window.handleAdminLogin = handleAdminLogin;
window.handleAdminRegister = handleAdminRegister;
window.navigateToLogin = navigateToLogin;
window.showLandingView = showLandingView;
window.navigateToLogin = navigateToLogin;
//window.navigateToAdmin = navigateToAdmin;
