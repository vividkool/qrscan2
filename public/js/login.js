import {
  signInWithCustomToken,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase共通設定を使用
import {
  app,
  db,
  auth,
  API_ENDPOINTS,
  getCollectionPath,
  getUrlParams,
  handleFirebaseError,
} from "./firebase-config.js";

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

// Firestoreからユーザーデータを取得する関数（改善版）
async function getUserDataFromFirestore(userId, adminId, eventId) {
  console.log("Firestoreからユーザーデータ取得開始");
  console.log("- adminId:", adminId);
  console.log("- eventId:", eventId);
  console.log("- userId:", userId);

  try {
    // 共通ヘルパーを使用してコレクションパスを生成
    const collectionPath = getCollectionPath.users(adminId, eventId);
    console.log("Firestoreコレクションパス:", collectionPath);

    const usersCollection = collection(db, collectionPath);
    const userQuery = query(usersCollection, where("user_id", "==", userId));
    const userSnapshot = await getDocs(userQuery);

    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data();
      console.log("✅ ユーザーデータ取得成功:", userData);
      return { userData, isNewStructure: true };
    } else {
      console.log("❌ ユーザーが見つかりません");
      console.log("検索条件:");
      console.log("- コレクション:", collectionPath);
      console.log("- user_id:", userId);

      // デバッグ用: コレクション内の全ドキュメントを確認
      try {
        const allDocsSnapshot = await getDocs(usersCollection);
        console.log("コレクション内の全ドキュメント数:", allDocsSnapshot.size);
        allDocsSnapshot.forEach((docSnap, index) => {
          const data = docSnap.data();
          console.log(`ドキュメント${index + 1}:`, {
            docId: docSnap.id,
            user_id: data.user_id,
            user_name: data.user_name || data.company_name
          });
        });
      } catch (debugError) {
        console.log("デバッグ用コレクション確認エラー:", debugError);
      }

      throw new Error(`ユーザーが見つかりません。\nコレクション: ${collectionPath}\nuser_id: ${userId}`);
    }
  } catch (error) {
    const firebaseError = handleFirebaseError(error, "ユーザーデータ取得");
    console.error("Firestoreアクセスエラー:", firebaseError);
    throw new Error(firebaseError.userMessage);
  }
}// QRコード認証処理
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

    // 2. カスタムトークン生成とFirebase Auth認証（共通API使用）
    const response = await fetch(
      API_ENDPOINTS.CREATE_CUSTOM_TOKEN,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          adminId: adminId,
          eventId: eventId,
          role: userData.role || "user",
          user_name: userData.user_name,
          company_name: userData.company_name,
          user_role: userData.user_role,
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

    // Firebase Auth認証（共通auth使用）
    const userCredential = await signInWithCustomToken(auth, customToken);
    console.log("QRコードFirebase認証完了:", userCredential.user.uid);

    // 認証成功後、Firestoreにユーザー情報を保存
    const currentUser = auth.currentUser;
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

  try {
    // URLパラメータを統一ヘルパーで取得
    const urlParams = getUrlParams();
    console.log("URLパラメータ確認:", urlParams);

    // 必須パラメータの検証
    const { admin_id, event_id, user_id } = urlParams;

    if (!admin_id || !event_id || !user_id) {
      const missingParams = [];
      if (!admin_id) missingParams.push("admin_id");
      if (!event_id) missingParams.push("event_id");
      if (!user_id) missingParams.push("user_id");

      console.log(`必須パラメータが不足しています: ${missingParams.join(", ")}`);
      console.log("index.htmlにリダイレクトします");
      window.location.href = "index.html";
      return;
    }

    console.log("QRコードからのアクセス検出:", { admin_id, event_id, user_id });

    // URLパラメータをクリーンアップ
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);

    // QRコード認証実行
    await performQRCodeAuth(user_id, admin_id, event_id);
  } catch (error) {
    console.error("初期化エラー:", error);
    showError(`初期化に失敗しました: ${error.message}`);
  }
});
