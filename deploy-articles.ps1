# -*- coding: utf-8 -*-
# Autoblog Builder - 記事デプロイスクリプト
# 用途: sites/フォルダ（記事）のみをLovable-Auto-Blog.gitにプッシュ

# UTF-8エンコーディング設定
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host ""
Write-Host "📰 Autoblog Builder - 記事デプロイ（Cloudflare Pages公開）" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

# コミットメッセージを引数から取得（なければデフォルト）
$commitMessage = $args[0]
if (-not $commitMessage) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $commitMessage = "Update articles - $timestamp"
}

Write-Host "📝 コミットメッセージ: $commitMessage" -ForegroundColor Yellow
Write-Host ""

# sites/フォルダの変更を確認
Write-Host "📋 sites/フォルダの変更:" -ForegroundColor Green
git status --short sites/
Write-Host ""

# 変更がない場合は終了
$changes = git status --short sites/
if (-not $changes) {
    Write-Host "⚠️  sites/フォルダに変更がありません" -ForegroundColor Yellow
    exit 0
}

# ユーザーに確認
$confirm = Read-Host "sites/フォルダをCloudflare Pagesに公開しますか? (Y/n)"
if ($confirm -eq "n" -or $confirm -eq "N") {
    Write-Host "❌ デプロイをキャンセルしました" -ForegroundColor Red
    exit 1
}

# sites/フォルダのみをステージング
Write-Host "📦 sites/フォルダをステージング中..." -ForegroundColor Cyan
git add sites/

# git commit
Write-Host "💾 コミット作成中..." -ForegroundColor Cyan
git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  コミットするファイルがありません" -ForegroundColor Yellow
    exit 0
}

# git push to lovable-blog
Write-Host "🚀 Lovable-Auto-Blog.gitにプッシュ中..." -ForegroundColor Cyan
Write-Host "   ⚡ Cloudflare Pagesが自動デプロイを開始します..." -ForegroundColor Gray
git push lovable-blog main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 記事デプロイ完了！" -ForegroundColor Green
    Write-Host "   リポジトリ: https://github.com/papa123papa123/Lovable-Auto-Blog" -ForegroundColor Gray
    Write-Host "   公開URL: https://papa123papa123.github.io/Lovable-Auto-Blog/" -ForegroundColor Gray
    Write-Host "   Cloudflare Pages: 数分後に反映されます" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ デプロイに失敗しました" -ForegroundColor Red
    Write-Host ""
    exit 1
}
