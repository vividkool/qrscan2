// 認証・権限管理システム
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
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

// ローカルストレージキー
const SESSION_KEY = "qrscan_user_session";

// ユーザーセッション管理
class UserSession {
  // セッション保存
  static saveSession(userData) {
    // roleフィールドの正規化
    const userRole = userData.user_role || userData.role;

    const sessionData = {
      user_id: userData.user_id,
      user_name: userData.user_name,
      role: userRole, // 正規化されたroleを使用
      department: userData.department,
      timestamp: new Date().getTime(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    currentUser = sessionData;
  } // セッション取得
  static getSession() {
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) return null;

    try {
      const parsed = JSON.parse(sessionData);
      const now = new Date().getTime();
      const sessionAge = now - parsed.timestamp;

      // 8時間でセッション期限切れ
      if (sessionAge > 8 * 60 * 60 * 1000) {
        this.clearSession();
        return null;
      }

      currentUser = parsed;
      return parsed;
    } catch (error) {
      console.error("Session parse error:", error);
      this.clearSession();
      return null;
    }
  }

  // セッションクリア
  static clearSession() {
    localStorage.removeItem(SESSION_KEY);
    currentUser = null;
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

  // ページアクセス権限チェック
  static checkPageAccess() {
    const currentPage =
      window.location.pathname.split("/").pop() || "admin.html";
    const session = this.getSession();

    // セッションがない場合はログインページへ
    if (!session) {
      if (currentPage !== "login.html") {
        window.location.href = "login.html";
      }
      return false;
    }

    // ページアクセス権限チェック
    const allowedRoles = PAGE_PERMISSIONS[currentPage] || [];
    if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
      // 権限がない場合は適切なページにリダイレクト
      const redirectUrl = this.getRedirectUrl(session.role);
      if (currentPage !== redirectUrl.replace(".html", "")) {
        window.location.href = redirectUrl;
      }
      return false;
    }

    return true;
  }

  // ログアウト
  static logout() {
    this.clearSession();
    window.location.href = "login.html";
  }

  // 現在のユーザー情報取得
  static getCurrentUser() {
    return this.getSession();
  }
}

// ページロード時の認証チェック
document.addEventListener("DOMContentLoaded", function () {
  // ログインページ以外では認証チェック
  const currentPage = window.location.pathname.split("/").pop() || "admin.html";
  if (currentPage !== "login.html") {
    UserSession.checkPageAccess();
  }
});

// グローバル関数として公開
window.UserSession = UserSession;
window.USER_ROLES = USER_ROLES;

console.log("認証システムが初期化されました");
