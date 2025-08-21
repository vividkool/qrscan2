// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    setDoc,
    addDoc,
    serverTimestamp,
    query,
    where,
    getDocs
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

// QRコード自動ログイン処理
async function handleQRCodeAutoLogin() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get("user_id");

    if (!userId) {
        return false; // user_idパラメータがない場合は通常表示
    }

    console.log("Index page - QRコードからのアクセス検出 - user_id:", userId);

    // ローディング表示
    document.body.innerHTML = `
    <div class="landing-container" style="text-align: center;">
      <div class="logo">📱</div>
      <h1 class="title">自動ログイン中...</h1>
      <p class="subtitle">QRコードからのログインを処理しています</p>
      <div class="loading-spinner"></div>
      <p style="color: #666; font-size: 14px;">ユーザーID: ${userId}</p>
    </div>
  `;

    try {
        // login-auth.jsのLoginAuthを使用
        if (!window.LoginAuth) {
            throw new Error("LoginAuth が見つかりません");
        }

        // 自動ログイン実行
        const result = await window.LoginAuth.login(userId);

        if (result.success) {
            console.log("=== Index QR自動ログイン成功 ===");
            console.log("ユーザー情報:", result.user);
            console.log("リダイレクト先:", result.redirectUrl);

            // 成功メッセージを表示
            document.body.innerHTML = `
        <div class="landing-container" style="text-align: center;">
          <div class="logo">✅</div>
          <h1 class="title" style="color: #28a745;">ログイン成功！</h1>
          <p class="subtitle">
            ${result.user.user_name || userId}さん、こんにちは！<br>
            ${result.user.role}ページにリダイレクトしています...
          </p>
        </div>
      `;

            // 1.5秒後にリダイレクト
            setTimeout(() => {
                console.log("QR自動リダイレクト実行中...", result.redirectUrl);
                window.location.href = result.redirectUrl;
            }, 1500);

            return true;
        } else {
            throw new Error(result.error || "ログインに失敗しました");
        }
    } catch (error) {
        console.error("QR自動ログインエラー:", error);

        // エラー表示
        document.body.innerHTML = `
      <div class="landing-container" style="text-align: center;">
        <div class="logo">❌</div>
        <h1 class="title" style="color: #dc3545;">ログイン失敗</h1>
        <p class="subtitle">
          ユーザーID「${userId}」でのログインに失敗しました<br>
          ログイン画面にリダイレクトしています...
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 10px;">
          エラー: ${error.message}
        </p>
      </div>
    `;

        // 3秒後にログイン画面にリダイレクト
        setTimeout(() => {
            window.location.href = `./login.html?user_id=${userId}`;
        }, 3000);

        return true;
    }
}

// Admin新規登録処理
async function registerAdmin(formData) {
    try {
        const { adminId, adminName, email, password } = formData;

        // 既存のadmin_id確認
        const adminRef = doc(db, "admin_settings", adminId);
        const adminDoc = await getDoc(adminRef);

        if (adminDoc.exists()) {
            throw new Error("このAdmin IDは既に使用されています");
        }

        // Emailの重複確認
        const adminSettingsRef = collection(db, "admin_settings");
        const emailQuery = query(adminSettingsRef, where("email", "==", email));
        const emailDocs = await getDocs(emailQuery);

        if (!emailDocs.empty) {
            throw new Error("このメールアドレスは既に使用されています");
        }

        // admin_settingsコレクションに登録
        await setDoc(adminRef, {
            admin_id: adminId,
            admin_name: adminName,
            email: email,
            password: password, // 実際のプロダクションではハッシュ化が必要
            permissions: ["user_manage", "data_export", "system_config"],

            // 新しいステータス管理システム
            account_status: "test", // test/real/suspended
            plan_type: "free",      // free/basic/premium  
            is_active: true,        // アクティブ状態

            // 課金情報 (将来の拡張用)
            billing_info: {
                trial_end_date: null,
                last_payment_date: null,
                next_billing_date: null,
                payment_method: null
            },

            // 使用制限 (プランに応じた制限)
            usage_limits: {
                max_users: 100,        // テストプランの制限
                max_scans_per_month: 1000,
                max_data_export: 10
            },

            created_at: serverTimestamp(),
            last_login: null
        });

        console.log("Admin登録成功:", adminId);
        return { success: true, message: "管理者登録が完了しました" };

    } catch (error) {
        console.error("Admin登録エラー:", error);
        return { success: false, error: error.message };
    }
}

// デモ用Admin作成関数
async function createDemoAdmin() {
    try {
        const demoAdminId = "ADMIN001";
        const adminRef = doc(db, "admin_settings", demoAdminId);
        const adminDoc = await getDoc(adminRef);

        // 既に存在する場合は、パスワードのみ更新
        if (adminDoc.exists()) {
            console.log("デモAdmin ADMIN001は既に存在します。パスワードを更新します。");
            await setDoc(adminRef, {
                ...adminDoc.data(),
                password: "DemoAdmin2024!", // パスワードのみ更新
                updatedAt: serverTimestamp()
            });
            console.log("デモAdminのパスワードを更新しました (New Pass: DemoAdmin2024!)");
            return;
        }

        // デモAdminを作成
        await setDoc(adminRef, {
            admin_id: demoAdminId,
            admin_name: "デモ管理者",
            email: "demo@admin.com",
            password: "DemoAdmin2024!", // より安全なデモ用パスワード
            permissions: ["user_manage", "data_export", "system_config"],

            // 新しいステータス管理システム
            account_status: "real", // デモAdminは本番扱い
            plan_type: "premium",   // フル機能利用可能
            is_active: true,

            // 課金情報
            billing_info: {
                trial_end_date: null,
                last_payment_date: serverTimestamp(),
                next_billing_date: null, // 無期限
                payment_method: "demo"
            },

            // 使用制限なし
            usage_limits: {
                max_users: -1,           // 無制限
                max_scans_per_month: -1, // 無制限
                max_data_export: -1      // 無制限
            },

            created_at: serverTimestamp(),
            last_login: null
        });

        console.log("デモAdmin ADMIN001を作成しました (ID: ADMIN001, Pass: DemoAdmin2024!)");
    } catch (error) {
        console.error("デモAdmin作成エラー:", error);
    }
}

// Legacy AdminユーザーをAdmin認証システムに移行する関数
async function migrateLegacyAdminUser(userId, userName, password = "LegacyAdmin2024!") {
    try {
        const adminRef = doc(db, "admin_settings", userId);
        const adminDoc = await getDoc(adminRef);

        if (adminDoc.exists()) {
            console.log(`Admin ${userId}は既に存在します`);

            // アカウントのステータスをチェックして修正
            const adminData = adminDoc.data();

            // 旧システムから新システムへの移行チェック
            const needsUpdate = adminData.status || !adminData.account_status;

            if (needsUpdate) {
                console.warn(`Admin ${userId} を新しいステータス管理システムに移行します`);
                // statusフィールドを削除
                const newAdminData = { ...adminData };
                if ('status' in newAdminData) delete newAdminData.status;
                await setDoc(adminRef, {
                    ...newAdminData,
                    account_status: "test", // レガシーユーザーはテストから開始
                    plan_type: "basic",
                    is_active: true,
                    password: password, // パスワードも再設定
                    billing_info: {
                        trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日間試用
                        last_payment_date: null,
                        next_billing_date: null,
                        payment_method: null
                    },
                    usage_limits: {
                        max_users: 50,
                        max_scans_per_month: 500,
                        max_data_export: 5
                    },
                    migrated_to_new_system: serverTimestamp()
                });
                console.log(`Admin ${userId}のアカウントを新システムに移行しました`);
            }
            return;
        }

        // Legacy AdminをAdmin認証システムに登録
        await setDoc(adminRef, {
            admin_id: userId,
            admin_name: userName || `管理者${userId}`,
            email: `${userId}@legacy.admin.com`,
            password: password,
            permissions: ["user_manage", "data_export", "system_config"],

            // 新しいステータス管理システム
            account_status: "test", // 新規レガシーユーザーはテストから開始
            plan_type: "basic",
            is_active: true,

            // 課金情報
            billing_info: {
                trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日間試用
                last_payment_date: null,
                next_billing_date: null,
                payment_method: null
            },

            // 使用制限
            usage_limits: {
                max_users: 50,
                max_scans_per_month: 500,
                max_data_export: 5
            },

            created_at: serverTimestamp(),
            last_login: null,
            migrated_from_legacy: true
        });

        console.log(`Legacy Admin ${userId}をAdmin認証システムに移行しました (Pass: ${password})`);
    } catch (error) {
        console.error("Legacy Admin移行エラー:", error);
    }
}

// Adminログイン処理
async function loginAdmin(adminId, password) {
    try {
        const adminRef = doc(db, "admin_settings", adminId);
        const adminDoc = await getDoc(adminRef);

        if (!adminDoc.exists()) {
            throw new Error("Admin IDが見つかりません");
        }

        const adminData = adminDoc.data();
        console.log(`[DEBUG] Admin ${adminId} のデータ:`, adminData);

        // 新しいステータス管理システム
        const accountStatus = adminData.account_status || "test"; // test/real/suspended
        const planType = adminData.plan_type || "free"; // free/basic/premium
        const isActive = adminData.is_active !== false; // アクティブ状態 (デフォルト: true)

        // アカウントが無効化されているかチェック
        if (!isActive) {
            console.error(`[ERROR] Admin ${adminId} は無効化されています`);
            throw new Error("このアカウントは無効化されています");
        }

        // 課金状態チェック (将来の拡張用)
        if (accountStatus === "suspended") {
            console.error(`[ERROR] Admin ${adminId} のアカウントが停止されています`);
            throw new Error("このアカウントは停止されています。課金状況をご確認ください");
        }

        console.log(`[INFO] Admin ${adminId} - アカウント種別: ${accountStatus}, プラン: ${planType}`);

        if (adminData.password !== password) {
            console.error(`[ERROR] パスワード不一致 - 入力: ${password}, 保存: ${adminData.password}`);
            throw new Error("パスワードが間違っています");
        }

        // 最終ログイン時刻を更新
        await setDoc(adminRef, {
            ...adminData,
            last_login: serverTimestamp()
        });

        // セッション情報保存
        const sessionData = {
            admin_id: adminId,
            admin_name: adminData.admin_name,
            email: adminData.email,
            role: "admin",
            permissions: adminData.permissions,
            account_status: adminData.account_status || "test",
            plan_type: adminData.plan_type || "free",
            is_active: adminData.is_active !== false,
            timestamp: Date.now()
        };

        console.log("💾 セッションデータを保存します:", sessionData);
        localStorage.setItem("currentAdmin", JSON.stringify(sessionData));

        // 保存確認
        const savedData = localStorage.getItem("currentAdmin");
        console.log("📦 保存されたセッション:", savedData);
        console.log("🔍 JSON解析テスト:", JSON.parse(savedData));

        console.log("Adminログイン成功:", adminId);
        return {
            success: true,
            adminData: sessionData,
            redirectUrl: "./admin.html"
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
    const formData = new FormData(event.target);
    const adminData = {
        adminId: formData.get("adminId"),
        adminName: formData.get("adminName"),
        email: formData.get("email"),
        password: formData.get("password"),
        account_status: formData.get("accountMode") || "test"
    };
    // パスワードバリデーション
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(adminData.password)) {
        alert("パスワードは8文字以上の英数字を組み合わせてください");
        return;
    }
    const registerBtn = document.getElementById("registerBtn");
    registerBtn.textContent = "登録中...";
    registerBtn.disabled = true;
    const result = await registerAdmin(adminData);
    if (result.success) {
        alert("管理者登録が完了しました。ログイン画面に移動します。");
        showAdminLoginForm();
        const form = document.getElementById("adminRegisterFormForm");
        if (form && typeof form.reset === "function") form.reset();
    } else {
        alert("登録に失敗しました: " + result.error);
    }
    registerBtn.textContent = "新規登録";
    registerBtn.disabled = false;
}

async function handleAdminLogin(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const adminId = formData.get("adminId");
    const password = formData.get("password");

    console.log("=== Adminログイン開始 ===");
    console.log("Admin ID:", adminId);
    console.log("ログイン前のlocalStorage:", { ...localStorage });

    const loginBtn = document.getElementById("loginBtn");
    loginBtn.textContent = "ログイン中...";
    loginBtn.disabled = true;

    const result = await loginAdmin(adminId, password);

    if (result.success) {
        console.log("✅ ログイン成功:", result);
        console.log("ログイン後のlocalStorage:", { ...localStorage });
        console.log("currentAdmin確認:", localStorage.getItem("currentAdmin"));

        // リダイレクト前に2秒待機してログ確認
        setTimeout(() => {
            console.log("🔄 admin.htmlにリダイレクトします");
            window.location.href = result.redirectUrl;
        }, 2000);
    } else {
        console.log("❌ ログイン失敗:", result.error);
        alert("ログインに失敗しました: " + result.error);
    }

    loginBtn.textContent = "ログイン";
    loginBtn.disabled = false;
}

// ページロード時の処理
document.addEventListener("DOMContentLoaded", async function () {
    // デモAdmin作成（初回のみ）
    await createDemoAdmin();

    // Legacy Adminユーザーの自動移行（修復も含む）
    // await migrateLegacyAdminUser("32030428", "船切", "Legacy2024!");

    // 緊急修復：32030428アカウントの強制修復
    // await emergencyFixAdmin("32030428");

    // QRコード自動ログインチェック
    const isQRLogin = await handleQRCodeAutoLogin();

    if (!isQRLogin) {
        // QRコードでのアクセスでない場合、Admin認証画面を表示
        showAdminAuthInterface();
    }
});

// 緊急修復関数
async function emergencyFixAdmin(adminId) {
    try {
        const adminRef = doc(db, "admin_settings", adminId);
        const adminDoc = await getDoc(adminRef);

        if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            console.log(`[緊急修復] Admin ${adminId} の現在のデータ:`, adminData);

            // 旧システムから新システムへの強制移行
            const needsUpdate = adminData.status || !adminData.account_status || !adminData.is_active;

            if (needsUpdate) {
                await setDoc(adminRef, {
                    ...adminData,

                    // 旧システムフィールド削除
                    status: undefined,

                    // 新システムへ移行
                    account_status: "test",
                    plan_type: "basic",
                    is_active: true,
                    password: "Legacy2024!",

                    // 課金情報
                    billing_info: {
                        trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        last_payment_date: null,
                        next_billing_date: null,
                        payment_method: null
                    },

                    // 使用制限
                    usage_limits: {
                        max_users: 50,
                        max_scans_per_month: 500,
                        max_data_export: 5
                    },

                    emergency_fixed_at: serverTimestamp()
                });
                console.log(`[緊急修復] Admin ${adminId} を新システムに移行しました`);
                alert(`Admin ${adminId} を新しいシステムに移行しました！\nアカウント種別: テスト\nプラン: ベーシック\nパスワード: Legacy2024!`);
            } else {
                console.log(`[緊急修復] Admin ${adminId} は正常です`);
            }
        } else {
            console.error(`[緊急修復] Admin ${adminId} が見つかりません`);
        }
    } catch (error) {
        console.error(`[緊急修復] エラー:`, error);
    }
}

// Admin認証インターフェース表示
function showAdminAuthInterface() {
    document.body.innerHTML = `
    <div class="auth-container">
      <!-- ログインフォーム -->
      <div id="adminLoginForm" class="auth-form">
        <div class="logo">🔐</div>
        <h1 class="title">管理者ログイン</h1>
        <p class="subtitle">QRスキャンシステム管理画面</p>
        
        <!-- デモ用情報表示 -->
        
        
                <form onsubmit="handleAdminLogin(event)">
                    <div class="form-group">
                        <label for="loginAdminId">管理者 ID</label>
                        <input type="text" id="loginAdminId" name="adminId" required placeholder="ADMIN ID" value="${localStorage.getItem('currentAdmin') ? JSON.parse(localStorage.getItem('currentAdmin')).admin_id : ''}">
                    </div>
          
                    <div class="form-group">
                        <label for="loginPassword">パスワード</label>
                        <input type="password" id="loginPassword" name="password" required placeholder="パスワード">
                    </div>
          
                    <button type="submit" id="loginBtn" class="btn-primary">ログイン</button>
                </form>
        
        <div class="form-footer">
          <p>アカウントをお持ちでない場合</p>
          <button onclick="showAdminRegisterForm()" class="btn-link">新規管理者登録</button>
        </div>
      </div>

      <!-- 新規登録フォーム -->
      <div id="adminRegisterForm" class="auth-form" style="display: none;">
        <div class="logo">👤</div>
        <h1 class="title">管理者　新規登録</h1>
        <form id="adminRegisterFormForm">
          <div class="form-group">
            <label for="regAdminId">管理者 ID</label>
            <input type="text" id="regAdminId" name="adminId" required placeholder="例: ADMIN001" value="" pattern="[A-Za-z0-9_]+" title="英数字とアンダースコアのみ使用可能">
            <small>英数字とアンダースコアのみ使用可能</small>
          </div>
          <div class="form-group">
            <label for="adminName">管理者名</label>
            <input type="text" id="adminName" name="adminName" required placeholder="例: 管理者太郎" value="">
          </div>
          <div class="form-group">
            <label for="email">メールアドレス</label>
            <input type="email" id="email" name="email" required placeholder="admin@company.com" value="">
          </div>
          <div class="form-group">
            <label for="regPassword">パスワード</label>
            <input type="password" id="regPassword" name="password" required minlength="8" pattern="^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$" title="8文字以上の英数字を組み合わせてください">
            <small>8文字以上の英数字を組み合わせてください</small>
          </div>
          <!-- 課金方法欄（後で追加予定） -->
          <div class="form-group" id="paymentMethodGroup" style="display:none;"></div>
          <div class="form-group" style="display: flex; gap: 16px; justify-content: space-between; margin-top: 30px;">
            <button type="button" id="registerTestBtn" class="btn-primary" style="width:48%;">新規登録テストモード</button>
            <button type="button" id="registerRealBtn" class="btn-danger" style="width:48%;background-color:#dc3545;color:#fff;">新規登録本番モード</button>
          </div>
        </form>
        
        <div class="form-footer">
          <p>既にアカウントをお持ちの場合</p>
          <button onclick="showAdminLoginForm()" class="btn-link">ログイン画面に戻る</button>
        </div>
      </div>
    </div>
  `;

    // ボタンイベント
    document.getElementById('registerTestBtn').onclick = function () {
        handleAdminRegisterMode('test');
    };
    document.getElementById('registerRealBtn').onclick = function () {
        handleAdminRegisterMode('real');
    };

    // 新規登録モード選択関数
    function handleAdminRegisterMode(mode) {
        const form = document.getElementById('adminRegisterFormForm');
        if (!form) return;
        // hidden inputがなければ追加
        let modeInput = form.querySelector('input[name="accountMode"]');
        if (!modeInput) {
            modeInput = document.createElement('input');
            modeInput.type = 'hidden';
            modeInput.name = 'accountMode';
            form.appendChild(modeInput);
        }
        modeInput.value = mode;
        // 登録処理を呼び出し
        handleAdminRegister({ preventDefault: () => { } });
    }
}

// グローバルスコープに関数を追加
window.showAdminRegisterForm = showAdminRegisterForm;
window.showAdminLoginForm = showAdminLoginForm;
window.handleAdminLogin = handleAdminLogin;
window.handleAdminRegister = handleAdminRegister;
