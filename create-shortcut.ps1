$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [Environment]::GetFolderPath('Desktop')
$Shortcut = $WshShell.CreateShortcut("$Desktop\AI Command Center.lnk")
$Shortcut.TargetPath = "C:\Windows\System32\cmd.exe"
$Shortcut.Arguments = "/c cd /d D:\Projects\ai-command-center && npm run dev:electron"
$Shortcut.WorkingDirectory = "D:\Projects\ai-command-center"
$Shortcut.WindowStyle = 7
$Shortcut.Save()
Write-Host "Desktop shortcut updated!"
