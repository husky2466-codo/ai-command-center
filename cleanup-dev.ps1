# Cleanup script for development - kills all AI Command Center processes and frees ports
# Run this if the app won't start due to "another instance running"

Write-Host "AI Command Center - Development Cleanup Script" -ForegroundColor Cyan
Write-Host "=" * 50

# Kill processes on port 5173 (Vite dev server)
Write-Host "`nChecking port 5173 (Vite)..." -ForegroundColor Yellow
$connections = netstat -ano | Select-String ':5173' | Select-String 'LISTENING'
if ($connections) {
    foreach ($line in $connections) {
        $parts = $line -split '\s+'
        $processId = $parts[-1]
        if ($processId -and $processId -ne '0') {
            Write-Host "  Killing process $processId on port 5173" -ForegroundColor Green
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
} else {
    Write-Host "  Port 5173 is free" -ForegroundColor Gray
}

# Kill all Node processes
Write-Host "`nKilling Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process | Where-Object { $_.Name -eq 'node' }
if ($nodeProcesses) {
    Write-Host "  Found $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Green
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "  No Node.js processes running" -ForegroundColor Gray
}

# Kill all Electron processes
Write-Host "`nKilling Electron processes..." -ForegroundColor Yellow
$electronProcesses = Get-Process | Where-Object { $_.Name -eq 'electron' }
if ($electronProcesses) {
    Write-Host "  Found $($electronProcesses.Count) Electron process(es)" -ForegroundColor Green
    $electronProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "  No Electron processes running" -ForegroundColor Gray
}

# Kill AI Command Center app processes
Write-Host "`nKilling AI Command Center app processes..." -ForegroundColor Yellow
$accProcesses = Get-Process | Where-Object {
    $_.ProcessName -like '*AI Command Center*' -or
    $_.MainWindowTitle -like '*AI Command Center*'
}
if ($accProcesses) {
    Write-Host "  Found $($accProcesses.Count) AI Command Center process(es)" -ForegroundColor Green
    $accProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "  No AI Command Center processes running" -ForegroundColor Gray
}

Write-Host "`n" + "=" * 50
Write-Host "Cleanup complete! You can now run: npm run dev:electron" -ForegroundColor Cyan
