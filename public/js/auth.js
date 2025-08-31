// auth.js（セッション廃止版）
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
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyCWFL91baSHkjkvU_k-yTUv6QS191YTFlg",
  authDomain: "qrscan2-99ffd.firebaseapp.com",
  projectId: "qrscan2-99ffd",
  storageBucket: "qrscan2-99ffd.firebasestorage.app",
  messagingSenderId: "1089215781575",
  appId: "1:1089215781575:web:bf9d05f6930b7123813ce2",
  measurementId: "G-QZZWT3HW0W",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  STAFF: "staff",
  MAKER: "maker",
  SCANNER: "scanner",
  GUEST: "guest",
};
export const PAGE_PERMISSIONS = {
  "admin.html": [USER_ROLES.ADMIN],
  "staff.html": [USER_ROLES.STAFF],
  "maker.html": [USER_ROLES.MAKER],
  "user.html": [USER_ROLES.USER, USER_ROLES.STAFF, USER_ROLES.MAKER],
  "login.html": [],
  "index.html": [],
};

export class AuthManager {
  // Firestore からユーザー情報取得
  static async fetchUser(userId) {
    try {
      const usersQuery = query(
        collection(db, "users"),
        where("user_id", "==", userId)
      );
      const snapshot = await getDocs(usersQuery);
      if (snapshot.empty) return null;

      const userData = snapshot.docs[0].data();
      // role 正規化（user_role を優先）
      const role =
        userData.user_role?.trim() || userData.role?.trim() || "user";

      return { ...userData, role };
    } catch (e) {
      console.error("fetchUser error:", e);
      return null;
    }
  }

  // ページアクセス権確認
  static async checkAccess(user) {
    const currentPage = window.location.pathname.split("/").pop();
    const allowedRoles = PAGE_PERMISSIONS[currentPage] || [];
    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      console.warn(`[Access denied] ${user.user_name} (${user.role})`);
      window.location.href = this.getRedirectUrl(user.role);
      return false;
    }
    console.log(`[Access granted] ${user.user_name} (${user.role})`);
    return true;
  }

  static getRedirectUrl(role) {
    alert("stop");
    switch (role) {
      case USER_ROLES.ADMIN:
        return "admin.html";
      case USER_ROLES.USER:
        return "user.html";
      case USER_ROLES.STAFF:
        return "staff.html";
      case USER_ROLES.MAKER:
        return "maker.html";
      default:
        return "login.html";
    }
  }

  // ログアウト
  static async logout() {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("SignOut error:", e);
    }
    window.location.href = "login.html";
  }

  // 認証状態監視
  static watchAuth(callback) {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log("Firebase user:", firebaseUser.uid);
        const user = await this.fetchUser(firebaseUser.uid);
        callback(user);
      } else {
        console.log("未ログイン状態");
        callback(null);
      }
    });
  }
}

// デバッグ用ボタン
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.createElement("button");
  btn.textContent = "デバッグ: ユーザー情報取得";
  btn.style.position = "fixed";
  btn.style.bottom = "10px";
  btn.style.right = "10px";
  btn.style.zIndex = 9999;
  btn.onclick = async () => {
    const userId = new URLSearchParams(window.location.search).get("user_id");
    const user = await AuthManager.fetchUser(userId);
    console.log("[DEBUG] fetchUser result:", user);
    alert(JSON.stringify(user, null, 2));
  };
  document.body.appendChild(btn);
});
