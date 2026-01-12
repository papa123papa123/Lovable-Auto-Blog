# -*- coding: utf-8 -*-
# Autoblog Builder - プロジェクトコードデプロイスクリプト
# 用途: functions/, src/, package.json等のプロジェクトファイルをautoblog-builder.gitにプッシュ

# UTF-8エンコーディング設定
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host ""
Write-Host "🚀 Autoblog Builder - プロジェクトコードデプロイ" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# コミットメッセージを引数から取得（なければデフォルト）
$commitMessage = $args[0]
if (-not $commitMessage) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $commitMessage = "Update project code - $timestamp"
}

Write-Host "📝 コミットメッセージ: $commitMessage" -ForegroundColor Yellow
Write-Host ""

# 変更ファイルを確認
Write-Host "📋 変更されたファイル:" -ForegroundColor Green
git status --short
Write-Host ""

# ユーザーに確認
$confirm = Read-Host "このままデプロイしますか? (Y/n)"
if ($confirm -eq "n" -or $confirm -eq "N") {
    Write-Host "❌ デプロイをキャンセルしました" -ForegroundColor Red
    exit 1
}

# git add
Write-Host "📦 ファイルをステージング中..." -ForegroundColor Cyan
git add .

# git commit
Write-Host "💾 コミット作成中..." -ForegroundColor Cyan
git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  コミットするファイルがありません" -ForegroundColor Yellow
    exit 0
}

# git push to autoblog-builder
Write-Host "🚀 autoblog-builder.gitにプッシュ中..." -ForegroundColor Cyan
git push autoblog-builder main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ デプロイ完了！" -ForegroundColor Green
    Write-Host "   リポジトリ: https://github.com/papa123papa123/autoblog-builder" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ デプロイに失敗しました" -ForegroundColor Red
    Write-Host ""
    exit 1
}
