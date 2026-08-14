#!/bin/bash
# Purge test sacramental data on production VPS before historical import.
# Run on VPS: bash scripts/purge-sacred-heart-production.sh
#
# Uses SQL via the postgres container so it works immediately after git pull
# (no API image rebuild required). The node script in apps/api/scripts/ is
# only available inside the api container after: docker compose ... up -d --build api
set -euo pipefail

ROOT="${BCL_ROOT:-/opt/bcl-diocese-erp}"
COMPOSE_FILE="${BCL_COMPOSE_FILE:-docker/docker-compose.hostinger.yml}"
ENV_FILE="${BCL_ENV_FILE:-.env.production}"
SQL_FILE="${ROOT}/scripts/purge-sacred-heart-production.sql"

cd "${ROOT}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE} — set BCL_ENV_FILE if your env file has another name."
  exit 1
fi

if [[ ! -f "${SQL_FILE}" ]]; then
  echo "Missing ${SQL_FILE}"
  exit 1
fi

echo "=== Sacred Heart (SHPTURA) sacrament purge ==="
echo "This permanently removes test Marriage, Confirmation, Communion, Baptism, Death records."
echo ""

# Use postgres container env (POSTGRES_USER/POSTGRES_DB) — do not source .env.production
# on the host; values like EMAIL_FROM=BCL Diocese ERP <...> break bash.
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T postgres \
  sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "${SQL_FILE}"

echo ""
echo "Done. You can now import via Data Import Studio."
