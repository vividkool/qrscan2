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
    // event_idは今日の日付（作成日）をベースに生成（イベント開催日変更に対応）
    const today = new Date();
    const todayEventId =
      "EXPO" +
      today.getFullYear() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");

    await setDoc(adminRef, {
      admin_id: adminId,
      admin_name: adminName,
      email: email,
      password: password,
      project_name: projectName,
      event_date: eventDate,
      event_id: todayEventId, // 今日の日付ベース（EXPO20250903形式）
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

    // テンプレートコレクションをコピー（3層構造対応）
    try {
      console.log("=== テンプレートコレクションコピー開始 ===");
      await copyTemplateCollections(adminId, todayEventId); // 今日の日付ベースevent_idを使用
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
async function copyTemplateCollections(targetAdminId, eventId) {
  try {
    console.log(`新規管理者 ${targetAdminId} にテンプレートをコピー開始`);

    // テンプレート構造をサブコレクション構造に変更
    // ソース: admin_collections/testtemplate/{subCollection}
    // ターゲット: admin_collections/{adminId}/{eventId}/{subCollection}
    const sourceTemplateId = "testtemplate";
    const targetAdminId_clean = targetAdminId;
    const targetEventId_clean = eventId;

    console.log(
      `コピー元テンプレート: ${sourceTemplateId} → コピー先: ${targetAdminId_clean}/${targetEventId_clean}`
    );

    // testtemplateからのコピーを有効化（サブコレクション構造）
    console.log("🚀 testtemplateからサブコレクション構造でコピー開始...");
    try {
      await copySubCollectionsToEventStructure(
        sourceTemplateId,
        targetAdminId_clean,
        targetEventId_clean,
        ["items", "users", "scanItems"]
      );
      console.log("✅ testtemplateからサブコレクション構造でのコピー完了");
    } catch (templateError) {
      console.warn("テンプレートからのコピーに失敗:", templateError);
      // コピー失敗時のみ基本構造を作成
      console.log("🔄 基本サンプルデータで代替作成...");
      await createInitialEventCollections(
        targetAdminId_clean,
        targetEventId_clean
      );
    }

    console.log(
      `テンプレートコピー完了: ${targetAdminId} → admin_collections/${targetAdminId_clean}/${targetEventId_clean}/{サブコレクション}`
    );

    // インデックス作成案内を表示
    console.log("=== インデックス作成案内 ===");
    console.log(
      "💡 高速化のヒント: 大量データの場合、Firestoreインデックス作成により表示速度が大幅に向上します"
    );
    console.log(
      "📊 管理画面でエラーが表示された場合は、提示されるリンクからインデックスを作成してください"
    );
  } catch (error) {
    console.error("テンプレートコピーエラー:", error);
    console.error("エラー詳細:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      targetAdminId: targetAdminId,
      eventId: eventId,
      targetCollectionName: `admin_collections/${targetAdminId_clean}/${targetEventId_clean}`,
    });
    throw error;
  }
}

// イベントサブコレクション構造で基本コレクションを作成する関数
async function createInitialEventCollections(targetAdminId, targetEventId) {
  console.log(
    `イベント構造で基本コレクション作成: admin_collections/${targetAdminId}/${targetEventId}`
  );

  try {
    const batch = writeBatch(db);

    // items コレクションに初期サンプルデータを作成（4セグメント構造）
    const itemsRef = doc(
      db,
      "admin_collections",
      targetAdminId,
      `${targetEventId}_items`,
      "sample-item-001"
    );
    batch.set(itemsRef, {
      item_no: "0001",
      category_name: "サンプルカテゴリ",
      company_name: "サンプル会社",
      item_name: "サンプルアイテム",
      maker_code: "SAMPLE001",
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    console.log(`[DEBUG] items参照作成: ${itemsRef.path}`);

    // users コレクションに初期サンプルデータを作成（4セグメント構造）
    const usersRef = doc(
      db,
      "admin_collections",
      targetAdminId,
      `${targetEventId}_users`,
      "sample-user-001"
    );
    batch.set(usersRef, {
      user_id: "sample001",
      user_name: "サンプルユーザー",
      email: "sample@example.com",
      phone: "000-0000-0000",
      company_name: "サンプル会社",
      status: "-",
      user_role: "user",
      print_status: "not_printed",
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    console.log(`[DEBUG] users参照作成: ${usersRef.path}`);

    // scanItems 初期化ドキュメント（4セグメント構造）
    const scanItemsRef = doc(
      db,
      "admin_collections",
      targetAdminId,
      `${targetEventId}_scanItems`,
      "_scanItems_init"
    );
    batch.set(scanItemsRef, {
      _note: "scanItems コレクション初期化用ドキュメント（削除可能）",
      _structure_info:
        "非正規化設計: user_name, item_name, maker_code等を含む効率的クエリ対応",
      created_at: serverTimestamp(),
    });
    console.log(`[DEBUG] scanItems参照作成: ${scanItemsRef.path}`);

    await batch.commit();
    console.log("イベント構造での基本コレクション作成完了");
  } catch (error) {
    console.error("イベント構造基本コレクション作成エラー:", error);
    throw error;
  }
}

// サブコレクションをイベント構造にコピーする関数
async function copySubCollectionsToEventStructure(
  sourceTemplateId,
  targetAdminId,
  targetEventId,
  subCollectionNames
) {
  try {
    console.log(
      `イベント構造コピー開始: testtemplate → ${targetAdminId}/${targetEventId}`
    );

    for (const subColName of subCollectionNames) {
      console.log(
        `コピー中: testtemplate/${subColName} → ${targetAdminId}/${targetEventId}/${subColName}`
      );

      try {
        // ソースコレクション（testtemplate構造）からドキュメントを取得
        const sourceRef = collection(
          db,
          "admin_collections",
          sourceTemplateId,
          subColName
        );
        console.log(
          `[DEBUG] ソース参照: admin_collections/${sourceTemplateId}/${subColName}`
        );

        const sourceSnapshot = await getDocs(sourceRef);

        if (sourceSnapshot.empty) {
          console.log(`ソース ${sourceTemplateId}/${subColName} は空です`);
          continue;
        }

        console.log(
          `${sourceTemplateId}/${subColName} から ${sourceSnapshot.docs.length}件のドキュメントを取得`
        );

        // バッチ処理でイベント構造にコピー
        const batch = writeBatch(db);
        let batchCount = 0;
        const maxBatchSize = 500;

        sourceSnapshot.docs.forEach((docSnap) => {
          const docData = docSnap.data();

          // 正しいFirestore構造: admin_collections/{adminId}/{eventId}_{collectionName}/{docId}
          // これで4セグメント（偶数）のドキュメント参照になる
          const targetRef = doc(
            db,
            "admin_collections",
            targetAdminId,
            `${targetEventId}_${subColName}`,
            docSnap.id
          );
          console.log(
            `[DEBUG] ターゲット: admin_collections/${targetAdminId}/${targetEventId}_${subColName}/${docSnap.id}`
          );

          // scanItemsの場合は非正規化データとして保存（効率的クエリ対応）
          let enhancedData = { ...docData };
          if (subColName === "scanItems") {
            enhancedData = {
              ...docData,
              _normalized: true,
              _note: "非正規化データ: 関連アイテム・ユーザー情報を含む",
              updated_at: serverTimestamp(),
            };
          } else {
            enhancedData = {
              ...docData,
              updated_at: serverTimestamp(),
            };
          }

          batch.set(targetRef, enhancedData);

          batchCount++;

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
            `${subColName} イベント構造コピー完了: ${sourceSnapshot.docs.length}件`
          );
        }
      } catch (subError) {
        console.error(
          `サブコレクション ${subColName} のイベント構造コピーエラー:`,
          subError
        );
        continue;
      }
    }

    console.log("イベント構造コピー処理完了");
  } catch (error) {
    console.error("イベント構造コピーエラー:", error);
    throw error;
  }
}

// 3層構造の基本コレクションを作成する関数
async function createInitialCollections(targetCollectionName) {
  console.log(`基本コレクション構造を作成: ${targetCollectionName}`);

  try {
    // targetCollectionName: "admin_collections/aaaaaa/EXPO20250925"
    // これを分解して適切なFirestore参照を作成
    const pathParts = targetCollectionName.split("/");
    if (pathParts.length !== 3) {
      throw new Error(`無効なコレクションパス: ${targetCollectionName}`);
    }

    const [adminCollections, adminId, eventId] = pathParts;
    console.log(`[DEBUG] パス分解: ${adminCollections}/${adminId}/${eventId}`);

    // Firestoreの正しい構造：
    // admin_collections (collection) / adminId (doc) / eventId (collection) / docId (doc)
    // つまり、eventId はサブコレクション名として使用する

    const batch = writeBatch(db);

    // items サブコレクションに初期サンプルデータを作成
    console.log(
      `[DEBUG] doc()セグメント確認: "${adminCollections}", "${adminId}", "${eventId}", "sample-item-001"`
    );
    console.log(
      `[DEBUG] セグメント数確認: ${
        [adminCollections, adminId, eventId, "sample-item-001"].length
      }個`
    );

    let itemsRef;
    try {
      itemsRef = doc(db, adminCollections, adminId, eventId, "sample-item-001");
      console.log(`[DEBUG] itemsRef作成成功:`, itemsRef.path);
    } catch (docError) {
      console.error(`[ERROR] itemsRef作成失敗:`, docError);
      throw docError;
    }

    batch.set(itemsRef, {
      collection_type: "items",
      item_no: "0001",
      category_name: "サンプルカテゴリ",
      company_name: "サンプル会社",
      item_name: "サンプルアイテム",
      maker_code: "SAMPLE001",
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    console.log(`[DEBUG] items参照作成: ${itemsRef.path}`);

    // users データも同じサブコレクションに作成（collection_typeで区別）
    let usersRef;
    try {
      usersRef = doc(db, adminCollections, adminId, eventId, "sample-user-001");
      console.log(`[DEBUG] usersRef作成成功:`, usersRef.path);
    } catch (docError) {
      console.error(`[ERROR] usersRef作成失敗:`, docError);
      throw docError;
    }

    batch.set(usersRef, {
      collection_type: "users",
      user_id: "sample001",
      user_name: "サンプルユーザー",
      email: "sample@example.com",
      phone: "000-0000-0000",
      company_name: "サンプル会社",
      status: "-",
      user_role: "user",
      print_status: "not_printed",
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    console.log(`[DEBUG] users参照作成: ${usersRef.path}`);

    // scanItems 初期化ドキュメント
    let scanItemsRef;
    try {
      scanItemsRef = doc(
        db,
        adminCollections,
        adminId,
        eventId,
        "_scanItems_init"
      );
      console.log(`[DEBUG] scanItemsRef作成成功:`, scanItemsRef.path);
    } catch (docError) {
      console.error(`[ERROR] scanItemsRef作成失敗:`, docError);
      throw docError;
    }

    batch.set(scanItemsRef, {
      collection_type: "scanItems",
      _note: "scanItems コレクション初期化用ドキュメント（削除可能）",
      created_at: serverTimestamp(),
    });
    console.log(`[DEBUG] scanItems参照作成: ${scanItemsRef.path}`);

    await batch.commit();
    console.log("基本コレクション構造の作成完了");
  } catch (error) {
    console.error("基本コレクション作成エラー:", error);
    console.error("エラー詳細:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw error;
  }
} // サブコレクションをコピーする関数（3層構造対応）
async function copySubCollections(
  sourceCollection,
  targetCollection,
  subCollectionNames
) {
  try {
    console.log(`3層構造コピー開始: ${sourceCollection} → ${targetCollection}`);

    // targetCollection: "admin_collections/adminId/eventId"
    const targetParts = targetCollection.split("/");
    if (targetParts.length !== 3) {
      throw new Error(`無効なターゲットパス: ${targetCollection}`);
    }
    const [adminCollections, targetAdminId, targetEventId] = targetParts;

    for (const subColName of subCollectionNames) {
      console.log(
        `コピー中: ${sourceCollection}/${subColName} → ${targetCollection} (collection_type="${subColName}")`
      );

      try {
        // ソースコレクション（2層構造）からドキュメントを取得
        const sourceCollectionPath = `${sourceCollection}/${subColName}`;
        const sourceRef = collection(db, sourceCollectionPath);
        console.log(`[DEBUG] ソースコレクション参照: ${sourceCollectionPath}`);

        const sourceSnapshot = await getDocs(sourceRef);

        if (sourceSnapshot.empty) {
          console.log(`ソースコレクション ${sourceCollectionPath} は空です`);
          continue;
        }

        console.log(
          `${sourceCollectionPath} から ${sourceSnapshot.docs.length}件のドキュメントを取得`
        );

        // バッチ処理でコピー（3層構造へ）
        const batch = writeBatch(db);
        let batchCount = 0;
        const maxBatchSize = 500; // Firestoreの制限

        sourceSnapshot.docs.forEach((docSnap) => {
          const docData = docSnap.data();

          // 3層構造のターゲット参照を作成
          const targetRef = doc(
            db,
            adminCollections,
            targetAdminId,
            targetEventId,
            docSnap.id
          );
          console.log(
            `[DEBUG] ターゲットドキュメント参照: ${adminCollections}/${targetAdminId}/${targetEventId}/${docSnap.id}`
          );

          // collection_typeフィールドを追加してデータを保存
          batch.set(targetRef, {
            ...docData,
            collection_type: subColName, // データタイプを識別するフィールド
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
            `${subColName} コピー完了: ${sourceSnapshot.docs.length}件 → 3層構造`
          );
        }
      } catch (subError) {
        console.error(
          `サブコレクション ${subColName} のコピーエラー:`,
          subError
        );
        console.error("サブエラーの詳細:", {
          message: subError.message,
          code: subError.code,
          stack: subError.stack,
        });
        // 個別のサブコレクションエラーは継続（全体を止めない）
        continue;
      }
    }

    console.log("3層構造コピー処理完了");
  } catch (error) {
    console.error("サブコレクションコピーエラー:", error);
    console.error("エラーの詳細:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
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

  // 現在の日付からevent_idを生成（作成日ベース）
  const today = new Date();
  const todayEventId =
    "EXPO" +
    today.getFullYear() +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");

  const adminData = {
    adminId: formData.get("adminIdReg"),
    adminName: formData.get("adminNameReg"),
    email: formData.get("emailReg"),
    password: formData.get("passwordReg"),
    projectName: formData.get("projectNameReg"),
    eventDate: formData.get("eventDateReg"),
    eventId: todayEventId, // 作成日ベースのevent_id
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
