// Firebase設定共通ファイル - すべてのJSファイルで使用
import {
    initializeApp,
    getApps,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getAuth,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase設定（統一）
export const firebaseConfig = {
    apiKey: "AIzaSyCWFL91baSHkjkvU_k-yTUv6QS191YTFlg",
    authDomain: "qrscan2-99ffd.firebaseapp.com",
    projectId: "qrscan2-99ffd",
    storageBucket: "qrscan2-99ffd.firebasestorage.app",
    messagingSenderId: "1089215781575",
    appId: "1:1089215781575:web:bf9d05f6930b7123813ce2",
    measurementId: "G-QZZWT3HW0W",
};

// Firebase初期化（重複防止）
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Firebase サービスインスタンス
export const db = getFirestore(app);
export const auth = getAuth(app);

// プロジェクト情報
export const PROJECT_ID = "qrscan2-99ffd";

// API エンドポイント
export const API_ENDPOINTS = {
    CREATE_CUSTOM_TOKEN: "https://createcustomtoken-ijui6cxhzq-an.a.run.app",
    SEND_NOTIFICATION: "https://sendunifiednotification-ijui6cxhzq-an.a.run.app",
};

// コレクションパス生成ヘルパー
export const getCollectionPath = {
    adminSettings: () => "admin_settings",
    users: (adminId, eventId) => `admin_collections/${adminId}/${eventId}_users`,
    adminCollections: (adminId) => `admin_collections/${adminId}`,
};

// URL パラメータヘルパー
export const getUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        admin_id: urlParams.get("admin_id"),
        event_id: urlParams.get("event_id"),
        user_id: urlParams.get("user_id"),
        uid: urlParams.get("uid"),
    };
};

// エラーハンドリング統一
export const handleFirebaseError = (error, context = "") => {
    console.error(`Firebase Error ${context}:`, error);

    const errorMessages = {
        "permission-denied": "アクセス権限がありません",
        "not-found": "データが見つかりません",
        "network-request-failed": "ネットワークエラーが発生しました",
        "invalid-argument": "無効なパラメータです",
    };

    const userMessage = errorMessages[error.code] || `エラーが発生しました: ${error.message}`;

    return {
        code: error.code,
        message: error.message,
        userMessage: userMessage,
        context: context
    };
};

console.log("✅ Firebase共通設定が読み込まれました");
