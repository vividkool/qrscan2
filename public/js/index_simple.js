// Firebase imports - Admin専用シンプル版
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
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
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Firebase Auth認証済みならadmin.htmlへリダイレクト
            window.location.href = "./admin.html";
        }
        // 未認証なら管理者ログインフォームを表示
    });

    // 管理者ログインのみをサポート
    initAdminLogin();
});

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

        await setDoc(adminRef, {
            admin_id: adminId,
            admin_name: adminName,
            email: email,
            password: password,
            role: "admin",
            is_active: true,
            account_status: "test",
            plan_type: "free",
            created_at: serverTimestamp(),
        });

        alert("管理者登録が完了しました");
        return { success: true };
    } catch (error) {
        console.error("Admin登録エラー:", error);
        return { success: false, error: error.message };
    }
}

// Adminログイン処理（Firebase Auth統合版）
async function loginAdmin(adminId, password) {
    try {
        const adminRef = doc(db, "admin_settings", adminId);
        const adminDoc = await getDoc(adminRef);

        if (!adminDoc.exists()) {
            throw new Error("Admin IDが見つかりません");
        }

        const adminData = adminDoc.data();

        // パスワードチェック
        if (adminData.password !== password) {
            throw new Error("パスワードが間違っています");
        }

        // 最小限のセッション保存（管理機能用）
        const sessionData = {
            admin_id: adminId,
            admin_name: adminData.admin_name || adminId,
            email: adminData.email,
            role: "admin",
            timestamp: Date.now(),
        };

        localStorage.setItem("currentAdmin", JSON.stringify(sessionData));

        return {
            success: true,
            adminData: sessionData,
            redirectUrl: "./admin.html",
        };
    } catch (error) {
        console.error("Adminログインエラー:", error);
        return { success: false, error: error.message };
    }
}

// UIコントロール関数
function showAdminRegisterForm() {
    document.getElementById("adminLoginForm").style.display = "none";
    document.getElementById("adminRegisterForm").style.display = "block";
}

function showAdminLoginForm() {
    document.getElementById("adminRegisterForm").style.display = "none";
    document.getElementById("adminLoginForm").style.display = "block";
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
