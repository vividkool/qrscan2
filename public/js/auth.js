// 認証・権限管理システム（Firebase Auth専用・レガシー削除版）
import {
  getAuth,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

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
  SUPERUSER: "superuser", // 開発者用SuperUser
  USER: "user",
  STAFF: "staff",
  MAKER: "maker",
  SCANNER: "scanner",
  GUEST: "guest",
};

// ページアクセス権限定義
const PAGE_PERMISSIONS = {
  "admin.html": [USER_ROLES.ADMIN, USER_ROLES.SUPERUSER], // SUPERUSERも管理画面アクセス可
  "staff.html": [USER_ROLES.STAFF, USER_ROLES.SUPERUSER],
  "maker.html": [USER_ROLES.MAKER, USER_ROLES.SUPERUSER],
  "login.html": [USER_ROLES.SUPERUSER], // SUPERUSER専用
  "user.html": [
    USER_ROLES.USER,
    USER_ROLES.STAFF,
    USER_ROLES.MAKER,
    USER_ROLES.SUPERUSER,
  ],
  "index.html": [], // 公開ページ
  "superuser.html": [], // 公開ページ
  "/": [USER_ROLES.ADMIN],
};

let currentUser = null;
let currentFirebaseUser = null;

// 認証タイプ（Firebase Auth専用）
const AUTH_TYPES = {
  FIREBASE: "firebase", // Firebase Auth認証のみ
  ADMIN: "admin", // 管理者認証のみ
};

// Firebase Authentication管理
class FirebaseAuthManager {
  // ログアウト
  static async signOut() {
    try {
      await signOut(auth);
      UserSession.clearSession();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 認証状態監視
  static onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      currentFirebaseUser = firebaseUser;
      if (firebaseUser) {
        try {
          // Firestoreから管理者情報を取得
          let adminData = null;
          try {
            const adminQuery = query(
              collection(db, "admin_settings"),
              where("uid", "==", firebaseUser.uid),
              limit(1)
            );
            const adminSnapshot = await getDocs(adminQuery);
            if (!adminSnapshot.empty) {
              adminData = adminSnapshot.docs[0].data();
              console.log("🔍 Firestoreから管理者データ取得:", adminData);
            }
          } catch (error) {
            console.log(
              "管理者データ取得エラー（通常ユーザーの可能性）:",
              error
            );
          }

          // Firebase Authトークンから情報を優先取得
          const token = await firebaseUser.getIdToken();
          const payload = JSON.parse(atob(token.split(".")[1]));

          console.log("🔍 onAuthStateChanged トークン詳細:");
          console.log("- UID:", firebaseUser.uid);
          console.log("- Token payload:", payload);

          // UTF-8デコードを修正
          let userName = payload.user_name;
          if (userName && typeof userName === "string") {
            // 文字化けしたUTF-8文字列をデコード
            try {
              userName = decodeURIComponent(escape(userName));
            } catch (e) {
              // デコードに失敗した場合はそのまま使用
              console.warn("ユーザー名のデコードに失敗:", e);
            }
          }

          const userData = {
            uid: firebaseUser.uid,
            user_id: payload.user_id || firebaseUser.uid,
            user_name: adminData
              ? adminData.admin_name
              : userName || firebaseUser.uid,
            role: adminData ? adminData.role : payload.role, // Firestoreの管理者データを優先
            // Firestoreから取得した管理者データを全て含める
            ...(adminData && {
              admin_id: adminData.admin_id,
              admin_name: adminData.admin_name,
              company_name: adminData.company_name,
              email: adminData.email,
              phone: adminData.phone_number,
              project_name: adminData.project_name,
              event_date: adminData.event_date,
              status: adminData.status,
              plan_type: adminData.plan_type,
              is_active: adminData.is_active,
            }),
            authType: "FIREBASE",
            timestamp: Date.now(),
            firebaseUser: firebaseUser,
          };

          console.log("🎯 onAuthStateChanged 最終userData:", userData);

          if (userData.status === "退場済") {
            callback({
              ...userData,
              isInactive: true,
              message: "このアカウントは無効化されています。",
            });
            return;
          }

          // ※ localStorage保存は削除（Firebase Auth専用システムのため不要）
          // localStorage.setItem("firebaseSessionData", JSON.stringify(userData));

          callback(userData);
        } catch (error) {
          console.error("Firebase Auth token parsing error:", error);
          callback(null);
        }
      } else {
        // Firebase Auth未認証時はクリア
        currentUser = null;
        currentFirebaseUser = null;
        UserSession.clearSession();
        callback(null);
      }
    });
  }
}

// ユーザーセッション管理（Firebase Auth専用）
class UserSession {
  // セッション保存（Firebase Auth専用・無効化）
  static saveSession(userData) {
    // Firebase Auth専用のため、localStorageへの保存を無効化
    console.log("saveSession: Firebase Auth専用のため無効化されました");
    return;
  }

  // セッション取得（Firebase Auth優先）
  static async getSession() {
    // Firebase認証状態を最優先でチェック
    if (currentFirebaseUser) {
      // ※ localStorageキャッシュは削除（Firebase Auth専用システムのため不要）
      /*
      const firebaseSessionData = localStorage.getItem("firebaseSessionData");
      if (firebaseSessionData) {
        try {
          const parsed = JSON.parse(firebaseSessionData);
          if (parsed.uid === currentFirebaseUser.uid) {
            currentUser = parsed;
            return parsed;
          }
        } catch { }
      }
      */

      // Firebase Authのトークンから直接情報を取得
      try {
        // Firestoreから管理者情報を取得
        let adminData = null;
        try {
          const adminQuery = query(
            collection(db, "admin_settings"),
            where("uid", "==", currentFirebaseUser.uid),
            limit(1)
          );
          const adminSnapshot = await getDocs(adminQuery);
          if (!adminSnapshot.empty) {
            adminData = adminSnapshot.docs[0].data();
            console.log(
              "🔍 getCurrentUser: Firestoreから管理者データ取得:",
              adminData
            );
          }
        } catch (error) {
          console.log(
            "getCurrentUser: 管理者データ取得エラー（通常ユーザーの可能性）:",
            error
          );
        }

        const token = await currentFirebaseUser.getIdToken();
        const payload = JSON.parse(atob(token.split(".")[1]));

        console.log("🔍 Firebase Auth トークン詳細デバッグ:");
        console.log("- UID:", currentFirebaseUser.uid);
        console.log("- Token payload:", payload);
        console.log("- user_id:", payload.user_id);
        console.log("- user_name:", payload.user_name);
        console.log("- role:", payload.role);

        // UTF-8デコードを修正
        let userName = payload.user_name;
        if (userName && typeof userName === "string") {
          try {
            userName = decodeURIComponent(escape(userName));
          } catch (e) {
            console.warn("ユーザー名のデコードに失敗:", e);
          }
        }

        const firebaseUserData = {
          uid: currentFirebaseUser.uid,
          user_id: payload.user_id,
          user_name: adminData ? adminData.admin_name : userName,
          role: adminData ? adminData.role : payload.role, // Firestoreの管理者データを優先
          // Firestoreから取得した管理者データを全て含める
          ...(adminData && {
            admin_id: adminData.admin_id,
            admin_name: adminData.admin_name,
            company_name: adminData.company_name,
            email: adminData.email,
            phone: adminData.phone_number,
            project_name: adminData.project_name,
            event_date: adminData.event_date,
            status: adminData.status,
            plan_type: adminData.plan_type,
            is_active: adminData.is_active,
          }),
          authType: "FIREBASE",
          timestamp: Date.now(),
          firebaseUser: currentFirebaseUser,
        };

        console.log("🎯 最終的なuserData:", firebaseUserData);

        // キャッシュとして保存
        /*
        localStorage.setItem(
          "firebaseSessionData",
          JSON.stringify(firebaseUserData)
        );
        */
        currentUser = firebaseUserData;
        return firebaseUserData;
      } catch (error) {
        console.error("Firebase token parsing error:", error);
      }
    }

    // フォールバック：古いcurrentAdminデータ（Firebase認証がない場合のみ）
    // ※ Firebase Auth専用システムのため、以下のlocalStorageフォールバックは無効化
    /*
    const currentAdmin = localStorage.getItem("currentAdmin");
    if (currentAdmin) {
      try {
        const adminObj = JSON.parse(currentAdmin);
        console.log("⚠️  フォールバック: 古いcurrentAdminデータを使用:", adminObj);
        return {
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
          ...adminObj,
        };
      } catch {
        return null;
      }
    }
    */

    return null;
  }

  // セッションクリア（Firebase Auth専用・localStorage完全削除版）
  static clearSession() {
    // ※ Firebase Auth専用システムのため、localStorage使用を完全停止
    // localStorage.removeItem("firebaseSessionData");

    // ※ レガシーデータ削除処理も無効化（Firebase Auth専用のため不要）
    // localStorage.removeItem("currentUser"); // レガシーデータ削除
    // localStorage.removeItem("session"); // レガシーデータ削除
    // localStorage.removeItem("loginTime"); // レガシーデータ削除
    // localStorage.removeItem("user");
    // localStorage.removeItem("sessionData");
    // localStorage.removeItem("userData");

    currentUser = null;
    currentFirebaseUser = null;
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
        return "login.html"; // superuserは特別扱い、ログイン画面に戻す
      default:
        return "login.html";
    }
  }

  // 現在のユーザー情報取得
  static async getCurrentUser() {
    return await this.getSession();
  }

  // ログアウト（Firebase Auth対応）
  static async logout() {
    try {
      // Firebase Authからサインアウト
      const auth = getAuth();
      if (auth.currentUser) {
        await signOut(auth);
      }

      // レガシーセッションもクリア
      this.clearSession();

      // ログイン画面にリダイレクト
      window.location.href = "login.html";
    } catch (error) {
      console.error("ログアウトエラー:", error);
      // エラーが発生してもセッションはクリアする
      this.clearSession();
      window.location.href = "login.html";
    }
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
        "認証状態監視: Firebase Auth認証済み -",
        user.user_name,
        "(" + user.role + ")"
      );
      currentUser = user;
    } else {
      console.log("認証状態監視: 未認証状態");
      currentUser = null;
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

  // グローバル関数として公開
  window.FirebaseAuthManager = FirebaseAuthManager;
  window.UserSession = UserSession;
  window.AUTH_TYPES = AUTH_TYPES;
  window.USER_ROLES = USER_ROLES;
  window.db = db; // Firestoreインスタンスをグローバルに公開

  console.log("認証システムが初期化されました");
});
