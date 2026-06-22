#!/usr/bin/env bash
# launch.sh — stop any running dev server, verify dependencies, then start fresh.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[1;33m'; BLU='\033[0;34m'; RST='\033[0m'
info()  { echo -e "${BLU}[launch]${RST} $*"; }
ok()    { echo -e "${GRN}[launch]${RST} $*"; }
warn()  { echo -e "${YLW}[launch]${RST} $*"; }
error() { echo -e "${RED}[launch]${RST} $*" >&2; }

# ─── 1. Stop any running server ───────────────────────────────────────────────
info "Checking for processes on port 8080..."
PORT_PID=$(lsof -ti tcp:8080 2>/dev/null || true)
if [ -n "$PORT_PID" ]; then
  warn "Killing process on port 8080 (PID $PORT_PID)"
  kill "$PORT_PID" 2>/dev/null || true
  sleep 1
else
  ok "Port 8080 is free"
fi

# Kill any orphaned vite processes (e.g. from a crashed session)
if pkill -f "vite" 2>/dev/null; then
  warn "Killed orphaned vite process(es)"
fi

# ─── 2. Check required tools ─────────────────────────────────────────────────
info "Checking required tools..."

if ! command -v node &>/dev/null; then
  error "node not found — install Node.js >= 20 from https://nodejs.org"
  exit 1
fi
NODE_VER=$(node --version)
ok "node $NODE_VER"

if ! command -v pnpm &>/dev/null; then
  warn "pnpm not found — attempting to enable via corepack"
  if command -v corepack &>/dev/null; then
    corepack enable && corepack prepare pnpm@latest --activate
  else
    warn "corepack unavailable — falling back to: npm install -g pnpm"
    npm install -g pnpm
  fi
fi
PNPM_VER=$(pnpm --version)
ok "pnpm $PNPM_VER"

# ─── 3. Check / install dependencies ─────────────────────────────────────────
info "Checking dependencies..."

NEEDS_INSTALL=0

if [ ! -d node_modules ]; then
  warn "node_modules not found"
  NEEDS_INSTALL=1
elif [ pnpm-lock.yaml -nt node_modules ]; then
  warn "pnpm-lock.yaml is newer than node_modules (lockfile changed)"
  NEEDS_INSTALL=1
fi

if [ "$NEEDS_INSTALL" -eq 1 ]; then
  info "Running pnpm install..."
  pnpm install
  ok "Dependencies installed"
else
  ok "Dependencies up to date"
fi

# ─── 4. Warn if .env is missing ──────────────────────────────────────────────
if [ ! -f .env ]; then
  warn ".env not found — running in demo mode (VITE_DEMO_LOGIN defaults to true)"
  warn "Copy .env.example to .env and fill in Supabase credentials for production mode"
fi

# ─── 5. Launch ───────────────────────────────────────────────────────────────
echo ""
ok "Starting dev server → http://localhost:8080"
echo ""
exec pnpm dev
