# PowerShell script to create desktop shortcut for AI Command Center

$TargetPath = "D:\Projects\ai-command-center\release\win-unpacked\AI Command Center.exe"
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = "$DesktopPath\AI Command Center.lnk"
$WorkingDirectory = "D:\Projects\ai-command-center\release\win-unpacked"

Write-Host "Creating shortcut..." -ForegroundColor Yellow
Write-Host "Desktop path: $DesktopPath" -ForegroundColor Cyan
Write-Host "Target exe: $TargetPath" -ForegroundColor Cyan

# Verify the exe exists
if (Test-Path $TargetPath) {
    Write-Host "Exe found!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Exe not found at $TargetPath" -ForegroundColor Red
    exit 1
}

# Create shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = $WorkingDirectory
$Shortcut.Description = "AI Command Center - Unified AI productivity desktop app"
$Shortcut.Save()

# Verify shortcut was created
if (Test-Path $ShortcutPath) {
    Write-Host "Desktop shortcut created successfully at: $ShortcutPath" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to create shortcut" -ForegroundColor Red
    exit 1
}
