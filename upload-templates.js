#!/usr/bin/env node
// Firebase Storageにテンプレートファイルをアップロードするスクリプト

import * as XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyCWFL91baSHkjkvU_k-yTUv6QS191YTFlg",
    authDomain: "qrscan2-99ffd.firebaseapp.com",
    projectId: "qrscan2-99ffd",
    storageBucket: "qrscan2-99ffd.firebasestorage.app",
    messagingSenderId: "1089215781575",
    appId: "1:1089215781575:web:bf9d05f6930b7123813ce2"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function createAndUploadTemplates() {
    try {
        console.log('テンプレートファイルを作成中...');

        // Items テンプレート
        const itemsData = [
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

        // Users テンプレート
        const usersData = [
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

        // Items テンプレート作成
        const itemsWorksheet = XLSX.utils.json_to_sheet(itemsData);
        const itemsWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(itemsWorkbook, itemsWorksheet, 'Items Template');

        itemsWorksheet['!cols'] = [
            { width: 20 }, { width: 30 }, { width: 15 },
            { width: 10 }, { width: 12 }, { width: 15 }
        ];

        // Users テンプレート作成
        const usersWorksheet = XLSX.utils.json_to_sheet(usersData);
        const usersWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(usersWorkbook, usersWorksheet, 'Users Template');

        usersWorksheet['!cols'] = [
            { width: 15 }, { width: 25 }, { width: 15 },
            { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }
        ];

        // バイナリデータとして書き出し
        const itemsBuffer = XLSX.write(itemsWorkbook, { type: 'buffer', bookType: 'xlsx' });
        const usersBuffer = XLSX.write(usersWorkbook, { type: 'buffer', bookType: 'xlsx' });

        // Firebase Storageにアップロード
        console.log('Firebase Storageにアップロード中...');

        const itemsRef = ref(storage, 'templates/items_template.xlsx');
        const usersRef = ref(storage, 'templates/users_template.xlsx');

        await uploadBytes(itemsRef, itemsBuffer);
        await uploadBytes(usersRef, usersBuffer);

        console.log('✅ テンプレートファイルのアップロードが完了しました!');
        console.log('- templates/items_template.xlsx');
        console.log('- templates/users_template.xlsx');

    } catch (error) {
        console.error('❌ エラーが発生しました:', error);
    }
}

createAndUploadTemplates();
