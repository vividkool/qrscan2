// 認証・権限管理システム (Firebase Auth対応版)
import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  limit,
  serverTimestamp,
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
const auth = getAuth(app);
const db = getFirestore(app);

// ユーザーロール定義
const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  STAFF: "staff",
  MAKER: "maker",
  SCANNER: "scanner",
  GUEST: "guest",
};

// ページアクセス権限定義
const PAGE_PERMISSIONS = {
  "admin.html": [USER_ROLES.ADMIN],
  "staff.html": [USER_ROLES.STAFF],
  "maker.html": [USER_ROLES.MAKER],
  "superuser.html": [USER_ROLES.SUPERUSER],
  "user.html": [USER_ROLES.USER, USER_ROLES.STAFF, USER_ROLES.MAKER],
  "index.html": [], // 公開ページ
  "login.html": [], // 公開ページ
  "/": [USER_ROLES.ADMIN],
};

// 現在のユーザーセッション
let currentUser = null;
let currentFirebaseUser = null;

// 認証タイプ（LEGACY認証のみ）
const AUTH_TYPES = {
  LEGACY: "legacy", // 従来の認証のみ
};

// ローカルストレージキー
const SESSION_KEY = "currentUser";

// Firebase Authentication管理
class FirebaseAuthManager {


  // ログアウト
  static async signOut() {
    try {
      await signOut(auth);
      UserSession.clearSession();
      return { success: true };
    } catch (error) {
      console.error("ログアウトエラー:", error);
      return { success: false, error: error.message };
    }
  }



  // 認証状態監視
  static onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      console.log(
        "Firebase認証状態変更:",
        firebaseUser ? "認証済み" : "未認証",
        firebaseUser?.uid
      );

      currentFirebaseUser = firebaseUser;
      if (firebaseUser) {
        try {
          // Firestoreからユーザー情報を取得
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = {
              ...userSnap.data(),
              uid: firebaseUser.uid,
              firebaseUser: firebaseUser,
            };



            // 退場済みユーザーの処理
            if (userData.status === "退場済") {
              console.log("退場済みユーザー:", userData.user_name);
              callback({
                ...userData,
                isInactive: true,
                message: "このアカウントは無効化されています。",
              });
              return;
            }


            // Firebase専用のセッションデータを保存
            localStorage.setItem(
              "firebaseSessionData",
              JSON.stringify({
                ...userData,
                timestamp: new Date().getTime(),
              })
            );

            UserSession.saveSession(userData);
            callback(userData);
          } else {
            console.log(
              "Firestoreにユーザーデータが見つかりません:",
              firebaseUser.uid
            );
            callback(null);
          }
        } catch (error) {
          console.error("認証状態確認エラー:", error);
          callback(null);
        }
      } else {
        console.log("Firebase認証解除 - レガシーセッションを確認");
        // Firebase認証が解除されても、レガシーセッションがあるかもしれない
        const legacySession = UserSession.getSession();
        if (legacySession) {
          console.log("レガシーセッション継続:", legacySession.user_name);
          currentUser = legacySession;
          callback(legacySession);
        } else {
          console.log("全認証セッション解除");
          currentUser = null;
          UserSession.clearSession();
          callback(null);
        }
      }
    });
  }
}

// ユーザーセッション管理（レガシー対応）
class UserSession {
  // セッション保存（Firebase Auth対応 + セキュリティ強化）
  static saveSession(userData) {
    // roleフィールドの正規化
    const userRole = userData.user_role || userData.role;

    // セキュアなセッションデータ（機密情報は除外）
    const sessionData = {
      uid: userData.uid || userData.user_id, // Firebase UID（公開情報）
      user_id: userData.user_id, // アプリケーションID
      user_name: userData.user_name, // 表示名
      company_name: userData.company_name, // 会社名
      role: userRole, // 権限情報
      department: userData.department, // 部署情報
      authType: userData.authType || AUTH_TYPES.LEGACY,
      timestamp: new Date().getTime(),
      // 注意: email, photoURL, 機密データは保存しない
    };

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      currentUser = sessionData;
      console.log("セッション保存完了:", sessionData.user_name);
    } catch (error) {
      console.error("セッション保存エラー:", error);
      // localStorage容量超過等のエラーハンドリング
    }
  } // セッション取得
  // セッション取得（Firebase + レガシー対応）
  static async getSession() {
    // currentAdminが存在する場合は最優先で返す
    const currentAdmin = localStorage.getItem("currentAdmin");
    if (currentAdmin) {
      try {
        const adminObj = JSON.parse(currentAdmin);
        // セッション互換用に必要フィールドを補完
        // 必要フィールドを厳密に補完
        const sessionObj = {
          user_id: adminObj.admin_id ?? "",
          user_name: adminObj.admin_name ?? adminObj.admin_id ?? "",
          email: adminObj.email ?? "",
          company_name: adminObj.company_name ?? "",
          role: adminObj.role ?? "admin",
          department: adminObj.department ?? "",
          is_active: adminObj.is_active ?? true,
          timestamp: adminObj.timestamp ?? Date.now(),
          authType: "ADMIN",
          status: adminObj.status ?? "active",
          // 元データも保持
          ...adminObj,
        };
        //alert("[getSession] currentAdmin返却: " + JSON.stringify(sessionObj));
        console.log(
          "[getSession] currentAdmin返却:",
          JSON.stringify(sessionObj)
        );
        //alert("stop");
        return sessionObj;
      } catch {
        return null;
      }
    }

    // ログイン画面では簡易セッションチェックのみ
    const currentPage =
      window.location.pathname.split("/").pop() || "admin.html";
    if (currentPage === "login.html" || currentPage === "index.html") {
      const sessionData = localStorage.getItem(SESSION_KEY);
      if (!sessionData) {
        return null;
      }
      try {
        return JSON.parse(sessionData);
      } catch {
        return null;
      }
    }

    // Firebase認証状態を優先的にチェック（保護されたページのみ）
    if (currentFirebaseUser) {
      // Firebase認証ユーザーがいる場合、firebaseSessionDataを確認
      const firebaseSessionData = localStorage.getItem("firebaseSessionData");
      if (firebaseSessionData) {
        try {
          const parsed = JSON.parse(firebaseSessionData);
          // Firebase認証データがある場合はそれを返す
          if (parsed.uid === currentFirebaseUser.uid) {
            console.log("Firebase認証セッションを取得:", parsed.user_name);
            currentUser = parsed;
            return parsed;
          }
        } catch (error) {
          console.error("Firebase session parse error:", error);
        }
      }
    }

    // Firebase認証がないか、セッションデータがない場合はレガシーセッションを確認
    console.log("=== getSession デバッグ ===");
    console.log("SESSION_KEY:", SESSION_KEY);

    const sessionData = localStorage.getItem(SESSION_KEY);
    console.log("取得したセッションデータ:", sessionData);

    // 他のキーも確認
    console.log("currentUserキーの値:", localStorage.getItem("currentUser"));
    console.log(
      "qrscan_user_sessionキーの値:",
      localStorage.getItem("qrscan_user_session")
    );
    console.log("==========================");

    if (!sessionData) {
      const currentPage =
        window.location.pathname.split("/").pop() || "admin.html";
      if (currentPage === "login.html" || currentPage === "index.html") {
        // ログイン画面では正常な状態なのでログレベルを下げる
        console.log("ログイン画面: セッションなし（正常）");
      } else {
        console.log("セッションデータが見つかりません");
      }
      return null;
    }

    try {
      const parsed = JSON.parse(sessionData);
      const now = new Date().getTime();
      const sessionAge = now - parsed.timestamp;

      // 8時間でセッション期限切れ
      if (sessionAge > 8 * 60 * 60 * 1000) {
        console.log("レガシーセッション期限切れ");
        this.clearSession();
        return null;
      }

      console.log("レガシーセッションを取得:", parsed.user_name);

      // company_nameが不足している場合は、Firestoreから再取得して補完
      if (!parsed.company_name && parsed.user_id) {
        console.log(
          "company_nameが不足しているため、Firestoreから再取得します"
        );
        try {
          const usersQuery = query(
            collection(db, "users"),
            where("user_id", "==", parsed.user_id)
          );
          const querySnapshot = await getDocs(usersQuery);

          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            if (userData.company_name) {
              parsed.company_name = userData.company_name;
              // 更新されたセッションを保存
              this.saveSession(parsed);
              console.log("company_nameを補完しました:", userData.company_name);
            }
          }
        } catch (error) {
          console.error("company_name補完エラー:", error);
        }
      }

      currentUser = parsed;
      return parsed;
    } catch (error) {
      console.error("Session parse error:", error);
      this.clearSession();
      return null;
    }
  }

  // セッションクリア（Firebase + レガシー）
  static clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("firebaseSessionData"); // Firebase専用セッションもクリア
    currentUser = null;
    currentFirebaseUser = null;
  }

  // ログイン処理
  static async login(userId) {
    try {
      console.log("ログイン試行:", userId);

      // Firestoreからユーザー情報取得
      const usersQuery = query(
        collection(db, "users"),
        where("user_id", "==", userId)
      );
      const querySnapshot = await getDocs(usersQuery);

      // デバッグ用：既存ユーザーをログ出力
      if (querySnapshot.empty) {
        console.log(
          "ユーザーが見つかりませんでした。既存ユーザーを確認します..."
        );
        const allUsersQuery = query(collection(db, "users"));
        const allUsersSnapshot = await getDocs(allUsersQuery);
        console.log("既存ユーザー数:", allUsersSnapshot.size);
        allUsersSnapshot.forEach((doc) => {
          const userData = doc.data();
          console.log("- ユーザー:", userData.user_id, userData.user_name);
        });
      }

      if (querySnapshot.empty) {
        throw new Error(
          `ユーザーID「${userId}」が見つかりません。\n「テストユーザーを作成」ボタンを押してからログインしてください。`
        );
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // roleフィールドの正規化（user_roleがメインフィールドの場合）
      const userRole = userData.user_role || userData.role;

      // ユーザーがアクティブかチェック
      if (userData.status === "退場済") {
        throw new Error("このユーザーは退場済みです");
      }

      // セッション保存（正しいroleフィールドを使用）
      const sessionData = {
        ...userData,
        role: userRole, // 正規化されたroleを使用
      };
      this.saveSession(sessionData);

      const redirectUrl = this.getRedirectUrl(userRole);

      return {
        success: true,
        user: sessionData,
        redirectUrl: redirectUrl,
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ロールに応じたリダイレクトURL取得
  static getRedirectUrl(role) {
    switch (role) {
      case USER_ROLES.ADMIN:
        return "admin.html";
      case USER_ROLES.USER:
        return "user.html";
      case USER_ROLES.STAFF:
        return "staff.html";
      case USER_ROLES.MAKER:
        return "maker.html";
      case USER_ROLES.SUPERUSER:
        return "superuser.html";
      default:
        return "login.html";
    }
  }

  // ページアクセス権限チェック（Firebase Auth + レガシー対応）
  static async checkPageAccess() {
    const currentPage =
      window.location.pathname.split("/").pop() || "admin.html";

    console.log("=== ページアクセスチェック開始 ===");
    console.log("現在のページ:", currentPage);
    console.log("リダイレクト中フラグ:", window.isRedirecting);

    // Admin認証システム優先チェック
    if (localStorage.getItem("currentAdmin")) {
      console.log(
        "🔐 Admin認証システム検出 - ページアクセスチェックをスキップ"
      );
      return true;
    }

    // ログイン画面の場合は認証チェックをスキップ
    if (currentPage === "login.html" || currentPage === "index.html") {
      console.log("ログイン画面のため認証チェックをスキップ");
      return true;
    }

    // リダイレクト中フラグで無限ループを防止
    if (window.isRedirecting) {
      console.log("リダイレクト処理中のため、チェックをスキップ");
      return true;
    }

    // セッション取得（Firebaseまたはレガシー）
    const session = await this.getSession(); // await追加
    console.log(
      "現在のセッション:",
      session ? `${session.user_name} (${session.role})` : "なし"
    );

    // セッションがない場合はログインページへ
    if (!session) {
      console.log("認証セッションなし - ログインページへリダイレクト");
      if (currentPage !== "login.html" && currentPage !== "index.html") {
        //alert("stop");
        this.redirectTo("login.html");
      }
      return false;
    }



    // セッションのタイプを判定してログ出力
    if (session.uid) {
      console.log(
        "Firebase認証ユーザーでアクセス:",
        session.user_name,
        session.role
      );
    } else {
      console.log(
        "レガシー認証ユーザーでアクセス:",
        session.user_name,
        session.role
      );
    }

    // ページアクセス権限チェック
    const allowedRoles = PAGE_PERMISSIONS[currentPage] || [];
    console.log("=== 権限チェック詳細 ===");
    console.log("ページの許可ロール:", allowedRoles);
    console.log("ユーザーのロール:", session.role);
    console.log(
      "権限チェック結果:",
      allowedRoles.length > 0 && !allowedRoles.includes(session.role)
    );
    console.log("=====================");

    if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
      const redirectUrl = this.getRedirectUrl(session.role);
      console.log(
        `権限不足 - 現在のロール: ${session.role
        }, 必要なロール: [${allowedRoles.join(", ")}]`
      );
      console.log(`${redirectUrl}へリダイレクト`);

      const targetPage = redirectUrl.replace(".html", "");
      const currentPageName = currentPage.replace(".html", "");

      console.log("=== リダイレクト判定 ===");
      console.log("リダイレクト先ページ:", targetPage);
      console.log("現在のページ名:", currentPageName);
      console.log("リダイレクト必要か:", currentPageName !== targetPage);
      console.log("====================");

      if (currentPageName !== targetPage) {
        console.log("リダイレクト実行中...");
        this.redirectTo(redirectUrl);
      } else {
        console.log("既に正しいページにいるため、リダイレクトをスキップ");
      }
      return false;
    }

    console.log(`アクセス許可: ${currentPage} (${session.role})`);
    console.log("=== ページアクセスチェック完了 ===");
    return true;
  }

  // 安全なリダイレクト関数
  static redirectTo(url) {
    const currentPage =
      window.location.pathname.split("/").pop() || "admin.html";

    // ログイン画面から他のページへのリダイレクトは許可
    // ログイン画面内でのリダイレクトは防止
    if (currentPage === "login.html" && url.includes("login.html")) {
      console.log("ログイン画面内でのリダイレクトを防止");
      return;
    }

    if (window.isRedirecting) {
      console.log("リダイレクト処理中のため、新しいリダイレクトをスキップ");
      return;
    }

    window.isRedirecting = true;
    console.log(`リダイレクト実行: ${url}`);

    // ページアクセス権限チェックを一時的に無効化
    setTimeout(() => {
      console.log(`実際にリダイレクト: ${url}`);
      window.location.href = url;
    }, 500); // 少し長めの遅延でリダイレクト実行
  } // ログアウト
  static logout() {
    this.clearSession();
    window.location.href = "login.html";
  }

  // 現在のユーザー情報取得
  static async getCurrentUser() {
    return await this.getSession();
  }

}

// 認証状態監視の開始（ログイン画面以外でのみ有効）
const currentPageForAuth =
  window.location.pathname.split("/").pop() || "admin.html";

if (
  currentPageForAuth !== "login.html" &&
  currentPageForAuth !== "index.html"
) {
  console.log("保護されたページのため認証監視を開始します");

  FirebaseAuthManager.onAuthStateChanged((user) => {
    if (user) {
      console.log(
        "認証状態監視: 認証済み -",
        user.user_name,
        "(" + user.user_role + ")"
      );
      currentUser = user;
    } else {
      console.log("認証状態監視: 未認証状態");
      currentUser = null;
    }

    // ページアクセスチェック（公開ページ以外）
    const currentPage =
      window.location.pathname.split("/").pop() || "admin.html";

    // ログインページ、インデックスページでは一切の認証チェックを行わない
    if (currentPage === "login.html" || currentPage === "index.html") {
      console.log("ログイン画面のため認証監視をスキップします");
      return;
    }

    // リダイレクト中の場合もスキップ
    if (window.isRedirecting) {
      console.log("リダイレクト中のため認証監視をスキップします");
      return;
    }

    // 保護されたページでのみ認証チェックを実行
    if (
      currentPage !== "login.html" &&
      currentPage !== "index.html" &&
      !window.isRedirecting
    ) {
      // Admin認証システム使用時はスキップ
      if (localStorage.getItem("currentAdmin")) {
        console.log("🔐 Admin認証システム使用中 - Firebase認証監視をスキップ");
        return;
      }

      // 認証状態監視による自動チェックは控えめに実行
      setTimeout(async () => {
        console.log("認証状態監視からのページアクセスチェック実行");
        await UserSession.checkPageAccess(); // await追加
      }, 1000); // より長い遅延でチェック
    }
  });
} else {
  console.log("ログイン画面のため認証監視を完全に無効化します");
}

// ページロード時の認証チェック
document.addEventListener("DOMContentLoaded", function () {
  window.isRedirecting = false;
  console.log("DOMContentLoaded: ページロード時の認証チェック開始");
  const currentPage = window.location.pathname.split("/").pop() || "admin.html";
  console.log("現在のページ:", currentPage);

  // ログイン画面では一切の認証チェックを行わない
  if (currentPage === "login.html" || currentPage === "index.html") {
    console.log("ログイン画面のため認証チェックをスキップします");
    return;
  }

  // superuserならsuperuser.htmlにリダイレクト
  setTimeout(async () => {
    try {
      // Firestoreからadmin_settingsを取得
      const session = await UserSession.getSession();
      if (session && session.admin_id) {

        console.log("[superuser判定] session: " + JSON.stringify(session));
        //alert("stop");
        const adminRef = doc(db, "admin_settings", session.admin_id);
        console.log("Admin設定を確認中:", session.admin_id);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
          const adminData = adminSnap.data();
          const roleValue = adminData.role ?? "admin";
          // superuserなら必ずsuperuser.htmlへ遷移
          if (session.admin_id === "superuser" || roleValue === "superuser") {
            if (!window.location.pathname.endsWith("superuser.html")) {
              window.isRedirecting = true;
              window.location.href = "superuser.html";
              return;
            }
          } else if (roleValue === "admin") {
            // adminならadmin.htmlへ（ただし今admin.htmlでなければ）
            if (!window.location.pathname.endsWith("admin.html")) {
              window.isRedirecting = true;
              window.location.href = "admin.html";
              return;
            }
          }
          // それ以外はリダイレクトしない
        }
      }
    }
    catch (e) {
      console.error("superuser判定・リダイレクトエラー", e);
    }
    // 通常のアクセスチェック
    await UserSession.checkPageAccess();
  }, 2000);

  // グローバル関数として公開
  window.FirebaseAuthManager = FirebaseAuthManager;
  window.UserSession = UserSession;
  window.AUTH_TYPES = AUTH_TYPES;
  window.USER_ROLES = USER_ROLES;
  window.db = db; // Firestoreインスタンスをグローバルに公開

  console.log("認証システムが初期化されました");

  // ログイン画面では初期化時のセッション確認をスキップ
  const currentPageForInit =
    window.location.pathname.split("/").pop() || "admin.html";

  if (
    currentPageForInit !== "login.html" &&
    currentPageForInit !== "index.html"
  ) {
    console.log("保護されたページのため、セッション状態を確認します");

    // 初期化時のセッション状態確認（非同期処理）
    setTimeout(async () => {
      try {
        const currentSession = await UserSession.getSession();
        const firebaseSessionData = localStorage.getItem("firebaseSessionData");
        const legacySessionData = localStorage.getItem(SESSION_KEY);

        console.log("=== セッション状態確認 ===");
        console.log(
          "現在のセッション:",
          currentSession ? currentSession.user_name : "なし"
        );
        console.log(
          "Firebaseセッションデータ:",
          firebaseSessionData ? "あり" : "なし"
        );
        console.log(
          "レガシーセッションデータ:",
          legacySessionData ? "あり" : "なし"
        );
        console.log(
          "currentFirebaseUser:",
          currentFirebaseUser ? currentFirebaseUser.uid : "なし"
        );
        console.log("========================");
      } catch (error) {
        console.error("セッション状態確認エラー:", error);
      }
    }, 100); // 短い遅延で実行
  } else {
    console.log("ログイン画面のため、初期化時のセッション確認をスキップします");
  }
});
