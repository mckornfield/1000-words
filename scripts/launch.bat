@echo off
REM launch.bat — stop any running dev server, verify dependencies, then start fresh.
REM Usage: scripts\launch.bat  (run from repo root, or double-click)

setlocal enabledelayedexpansion

REM Move to repo root (one level up from scripts\)
pushd "%~dp0.."

echo.
echo [launch] Checking for processes on port 8080...

REM Find and kill any process listening on port 8080
set "FOUND_PID="
for /f "tokens=5" %%P in ('netstat -aon 2^>nul ^| findstr /R "[:.]8080 " ^| findstr "LISTENING"') do (
    set "FOUND_PID=%%P"
)
if defined FOUND_PID (
    echo [launch] WARNING: Killing process on port 8080 ^(PID !FOUND_PID!^)
    taskkill /PID !FOUND_PID! /F >nul 2>&1
    timeout /t 1 /nobreak >nul
) else (
    echo [launch] OK: Port 8080 is free
)

REM Kill any orphaned vite-related node processes by window title / command
REM (best-effort; may not catch all cases without wmic)
wmic process where "commandline like '%%vite%%'" delete >nul 2>&1

REM ─── Check required tools ────────────────────────────────────────────────────
echo.
echo [launch] Checking required tools...

where node >nul 2>&1
if errorlevel 1 (
    echo [launch] ERROR: node not found -- install Node.js ^>= 20 from https://nodejs.org
    popd
    exit /b 1
)
for /f %%V in ('node --version') do echo [launch] OK: node %%V

where pnpm >nul 2>&1
if errorlevel 1 (
    echo [launch] WARNING: pnpm not found -- installing via npm
    npm install -g pnpm
    if errorlevel 1 (
        echo [launch] ERROR: Failed to install pnpm
        popd
        exit /b 1
    )
)
for /f %%V in ('pnpm --version') do echo [launch] OK: pnpm %%V

REM ─── Check / install dependencies ────────────────────────────────────────────
echo.
echo [launch] Checking dependencies...

if not exist node_modules (
    echo [launch] WARNING: node_modules not found
    goto :install_deps
)

REM Compare pnpm-lock.yaml modification time against node_modules
REM xcopy /d trick: if lockfile is newer, xcopy would copy it (exit 0); otherwise exit 1
xcopy /d /y /q pnpm-lock.yaml node_modules\..\ >nul 2>&1
if not errorlevel 1 (
    echo [launch] WARNING: pnpm-lock.yaml is newer than node_modules
    goto :install_deps
)

echo [launch] OK: Dependencies up to date
goto :after_install

:install_deps
echo [launch] Running pnpm install...
pnpm install
if errorlevel 1 (
    echo [launch] ERROR: pnpm install failed
    popd
    exit /b 1
)
echo [launch] OK: Dependencies installed

:after_install

REM ─── Warn if .env is missing ─────────────────────────────────────────────────
if not exist .env (
    echo.
    echo [launch] WARNING: .env not found -- running in demo mode
    echo [launch] WARNING: Copy .env.example to .env for Supabase production mode
)

REM ─── Launch ──────────────────────────────────────────────────────────────────
echo.
echo [launch] OK: Starting dev server ^-^> http://localhost:8080
echo.

pnpm dev

popd
endlocal
