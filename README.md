# QR Scan Firebase App

QRコードスキャン機能を持つFirebaseアプリケーションです。Firestore、Cloud Functions、Hostingを使用しています。

## 🚀 機能

- 📊 **Firestore Database**: データの保存・取得
- ⚡ **Cloud Functions**: サーバーレス API
- 🌐 **Firebase Hosting**: Webアプリのホスティング
- 🔐 **CORS対応**: フロントエンドからのAPI呼び出し

## 📁 プロジェクト構造

```
qrscan2/
├── functions/           # Cloud Functions
│   ├── src/
│   │   └── index.ts    # Functions ソースコード
│   ├── package.json    # Functions 依存関係
│   └── tsconfig.json   # TypeScript設定
├── public/             # Hosting ファイル
│   └── index.html      # メインWebアプリ
├── firebase.json       # Firebase設定
├── firestore.rules     # Firestore セキュリティルール
└── firestore.indexes.json # Firestore インデックス
```

## 🛠️ セットアップ

### 前提条件

- Node.js 20以上
- Firebase CLI
- Firebaseプロジェクト

### インストール

1. **リポジトリをクローン**
   ```bash
   git clone <repository-url>
   cd qrscan2
   ```

2. **Firebase プロジェクトに接続**
   ```bash
   firebase use --add
   ```

3. **Functions の依存関係をインストール**
   ```bash
   cd functions
   npm install
   cd ..
   ```

## 🚀 デプロイ

### 全体をデプロイ
```bash
firebase deploy
```

### 個別デプロイ
```bash
# Functions のみ
firebase deploy --only functions

# Hosting のみ
firebase deploy --only hosting

# Firestore ルールのみ
firebase deploy --only firestore:rules
```

## 🧪 ローカル開発

### Firebase Emulator を起動
```bash
firebase emulators:start
```

### Functions のローカル実行
```bash
cd functions
npm run serve
```

## 📋 API エンドポイント

### Cloud Functions

- **Hello World**: `GET /helloWorld`
  - シンプルなテスト用エンドポイント

- **QRスキャンデータ取得**: `GET /getQRScans`
  - Firestoreからすべてのデータを取得

- **QRスキャンデータ追加**: `POST /addQRScan`
  - Firestoreにデータを追加
  - Body: `{"title": "タイトル", "content": "内容"}`

## 🌐 デプロイ先

- **Hosting URL**: https://qrscan2-99ffd.web.app
- **Functions URL**: https://asia-northeast1-qrscan2-99ffd.cloudfunctions.net/
- **Project Console**: https://console.firebase.google.com/project/qrscan2-99ffd/overview

## 🔧 設定

### リージョン設定
- **Firestore**: asia-northeast1 (東京)
- **Functions**: asia-northeast1 (東京)
- **Hosting**: グローバル

### CORS設定
Cloud FunctionsでCORSが有効になっており、Webアプリからの呼び出しが可能です。

## 📚 使用技術

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, TypeScript
- **Database**: Firestore
- **Hosting**: Firebase Hosting
- **Functions**: Firebase Cloud Functions v2

## 🔒 セキュリティ

現在は開発用設定になっています。本番環境では以下を確認してください：

1. Firestore セキュリティルールの強化
2. Authentication の実装
3. CORS の適切な設定

## 📝 開発メモ

- Node.js 20を使用
- Firebase Functions v2を使用
- asia-northeast1リージョンでパフォーマンス最適化
- ESLintとTypeScriptでコード品質を維持

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。
