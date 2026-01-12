# Autoblog Builder - Articles Deploy Script
# Purpose: Push sites/ folder only to Lovable-Auto-Blog.git (Cloudflare Pages)

# UTF-8 encoding setup
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host ""
Write-Host "Deploy Articles to Cloudflare Pages" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Get commit message from argument or use default
$commitMessage = $args[0]
if (-not $commitMessage) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $commitMessage = "Update articles - $timestamp"
}

Write-Host "Commit message: $commitMessage" -ForegroundColor Yellow
Write-Host ""

# Check changes in sites/ folder
Write-Host "Changes in sites/ folder:" -ForegroundColor Green
git status --short sites/
Write-Host ""

# Exit if no changes
$changes = git status --short sites/
if (-not $changes) {
    Write-Host "No changes in sites/ folder" -ForegroundColor Yellow
    exit 0
}

# Confirm with user
$confirm = Read-Host "Deploy to Cloudflare Pages? (Y/n)"
if ($confirm -eq "n" -or $confirm -eq "N") {
    Write-Host "Deploy cancelled" -ForegroundColor Red
    exit 1
}

# Stage sites/ folder only
Write-Host "Staging sites/ folder..." -ForegroundColor Cyan
git add sites/

# git commit
Write-Host "Creating commit..." -ForegroundColor Cyan
git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "No files to commit" -ForegroundColor Yellow
    exit 0
}

# git push to lovable-blog
Write-Host "Pushing to Lovable-Auto-Blog.git..." -ForegroundColor Cyan
Write-Host "Cloudflare Pages will auto-deploy..." -ForegroundColor Gray
git push lovable-blog main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Articles deployed successfully!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/papa123papa123/Lovable-Auto-Blog" -ForegroundColor Gray
    Write-Host "Public URL: https://papa123papa123.github.io/Lovable-Auto-Blog/" -ForegroundColor Gray
    Write-Host "Cloudflare Pages: Will be live in a few minutes" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Deploy failed" -ForegroundColor Red
    Write-Host ""
    exit 1
}
