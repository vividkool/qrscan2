// Firebase Authentication対応版 認証システム
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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
const auth = getAuth(app);
const db = getFirestore(app);

// カスタムトークン生成関数のURL
const CUSTOM_TOKEN_URL = 'https://asia-northeast1-qrscan2-99ffd.cloudfunctions.net/createCustomToken';

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
  "index.html": [USER_ROLES.ADMIN],
  "user.html": [USER_ROLES.USER, USER_ROLES.STAFF, USER_ROLES.MAKER, USER_ROLES.SCANNER, USER_ROLES.GUEST],
  "/": [USER_ROLES.ADMIN],
};

// 現在のユーザーセッション
let currentUser = null;

// ユーザーセッション管理（Firebase Auth対応版）
class UserSession {
  // カスタムトークン取得（サーバーサイド関数を呼び出し）
  static async getCustomToken(userId) {
    try {
      // Firebase Functionsでカスタムトークンを生成
      const response = await fetch(CUSTOM_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userId })
      });

      if (!response.ok) {
        throw new Error('カスタムトークンの取得に失敗しました');
      }

      const data = await response.json();
      return data.customToken;
    } catch (error) {
      console.error('Custom token error:', error);
      throw error;
    }
  }

  // ログイン処理（Firebase Auth + カスタムトークン）
  static async login(userId) {
    try {
      console.log("Firebase Auth ログイン試行:", userId);

      // 1. Firestoreでユーザー存在確認
      const usersQuery = query(
        collection(db, "users"),
        where("user_id", "==", userId)
      );
      const querySnapshot = await getDocs(usersQuery);

      if (querySnapshot.empty) {
        // デバッグ用：既存ユーザーをログ出力
        console.log("ユーザーが見つかりませんでした。既存ユーザーを確認します...");
        const allUsersQuery = query(collection(db, "users"));
        const allUsersSnapshot = await getDocs(allUsersQuery);
        console.log("既存ユーザー数:", allUsersSnapshot.size);
        allUsersSnapshot.forEach((doc) => {
          const userData = doc.data();
          console.log("- ユーザー:", userData.user_id, userData.user_name);
        });

        throw new Error(
          `ユーザーID「${userId}」が見つかりません。\n「テストユーザーを作成」ボタンを押してからログインしてください。`
        );
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // ステータスチェック
      if (userData.status === "退場済") {
        throw new Error("このユーザーは退場済みです");
      }

      // 2. カスタムトークン取得
      const customToken = await this.getCustomToken(userId);

      // 3. Firebase Authでサインイン
      const userCredential = await signInWithCustomToken(auth, customToken);
      const firebaseUser = userCredential.user;

      console.log("Firebase Auth ログイン成功:", firebaseUser.uid);

      // 4. ユーザーデータの正規化
      const userRole = userData.user_role || userData.role;
      const sessionData = {
        ...userData,
        role: userRole,
        firebaseUid: firebaseUser.uid,
        idToken: await firebaseUser.getIdToken() // JWTトークン取得
      };

      currentUser = sessionData;
      const redirectUrl = this.getRedirectUrl(userRole);

      return {
        success: true,
        user: sessionData,
        redirectUrl: redirectUrl,
      };
    } catch (error) {
      console.error("Firebase Auth Login error:", error);
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
        return "index.html";
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

  // 認証状態取得
  static getCurrentUser() {
    return currentUser;
  }

  // セッション情報取得（互換性のため）
  static getSession() {
    return currentUser ? {
      userId: currentUser.user_id,
      role: currentUser.role,
      userName: currentUser.user_name,
      department: currentUser.department,
      authenticated: true,
      firebaseUid: currentUser.firebaseUid
    } : null;
  }

  // Firebase Authユーザー取得
  static getCurrentFirebaseUser() {
    return auth.currentUser;
  }

  // IDトークン取得（サーバーサイド検証用）
  static async getIdToken() {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  }

  // ページアクセス権限チェック
  static checkPageAccess() {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";

    // Firebase Auth認証状態をチェック
    if (!auth.currentUser || !currentUser) {
      if (currentPage !== "login.html") {
        window.location.href = "login.html";
      }
      return false;
    }

    // ページアクセス権限チェック
    const allowedRoles = PAGE_PERMISSIONS[currentPage] || [];
    if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
      // 権限がない場合は適切なページにリダイレクト
      const redirectUrl = this.getRedirectUrl(currentUser.role);
      if (currentPage !== redirectUrl.replace(".html", "")) {
        window.location.href = redirectUrl;
      }
      return false;
    }

    return true;
  }

  // ログアウト
  static async logout() {
    try {
      await signOut(auth);
      currentUser = null;
      window.location.href = "login.html";
    } catch (error) {
      console.error("Logout error:", error);
      // エラーが発生してもログアウト処理を続行
      currentUser = null;
      window.location.href = "login.html";
    }
  }
}

// Firebase Auth状態変化監視
onAuthStateChanged(auth, async (user) => {
  console.log("Auth state changed:", user?.uid);

  if (user) {
    // 認証済み：ユーザーデータを取得
    if (!currentUser) {
      try {
        // カスタムクレームからuser_idを取得（トークンに含まれている場合）
        const idTokenResult = await user.getIdTokenResult();
        const userId = idTokenResult.claims.user_id;

        if (userId) {
          // Firestoreからユーザーデータを取得
          const usersQuery = query(
            collection(db, "users"),
            where("user_id", "==", userId)
          );
          const querySnapshot = await getDocs(usersQuery);

          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            const userRole = userData.user_role || userData.role;
            currentUser = {
              ...userData,
              role: userRole,
              firebaseUid: user.uid
            };
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    }
  } else {
    // 未認証
    currentUser = null;
  }
});

// ページロード時の認証チェック
document.addEventListener("DOMContentLoaded", function () {
  // ログインページ以外では認証チェック
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  if (currentPage !== "login.html") {
    // Firebase Authの状態が確定するまで少し待つ
    setTimeout(() => {
      UserSession.checkPageAccess();
    }, 1000);
  }
});

// グローバル関数として公開
window.UserSession = UserSession;
window.USER_ROLES = USER_ROLES;

console.log("Firebase Authentication システムが初期化されました");
