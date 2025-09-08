// admin-settings.js - 管理者設定の保存・読み込み機能

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { generateRandomKey, generateQRToken } from './crypto-utils.js';

// Firebase設定は既存のものを使用（auth.jsから取得）
let db, auth;

// Firebase初期化待ち
window.addEventListener('load', async () => {
    // auth.jsからFirebaseインスタンスを取得
    if (window.firebaseApp) {
        db = getFirestore(window.firebaseApp);
        auth = getAuth(window.firebaseApp);
    } else {
        // フォールバック: 直接初期化
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
    }
});

/**
 * 管理者設定をFirestoreに保存
 * @param {Object} settings - 保存する設定オブジェクト
 */
window.saveAdminSettings = async function (settings) {
    try {
        console.log('設定保存開始:', settings);

        if (!auth.currentUser) {
            throw new Error('ユーザーがログインしていません');
        }

        const adminId = auth.currentUser.uid;

        // admin_settingsコレクションに保存
        const settingsRef = doc(db, 'admin_settings', adminId);

        // 既存設定を確認
        const existingDoc = await getDoc(settingsRef);
        let encryptionKey = null;

        if (existingDoc.exists()) {
            encryptionKey = existingDoc.data().qrEncryptionKey;
        }

        // 暗号化キーが存在しない場合は新規生成
        if (!encryptionKey) {
            encryptionKey = generateRandomKey(32);
            console.log('QRコード暗号化キーを新規生成しました');
        }

        const settingsData = {
            ...settings,
            qrEncryptionKey: encryptionKey, // QRコード用暗号化キー
            updated_at: serverTimestamp(),
            updated_by: adminId
        };

        await setDoc(settingsRef, settingsData, { merge: true });

        console.log('設定保存完了:', {
            ...settingsData,
            qrEncryptionKey: '[HIDDEN]' // ログには暗号化キーを表示しない
        });

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

        if (!auth.currentUser) {
            console.warn('ユーザーがログインしていません。デフォルト設定を使用します。');
            setDefaultSettings();
            return;
        }

        const adminId = auth.currentUser.uid;
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
        staffNotification: 'lineworks',
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
}/**
 * 特定の設定値を取得
 * @param {string} settingName - 設定名
 * @returns {Promise<string>} 設定値
 */
window.getAdminSetting = async function (settingName) {
    try {
        if (!auth.currentUser) {
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
        if (!auth.currentUser) {
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

/**
 * QRコード用固定暗号化トークンを生成
 * @param {string} eventId - イベントID
 * @returns {Promise<string>} - 暗号化トークン（固定）
 */
window.generateQRCodeToken = async function (eventId) {
    try {
        if (!auth.currentUser) {
            throw new Error('ユーザーがログインしていません');
        }

        const adminId = auth.currentUser.uid;
        const settingsRef = doc(db, 'admin_settings', adminId);
        const settingsDoc = await getDoc(settingsRef);

        if (!settingsDoc.exists()) {
            throw new Error('管理者設定が見つかりません');
        }

        const settings = settingsDoc.data();
        const encryptionKey = settings.qrEncryptionKey;
        if (!encryptionKey) {
            throw new Error('暗号化キーが設定されていません');
        }

        // 固定トークンを生成
        const token = generateQRToken(adminId, eventId, encryptionKey);

        // 生成したトークンを admin_settings に保存（再利用のため）
        const tokenCacheKey = `qrToken_${eventId}`;
        await setDoc(settingsRef, {
            [tokenCacheKey]: {
                token: token,
                adminId: adminId,
                eventId: eventId,
                created_at: serverTimestamp(),
                isFixed: true // 固定トークンフラグ
            }
        }, { merge: true });

        console.log('固定QRコードトークン生成・保存完了:', { eventId, token: token.substring(0, 10) + '...' });

        return token;
    } catch (error) {
        console.error('QRコードトークン生成エラー:', error);
        throw error;
    }
};

/**
 * 保存済み固定QRトークンを取得
 * @param {string} eventId - イベントID
 * @returns {Promise<string|null>} - 保存済みトークン（存在しない場合はnull）
 */
window.getStoredQRToken = async function (eventId) {
    try {
        if (!auth.currentUser) {
            throw new Error('ユーザーがログインしていません');
        }

        const adminId = auth.currentUser.uid;
        const settingsRef = doc(db, 'admin_settings', adminId);
        const settingsDoc = await getDoc(settingsRef);

        if (!settingsDoc.exists()) {
            return null;
        }

        const settings = settingsDoc.data();
        const tokenCacheKey = `qrToken_${eventId}`;
        const tokenData = settings[tokenCacheKey];

        if (tokenData && tokenData.token && tokenData.isFixed) {
            console.log('保存済み固定トークンを取得:', { eventId, found: true });
            return tokenData.token;
        }

        return null;
    } catch (error) {
        console.error('保存済みトークン取得エラー:', error);
        return null;
    }
};

/**
 * 固定QRトークンを取得または生成
 * @param {string} eventId - イベントID
 * @returns {Promise<string>} - 固定暗号化トークン
 */
window.getOrCreateFixedQRToken = async function (eventId) {
    try {
        // まず保存済みトークンを確認
        let token = await window.getStoredQRToken(eventId);

        if (token) {
            console.log('既存の固定トークンを使用');
            return token;
        }

        // 存在しない場合は新規生成
        console.log('新規固定トークンを生成');
        token = await window.generateQRCodeToken(eventId);

        return token;
    } catch (error) {
        console.error('固定QRトークン取得/生成エラー:', error);
        throw error;
    }
};
window.getQREncryptionKey = async function (adminId = null) {
    try {
        const targetAdminId = adminId || auth.currentUser?.uid;
        if (!targetAdminId) {
            throw new Error('管理者IDが指定されていません');
        }

        const settingsRef = doc(db, 'admin_settings', targetAdminId);
        const settingsDoc = await getDoc(settingsRef);

        if (!settingsDoc.exists()) {
            throw new Error('管理者設定が見つかりません');
        }

        const encryptionKey = settingsDoc.data().qrEncryptionKey;
        if (!encryptionKey) {
            throw new Error('暗号化キーが設定されていません');
        }

        return encryptionKey;
    } catch (error) {
        console.error('暗号化キー取得エラー:', error);
        throw error;
    }
};

/**
 * 暗号化キーを再生成
 * @returns {Promise<string>} - 新しい暗号化キー
 */
window.regenerateQREncryptionKey = async function () {
    try {
        if (!auth.currentUser) {
            throw new Error('ユーザーがログインしていません');
        }

        if (!confirm('暗号化キーを再生成しますか？\n既存のQRコードはすべて無効になります。')) {
            return null;
        }

        const adminId = auth.currentUser.uid;
        const newKey = generateRandomKey(32);

        const settingsRef = doc(db, 'admin_settings', adminId);
        await updateDoc(settingsRef, {
            qrEncryptionKey: newKey,
            updated_at: serverTimestamp(),
            updated_by: adminId
        });

        console.log('暗号化キーを再生成しました');
        alert('暗号化キーを再生成しました。\n新しいQRコードを生成してください。');

        return newKey;
    } catch (error) {
        console.error('暗号化キー再生成エラー:', error);
        alert(`暗号化キーの再生成に失敗しました: ${error.message}`);
        throw error;
    }
};

console.log('admin-settings.js loaded');
