@echo off
title OMS Backend APIs - Matrix Data Egypt
echo ====================================================
echo   OMS BACKEND APIS - STARTUP
echo   Developed by MDE - Matrix Data Egypt
echo ====================================================
echo.

echo [1/4] Starting PostgreSQL Service...
net start postgresql-x64-18 >nul 2>&1

echo [2/4] Starting Invoice Backend API (Port 5001)...
start "OMS Invoice API [5001]" cmd /k "cd /d "%~dp0Invoice\server" && npm run dev"

echo [3/4] Starting Media Backend API (Port 5002)...
start "OMS Media API [5002]" cmd /k "cd /d "%~dp0media\backend" && npm run dev"

echo [4/4] Starting Admin Central API (Port 5003)...
start "OMS Admin API [5003]" cmd /k "cd /d "%~dp0admin\backend" && npm run dev"

echo.
echo ====================================================
echo   All 3 Backend APIs are starting:
echo   - Invoice API: http://localhost:5001
echo   - Media API:   http://localhost:5002
echo   - Admin API:   http://localhost:5003
echo ====================================================
timeout /t 5
