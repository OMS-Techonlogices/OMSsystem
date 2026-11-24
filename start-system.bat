@echo off
echo ====================================================
echo   OMS INVOICE MANAGEMENT SYSTEM
echo   Developed by MDE - Matrix Data Egypt
echo ====================================================

echo Starting Backend Server on http://127.0.0.1:5001...
start cmd /k "cd Invoice\server && npm run dev"

echo Starting Frontend React Client on http://127.0.0.1:5173...
start cmd /k "cd Invoice\client && npm run dev"

echo System is running!
pause
