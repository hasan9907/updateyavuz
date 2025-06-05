; Yavuz Muhasebe v1.0.4 Installer Script
!include "MUI2.nsh"

; Genel Ayarlar
Name "Yavuz Muhasebe"
OutFile "dist\Yavuz Muhasebe Setup 1.0.4.exe"
InstallDir "$PROGRAMFILES\Yavuz Muhasebe"
RequestExecutionLevel admin

; Modern UI Ayarları
!define MUI_ABORTWARNING
!define MUI_ICON "assets\icon.ico"
!define MUI_UNICON "assets\icon.ico"

; Sayfalar
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Dil
!insertmacro MUI_LANGUAGE "Turkish"

; Kurulum
Section "Ana Program" SecMain
  SetOutPath "$INSTDIR"
  File /r "dist\win-unpacked-v1.0.4\*.*"
  
  ; Kısayollar
  CreateDirectory "$SMPROGRAMS\Yavuz Muhasebe"
  CreateShortCut "$SMPROGRAMS\Yavuz Muhasebe\Yavuz Muhasebe.lnk" "$INSTDIR\Yavuz Muhasebe.exe"
  CreateShortCut "$DESKTOP\Yavuz Muhasebe.lnk" "$INSTDIR\Yavuz Muhasebe.exe"
  
  ; Kaldırıcı
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateShortCut "$SMPROGRAMS\Yavuz Muhasebe\Kaldır.lnk" "$INSTDIR\Uninstall.exe"
  
  ; Registry
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\YavuzMuhasebe" "DisplayName" "Yavuz Muhasebe v1.0.4"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\YavuzMuhasebe" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\YavuzMuhasebe" "DisplayVersion" "1.0.4"
SectionEnd

; Kaldırma
Section "Uninstall"
  Delete "$INSTDIR\*.*"
  RMDir /r "$INSTDIR"
  Delete "$DESKTOP\Yavuz Muhasebe.lnk"
  RMDir /r "$SMPROGRAMS\Yavuz Muhasebe"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\YavuzMuhasebe"
SectionEnd 