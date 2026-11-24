@echo off
title OMS Admin Desktop - Matrix Data Egypt
echo ====================================================
echo   OMS ADMIN MANAGEMENT - DESKTOP EDITION
echo ====================================================
net start postgresql-x64-18 >nul 2>&1
call start-admin.bat
timeout /t 3 /nobreak >nul
cd /d "%~dp0desktop"
npm start -- --portal=admin
