// 認証・権限管理システム (Firebase Auth対応版)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// 認証状態の設定
googleProvider.setCustomParameters({
  prompt: "select_account",
});

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
  "user.html": [
    USER_ROLES.USER,
    USER_ROLES.STAFF,
    USER_ROLES.MAKER,
    USER_ROLES.SCANNER,
    USER_ROLES.GUEST,
  ],
  "/": [USER_ROLES.ADMIN],
};

// 現在のユーザーセッション
let currentUser = null;
let currentFirebaseUser = null;

// 認証タイプ
const AUTH_TYPES = {
  LEGACY: "legacy", // 従来の匿名認証
  EMAIL: "email", // メール認証
  GOOGLE: "google", // Google認証
  ANONYMOUS: "anonymous", // Firebase匿名認証
};

// ローカルストレージキー
const SESSION_KEY = "qrscan_user_session";

// Firebase Authentication管理
class FirebaseAuthManager {
  // Google認証
  static async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Firestoreでユーザー情報を確認・作成
      const userData = await this.syncUserWithFirestore(
        user,
        AUTH_TYPES.GOOGLE
      );
      return { success: true, user: userData };
    } catch (error) {
      console.error("Google認証エラー:", error);
      return { success: false, error: error.message };
    }
  }

  // メール認証（ログイン）
  static async signInWithEmail(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;

      const userData = await this.syncUserWithFirestore(user, AUTH_TYPES.EMAIL);
      return { success: true, user: userData };
    } catch (error) {
      console.error("メール認証エラー:", error);
      return { success: false, error: error.message };
    }
  }

  // メール認証（新規登録）
  static async createUserWithEmail(email, password, displayName) {
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = result.user;

      // 初期ユーザーデータを作成
      const userData = await this.syncUserWithFirestore(
        user,
        AUTH_TYPES.EMAIL,
        {
          user_name: displayName,
          user_role: USER_ROLES.USER, // デフォルト権限
        }
      );
      return { success: true, user: userData };
    } catch (error) {
      console.error("ユーザー作成エラー:", error);
      return { success: false, error: error.message };
    }
  }

  // 匿名認証（後方互換性）
  static async signInAnonymously() {
    try {
      const result = await signInAnonymously(auth);
      const user = result.user;

      return {
        success: true,
        user: { uid: user.uid, authType: AUTH_TYPES.ANONYMOUS },
      };
    } catch (error) {
      console.error("匿名認証エラー:", error);
      return { success: false, error: error.message };
    }
  }

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

  // Firebase UserとFirestoreの同期
  static async syncUserWithFirestore(
    firebaseUser,
    authType,
    additionalData = {}
  ) {
    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      let userData;
      if (userSnap.exists()) {
        // 既存ユーザーの更新
        userData = userSnap.data();
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp(),
          authType: authType,
          email: firebaseUser.email || userData.email,
          photoURL: firebaseUser.photoURL || userData.photoURL,
        });
      } else {
        // 新規ユーザーの作成
        userData = {
          user_id: firebaseUser.uid,
          user_name:
            additionalData.user_name ||
            firebaseUser.displayName ||
            firebaseUser.email?.split("@")[0] ||
            "匿名ユーザー",
          email: firebaseUser.email || "",
          photoURL: firebaseUser.photoURL || "",
          user_role: additionalData.user_role || USER_ROLES.USER,
          status: "active",
          authType: authType,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          ...additionalData,
        };
        await setDoc(userRef, userData);
      }

      return {
        ...userData,
        uid: firebaseUser.uid,
        firebaseUser: firebaseUser,
      };
    } catch (error) {
      console.error("Firestoreユーザー同期エラー:", error);
      throw error;
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
            console.log(
              "Firebase認証ユーザー詳細取得:",
              userData.user_name,
              userData.user_role
            );
            currentUser = userData;

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
  // セッション保存（Firebase Auth対応）
  static saveSession(userData) {
    // roleフィールドの正規化
    const userRole = userData.user_role || userData.role;

    const sessionData = {
      uid: userData.uid || userData.user_id, // Firebase UID対応
      user_id: userData.user_id,
      user_name: userData.user_name,
      email: userData.email || "",
      photoURL: userData.photoURL || "",
      role: userRole,
      department: userData.department,
      authType: userData.authType || AUTH_TYPES.LEGACY,
      timestamp: new Date().getTime(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    currentUser = sessionData;
  } // セッション取得
  // セッション取得（Firebase + レガシー対応）
  static getSession() {
    // Firebase認証状態を優先的にチェック
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
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) {
      console.log("セッションデータが見つかりません");
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
      case USER_ROLES.STAFF:
      case USER_ROLES.MAKER:
      case USER_ROLES.SCANNER:
      case USER_ROLES.GUEST:
        return "user.html";
      default:
        return "login.html";
    }
  }

  // ページアクセス権限チェック（Firebase Auth + レガシー対応）
  static checkPageAccess() {
    const currentPage =
      window.location.pathname.split("/").pop() || "admin.html";

    // セッション取得（Firebaseまたはレガシー）
    const session = this.getSession();

    // セッションがない場合はログインページへ
    if (!session) {
      console.log("認証セッションなし - ログインページへリダイレクト");
      if (currentPage !== "login.html") {
        window.location.href = "login.html";
      }
      return false;
    }

    // セッションのタイプを判定してログ出力
    if (session.uid) {
      console.log("Firebase認証ユーザーでアクセス:", session.user_name);
    } else {
      console.log("レガシー認証ユーザーでアクセス:", session.user_name);
    }

    // ページアクセス権限チェック
    const allowedRoles = PAGE_PERMISSIONS[currentPage] || [];
    if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
      // 権限がない場合は適切なページにリダイレクト
      const redirectUrl = this.getRedirectUrl(session.role);
      console.log(`権限不足 - ${redirectUrl}へリダイレクト`);
      if (currentPage !== redirectUrl.replace(".html", "")) {
        window.location.href = redirectUrl;
      }
      return false;
    }

    console.log(`アクセス許可: ${currentPage} (${session.role})`);
    return true;
  } // ログアウト
  static logout() {
    this.clearSession();
    window.location.href = "login.html";
  }

  // 現在のユーザー情報取得
  static getCurrentUser() {
    return this.getSession();
  }
}

// 認証状態監視の開始
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

  // ページアクセスチェック（ログインページ以外）
  const currentPage = window.location.pathname.split("/").pop() || "admin.html";
  if (currentPage !== "login.html" && currentPage !== "index.html") {
    UserSession.checkPageAccess();
  }
});

// ページロード時の認証チェック
document.addEventListener("DOMContentLoaded", function () {
  // ログインページ以外では認証チェック
  const currentPage = window.location.pathname.split("/").pop() || "admin.html";
  if (currentPage !== "login.html") {
    UserSession.checkPageAccess();
  }
});

// グローバル関数として公開
window.FirebaseAuthManager = FirebaseAuthManager;
window.UserSession = UserSession;
window.AUTH_TYPES = AUTH_TYPES;
window.USER_ROLES = USER_ROLES;

console.log("認証システムが初期化されました");

// 初期化時のセッション状態確認
const currentSession = UserSession.getSession();
const firebaseSessionData = localStorage.getItem("firebaseSessionData");
const legacySessionData = localStorage.getItem(SESSION_KEY);

console.log("=== セッション状態確認 ===");
console.log(
  "現在のセッション:",
  currentSession ? currentSession.user_name : "なし"
);
console.log("Firebaseセッションデータ:", firebaseSessionData ? "あり" : "なし");
console.log("レガシーセッションデータ:", legacySessionData ? "あり" : "なし");
console.log(
  "currentFirebaseUser:",
  currentFirebaseUser ? currentFirebaseUser.uid : "なし"
);
console.log("========================");
