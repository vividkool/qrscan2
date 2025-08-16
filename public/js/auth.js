// 認証・権限管理システム (Firebase Auth対応版)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Google認証プロバイダの設定を修正
googleProvider.setCustomParameters({
  prompt: "select_account",
  hd: null, // 特定ドメイン制限を解除
});

// Google認証スコープ設定
googleProvider.addScope("email");
googleProvider.addScope("profile");

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
  "user.html": [
    USER_ROLES.USER,
    USER_ROLES.STAFF,
    USER_ROLES.MAKER,
    USER_ROLES.SCANNER,
    USER_ROLES.GUEST,
  ],
  "index.html": [], // 公開ページ
  "login.html": [], // 公開ページ
  "/": [USER_ROLES.ADMIN],
};

// 現在のユーザーセッション
let currentUser = null;
let currentFirebaseUser = null;

// 認証タイプ
const AUTH_TYPES = {
  LEGACY: "legacy", // 従来の認証
  EMAIL: "email", // メール認証
  GOOGLE: "google", // Google認証
};

// ローカルストレージキー
const SESSION_KEY = "currentUser";

// Firebase Authentication管理
class FirebaseAuthManager {
  // Google認証
  static async signInWithGoogle() {
    try {
      console.log("Google認証を開始...");

      // ポップアップでGoogle認証
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      console.log("Google認証成功:", user.uid, user.email);

      // Firestoreでユーザー情報を確認・作成
      const userData = await this.syncUserWithFirestore(
        user,
        AUTH_TYPES.GOOGLE
      );
      return { success: true, user: userData };
    } catch (error) {
      console.error("Google認証エラー:", error);

      // 具体的なエラーメッセージを提供
      let errorMessage = "Google認証に失敗しました";
      if (error.code === "auth/operation-not-allowed") {
        errorMessage =
          "Google認証が有効化されていません。管理者にお問い合わせください。";
      } else if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "認証ポップアップが閉じられました。再度お試しください。";
      } else if (error.code === "auth/popup-blocked") {
        errorMessage =
          "ポップアップがブロックされています。ブラウザ設定を確認してください。";
      } else if (error.code === "auth/cancelled-popup-request") {
        errorMessage = "認証がキャンセルされました。";
      }

      return { success: false, error: errorMessage, code: error.code };
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
        // 新規ユーザーの作成（招待コードベース承認）
        const isFirstUser = await this.isFirstUser();
        const inviteCode = this.getInviteCodeFromURL();
        const autoApprove = isFirstUser || this.isValidInviteCode(inviteCode);

        userData = {
          user_id: firebaseUser.uid,
          user_name:
            additionalData.user_name ||
            firebaseUser.displayName ||
            firebaseUser.email?.split("@")[0] ||
            "登録ユーザー",
          email: firebaseUser.email || "",
          photoURL: firebaseUser.photoURL || "",
          user_role: isFirstUser
            ? USER_ROLES.ADMIN
            : additionalData.user_role || USER_ROLES.USER,
          status: autoApprove ? "active" : "pending",
          authType: authType,
          department: additionalData.department || "",
          inviteCode: inviteCode || null,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          approvedBy: autoApprove
            ? isFirstUser
              ? "system"
              : "invite_code"
            : null,
          approvedAt: autoApprove ? serverTimestamp() : null,
          ...additionalData,
        };
        await setDoc(userRef, userData);

        if (autoApprove) {
          console.log(
            isFirstUser ? "初回管理者ユーザー作成:" : "招待コードで自動承認:",
            userData.user_name
          );
        } else {
          console.log("新規ユーザー登録 - 管理者承認待ち:", userData.user_name);
          await this.notifyAdminOfNewUser(userData);
        }
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

  // 初回ユーザーかどうか確認
  static async isFirstUser() {
    try {
      const usersQuery = query(collection(db, "users"), limit(1));
      const snapshot = await getDocs(usersQuery);
      return snapshot.empty;
    } catch (error) {
      console.error("ユーザー確認エラー:", error);
      return false;
    }
  }

  // 管理者に新規ユーザー通知
  static async notifyAdminOfNewUser(userData) {
    try {
      const notificationRef = collection(db, "notifications");
      await addDoc(notificationRef, {
        type: "new_user_registration",
        message: `新規ユーザー「${userData.user_name}」が登録申請しました`,
        userData: {
          uid: userData.user_id,
          user_name: userData.user_name,
          email: userData.email,
          department: userData.department,
        },
        status: "unread",
        createdAt: serverTimestamp(),
      });
      console.log("管理者通知を送信しました");
    } catch (error) {
      console.error("通知送信エラー:", error);
    }
  }

  // URLから招待コード取得
  static getInviteCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("invite") || urlParams.get("code") || null;
  }

  // 招待コード有効性確認
  static isValidInviteCode(inviteCode) {
    if (!inviteCode) return false;

    // 簡単な招待コード検証（実際の運用に応じて調整）
    const validCodes = [
      "STAFF2024", // スタッフ用
      "MAKER2024", // メーカー用
      "GUEST2024", // ゲスト用
      "ADMIN_INVITE", // 管理者招待用
    ];

    // 時限付きコード（年月ベース）
    const currentMonth = new Date().toISOString().slice(0, 7).replace("-", "");
    const timeBasedCodes = [
      `INVITE_${currentMonth}`, // 月次招待コード
      `QR_${currentMonth}`, // QRコード用
    ];

    return (
      validCodes.includes(inviteCode) || timeBasedCodes.includes(inviteCode)
    );
  }

  // 招待コードに基づく初期ロール決定
  static getDefaultRoleFromInviteCode(inviteCode) {
    if (!inviteCode) return USER_ROLES.USER;

    const roleMap = {
      STAFF2024: USER_ROLES.STAFF,
      MAKER2024: USER_ROLES.MAKER,
      GUEST2024: USER_ROLES.GUEST,
      ADMIN_INVITE: USER_ROLES.ADMIN,
    };

    return roleMap[inviteCode] || USER_ROLES.USER;
  }

  // 招待コード付きGoogle認証（ログインページ用）
  static async registerWithGoogleAndInvite(department = "") {
    try {
      const inviteCode = this.getInviteCodeFromURL();
      const defaultRole = this.getDefaultRoleFromInviteCode(inviteCode);

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userData = await this.syncUserWithFirestore(
        user,
        AUTH_TYPES.GOOGLE,
        {
          department: department,
          user_role: defaultRole,
        }
      );

      return {
        success: true,
        user: userData,
        isNewUser: userData.status === "pending",
        autoApproved:
          userData.status === "active" && userData.approvedBy === "invite_code",
      };
    } catch (error) {
      console.error("Google招待登録エラー:", error);
      return { success: false, error: error.message };
    }
  }

  // Google認証での新規登録（部署情報付き）
  static async registerWithGoogle(department = "") {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // 部署情報を含めて同期
      const userData = await this.syncUserWithFirestore(
        user,
        AUTH_TYPES.GOOGLE,
        { department: department }
      );

      return {
        success: true,
        user: userData,
        isNewUser: userData.status === "pending",
      };
    } catch (error) {
      console.error("Google新規登録エラー:", error);
      return { success: false, error: error.message };
    }
  }

  // 追加情報の更新（パスワードレス登録用）
  static async updateUserAdditionalInfo(
    displayName,
    department = "",
    inviteCode = null
  ) {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error("認証されたユーザーがいません");
      }

      // Firebase Authのプロフィールを更新
      await updateProfile(firebaseUser, {
        displayName: displayName,
      });

      // Firestoreのユーザー情報を更新
      const userData = await this.syncUserWithFirestore(
        firebaseUser,
        AUTH_TYPES.GOOGLE,
        {
          user_name: displayName,
          department: department,
        }
      );

      return {
        success: true,
        user: userData,
        isNewUser: userData.status === "pending",
        autoApproved:
          userData.status === "active" && userData.approvedBy === "invite_code",
      };
    } catch (error) {
      console.error("追加情報更新エラー:", error);
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

            // 承認待ちユーザーの処理
            if (userData.status === "pending") {
              console.log("承認待ちユーザー:", userData.user_name);
              callback({
                ...userData,
                isPending: true,
                message:
                  "アカウントは管理者の承認待ちです。承認後にご利用いただけます。",
              });
              return;
            }

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
      case USER_ROLES.SCANNER:
      case USER_ROLES.GUEST:
        return "user.html";
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
        this.redirectTo("login.html");
      }
      return false;
    }

    // 承認待ちユーザーの処理
    if (session.status === "pending") {
      console.log("承認待ちユーザー:", session.user_name);
      if (currentPage !== "login.html") {
        alert("アカウントは管理者の承認待ちです。承認後にご利用いただけます。");
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
        `権限不足 - 現在のロール: ${
          session.role
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

  // 管理者用：ユーザー承認
  static async approveUser(userId, approvedRole = USER_ROLES.USER) {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error("ユーザーが見つかりません");
      }

      const currentSession = this.getSession();
      if (!currentSession || currentSession.role !== USER_ROLES.ADMIN) {
        throw new Error("管理者権限が必要です");
      }

      await updateDoc(userRef, {
        status: "active",
        user_role: approvedRole,
        approvedBy: currentSession.user_id,
        approvedAt: serverTimestamp(),
      });

      console.log("ユーザー承認完了:", userId);
      return { success: true };
    } catch (error) {
      console.error("ユーザー承認エラー:", error);
      return { success: false, error: error.message };
    }
  }

  // 管理者用：ユーザー拒否
  static async rejectUser(userId) {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        status: "rejected",
        rejectedBy: this.getSession()?.user_id,
        rejectedAt: serverTimestamp(),
      });

      console.log("ユーザー拒否完了:", userId);
      return { success: true };
    } catch (error) {
      console.error("ユーザー拒否エラー:", error);
      return { success: false, error: error.message };
    }
  }

  // 承認待ちユーザー一覧取得
  static async getPendingUsers() {
    try {
      const pendingQuery = query(
        collection(db, "users"),
        where("status", "==", "pending")
      );
      const snapshot = await getDocs(pendingQuery);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("承認待ちユーザー取得エラー:", error);
      return [];
    }
  }

  // 一括承認機能（効率的な管理）
  static async bulkApproveUsers(userIds, defaultRole = USER_ROLES.USER) {
    try {
      const currentSession = this.getSession();
      if (!currentSession || currentSession.role !== USER_ROLES.ADMIN) {
        throw new Error("管理者権限が必要です");
      }

      const results = [];
      for (const userId of userIds) {
        try {
          const userRef = doc(db, "users", userId);
          await updateDoc(userRef, {
            status: "active",
            user_role: defaultRole,
            approvedBy: currentSession.user_id,
            approvedAt: serverTimestamp(),
          });
          results.push({ userId, success: true });
        } catch (error) {
          results.push({ userId, success: false, error: error.message });
        }
      }

      console.log("一括承認完了:", results);
      return { success: true, results };
    } catch (error) {
      console.error("一括承認エラー:", error);
      return { success: false, error: error.message };
    }
  }

  // 招待コード別一括承認（同じ招待コードのユーザーを一括承認）
  static async approveByInviteCode(inviteCode, targetRole = null) {
    try {
      const pendingQuery = query(
        collection(db, "users"),
        where("status", "==", "pending"),
        where("inviteCode", "==", inviteCode)
      );
      const snapshot = await getDocs(pendingQuery);

      if (snapshot.empty) {
        return {
          success: true,
          message: "該当する承認待ちユーザーがありません",
        };
      }

      const userIds = snapshot.docs.map((doc) => doc.id);
      const defaultRole =
        targetRole || this.getDefaultRoleFromInviteCode(inviteCode);

      const result = await this.bulkApproveUsers(userIds, defaultRole);

      console.log(`招待コード「${inviteCode}」での一括承認完了:`, result);
      return result;
    } catch (error) {
      console.error("招待コード別一括承認エラー:", error);
      return { success: false, error: error.message };
    }
  }

  // 自動承認設定（特定の条件で自動承認を有効化）
  static async enableAutoApprovalForInviteCode(
    inviteCode,
    targetRole,
    expiryHours = 24
  ) {
    try {
      const autoApprovalRef = collection(db, "auto_approvals");
      await addDoc(autoApprovalRef, {
        inviteCode: inviteCode,
        targetRole: targetRole,
        enabled: true,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
        createdBy: this.getSession()?.user_id,
      });

      console.log(`招待コード「${inviteCode}」の自動承認を有効化しました`);
      return { success: true };
    } catch (error) {
      console.error("自動承認設定エラー:", error);
      return { success: false, error: error.message };
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
  // リダイレクトフラグをリセット
  window.isRedirecting = false;

  console.log("DOMContentLoaded: ページロード時の認証チェック開始");

  // 公開ページ以外では認証チェック
  const currentPage = window.location.pathname.split("/").pop() || "admin.html";
  console.log("現在のページ:", currentPage);

  // ログイン画面では一切の認証チェックを行わない
  if (currentPage === "login.html" || currentPage === "index.html") {
    console.log("ログイン画面のため認証チェックをスキップします");
    return;
  }

  // 保護されたページでのみ認証チェックを実行
  if (currentPage !== "login.html" && currentPage !== "index.html") {
    // より長い遅延で初期化完了を確実に待つ
    setTimeout(async () => {
      console.log("DOMContentLoadedからのページアクセスチェック実行");
      await UserSession.checkPageAccess(); // await追加
    }, 2000); // 2秒遅延で確実に初期化完了を待つ
  }
});

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
