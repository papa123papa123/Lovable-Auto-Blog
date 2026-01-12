# 📘 Git Workflow ガイド

このドキュメントは、Autoblog Builderプロジェクトの複数リポジトリ管理を明確化するためのものです。

## 🎯 3つのリポジトリの役割

### 1. autoblog-builder（プロジェクトコード）
**用途:** 開発用リポジトリ  
**URL:** https://github.com/papa123papa123/autoblog-builder.git  
**リモート名:** `autoblog-builder`

**プッシュするファイル:**
- ✅ functions/
- ✅ src/
- ✅ package.json, package-lock.json
- ✅ tsconfig.*.json
- ✅ vite.config.ts
- ✅ wrangler.toml
- ✅ README.md, GIT-WORKFLOW.md
- ✅ deploy-*.ps1
- ✅ その他すべてのプロジェクトファイル

**プッシュしないファイル:**
- ❌ node_modules/
- ❌ dist/
- ❌ venv/
- ❌ .env, .dev.vars（機密情報）

**デプロイコマンド:**
```powershell
.\deploy-code.ps1
```

---

### 2. Lovable-Auto-Blog（記事公開）
**用途:** 静的サイト公開（Cloudflare Pages / GitHub Pages）  
**URL:** https://github.com/papa123papa123/Lovable-Auto-Blog.git  
**リモート名:** `lovable-blog`

**プッシュするファイル:**
- ✅ sites/ **のみ**
  - sites/comic-review-navi.com/index.html
  - sites/comic-review-navi.com/articles/
  - sites/comic-review-navi.com/images/
  - sites/comic-review-navi.com/assets/
  - sites/comic-review-navi.com/sitemap.xml
  - sites/comic-review-navi.com/robots.txt
  - sites/comic-review-navi.com/feed.xml

**絶対にプッシュしないファイル:**
- ❌ functions/
- ❌ src/
- ❌ package.json
- ❌ node_modules/
- ❌ その他プロジェクトファイル

**デプロイコマンド:**
```powershell
.\deploy-articles.ps1
```

**公開URL:**
- GitHub Pages: https://papa123papa123.github.io/Lovable-Auto-Blog/
- Cloudflare Pages: （設定次第）

---

### 3. mangaverse-hub（トップページ）
**用途:** Lovableで作成したトップページ  
**URL:** https://github.com/papa123papa123/mangaverse-hub.git  
**リモート名:** `mangaverse`

**使い方:**
1. mangaverse-hubリポジトリでトップページを編集
2. Lovableでビルド
3. `dist/index.html` と `dist/assets/` を取得
4. autoblog-builderの `sites/comic-review-navi.com/` にコピー
5. `.\deploy-articles.ps1` でLovable-Auto-Blogにプッシュ

**このリポジトリには直接プッシュしない**（参照のみ）

---

## 🔄 典型的なワークフロー

### ケース1: 新機能を開発する

```powershell
# 1. コードを編集
code src/components/Dashboard.tsx

# 2. ローカルでテスト
npm run dev

# 3. プロジェクトコードをデプロイ
.\deploy-code.ps1
```

→ **autoblog-builder** リポジトリにプッシュ

---

### ケース2: 記事を生成して公開する

```powershell
# 1. アプリを起動
npm run dev

# 2. ブラウザで記事生成
# → 自動的にsites/フォルダに保存される

# 3. 記事を公開
.\deploy-articles.ps1
```

→ **lovable-blog** リポジトリにプッシュ  
→ Cloudflare Pagesが自動デプロイ

---

### ケース3: トップページを更新する

```powershell
# 1. mangaverse-hubリポジトリでトップページを編集
# （Lovableで編集＆ビルド）

# 2. ビルド済みファイルを取得
cd ../mangaverse-hub
git pull
cd ../autoblog-builder

# 3. トップページファイルをコピー
cp ../mangaverse-hub/dist/index.html sites/comic-review-navi.com/
cp -r ../mangaverse-hub/dist/assets sites/comic-review-navi.com/

# 4. 公開
.\deploy-articles.ps1
```

→ **lovable-blog** リポジトリにプッシュ

---

## ⚠️ よくある間違いと対処法

### 間違い1: Lovable-Auto-Blogにfunctions/をプッシュしてしまった

**対処法:**
```powershell
# 該当ファイルを削除
git rm -r functions/ src/
git rm package.json package-lock.json tsconfig.*.json vite.config.ts wrangler.toml

# コミット＆プッシュ
git commit -m "Remove development files (keep only sites/)"
git push lovable-blog main
```

---

### 間違い2: どのリモートにプッシュすべきか分からない

**チェックリスト:**

| 変更内容 | プッシュ先 | コマンド |
|---------|----------|---------|
| src/, functions/等のコード | autoblog-builder | `.\deploy-code.ps1` |
| sites/内の記事・画像 | lovable-blog | `.\deploy-articles.ps1` |
| トップページ | mangaverse → lovable-blog | 上記ケース3参照 |

---

### 間違い3: リモート設定が壊れている

**修正方法:**
```powershell
# 現在のリモート設定を確認
git remote -v

# 正しく設定し直す
git remote set-url autoblog-builder https://github.com/papa123papa123/autoblog-builder.git
git remote set-url lovable-blog https://github.com/papa123papa123/Lovable-Auto-Blog.git
git remote set-url mangaverse https://github.com/papa123papa123/mangaverse-hub.git

# 確認
git remote -v
```

---

## 🚀 クイックリファレンス

```powershell
# プロジェクトコードをデプロイ
.\deploy-code.ps1

# 記事を公開
.\deploy-articles.ps1

# リモート確認
git remote -v

# 現在の変更を確認
git status

# sites/フォルダの変更のみ確認
git status sites/
```

---

## 📌 覚えておくべきルール

1. **デプロイスクリプトを使う** → 混乱を防ぐ
2. **Lovable-Auto-Blogにはsites/のみ** → 静的サイト公開用
3. **コード開発はautoblog-builder** → プロジェクト全体を管理
4. **手動プッシュは避ける** → スクリプトで明確化

---

このワークフローを守れば、リポジトリの混乱を防げます！
