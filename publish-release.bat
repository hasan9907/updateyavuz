@echo off
echo Yavuz Muhasebe v1.0.0 Release Hazirlanıyor...
echo.

:: Önce build işlemini çalıştır
echo 🔧 Uygulama build ediliyor...
npm run build-win

:: GitHub repositorysine commit ve push
git add .
git commit -m "Release v1.0.0: Yavuz Muhasebe - İlk temiz release"
git tag v1.0.0
git push origin main
git push origin v1.0.0

echo.
echo Release GitHub'a yükleniyor...
echo.

:: Release bilgileri
echo 📦 Auto-updater ile güncelleme: latest.yml hazır
echo 🔧 Progress tracking ve UI event handling sorunları çözüldü!
echo.

echo ✅ Release tamamlandı! 
echo 🌐 GitHub: https://github.com/hasan9907/updateyavuz/releases
echo 📁 Installer: dist/Yavuz Muhasebe Setup 1.0.0.exe
echo.
pause 