@echo off
echo ====================================================
echo   OMS COMPLETE BUSINESS SUITE
echo   Developed by MDE - Matrix Data Egypt
echo ====================================================

echo [1/3] Starting Invoice Accounting System...
start cmd /k "cd Invoice\server && npm run dev"
start cmd /k "cd Invoice\client && npm run dev"

echo [2/3] Starting Media Department System...
start cmd /k "cd media\backend && npm run dev"
start cmd /k "cd media\frontend && npm run dev"

echo [3/3] Starting Admin Central Management System...
start cmd /k "cd admin\backend && npm run dev"
start cmd /k "cd admin\frontend && npm run dev"

echo ====================================================
echo   All 3 Systems are running!
echo   1. Invoice Accounting: http://localhost:5173
echo   2. Media Department:   http://localhost:5174
echo   3. Admin Management:   http://localhost:5175
echo ====================================================
pause
