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
  collection,
  getDocs,
  writeBatch,
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

// Admin新規登録処理（シンプル版）
async function registerAdmin(formData, accountStatus = "test") {
  try {
    const adminId = formData.adminId;
    const adminName = formData.adminName;
    const email = formData.email;
    const password = formData.password;
    const projectName = formData.projectName;
    const eventDate = formData.eventDate;
    const companyName = formData.companyName;
    const phoneNumber = formData.phoneNumber;

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
      project_name: projectName,
      event_date: eventDate,
      company_name: companyName,
      phone_number: phoneNumber,
      role: adminId === "superuser" ? "superuser" : "admin", // superuserの場合は特別なrole
      is_active: true,
      account_status: accountStatus, // test または real
      plan_type: accountStatus === "real" ? "premium" : "free",
      created_at: serverTimestamp(),
      uid: userCredential.user.uid, // Firebase AuthのUID（必須）
    });

    // 登録成功 - 認証状態を保持したまま（既にサインイン済み）
    console.log(
      "管理者登録完了 - Firebase Auth認証状態:",
      userCredential.user.uid
    );

    // テンプレートコレクションをコピー
    try {
      console.log("=== テンプレートコレクションコピー開始 ===");
      await copyTemplateCollections(adminId, companyName);
      console.log("テンプレートコレクションコピー完了");
    } catch (copyError) {
      console.error("テンプレートコピーエラー:", copyError);
      // コピー失敗してもユーザー登録は成功扱い
    }

    return {
      success: true,
      user: userCredential.user,
      accountStatus: accountStatus,
    };
  } catch (error) {
    console.error("Admin登録エラー:", error);
    return { success: false, error: error.message };
  }
}

// テンプレートコレクションをコピーする関数
async function copyTemplateCollections(newAdminId, companyName) {
  try {
    console.log(`新規管理者 ${newAdminId} にテンプレートをコピー開始`);

    // testテンプレートからコピー（test/realの両方に対応）
    const sourceCollectionName = "testtemplate";
    const targetCollectionName = companyName; // "test" または "real"

    console.log(
      `コピー元: ${sourceCollectionName} → コピー先: ${targetCollectionName}`
    );

    // サブコレクションをコピー
    await copySubCollections(sourceCollectionName, targetCollectionName, [
      "items",
      "scanItems",
      "users",
    ]);

    // ついでにrealモードの場合はtestテンプレートもコピー
    if (companyName === "real") {
      console.log("本番モード: testテンプレートも追加でコピー");
      await copySubCollections("testtemplate", "test", [
        "items",
        "scanItems",
        "users",
      ]);
    }

    console.log(`テンプレートコピー完了: ${newAdminId}`);
  } catch (error) {
    console.error("テンプレートコピーエラー:", error);
    throw error;
  }
}

// サブコレクションをコピーする関数
async function copySubCollections(
  sourceCollection,
  targetCollection,
  subCollectionNames
) {
  try {
    for (const subColName of subCollectionNames) {
      console.log(
        `コピー中: ${sourceCollection}/${subColName} → ${targetCollection}/${subColName}`
      );

      // ソースコレクションからドキュメントを取得
      const sourceRef = collection(db, sourceCollection, "data", subColName);
      const sourceSnapshot = await getDocs(sourceRef);

      if (sourceSnapshot.empty) {
        console.log(
          `ソースコレクション ${sourceCollection}/${subColName} は空です`
        );
        continue;
      }

      // バッチ処理でコピー
      const batch = writeBatch(db);
      let batchCount = 0;
      const maxBatchSize = 500; // Firestoreの制限

      sourceSnapshot.docs.forEach((docSnap) => {
        const docData = docSnap.data();
        const targetRef = doc(
          db,
          targetCollection,
          "data",
          subColName,
          docSnap.id
        );

        batch.set(targetRef, {
          ...docData,
          copied_at: serverTimestamp(),
          copied_from: `${sourceCollection}/${subColName}`,
        });

        batchCount++;

        // バッチサイズ制限に達した場合は実行
        if (batchCount >= maxBatchSize) {
          console.log(`バッチ実行中 (${batchCount}件)`);
          batch.commit();
          batchCount = 0;
        }
      });

      // 残りのバッチを実行
      if (batchCount > 0) {
        await batch.commit();
        console.log(
          `${subColName} コピー完了: ${sourceSnapshot.docs.length}件`
        );
      }
    }
  } catch (error) {
    console.error("サブコレクションコピーエラー:", error);
    throw error;
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
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // UserSessionから現在のユーザー情報を取得
    let userData = null;
    if (
      window.UserSession &&
      typeof UserSession.getCurrentUser === "function"
    ) {
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

  // フォームをリセット
  const form = document.getElementById("adminRegisterFormInner");
  if (form) {
    form.reset();
  }

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
async function handleAdminRegister(event, accountStatus = "test") {
  // フォーム要素を直接取得
  const form = document.getElementById("adminRegisterFormInner");

  if (!form) {
    alert("フォームが見つかりません");
    return;
  }

  // フォーム検証
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const formData = new FormData(form); // 必須項目チェック
  const requiredFields = [
    "adminIdReg",
    "adminNameReg",
    "emailReg",
    "passwordReg",
    "projectNameReg",
    "eventDateReg",
    "companyNameReg",
    "phoneNumberReg",
  ];

  for (const field of requiredFields) {
    if (!formData.get(field)) {
      alert(`${field.replace("Reg", "")}を入力してください`);
      return;
    }
  }

  const adminData = {
    adminId: formData.get("adminIdReg"),
    adminName: formData.get("adminNameReg"),
    email: formData.get("emailReg"),
    password: formData.get("passwordReg"),
    projectName: formData.get("projectNameReg"),
    eventDate: formData.get("eventDateReg"),
    companyName: formData.get("companyNameReg"),
    phoneNumber: formData.get("phoneNumberReg"),
  };

  const result = await registerAdmin(adminData, accountStatus);
  if (result.success) {
    const modeText = accountStatus === "test" ? "テストモード" : "本番モード";
    alert(
      `管理者登録が完了しました（${modeText}）。管理者ページに移動します。`
    );

    // Firebase Authの認証状態が安定するまで少し待機
    setTimeout(() => {
      window.location.href = "admin.html";
    }, 1000);
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
window.showLandingView = showLandingView;
