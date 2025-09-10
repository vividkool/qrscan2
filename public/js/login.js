import {
  getAuth,
  signInWithCustomToken,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

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
const db = getFirestore(app);

// QRコード認証専用 - DOM要素は不要

function showError(msg) {
  console.error("QRコード認証エラー:", msg);
  // HTMLページのエラー表示領域があれば使用
  const messageArea = document.getElementById("messageArea");
  if (messageArea) {
    messageArea.innerHTML = `<div class="error-message">${msg}</div>`;
  }
}

function showSuccess(msg) {
  console.log("QRコード認証成功:", msg);
  // HTMLページの成功表示領域があれば使用
  const messageArea = document.getElementById("messageArea");
  if (messageArea) {
    messageArea.innerHTML = `<div class="success-message">${msg}</div>`;
  }
}

function toggleLoading(show, text = "処理中...") {
  const loadingArea = document.getElementById("loadingArea");
  const statusMessage = document.getElementById("statusMessage");

  if (loadingArea) {
    loadingArea.style.display = show ? "block" : "none";
  }
  if (statusMessage) {
    statusMessage.textContent = text;
  }
  console.log("QRコード認証状態:", show ? text : "処理完了");
}

// Firestoreからユーザーデータを取得する関数
async function getUserDataFromFirestore(userId, adminId, eventId) {
  // 1. 元の構造でテスト
  console.log("Firestoreパス確認 - 元の構造でテスト");
  const userRef = doc(db, `admin_collections/${adminId}/users/${userId}`);
  console.log("Firestoreパス:", `admin_collections/${adminId}/users/${userId}`);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // 2. 新しい構造でテスト
    console.log("元の構造で見つからない、新しい構造でテスト");
    const userRefNew = doc(
      db,
      `admin_collections/${adminId}/${eventId}_users/${userId}`
    );
    console.log(
      "新しいFirestoreパス:",
      `admin_collections/${adminId}/${eventId}_users/${userId}`
    );
    const userSnapNew = await getDoc(userRefNew);

    if (!userSnapNew.exists()) {
      throw new Error(
        `ユーザーが見つかりません。確認したパス:\n1. admin_collections/${adminId}/users/${userId}\n2. admin_collections/${adminId}/${eventId}_users/${userId}`
      );
    }

    // 新しい構造でユーザーが見つかった場合
    const userDataNew = userSnapNew.data();
    console.log("新しい構造でQRコードユーザーデータ取得:", userDataNew);
    return { userData: userDataNew, isNewStructure: true };
  }

  // 元の構造でユーザーが見つかった場合
  const userDataOld = userSnap.data();
  console.log("元の構造でQRコードユーザーデータ取得:", userDataOld);
  return { userData: userDataOld, isNewStructure: false };
}

// QRコード認証処理
async function performQRCodeAuth(userId, adminId, eventId) {
  toggleLoading(true, "QRコード認証中...");

  try {
    console.log("QRコード認証開始:", { userId, adminId, eventId });

    // Firestoreからユーザーデータを取得
    const { userData, isNewStructure } = await getUserDataFromFirestore(
      userId,
      adminId,
      eventId
    );

    // 2. カスタムトークン生成とFirebase Auth認証
    const response = await fetch(
      "https://createcustomtoken-ijui6cxhzq-an.a.run.app",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          adminId: adminId,
          role: userData.role || "user",
        }),
      }
    );

    if (!response.ok) {
      throw new Error("認証トークンの生成に失敗しました");
    }

    const tokenData = await response.json();

    if (!tokenData.success || !tokenData.customToken) {
      throw new Error(tokenData.error || "カスタムトークン取得失敗");
    }

    const customToken = tokenData.customToken;

    // Firebase Auth認証
    const userCredential = await signInWithCustomToken(getAuth(), customToken);
    console.log("QRコードFirebase認証完了:", userCredential.user.uid);

    // 認証成功後、Firestoreにユーザー情報を保存
    const currentUser = getAuth().currentUser;
    if (currentUser) {
      // 構造に応じて保存先を決定
      const saveRef = isNewStructure
        ? doc(
            db,
            `admin_collections/${adminId}/${eventId}_users/${currentUser.uid}`
          )
        : doc(db, `admin_collections/${adminId}/users/${currentUser.uid}`);

      console.log(
        "Firestore保存先:",
        isNewStructure
          ? `admin_collections/${adminId}/${eventId}_users/${currentUser.uid}`
          : `admin_collections/${adminId}/users/${currentUser.uid}`
      );

      await setDoc(
        saveRef,
        {
          admin_id: adminId,
          user_id: userData.user_id || userId,
          user_name: userData.user_name || userData.user_id || userId,
          role: userData.role || "user",
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      console.log("QRコードユーザー情報Firestore保存完了");
    }

    // 3. ロール判定とリダイレクト
    const userRole = userData.role || "user";
    console.log("QRコードユーザーロール:", userRole);

    showSuccess("認証成功！ページをリダイレクトしています...");

    // ロールに応じたページリダイレクト
    setTimeout(() => {
      switch (userRole) {
        case "user":
          window.location.href = "user.html";
          break;
        case "staff":
          window.location.href = "staff.html";
          break;
        case "maker":
          window.location.href = "maker.html";
          break;
        case "admin":
          window.location.href = "admin.html";
          break;
        default:
          window.location.href = "user.html";
      }
    }, 1000);
  } catch (error) {
    console.error("QRコード認証エラー:", error);
    showError("QRコード認証に失敗しました: " + error.message);
  } finally {
    toggleLoading(false);
  }
}

// DOMContentLoaded後の初期化処理（QRコード認証専用）
document.addEventListener("DOMContentLoaded", async function () {
  console.log("QRコード認証専用 login.js 初期化");

  // QRコードパラメータチェック
  const urlParams = new URLSearchParams(window.location.search);
  const qrUserId = urlParams.get("user_id");
  const qrAdminId = urlParams.get("admin_id");
  const qrEventId = urlParams.get("event_id");

  console.log("URLパラメータ確認:", { qrUserId, qrAdminId, qrEventId });

  // QRコードからのアクセス判定
  if (qrUserId && qrAdminId && qrEventId) {
    console.log("QRコードからのアクセス検出:", {
      qrUserId,
      qrAdminId,
      qrEventId,
    });

    // URLパラメータをクリーンアップ
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);

    // QRコード専用認証処理を実行
    await performQRCodeAuth(qrUserId, qrAdminId, qrEventId);
    return;
  } else {
    // QRコードパラメータがない場合はindex.htmlにリダイレクト
    console.log(
      "QRコードパラメータがありません。index.htmlにリダイレクトします"
    );
    window.location.href = "index.html";
  }
});
