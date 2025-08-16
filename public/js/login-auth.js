// ログイン画面専用の軽量認証システム
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
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

// セッションキー
const SESSION_KEY = "currentUser";

// ユーザーロール
const USER_ROLES = {
  ADMIN: "admin",
  STAFF: "staff",
  MAKER: "maker",
  USER: "user",
};

// Google認証プロバイダの設定
googleProvider.setCustomParameters({
  prompt: "select_account",
  hd: null,
});

// ログイン専用のシンプルな認証クラス
class LoginAuth {
  // ログイン処理
  static async login(userId) {
    try {
      console.log("ログイン試行:", userId);

      const usersQuery = query(
        collection(db, "users"),
        where("user_id", "==", String(userId)) // 文字列で検索
      );

      let querySnapshot = await getDocs(usersQuery);

      // 文字列で見つからない場合は数値で再検索
      if (querySnapshot.empty) {
        const userIdAsNumber = parseInt(userId, 10);
        if (!isNaN(userIdAsNumber)) {
          const numberQuery = query(
            collection(db, "users"),
            where("user_id", "==", userIdAsNumber)
          );
          querySnapshot = await getDocs(numberQuery);
        }
      }

      if (querySnapshot.empty) {
        throw new Error(`ユーザーID「${userId}」が見つかりません。`);
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const userRole = userData.user_role || userData.role;

      if (userData.status === "退場済") {
        throw new Error("このユーザーは退場済みです");
      }

      // セッション保存
      const sessionData = {
        uid: userData.uid || userData.user_id,
        user_id: String(userData.user_id), // 文字列として保存
        user_name: userData.user_name,
        company_name: userData.company_name,
        role: userRole,
        department: userData.department,
        timestamp: new Date().getTime(),
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

      // リダイレクトURL決定
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

  // Google認証
  static async signInWithGoogle() {
    try {
      console.log("Google認証開始");
      const result = await signInWithPopup(auth, googleProvider);

      // Google認証成功後の処理は既存のauth.jsと同様
      console.log("Google認証成功:", result.user.displayName);

      return {
        success: true,
        requiresRegistration: true, // 追加情報入力が必要
        firebaseUser: result.user,
      };
    } catch (error) {
      console.error("Google認証エラー:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // リダイレクトURL取得
  static getRedirectUrl(role) {
    switch (role) {
      case USER_ROLES.ADMIN:
        return "admin.html";
      case USER_ROLES.STAFF:
        return "staff.html";
      case USER_ROLES.MAKER:
        return "maker.html";
      case USER_ROLES.USER:
        return "user.html";
      default:
        return "user.html";
    }
  }

  // セッションクリア
  static clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("firebaseSessionData");
  }

  // 現在のセッション取得
  static getSession() {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error("セッション取得エラー:", error);
      return null;
    }
  }

  // 追加情報更新（Google認証後）
  static async updateUserAdditionalInfo(firebaseUser, additionalInfo) {
    // 既存のauth.jsからFirebaseAuthManagerの同等機能をコピー
    // 今のところ、基本的な実装を提供
    try {
      console.log("追加情報更新:", additionalInfo);
      // 実装は既存のauth.jsの内容に基づいて後で追加
      return {
        success: true,
        user: { ...additionalInfo },
      };
    } catch (error) {
      console.error("追加情報更新エラー:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// グローバル公開
window.LoginAuth = LoginAuth;
window.USER_ROLES = USER_ROLES;

console.log("ログイン専用認証システムが初期化されました");
