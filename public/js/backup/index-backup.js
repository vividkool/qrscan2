// Firebase imports
import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
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
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// testtemplateから新adminへコレクションごとコピー

async function copyTemplateCollectionsToAdmin(newAdminId) {
  const collections = ["users", "staff", "maker", "items"];
  for (const col of collections) {
    const srcRef = collection(db, "admin_collections", "testtemplate", col);
    const dstRef = (id) => collection(db, "admin_collections", id, col);
    const snapshot = await getDocs(srcRef);
    for (const docSnap of snapshot.docs) {
      await setDoc(doc(dstRef(newAdminId), docSnap.id), docSnap.data());
    }
  }
}
import { uploadExcelFile } from "./template-utils.js";

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

// QRコード自動ログイン処理
async function handleQRCodeAutoLogin() {
  const urlParams = new URLSearchParams(window.location.search);
  const adminId = urlParams.get("admin_id");
  const docId = urlParams.get("id");
  if (!adminId || !docId) {
    return false; // パラメータがなければ通常表示
  }
  document.body.innerHTML = `
      <div class="landing-container" style="text-align: center;">
        <div class="logo">📱</div>
        <h1 class="title">自動ログイン中...</h1>
        <p class="subtitle">QRコードからのログインを処理しています</p>
        <div class="loading-spinner"></div>
        <p style="color: #666; font-size: 14px;">ID: ${docId}<br>Admin: ${adminId}</p>
      </div>
    `;
  try {
    // admin_idとdocIdが指定されている場合のみ直接参照
    const userRef = doc(db, `admin_collections/${adminId}/users/${docId}`);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error("ユーザーが見つかりません");
    }
    const userData = userSnap.data();
    // 成功メッセージを表示
    document.body.innerHTML = `
            <div class="landing-container" style="text-align: center;">
                <div class="logo">✅</div>
                <h1 class="title" style="color: #28a745;">ログイン成功！</h1>
                <p class="subtitle">
                    ${userData.user_name || docId}さん、こんにちは！<br>
                    ユーザーページにリダイレクトしています...
                </p>
            </div>
        `;
    // currentAdmin情報をlocalStorageへ保存
    localStorage.setItem(
      "currentAdmin",
      JSON.stringify({
        admin_id: adminId,
        user_id: docId,
        user_name: userData.user_name || docId,
        role: userData.role || "user",
      })
    );
    // 1.5秒後にリダイレクト
    setTimeout(() => {
      window.location.href = `./user.html?admin_id=${adminId}&user_id=${docId}`;
    }, 1500);
    return true;
  } catch (error) {
    console.error(
      "QR自動ログインエラー:",
      error,
      error?.message,
      error?.code,
      error?.stack
    );
    alert("stop");
    document.body.innerHTML = `
            <div class="landing-container" style="text-align: center;">
                <div class="logo">❌</div>
                <h1 class="title" style="color: #dc3545;">ログイン失敗</h1>
                <p class="subtitle">
                    ID「${docId}」でのログインに失敗しました<br>
                    ログイン画面にリダイレクトしています...
                </p>
                <p style="color: #666; font-size: 12px; margin-top: 10px;">
                    エラー: ${error?.message || error}
                </p>
            </div>
        `;
    setTimeout(() => {
      window.location.href = `./login.html?user_id=${docId}`;
    }, 3000);
    return true;
  }
}

// Admin新規登録処理
async function registerAdmin(formData) {
  try {
    // formDataがFormDataか通常オブジェクトか両方対応
    const adminId = formData.get ? formData.get("adminId") : formData.adminId;
    const adminName = formData.get
      ? formData.get("adminName")
      : formData.adminName;
    const email = formData.get ? formData.get("email") : formData.email;
    const password = formData.get
      ? formData.get("password")
      : formData.password;

    // 既存のadmin_id確認
    const adminRef = doc(db, "admin_settings", adminId);
    const adminDoc = await getDoc(adminRef);

    if (adminDoc.exists()) {
      throw new Error("この管理者 IDは既に使用されています");
    }

    // Emailの重複確認
    const adminSettingsRef = collection(db, "admin_settings");
    const emailQuery = query(adminSettingsRef, where("email", "==", email));
    const emailDocs = await getDocs(emailQuery);

    if (!emailDocs.empty) {
      throw new Error("このメールアドレスは既に使用されています");
    }
    console.log("フォームデータ:", formData);
    // admin_settingsコレクションに登録
    await setDoc(adminRef, {
      admin_id: adminId,
      admin_name: adminName,
      email: email,
      password: password, // 実際のプロダクションではハッシュ化が必要
      permissions: ["user_manage", "data_export", "system_config"],

      // 新しいステータス管理システム
      account_status: "test", // test/real/suspended
      plan_type: "free", // free/basic/premium
      is_active: true, // アクティブ状態

      // 課金情報 (将来の拡張用)
      billing_info: {
        trial_end_date: null,
        last_payment_date: null,
        next_billing_date: null,
        payment_method: null,
      },

      // 使用制限 (プランに応じた制限)
      usage_limits: {
        max_users: 100, // テストプランの制限
        max_scans_per_month: 1000,
        max_data_export: 10,
      },

      // 追加: プロジェクト名・展示会日

      projectName:
        (formData.get ? formData.get("eventid") : formData.eventid) || "",
      eventDate:
        (formData.get ? formData.get("exporday") : formData.exporday) || "",

      created_at: serverTimestamp(),
      last_login: null,
    });

    console.log("Admin登録成功:", adminId);

    return { success: true, message: "管理者登録が完了しました" };
  } catch (error) {
    // エラー内容を詳細に出力
    console.error(
      "Admin登録エラー:",
      error && error.stack ? error.stack : error
    );
    return {
      success: false,
      error: error && (error.message || error.toString()),
    };
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
      throw new Error(
        "このアカウントは停止されています。課金状況をご確認ください"
      );
    }

    console.log(
      `[INFO] Admin ${adminId} - アカウント種別: ${accountStatus}, プラン: ${planType}`
    );

    if (adminData.password !== password) {
      console.error(
        `[ERROR] パスワード不一致 - 入力: ${password}, 保存: ${adminData.password}`
      );
      throw new Error("パスワードが間違っています");
    }

    // 最終ログイン時刻を更新
    await setDoc(adminRef, {
      ...adminData,
      last_login: serverTimestamp(),
    });

    // セッション情報保存
    const sessionData = {
      admin_id: adminId,
      admin_name:
        adminData.admin_name && adminData.admin_name.trim() !== ""
          ? adminData.admin_name
          : adminId,
      email: adminData.email,
      role: "admin",
      permissions: adminData.permissions,
      account_status: adminData.account_status || "test",
      plan_type: adminData.plan_type || "free",
      is_active: adminData.is_active !== false,
      timestamp: Date.now(),
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
  // event.targetが未定義の場合はフォームIDから取得
  const form = event.target || document.getElementById("adminRegisterFormForm");
  const formData = new FormData(form);
  const adminData = {
    adminId: formData.get("adminId"),
    adminName: formData.get("adminName"),
    email: formData.get("email"),
    password: formData.get("password"),
    account_status: formData.get("accountMode") || "test",
    projectName: formData.get("eventid"),
    eventDate: formData.get("exporday"),
  };
  // パスワードバリデーション
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(adminData.password)) {
    console.log("入力パスワード:", adminData.password);
    console.log(
      "バリデーション結果:",
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(adminData.password)
    );
    alert("パスワードは8文字以上の英数字を組み合わせてください");
    return;
  }
  // 登録ボタン取得（activeElement優先、なければIDで取得）
  let registerBtn = document.activeElement;
  if (!registerBtn || !registerBtn.classList.contains("btn-primary")) {
    // fallback: テスト/本番ボタンどちらか取得
    registerBtn =
      document.getElementById("registerTestBtn") ||
      document.getElementById("registerRealBtn");
  }
  if (registerBtn) {
    registerBtn.textContent = "登録中...";
    registerBtn.disabled = true;
  }
  const result = await registerAdmin(adminData);
  if (result.success) {
    handleTestModeRegister(formData);
    alert("管理者登録が完了しました。ログイン画面に移動します。");
    showAdminLoginForm();
    const form = document.getElementById("adminRegisterFormForm");
    if (form && typeof form.reset === "function") form.reset();
  } else {
    alert("登録に失敗しました: " + result.error);
  }
  if (registerBtn) {
    registerBtn.textContent = "新規登録";
    registerBtn.disabled = false;
  }
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

// SheetJS (xlsx) CDNを利用してExcelをパース
// <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>

async function uploadTemplateToFirestore(collectionName, templateUrl) {
  try {
    console.log(
      `[テスト] admin_collectionsにadmin_idドキュメントのみ作成します`
    );
    // テスト用: admin_idを直接指定してaddDocで作成
    const testAdminId = window.currentAdmin?.admin_id || "TEST_ADMIN";
    if (
      testAdminId &&
      typeof testAdminId === "string" &&
      testAdminId.length > 0
    ) {
      // admin_idが有効な場合はsetDocでID指定
      await setDoc(doc(db, "admin_collections", testAdminId), {
        admin_id: testAdminId,
        created_at: serverTimestamp(),
        test: true,
      });
      console.log(`[テスト] admin_collectionsにID指定で作成:`, testAdminId);
    } else {
      // admin_idが無効な場合はaddDocで自動ID
      const docRef = await addDoc(collection(db, "admin_collections"), {
        admin_id: "UNKNOWN",
        created_at: serverTimestamp(),
        test: true,
      });
      console.log(`[テスト] admin_collectionsに自動IDで作成:`, docRef.id);
    }
  } catch (error) {
    console.error(`[テストアップロードエラー] ${collectionName}:`, error);
  }
}

async function handleTestModeRegister(formData) {
  // adminIdをformDataから取得
  const adminId = formData.get ? formData.get("adminId") : formData.adminId;

  // testtemplateから各コレクション(users, staff, maker, items)をコピー
  await copyTemplateCollectionsToAdmin(adminId);

  // サブコレクション作成
  const subCollections = ["items", "users", "scanItems"];
  for (const sub of subCollections) {
    const subRef = doc(db, `admin_collections/${adminId}/${sub}`, "initDoc");
    await setDoc(subRef, {
      created_at: serverTimestamp(),
      initialized: true,
    });
    console.log(
      `サブコレクション作成: admin_collections/${adminId}/${sub}/initDoc`
    );
  }

  // 2. window.currentAdminとgetAdminCollectionをセット
  window.currentAdmin = {
    admin_id: formData.get ? formData.get("adminId") : formData.adminId,
    account_status: formData.get
      ? formData.get("accountMode")
      : formData.account_status || "test",
  };
  window.getAdminCollection = (type) => {
    return collection(
      db,
      `admin_collections/${window.currentAdmin.admin_id}/${type}`
    );
  };
  const projectName = formData.get ? formData.get("eventid") : formData.eventid;
  const eventDate = formData.get ? formData.get("exporday") : formData.exporday;

  // 3. テンプレートファイルをfetchしてアップロード（template-utils.jsのuploadExcelFileを利用）
  // ファイルパス配列
  const templates = [
    { type: "items", path: "/templates/items.xlsx" },
    { type: "maker", path: "/templates/maker.xlsx" },
    { type: "staff", path: "/templates/staff.xlsx" },
    { type: "users", path: "/templates/users.xlsx" },
  ];

  // 4. ログイン状態セット（admin_name, email, roleなども保存）
  localStorage.setItem(
    "currentAdmin",
    JSON.stringify({
      admin_id: window.currentAdmin.admin_id,
      admin_name: formData.get ? formData.get("adminName") : formData.adminName,
      email: formData.get ? formData.get("email") : formData.email,
      role: "admin",
      account_status: window.currentAdmin.account_status,
    })
  );

  // 5. admin.htmlに遷移
  window.location.href = "admin.html";
}

// ページロード時の処理
document.addEventListener("DOMContentLoaded", async function () {
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
      const needsUpdate =
        adminData.status || !adminData.account_status || !adminData.is_active;

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
            payment_method: null,
          },

          // 使用制限
          usage_limits: {
            max_users: 50,
            max_scans_per_month: 500,
            max_data_export: 5,
          },

          emergency_fixed_at: serverTimestamp(),
        });
        console.log(`[緊急修復] Admin ${adminId} を新システムに移行しました`);
        alert(
          `Admin ${adminId} を新しいシステムに移行しました！\nアカウント種別: テスト\nプラン: ベーシック\nパスワード: Legacy2024!`
        );
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
                        <input type="text" id="loginAdminId" name="adminId" required placeholder="ADMIN ID" value="${
                          localStorage.getItem("currentAdmin")
                            ? JSON.parse(localStorage.getItem("currentAdmin"))
                                .admin_id
                            : ""
                        }">
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

            <!-- 新規登録フォーム（2列レイアウト） -->
            <div id="adminRegisterForm" class="auth-form" style="display: none;">
                <div class="logo">👤</div>
                <h1 class="title">管理者　新規登録</h1>
                <form id="adminRegisterFormForm">
                    <div style="display: flex; gap: 32px; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 260px;">
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
                        </div>
                        <div style="flex: 1; min-width: 260px;">
                            <div class="form-group">
                                <label for="eventid">プロジェクト名</label>
                                <input type="text" id="eventid" name="eventid" required placeholder="展示会20250827" value="">
                                <small>名札印刷時等に使います</small>
                            </div>
                            <div class="form-group">
                                <label for="exporday">展示会開催日</label>
                                <input type="date" id="exporday" name="exporday" required value="">
                                <small>展示会開催日をカレンダーから選択してください</small>
                            </div>
                            <!-- 課金方法欄（後で追加予定） -->
                            <div class="form-group" id="paymentMethodGroup" style="display:none;"></div>
                        </div>
                    </div>
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
  document.getElementById("registerTestBtn").onclick = function () {
    handleAdminRegisterMode("test");
  };
  document.getElementById("registerRealBtn").onclick = function () {
    handleAdminRegisterMode("real");
  };

  // 新規登録モード選択関数
  function handleAdminRegisterMode(mode) {
    const form = document.getElementById("adminRegisterFormForm");
    if (!form) return;
    // hidden inputがなければ追加
    let modeInput = form.querySelector('input[name="accountMode"]');
    if (!modeInput) {
      modeInput = document.createElement("input");
      modeInput.type = "hidden";
      modeInput.name = "accountMode";
      form.appendChild(modeInput);
    }
    modeInput.value = mode;
    // 登録処理を呼び出し
    handleAdminRegister({ preventDefault: () => {} });
  }
}

// グローバルスコープに関数を追加
window.showAdminRegisterForm = showAdminRegisterForm;
window.showAdminLoginForm = showAdminLoginForm;
window.handleAdminLogin = handleAdminLogin;
window.handleAdminRegister = handleAdminRegister;
