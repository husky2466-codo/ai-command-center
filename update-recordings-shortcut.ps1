$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut('D:\OneDrive\Desktop\Chain Runner Recordings.lnk')
$shortcut.TargetPath = 'C:\Users\myers\ai-command-center\release\win-unpacked\recordings'
$shortcut.Description = 'Chain Runner session recordings'
$shortcut.Save()
Write-Host 'Recordings shortcut updated successfully'
