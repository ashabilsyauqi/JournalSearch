Option Explicit
Dim WshShell, fso, desktopPath, currDir, targetPath, iconPath, sc

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

desktopPath = WshShell.SpecialFolders("Desktop")
currDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Cek apakah index.html berada di folder ini atau di subfolder public
If fso.FileExists(currDir & "\index.html") Then
    targetPath = currDir & "\index.html"
ElseIf fso.FileExists(currDir & "\public\index.html") Then
    targetPath = currDir & "\public\index.html"
Else
    targetPath = currDir & "\index.html"
End If

' Cek path ikon
If fso.FileExists(currDir & "\JournalSearch.ico") Then
    iconPath = currDir & "\JournalSearch.ico"
ElseIf fso.FileExists(currDir & "\public\JournalSearch.ico") Then
    iconPath = currDir & "\public\JournalSearch.ico"
Else
    iconPath = currDir & "\JournalSearch.ico"
End If

' 1. Buat shortcut .lnk di Desktop pengguna
Set sc = WshShell.CreateShortcut(desktopPath & "\JournalSearch - Pencari Jurnal Skripsi.lnk")
sc.TargetPath = targetPath
sc.WorkingDirectory = currDir
sc.IconLocation = iconPath & ",0"
sc.Description = "Sistem Rekomendasi Jurnal Ilmiah Berdasarkan Judul Skripsi"
sc.Save

' 2. Buat shortcut kedua dengan nama singkat JournalSearch.lnk
Set sc = WshShell.CreateShortcut(desktopPath & "\JournalSearch.lnk")
sc.TargetPath = targetPath
sc.WorkingDirectory = currDir
sc.IconLocation = iconPath & ",0"
sc.Description = "Sistem Rekomendasi Jurnal Ilmiah Berdasarkan Judul Skripsi"
sc.Save

' 3. Buka langsung aplikasi di browser default
WshShell.Run """" & targetPath & """"

' 4. Notifikasi ramah pengguna
MsgBox "Selamat! Shortcut 'JournalSearch' dengan ikon resmi telah berhasil dipasang di Desktop Anda." & vbCrLf & vbCrLf & "Aplikasi kini terbuka di peramban Anda dan dapat diakses kapan saja dari Desktop.", 64, "JournalSearch - Siap Digunakan"
