# launch.ps1 — stop any running dev server, verify dependencies, then start fresh.
# Usage: pwsh scripts/launch.ps1  (or: .\scripts\launch.ps1 from repo root in PowerShell)

$ErrorActionPreference = "Stop"

# Move to repo root regardless of where the script was invoked from
$ROOT = Split-Path -Parent $PSScriptRoot
Push-Location $ROOT

function Info  { param($msg) Write-Host "[launch] $msg" -ForegroundColor Cyan }
function Ok    { param($msg) Write-Host "[launch] $msg" -ForegroundColor Green }
function Warn  { param($msg) Write-Host "[launch] $msg" -ForegroundColor Yellow }
function Fail  { param($msg) Write-Error "[launch] $msg"; Pop-Location; exit 1 }

# ─── 1. Stop any running server ───────────────────────────────────────────────
Info "Checking for processes on port 8080..."
try {
    $conn = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $pid = $conn.OwningProcess
        Warn "Killing process on port 8080 (PID $pid)"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    } else {
        Ok "Port 8080 is free"
    }
} catch {
    Ok "Port 8080 is free"
}

# Kill orphaned vite processes
$viteProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*vite*" }
if ($viteProcs) {
    Warn "Killing $($viteProcs.Count) orphaned vite process(es)"
    $viteProcs | Stop-Process -Force
}

# ─── 2. Check required tools ─────────────────────────────────────────────────
Info "Checking required tools..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "node not found — install Node.js >= 20 from https://nodejs.org"
}
$nodeVer = (node --version)
Ok "node $nodeVer"

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Warn "pnpm not found — installing via npm"
    npm install -g pnpm
    if ($LASTEXITCODE -ne 0) { Fail "Failed to install pnpm" }
}
$pnpmVer = (pnpm --version)
Ok "pnpm $pnpmVer"

# ─── 3. Check / install dependencies ─────────────────────────────────────────
Info "Checking dependencies..."

$needsInstall = $false

if (-not (Test-Path "node_modules")) {
    Warn "node_modules not found"
    $needsInstall = $true
} elseif ((Test-Path "pnpm-lock.yaml") -and
          (Get-Item "pnpm-lock.yaml").LastWriteTime -gt (Get-Item "node_modules").LastWriteTime) {
    Warn "pnpm-lock.yaml is newer than node_modules (lockfile changed)"
    $needsInstall = $true
}

if ($needsInstall) {
    Info "Running pnpm install..."
    pnpm install
    if ($LASTEXITCODE -ne 0) { Fail "pnpm install failed" }
    Ok "Dependencies installed"
} else {
    Ok "Dependencies up to date"
}

# ─── 4. Warn if .env is missing ──────────────────────────────────────────────
if (-not (Test-Path ".env")) {
    Warn ".env not found — running in demo mode (VITE_DEMO_LOGIN defaults to true)"
    Warn "Copy .env.example to .env and fill in Supabase credentials for production mode"
}

# ─── 5. Launch ───────────────────────────────────────────────────────────────
Write-Host ""
Ok "Starting dev server → http://localhost:8080"
Write-Host ""

Pop-Location
Set-Location $ROOT
pnpm dev
