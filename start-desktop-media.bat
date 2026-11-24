@echo off
title OMS Media Desktop - Matrix Data Egypt
echo ====================================================
echo   OMS MEDIA DEPARTMENT - DESKTOP EDITION
echo ====================================================
net start postgresql-x64-18 >nul 2>&1
call start-media.bat
timeout /t 3 /nobreak >nul
cd /d "%~dp0desktop"
npm start -- --portal=media
