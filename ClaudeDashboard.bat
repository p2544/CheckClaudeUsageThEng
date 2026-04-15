@echo off
setlocal
:: ---------------------------------------------------------
:: Claude Usage Dashboard - Master Launcher (One-Click)
:: Create by Antigravity (AI Assistant)
:: ---------------------------------------------------------
title Claude Usage Dashboard Launcher

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

:: Check for Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git not found!
    echo Please install Git from https://git-scm.com/
    pause
    exit /b
)

:: Header
cls
echo.
echo  ==============================================
echo     CLAUDE USAGE DASHBOARD - MASTER LAUNCHER
echo  ==============================================
echo.
echo  [SYSTEM] Checking environment...

:: Ensure pnpm is installed
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo  [SYSTEM] Installing pnpm...
    npm install -g pnpm
)

set APP_DIR=claude-usage-app
set REPO_URL=https://github.com/p2544/CheckClaudeUsageThEng.git

:: Check if code exists
if not exist "%APP_DIR%" (
    echo  [SYSTEM] Downloading application from GitHub...
    git clone %REPO_URL% %APP_DIR%
) else (
    echo  [SYSTEM] Checking for updates...
    cd %APP_DIR%
    git pull
    cd ..
)

cd %APP_DIR%

:: Ensure .npmrc exists for hoisted linker (needed for better-sqlite3 in network drives)
if not exist ".npmrc" (
    echo node-linker=hoisted > .npmrc
)

echo  [SYSTEM] Initializing dependencies (This may take a moment)...
call pnpm install

echo  [SYSTEM] Syncing local logs...
call pnpm sync

echo.
echo  ==============================================
echo     DASHBOARD IS READY!
echo  ==============================================
echo.
echo  [SYSTEM] Starting server and opening browser...
echo.

:: Run dev server in background and open browser
start "" "http://localhost:3000"
call pnpm dev

pause
