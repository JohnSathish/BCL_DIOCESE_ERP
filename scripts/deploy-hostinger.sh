#!/usr/bin/env bash
# Safe deploy helper for Hostinger VPS (BCL Diocese ERP).
# Run from repo root: bash scripts/deploy-hostinger.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE="docker compose -f docker/docker-compose.hostinger.yml --env-file .env.production"

if [[ ! -f .env.production ]]; then
  echo "Missing .env.production — copy from .env.hostinger.example and fill secrets."
  exit 1
fi

echo "==> Checking localhost ports 13100 / 14100 are free or already ours..."
if command -v ss >/dev/null 2>&1; then
  ss -tln | grep -E ':13100|:14100' || true
fi

echo "==> Building & starting bcl-diocese stack (no 80/443)..."
$COMPOSE up -d --build

echo "==> Status"
$COMPOSE ps

echo "==> Health"
curl -fsS "http://127.0.0.1:14100/api/v1/health" || curl -fsS "http://127.0.0.1:14100/health" || true
echo
echo "Done. Configure host Nginx from docker/hostinger/nginx-bcl-diocese.conf if not already."
echo "See docs/HOSTINGER_VPS.md"
