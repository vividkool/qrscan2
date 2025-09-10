// admin-settings.js - 管理者設定の保存・読み込み機能

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Firebase設定は既存のものを使用（auth.jsから取得）
let db, auth;

/**
 * Firebase初期化を安全に実行
 */
function initializeFirebaseSafely() {
    console.log('Firebase インスタンス確認:', {
        'window.firebaseApp': !!window.firebaseApp,
        'window.auth': !!window.auth,
        'window.db': !!window.db,
        'getApps().length': getApps().length
    });

    // まず既存のアプリからインスタンスを取得を試行
    if (window.firebaseApp) {
        db = getFirestore(window.firebaseApp);
        auth = getAuth(window.firebaseApp);
        console.log('Firebase インスタンスを window.firebaseApp から取得');
        return;
    }

    // グローバル変数から取得を試行
    if (window.auth && window.db) {
        auth = window.auth;
        db = window.db;
        console.log('Firebase インスタンスをグローバル変数から取得');
        return;
    }

    // 既存のアプリを確認
    const existingApps = getApps();
    if (existingApps.length > 0) {
        const app = existingApps[0];
        db = getFirestore(app);
        auth = getAuth(app);
        console.log('既存のFirebaseアプリを使用:', app.name);
        return;
    }

    // 最終手段: 新しいアプリを初期化
    console.log('新しいFirebaseアプリを初期化します');
    const firebaseConfig = {
        apiKey: "AIzaSyDh1B7fDVs5FdFzE2nnGQKQNzFGvGkYMQE",
        authDomain: "qrscan2-99ffd.firebaseapp.com",
        projectId: "qrscan2-99ffd",
        storageBucket: "qrscan2-99ffd.appspot.com",
        messagingSenderId: "1089215781575",
        appId: "1:1089215781575:web:35cab4f6dc9a9b70dda70e"
    };
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('新しいFirebaseアプリの初期化完了');
}

// Firebase初期化待ち
window.addEventListener('load', initializeFirebaseSafely);

/**
 * 管理者設定をFirestoreに保存
 * @param {Object} settings - 保存する設定オブジェクト
 */
window.saveAdminSettings = async function (settings) {
    try {
        console.log('設定保存開始:', settings);

        // Firebase初期化を確認
        if (!auth || !db) {
            initializeFirebaseSafely();
        }

        // 認証状態を待機（最大3秒）
        let currentUser = auth.currentUser;
        let waitCount = 0;
        while (!currentUser && waitCount < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            currentUser = auth.currentUser;
            waitCount++;
        }

        if (!currentUser) {
            throw new Error('ユーザーがログインしていません');
        }

        const adminId = currentUser.uid;

        // admin_settingsコレクションに保存
        const settingsRef = doc(db, 'admin_settings', adminId);

        const settingsData = {
            ...settings,
            updated_at: serverTimestamp(),
            updated_by: adminId
        };

        await setDoc(settingsRef, settingsData, { merge: true });

        console.log('設定保存完了:', settingsData);

        // 成功メッセージを表示
        showSettingSaveSuccess(settings);

        // モーダルを閉じる
        closeDetailSettingsModal();

    } catch (error) {
        console.error('設定保存エラー:', error);
        alert(`設定の保存に失敗しました: ${error.message}`);
    }
};

/**
 * 管理者設定をFirestoreから読み込み
 */
window.loadAdminSettings = async function () {
    try {
        console.log('設定読み込み開始');

        // Firebase初期化を確認
        if (!auth || !db) {
            initializeFirebaseSafely();
        }

        // 認証状態を待機（最大3秒）
        let currentUser = auth.currentUser;
        let waitCount = 0;
        while (!currentUser && waitCount < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            currentUser = auth.currentUser;
            waitCount++;
        }

        if (!currentUser) {
            console.warn('認証状態の確認に失敗しました。デフォルト設定を使用します。');
            setDefaultSettings();
            return;
        }

        console.log('認証済みユーザー:', currentUser.uid);
        const adminId = currentUser.uid;
        const settingsRef = doc(db, 'admin_settings', adminId);
        const settingsDoc = await getDoc(settingsRef);

        let settings;

        if (settingsDoc.exists()) {
            settings = settingsDoc.data();
            console.log('Firestoreから設定を読み込み:', settings);
        } else {
            console.log('設定が見つかりません。デフォルト設定を使用します。');
            settings = getDefaultSettings();
        }

        // ラジオボタンに値を設定
        applySettingsToUI(settings);

    } catch (error) {
        console.error('設定読み込みエラー:', error);
        console.log('エラーのためデフォルト設定を使用します。');
        setDefaultSettings();
    }
};

/**
 * デフォルト設定値を取得
 */
function getDefaultSettings() {
    return {
        nametagTiming: 'onLogin',
        scanDataPrint: 'enabled',
        staffNotification: 'cmail',
        nametagSize: 'a6'
    };
}

/**
 * デフォルト設定をUIに適用
 */
function setDefaultSettings() {
    const defaultSettings = getDefaultSettings();
    applySettingsToUI(defaultSettings);
}

/**
 * 設定をUIのラジオボタンに適用
 * @param {Object} settings - 適用する設定
 */
function applySettingsToUI(settings) {
    Object.keys(settings).forEach(settingName => {
        const value = settings[settingName];
        const radioButton = document.querySelector(`input[name="${settingName}"][value="${value}"]`);
        if (radioButton) {
            radioButton.checked = true;
            console.log(`設定適用: ${settingName} = ${value}`);
        } else {
            console.warn(`ラジオボタンが見つかりません: ${settingName}[${value}]`);
        }
    });

    // LINEWORKS設定を適用
    if (settings.lineworksSettings) {
        const lineworksSettings = settings.lineworksSettings;

        const apiIdField = document.getElementById('lineworksApiId');
        const accessTokenField = document.getElementById('lineworksAccessToken');
        const botTokenField = document.getElementById('lineworksBotToken');
        const channelIdField = document.getElementById('lineworksChannelId');

        if (apiIdField) apiIdField.value = lineworksSettings.apiId || '';
        if (accessTokenField) accessTokenField.value = lineworksSettings.accessToken || '';
        if (botTokenField) botTokenField.value = lineworksSettings.botToken || '';
        if (channelIdField) channelIdField.value = lineworksSettings.channelId || '';

        console.log('LINEWORKS設定を適用しました');
    }

    // LINEWORKS設定の表示/非表示を制御
    if (window.toggleLineworksSettings) {
        window.toggleLineworksSettings();
    }
}

/**
 * 設定保存成功メッセージを表示
 * @param {Object} settings - 保存された設定
 */
function showSettingSaveSuccess(settings) {
    const staffNotificationJP = settings.staffNotification === 'lineworks' ? 'LINEWORKS' : 'メール';
    const nametagTimingJP = settings.nametagTiming === 'onLogin' ? 'ログイン時' : '事前発行';
    const scanDataPrintJP = settings.scanDataPrint === 'enabled' ? '印刷する' : '印刷しない';
    const nametagSizeJP = settings.nametagSize === 'a6' ? 'A6サイズ' : 'A4サイズ';

    let message = `設定が保存されました！\n\n` +
        `🏷️ 名札印刷タイミング: ${nametagTimingJP}\n` +
        `📄 スキャンデータ控え: ${scanDataPrintJP}\n` +
        `📢 スタッフ通知方法: ${staffNotificationJP}\n` +
        `📏 名札印刷サイズ: ${nametagSizeJP}`;

    // LINEWORKS設定が含まれている場合
    if (settings.lineworksSettings && settings.staffNotification === 'lineworks') {
        const apiId = settings.lineworksSettings.apiId;
        const channelId = settings.lineworksSettings.channelId;
        message += `\n\n🔧 LINEWORKS設定:\n` +
            `  • テナントID: ${apiId ? apiId.substring(0, 8) + '...' : '未設定'}\n` +
            `  • チャンネルID: ${channelId || '未設定'}`;
    }

    alert(message);
}

/**
 * 特定の設定値を取得
 * @param {string} settingName - 設定名
 * @returns {Promise<string>} 設定値
 */
window.getAdminSetting = async function (settingName) {
    try {
        if (!auth || !auth.currentUser) {
            return getDefaultSettings()[settingName];
        }

        const adminId = auth.currentUser.uid;
        const settingsRef = doc(db, 'admin_settings', adminId);
        const settingsDoc = await getDoc(settingsRef);

        if (settingsDoc.exists()) {
            const settings = settingsDoc.data();

            // 特別な処理：lineworksSettingsの場合は設定オブジェクト全体を返す
            if (settingName === 'lineworksSettings') {
                return settings.lineworksSettings || null;
            }

            return settings[settingName] || getDefaultSettings()[settingName];
        } else {
            return getDefaultSettings()[settingName];
        }
    } catch (error) {
        console.error('設定取得エラー:', error);
        return getDefaultSettings()[settingName];
    }
};

/**
 * スタッフ通知設定のみを更新
 * @param {string} notificationMethod - 'lineworks' または 'cmail'
 */
window.updateStaffNotificationSetting = async function (notificationMethod) {
    try {
        if (!auth || !auth.currentUser) {
            throw new Error('ユーザーがログインしていません');
        }

        const adminId = auth.currentUser.uid;
        const settingsRef = doc(db, 'admin_settings', adminId);

        await updateDoc(settingsRef, {
            staffNotification: notificationMethod,
            updated_at: serverTimestamp(),
            updated_by: adminId
        });

        console.log(`スタッフ通知設定を更新: ${notificationMethod}`);

    } catch (error) {
        console.error('スタッフ通知設定更新エラー:', error);
        throw error;
    }
};

console.log('admin-settings.js loaded');
