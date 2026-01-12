# Autoblog Builder - Project Code Deploy Script
# Purpose: Push project files (functions/, src/, package.json) to autoblog-builder.git

# UTF-8 encoding setup
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host ""
Write-Host "Deploy Project Code to autoblog-builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get commit message from argument or use default
$commitMessage = $args[0]
if (-not $commitMessage) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $commitMessage = "Update project code - $timestamp"
}

Write-Host "Commit message: $commitMessage" -ForegroundColor Yellow
Write-Host ""

# Show changed files
Write-Host "Changed files:" -ForegroundColor Green
git status --short
Write-Host ""

# Confirm with user
$confirm = Read-Host "Deploy now? (Y/n)"
if ($confirm -eq "n" -or $confirm -eq "N") {
    Write-Host "Deploy cancelled" -ForegroundColor Red
    exit 1
}

# git add
Write-Host "Staging files..." -ForegroundColor Cyan
git add .

# git commit
Write-Host "Creating commit..." -ForegroundColor Cyan
git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "No files to commit" -ForegroundColor Yellow
    exit 0
}

# git push to autoblog-builder
Write-Host "Pushing to autoblog-builder.git..." -ForegroundColor Cyan
git push autoblog-builder main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Deploy completed successfully!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/papa123papa123/autoblog-builder" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Deploy failed" -ForegroundColor Red
    Write-Host ""
    exit 1
}
