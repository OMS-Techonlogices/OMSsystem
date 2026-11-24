@echo off
title Build OMS Desktop EXE - Matrix Data Egypt
echo ====================================================
echo   BUILDING OMS DESKTOP EXECUTABLE (.EXE)
echo   Developed by MDE - Matrix Data Egypt
echo ====================================================
echo.

echo [1/4] Generating official high-res icon (.ico)...
cd /d "%~dp0desktop"
node create-icon.cjs

echo [2/4] Syncing latest frontend builds...
cd /d "%~dp0"
if not exist "desktop\dist-portals\invoice" mkdir "desktop\dist-portals\invoice"
if not exist "desktop\dist-portals\media" mkdir "desktop\dist-portals\media"
if not exist "desktop\dist-portals\admin" mkdir "desktop\dist-portals\admin"

xcopy /E /I /Y "Invoice\client\dist\*" "desktop\dist-portals\invoice\" >nul
xcopy /E /I /Y "media\frontend\dist\*" "desktop\dist-portals\media\" >nul
xcopy /E /I /Y "admin\frontend\dist\*" "desktop\dist-portals\admin\" >nul

echo [3/4] Packaging Windows Desktop App with Electron Builder...
cd /d "%~dp0desktop"
npm run dist

echo.
echo ====================================================
echo   Build completed successfully!
echo   Executables (.exe) are located in:
echo   E:\OMSsystem\desktop\release
echo ====================================================
pause
