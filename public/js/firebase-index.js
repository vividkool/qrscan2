// Firebase Index Page Functions
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage, ref, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyCWFL91baSHkjkvU_k-yTUv6QS191YTFlg",
    authDomain: "qrscan2-99ffd.firebaseapp.com",
    projectId: "qrscan2-99ffd",
    storageBucket: "qrscan2-99ffd.firebasestorage.app",
    messagingSenderId: "1089215781575",
    appId: "1:1089215781575:web:bf9d05f6930b7123813ce2",
    measurementId: "G-QZZWT3HW0W"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ユーティリティ関数
function showResult(elementId, message, type = '') {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `result ${type}`;
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    element.innerHTML = '<div class="loading"></div> 処理中...';
    element.className = 'result';
}

function clearResults(elementId) {
    document.getElementById(elementId).textContent = '';
    document.getElementById(elementId).className = 'result';
}

// Firestore関数
async function addDocument() {
    const documentId = document.getElementById('documentId').value;
    const title = document.getElementById('dataTitle').value;
    const content = document.getElementById('dataContent').value;

    if (!title || !content) {
        showResult('firestoreResult', 'タイトルと内容を入力してください', 'error');
        return;
    }

    try {
        showLoading('firestoreResult');

        const data = {
            title: title,
            content: content,
            timestamp: new Date().toISOString(),
            createdAt: new Date()
        };

        let docRef;
        if (documentId) {
            docRef = doc(db, 'qrscans', documentId);
            await setDoc(docRef, data);
        } else {
            docRef = await addDoc(collection(db, 'qrscans'), data);
        }

        showResult('firestoreResult',
            `ドキュメントが正常に追加されました:\nID: ${docRef.id || documentId}\nタイトル: ${title}\n内容: ${content}`,
            'success');

        // フォームをクリア
        document.getElementById('documentId').value = '';
        document.getElementById('dataTitle').value = '';
        document.getElementById('dataContent').value = '';
    } catch (error) {
        showResult('firestoreResult', `エラー: ${error.message}`, 'error');
    }
}

async function getAllDocuments() {
    try {
        showLoading('firestoreResult');

        const querySnapshot = await getDocs(collection(db, 'qrscans'));
        let result = 'Firestore データ一覧:\n\n';

        if (querySnapshot.empty) {
            result += 'データが見つかりませんでした。';
        } else {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                result += `ID: ${doc.id}\n`;
                result += `タイトル: ${data.title || 'N/A'}\n`;
                result += `内容: ${data.content || 'N/A'}\n`;
                result += `作成日時: ${data.timestamp || 'N/A'}\n`;
                result += '---\n\n';
            });
        }

        showResult('firestoreResult', result, 'success');
    } catch (error) {
        showResult('firestoreResult', `エラー: ${error.message}`, 'error');
    }
}

// Cloud Functions関数
async function callHelloWorld() {
    try {
        showLoading('functionResult');

        const response = await fetch('https://asia-northeast1-qrscan2-99ffd.cloudfunctions.net/helloWorld');
        const text = await response.text();

        showResult('functionResult',
            `Function レスポンス:\nステータス: ${response.status}\n内容: ${text}`,
            'success');
    } catch (error) {
        showResult('functionResult', `エラー: ${error.message}`, 'error');
    }
}

// Firebase Storage からテンプレートファイルをダウンロード
async function downloadItemsTemplateFromStorage() {
    try {
        showLoading('downloadResult');

        const fileRef = ref(storage, 'templates/excel/items_template.xlsx');
        const downloadURL = await getDownloadURL(fileRef);

        // ファイルをダウンロード
        const link = document.createElement('a');
        link.href = downloadURL;
        link.download = 'items_template.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showResult('downloadResult',
            'items_template.xlsx をFirebase Storageからダウンロードしました\n\nアップロード用テンプレートファイルです。\n- 必要な項目: タイトル、内容、カテゴリ、価格、ステータス、作成者\n- データ入力後、このファイルをアップロードしてください',
            'success');
    } catch (error) {
        console.log('Storage download failed, falling back to dynamic generation:', error);
        // フォールバック: 動的生成
        await downloadItemsTemplate();
    }
}

async function downloadUsersTemplateFromStorage() {
    try {
        showLoading('downloadResult');

        const fileRef = ref(storage, 'templates/excel/users_template.xlsx');
        const downloadURL = await getDownloadURL(fileRef);

        // ファイルをダウンロード
        const link = document.createElement('a');
        link.href = downloadURL;
        link.download = 'users_template.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showResult('downloadResult',
            'users_template.xlsx をFirebase Storageからダウンロードしました\n\nアップロード用テンプレートファイルです。\n- 必要な項目: 名前、メール、電話番号、部署、役職、ステータス、権限\n- データ入力後、このファイルをアップロードしてください',
            'success');
    } catch (error) {
        console.log('Storage download failed, falling back to dynamic generation:', error);
        // フォールバック: 動的生成
        await downloadUsersTemplate();
    }
}

// テンプレートファイル ダウンロード関数（動的生成版 - フォールバック用）
async function downloadItemsTemplate() {
    try {
        showLoading('downloadResult');

        // XLSX ライブラリを動的に読み込み
        if (!window.XLSX) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js';
            document.head.appendChild(script);

            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
        }

        // itemsコレクション用のテンプレートデータ
        const templateData = [
            {
                'タイトル': '商品名を入力してください',
                '内容': '商品の詳細説明を入力してください',
                'カテゴリ': 'カテゴリを入力してください',
                '価格': '価格を数値で入力してください',
                'ステータス': 'active/inactive',
                '作成者': '作成者名を入力してください'
            },
            {
                'タイトル': '例: iPhone 15',
                '内容': '例: 最新のスマートフォン',
                'カテゴリ': '例: Electronics',
                '価格': '例: 128000',
                'ステータス': '例: active',
                '作成者': '例: 管理者'
            }
        ];

        const worksheet = window.XLSX.utils.json_to_sheet(templateData);
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Items Template');

        // カラム幅を設定
        worksheet['!cols'] = [
            { width: 20 }, // タイトル
            { width: 30 }, // 内容
            { width: 15 }, // カテゴリ
            { width: 10 }, // 価格
            { width: 12 }, // ステータス
            { width: 15 }  // 作成者
        ];

        const fileName = `items_template.xlsx`;
        window.XLSX.writeFile(workbook, fileName);

        showResult('downloadResult',
            `${fileName} をダウンロードしました\n\nアップロード用テンプレートファイルです。\n- 必要な項目: タイトル、内容、カテゴリ、価格、ステータス、作成者\n- データ入力後、このファイルをアップロードしてください`,
            'success');
    } catch (error) {
        showResult('downloadResult', `エラー: ${error.message}`, 'error');
    }
}

async function downloadUsersTemplate() {
    try {
        showLoading('downloadResult');

        // XLSX ライブラリを動的に読み込み
        if (!window.XLSX) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js';
            document.head.appendChild(script);

            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
        }

        // usersコレクション用のテンプレートデータ
        const templateData = [
            {
                '名前': 'ユーザー名を入力してください',
                'メール': 'メールアドレスを入力してください',
                '電話番号': '電話番号を入力してください',
                '部署': '部署名を入力してください',
                '役職': '役職を入力してください',
                'ステータス': 'active/inactive',
                '権限': 'admin/user/guest'
            },
            {
                '名前': '例: 田中太郎',
                'メール': '例: tanaka@example.com',
                '電話番号': '例: 090-1234-5678',
                '部署': '例: 営業部',
                '役職': '例: 主任',
                'ステータス': '例: active',
                '権限': '例: user'
            }
        ];

        const worksheet = window.XLSX.utils.json_to_sheet(templateData);
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Users Template');

        // カラム幅を設定
        worksheet['!cols'] = [
            { width: 15 }, // 名前
            { width: 25 }, // メール
            { width: 15 }, // 電話番号
            { width: 12 }, // 部署
            { width: 12 }, // 役職
            { width: 12 }, // ステータス
            { width: 12 }  // 権限
        ];

        const fileName = `users_template.xlsx`;
        window.XLSX.writeFile(workbook, fileName);

        showResult('downloadResult',
            `${fileName} をダウンロードしました\n\nアップロード用テンプレートファイルです。\n- 必要な項目: 名前、メール、電話番号、部署、役職、ステータス、権限\n- データ入力後、このファイルをアップロードしてください`,
            'success');
    } catch (error) {
        showResult('downloadResult', `エラー: ${error.message}`, 'error');
    }
}

// グローバル関数として公開
window.addDocument = addDocument;
window.getAllDocuments = getAllDocuments;
window.callHelloWorld = callHelloWorld;
window.downloadItemsTemplate = downloadItemsTemplateFromStorage;
window.downloadUsersTemplate = downloadUsersTemplateFromStorage;
window.downloadItemsTemplateDynamic = downloadItemsTemplate;
window.downloadUsersTemplateDynamic = downloadUsersTemplate;
window.showResult = showResult;
window.showLoading = showLoading;
window.clearResults = clearResults;

// 初期化完了メッセージ
console.log('Firebase アプリが初期化されました');
