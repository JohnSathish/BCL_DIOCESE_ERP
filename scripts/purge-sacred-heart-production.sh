#!/bin/bash
# Purge test sacramental data on production VPS before historical import.
# Run on VPS: bash scripts/purge-sacred-heart-production.sh
set -euo pipefail

cd /opt/bcl-diocese-erp

echo "=== Sacred Heart (SHPTURA) sacrament purge ==="
echo "This permanently removes test Marriage, Confirmation, Communion, Baptism, Death records."
echo ""

docker compose -f docker/docker-compose.hostinger.yml --env-file .env.production exec -T api \
  node scripts/purge-parish-sacraments.mjs SHPTURA --confirm

echo ""
echo "Done. You can now import via Data Import Studio."
