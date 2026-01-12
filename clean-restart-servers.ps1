# UTF-8 BOM encoding for PowerShell
# Complete server cleanup and restart script
# Optimized for shortcut-based launch

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=== Server Complete Cleanup & Restart ===" -ForegroundColor Cyan
Write-Host "  (Shortcut launch optimized)" -ForegroundColor Gray
Write-Host ""

# Step 1: Kill all running processes (more thorough)
Write-Host "[1/7] Stopping all running processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "supabase" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "deno" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "postgres" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "docker" -ErrorAction SilentlyContinue | Stop-Process -Force

# Kill processes on specific ports
Write-Host "  - Checking ports..." -ForegroundColor Gray
$ports = @(5173, 54321, 54322, 54323, 54324)
foreach ($port in $ports) {
    $connections = netstat -ano | findstr ":$port"
    if ($connections) {
        $pids = $connections | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique
        foreach ($pid in $pids) {
            if ($pid -and $pid -match '^\d+$') {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "  - Killed process on port $port (PID: $pid)" -ForegroundColor Gray
            }
        }
    }
}

Start-Sleep -Seconds 3
Write-Host "  Done" -ForegroundColor Green

# Step 2: Stop Supabase
Write-Host "[2/7] Stopping Supabase..." -ForegroundColor Yellow
supabase stop 2>$null
Start-Sleep -Seconds 3
Write-Host "  Done" -ForegroundColor Green

# Step 3: Clear all caches (comprehensive)
Write-Host "[3/7] Clearing all caches..." -ForegroundColor Yellow

# Vite cache
if (Test-Path "node_modules\.vite") {
    Remove-Item -Path "node_modules\.vite" -Recurse -Force
    Write-Host "  - Vite cache cleared" -ForegroundColor Gray
}

# Next.js cache (if exists)
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force
    Write-Host "  - Next.js cache cleared" -ForegroundColor Gray
}

# Build output
if (Test-Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force
    Write-Host "  - dist cleared" -ForegroundColor Gray
}

# Supabase cache
if (Test-Path ".supabase") {
    Remove-Item -Path ".supabase" -Recurse -Force
    Write-Host "  - Supabase cache cleared" -ForegroundColor Gray
}

# Browser cache (if any)
if (Test-Path "node_modules\.cache") {
    Remove-Item -Path "node_modules\.cache" -Recurse -Force
    Write-Host "  - Node cache cleared" -ForegroundColor Gray
}

# Temp files
if (Test-Path "tmp") {
    Remove-Item -Path "tmp" -Recurse -Force
    Write-Host "  - Temp files cleared" -ForegroundColor Gray
}

Write-Host "  Done" -ForegroundColor Green

# Step 4: Clear temp and system cache
Write-Host "[4/7] Clearing system temp files..." -ForegroundColor Yellow
$env:TEMP_FILES = Get-ChildItem $env:TEMP -Filter "vite*" -ErrorAction SilentlyContinue
if ($env:TEMP_FILES) {
    Remove-Item $env:TEMP_FILES -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  - System temp Vite files cleared" -ForegroundColor Gray
}
Write-Host "  Done" -ForegroundColor Green

# Step 5: Wait to ensure complete shutdown
Write-Host "[5/7] Waiting for complete shutdown..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host "  Done" -ForegroundColor Green

# Step 6: Start Supabase (fresh)
Write-Host "[6/7] Starting Supabase (fresh instance)..." -ForegroundColor Yellow
supabase start
Start-Sleep -Seconds 2
Write-Host "  Done" -ForegroundColor Green

# Step 7: Ready for Vite
Write-Host "[7/7] Ready to start Vite..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=== Complete Cleanup Finished ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "All processes killed, all caches cleared, Supabase restarted." -ForegroundColor Green
Write-Host ""
Write-Host "Now run in a separate terminal:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Or if you started via shortcut, just run it again." -ForegroundColor Gray
Write-Host ""
