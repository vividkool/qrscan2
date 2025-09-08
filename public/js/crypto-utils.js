// 暗号化ユーティリティ（QRコード用セキュリティ強化）

/**
 * シンプルなBase64エンコード（URL安全版）
 * @param {string} str - エンコードする文字列
 * @returns {string} - URL安全なBase64文字列
 */
function encodeBase64URL(str) {
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * シンプルなBase64デコード（URL安全版）
 * @param {string} str - デコードするBase64文字列
 * @returns {string} - デコードされた文字列
 */
function decodeBase64URL(str) {
    // パディングを復元
    while (str.length % 4) {
        str += '=';
    }

    // URL安全文字を標準Base64に戻す
    str = str.replace(/-/g, '+').replace(/_/g, '/');

    try {
        return atob(str);
    } catch (error) {
        throw new Error('Invalid token format');
    }
}

/**
 * XOR暗号化（シンプルで軽量）
 * @param {string} text - 暗号化する文字列
 * @param {string} key - 暗号化キー
 * @returns {string} - 暗号化された文字列（16進数）
 */
function xorEncrypt(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const textChar = text.charCodeAt(i);
        const keyChar = key.charCodeAt(i % key.length);
        const encrypted = textChar ^ keyChar;
        result += encrypted.toString(16).padStart(2, '0');
    }
    return result;
}

/**
 * XOR復号化
 * @param {string} encryptedHex - 暗号化された16進数文字列
 * @param {string} key - 復号化キー
 * @returns {string} - 復号化された文字列
 */
function xorDecrypt(encryptedHex, key) {
    let result = '';
    for (let i = 0; i < encryptedHex.length; i += 2) {
        const encryptedChar = parseInt(encryptedHex.substr(i, 2), 16);
        const keyChar = key.charCodeAt((i / 2) % key.length);
        const decrypted = encryptedChar ^ keyChar;
        result += String.fromCharCode(decrypted);
    }
    return result;
}

/**
 * ランダムキー生成
 * @param {number} length - キーの長さ
 * @returns {string} - ランダムキー
 */
function generateRandomKey(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * admin_id + event_id を暗号化して固定トークン生成（タイムスタンプなし）
 * @param {string} adminId - 管理者ID
 * @param {string} eventId - イベントID
 * @param {string} encryptionKey - 暗号化キー
 * @returns {string} - 暗号化トークン（固定）
 */
export function generateQRToken(adminId, eventId, encryptionKey) {
    // タイムスタンプを削除して固定トークンを生成
    const data = `${adminId}|${eventId}`;
    const encrypted = xorEncrypt(data, encryptionKey);
    return encodeBase64URL(encrypted);
}

/**
 * admin_id + event_id + 固定識別子を暗号化して固定トークン生成（バリエーション版）
 * @param {string} adminId - 管理者ID
 * @param {string} eventId - イベントID
 * @param {string} encryptionKey - 暗号化キー
 * @param {string} identifier - 固定識別子（省略可能、デフォルト: "QRCODE"）
 * @returns {string} - 暗号化トークン（固定）
 */
export function generateFixedQRToken(adminId, eventId, encryptionKey, identifier = "QRCODE") {
    // 固定識別子を追加してより安全な固定トークンを生成
    const data = `${adminId}|${eventId}|${identifier}`;
    const encrypted = xorEncrypt(data, encryptionKey);
    return encodeBase64URL(encrypted);
}

/**
 * トークンを復号化してadmin_id、event_idを取得（固定トークン対応）
 * @param {string} token - 暗号化トークン
 * @param {string} encryptionKey - 復号化キー
 * @returns {Object} - {adminId, eventId, identifier?}
 */
export function decodeQRToken(token, encryptionKey) {
    try {
        const encrypted = decodeBase64URL(token);
        const decrypted = xorDecrypt(encrypted, encryptionKey);
        const parts = decrypted.split('|');

        if (parts.length < 2) {
            throw new Error('Invalid token data');
        }

        const [adminId, eventId, identifier] = parts;

        if (!adminId || !eventId) {
            throw new Error('Missing required token data');
        }

        const result = {
            adminId,
            eventId
        };

        // 固定識別子が含まれている場合
        if (identifier) {
            result.identifier = identifier;
        }

        return result;
    } catch (error) {
        throw new Error(`Token decode failed: ${error.message}`);
    }
}

/**
 * トークンの有効性チェック（固定トークンの場合は常にtrue）
 * @param {Object} decodedData - 復号化されたトークンデータ
 * @returns {boolean} - 有効かどうか（固定トークンの場合は常にtrue）
 */
export function isTokenValid(decodedData) {
    // 固定トークンの場合、必要なデータが存在すれば有効とする
    return decodedData && decodedData.adminId && decodedData.eventId;
}

/**
 * QRコード用URL生成
 * @param {string} baseUrl - ベースURL（例: "https://example.com/users.html"）
 * @param {string} token - 暗号化トークン
 * @param {string} documentId - ドキュメントID
 * @returns {string} - 完全なQRコードURL
 */
export function generateQRCodeURL(baseUrl, token, documentId) {
    const url = new URL(baseUrl);
    url.searchParams.set('token', token);
    url.searchParams.set('id', documentId);
    return url.toString();
}

/**
 * URLからトークンとドキュメントIDを抽出
 * @param {string} url - 現在のページURL
 * @returns {Object} - {token, documentId}
 */
export function parseQRCodeURL(url = window.location.href) {
    const urlObj = new URL(url);
    return {
        token: urlObj.searchParams.get('token'),
        documentId: urlObj.searchParams.get('id')
    };
}

// ランダムキー生成機能をエクスポート
export { generateRandomKey };

console.log('crypto-utils.js loaded');
