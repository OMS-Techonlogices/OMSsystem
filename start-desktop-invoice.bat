@echo off
title OMS Invoice Desktop - Matrix Data Egypt
echo ====================================================
echo   OMS INVOICE SYSTEM - DESKTOP EDITION
echo ====================================================
net start postgresql-x64-18 >nul 2>&1
call start-system.bat
timeout /t 3 /nobreak >nul
cd /d "%~dp0desktop"
npm start -- --portal=invoice
