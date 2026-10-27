@echo off
title Luxury E-Commerce - Startup Script
echo =======================================================
echo    Launching E-Commerce Store (Backend ^& Frontend)
echo =======================================================
echo.

echo [1/2] Starting Backend API Server (Port 5000)...
start "Backend Server (Port 5000)" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Vite Server (Port 5173)...
start "Frontend App (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =======================================================
echo  Servers are successfully started!
echo.
echo  Website URL : http://localhost:5173
echo  Backend API : http://localhost:5000
echo.
echo  Opening browser in 2 seconds...
echo =======================================================
timeout /t 2 /nobreak >nul
start http://localhost:5173
