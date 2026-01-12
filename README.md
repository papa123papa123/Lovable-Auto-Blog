# 🚀 Autoblog Builder

AIを活用した自動ブログ記事生成システム

## 📁 リポジトリ構成

このプロジェクトは3つのGitリポジトリで構成されています：

| リポジトリ | 用途 | プッシュ内容 | URL |
|-----------|------|------------|-----|
| **autoblog-builder** | プロジェクトコード全体 | functions/, src/, package.json等 | https://github.com/papa123papa123/autoblog-builder.git |
| **Lovable-Auto-Blog** | 記事公開用（Cloudflare Pages） | sites/のみ | https://github.com/papa123papa123/Lovable-Auto-Blog.git |
| **mangaverse-hub** | トップページ（Lovable製） | 参照のみ | https://github.com/papa123papa123/mangaverse-hub.git |

## 🎯 デプロイ方法

### プロジェクトコードを更新する

```powershell
# 自動デプロイスクリプト使用
.\deploy-code.ps1

# またはカスタムメッセージ付き
.\deploy-code.ps1 "Add new feature: image optimization"
```

**プッシュ先:** `autoblog-builder` リポジトリ

### 記事を公開する（Cloudflare Pages）

```powershell
# 自動デプロイスクリプト使用
.\deploy-articles.ps1

# またはカスタムメッセージ付き
.\deploy-articles.ps1 "Add new article: 漫画レビュー"
```

**プッシュ先:** `lovable-blog` リポジトリ → Cloudflare Pagesが自動デプロイ

### トップページを更新する

1. `mangaverse-hub` リポジトリで編集してビルド
2. ビルド後の `dist/index.html` を `sites/comic-review-navi.com/` にコピー
3. `.\deploy-articles.ps1` で公開

## ⚙️ セットアップ

### 1. 依存パッケージのインストール

```powershell
# Node.jsパッケージ
npm install

# Python仮想環境
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. 環境変数の設定

`.dev.vars` ファイルを作成：

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
GITHUB_TOKEN=YOUR_GITHUB_TOKEN_HERE
FIRECRAWL_API_KEY=YOUR_FIRECRAWL_API_KEY_HERE
AMAZON_ASSOCIATE_ID=YOUR_AMAZON_ASSOCIATE_ID_HERE
RAKUTEN_APP_ID=YOUR_RAKUTEN_APP_ID_HERE
RAKUTEN_AFFILIATE_ID=YOUR_RAKUTEN_AFFILIATE_ID_HERE
```

### 3. 開発サーバーの起動

```powershell
# Viteフロントエンド開発サーバー
npm run dev

# または Cloudflare Pages Functions込み
wrangler pages dev dist --compatibility-date=2024-01-01
```

## 🔧 プロジェクト構成

```
autoblog-builder/
├── functions/              # Cloudflare Pages Functions（API）
│   └── api/
│       ├── batch-deploy-to-github.ts
│       ├── generate-image.ts
│       ├── generate-outline.ts
│       └── ...
├── src/                   # Reactフロントエンド
│   ├── components/
│   ├── lib/
│   └── pages/
├── sites/                 # 生成された記事（公開用）
│   └── comic-review-navi.com/
│       ├── index.html
│       ├── articles/
│       └── images/
├── deploy-code.ps1        # プロジェクトコードデプロイスクリプト
├── deploy-articles.ps1    # 記事デプロイスクリプト
├── package.json
├── wrangler.toml
└── README.md
```

## ⚠️ 重要な注意事項

### ❌ 絶対にやってはいけないこと

1. **Lovable-Auto-Blogにfunctions/やsrc/をプッシュしない**
   - このリポジトリはCloudflare Pagesで静的サイトとして公開されます
   - `sites/` フォルダ**のみ**をプッシュしてください

2. **手動でgit pushしない**
   - 混乱を防ぐため、デプロイスクリプトを使用してください
   - どのリモートにプッシュするか明確になります

3. **記事生成時はアプリ内のGitHub自動プッシュを使う**
   - アプリで記事を生成すると自動的に `Lovable-Auto-Blog` にプッシュされます

## 📋 ワークフロー

### 記事生成から公開まで

1. **記事生成**
   - ブラウザで `http://localhost:8080` を開く
   - キーワードを入力して記事生成
   - 自動的にsites/フォルダに保存され、GitHubにプッシュ

2. **プレビュー確認**
   - 生成された記事を確認
   - 必要に応じて手動編集

3. **公開**
   - `.\deploy-articles.ps1` を実行（または自動プッシュ済み）
   - Cloudflare Pagesが自動的にデプロイ
   - 数分後に https://papa123papa123.github.io/Lovable-Auto-Blog/ で公開

### 機能開発ワークフロー

1. **コード変更**
   - `src/` または `functions/` でコード編集
   - ローカルでテスト

2. **デプロイ**
   - `.\deploy-code.ps1` を実行
   - `autoblog-builder` リポジトリにプッシュ

3. **Cloudflare Pagesにデプロイ**
   - Cloudflareダッシュボードで手動デプロイ
   - またはGitHub Actionsで自動デプロイ

## 🛠️ トラブルシューティング

### リモート設定を確認

```powershell
git remote -v
```

正しい設定：
```
autoblog-builder    https://github.com/papa123papa123/autoblog-builder.git
lovable-blog        https://github.com/papa123papa123/Lovable-Auto-Blog.git
mangaverse          https://github.com/papa123papa123/mangaverse-hub.git
```

### 間違ったリポジトリにプッシュしてしまった場合

```powershell
# 最新のコミットを取り消し（まだプッシュしていない場合）
git reset --soft HEAD~1

# プッシュしてしまった場合は該当ファイルを削除
git rm -r functions/ src/
git commit -m "Remove incorrect files"
git push
```

## 📝 開発者向けメモ

- **Gemini API**: 画像生成には `gemini-3-pro-image-preview` を使用
- **GitHub API**: batch-deploy-to-github.ts で複数ファイルを1コミットで処理
- **Cloudflare Pages Functions**: `/api/*` エンドポイントで動作

## 📄 ライセンス

Private Project
