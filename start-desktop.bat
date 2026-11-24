@echo off
title OMS Business Suite Desktop - Matrix Data Egypt
echo ====================================================
echo   OMS BUSINESS SUITE - DESKTOP EDITION
echo   Matrix Data Egypt (MDE)
echo ====================================================
echo.
echo [1/4] Ensuring PostgreSQL Database Service is running...
net start postgresql-x64-18 >nul 2>&1

echo [2/4] Starting System Servers in the background...
call start-all.bat

echo [3/4] Initializing OMS Desktop Environment...
timeout /t 3 /nobreak >nul

echo [4/4] Launching OMS Desktop Application...
cd /d "%~dp0desktop"
npm start

pause
