# PowerShell script to import contacts
# Handles closing the app, rebuilding better-sqlite3, and running the import

param(
    [Parameter(Mandatory=$true)]
    [string]$CsvPath
)

Write-Host "🔄 Contact Import Process" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Check if CSV exists
if (-not (Test-Path $CsvPath)) {
    Write-Host "❌ CSV file not found: $CsvPath" -ForegroundColor Red
    exit 1
}

# Find AI Command Center process
Write-Host "🔍 Looking for AI Command Center process..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object { $_.ProcessName -like "*ai-command-center*" -or $_.MainWindowTitle -like "*AI Command Center*" }

if ($processes) {
    Write-Host "⚠️  AI Command Center is running. Closing it..." -ForegroundColor Yellow
    foreach ($proc in $processes) {
        Write-Host "   Stopping process: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Gray
        Stop-Process -Id $proc.Id -Force
    }
    Start-Sleep -Seconds 2
    Write-Host "✅ App closed" -ForegroundColor Green
} else {
    Write-Host "ℹ️  App not running" -ForegroundColor Gray
}

# Navigate to project directory
$projectDir = "D:\Projects\ai-command-center"
Set-Location $projectDir

# Rebuild better-sqlite3
Write-Host ""
Write-Host "🔧 Rebuilding better-sqlite3 for Node.js v24..." -ForegroundColor Yellow
npm rebuild better-sqlite3 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ better-sqlite3 rebuilt successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to rebuild better-sqlite3" -ForegroundColor Red
    exit 1
}

# Run import
Write-Host ""
Write-Host "📥 Running contact import..." -ForegroundColor Yellow
Write-Host ""
node electron/scripts/import-contacts.js "$CsvPath"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Import complete! You can now restart AI Command Center." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Import failed" -ForegroundColor Red
    exit 1
}
