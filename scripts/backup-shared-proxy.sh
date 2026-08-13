#!/usr/bin/env bash
# Backup critical shared-proxy configs BEFORE any BCL nginx change.
# Safe: read-only copy. Does not stop containers or edit live files.
#
# Run on VPS as root:
#   bash /opt/bcl-diocese-erp/scripts/backup-shared-proxy.sh
# Or before clone exists:
#   curl -fsSL ... | bash   (prefer local copy after clone)
set -euo pipefail

STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="${BACKUP_DIR:-/root/backups/bcl-predeploy-${STAMP}}"
mkdir -p "$DEST"

echo "==> Backup destination: $DEST"

backup_file() {
  local src="$1"
  if [[ -f "$src" ]]; then
    local base
    base="$(basename "$src")"
    cp -a "$src" "$DEST/$base"
    echo "  OK  $src"
  else
    echo "  SKIP (missing) $src"
  fi
}

backup_dir() {
  local src="$1"
  local name="$2"
  if [[ -d "$src" ]]; then
    cp -a "$src" "$DEST/$name"
    echo "  OK  $src -> $DEST/$name"
  else
    echo "  SKIP (missing) $src"
  fi
}

echo "==> nep-erp nginx + compose"
backup_dir /opt/nep-erp/nginx nginx
backup_file /opt/nep-erp/docker-compose.yml
backup_file /opt/nep-erp/docker-compose.prod.yml
# Do NOT copy /opt/nep-erp/.env into chat; keep local backup only if present
if [[ -f /opt/nep-erp/.env ]]; then
  cp -a /opt/nep-erp/.env "$DEST/nep-erp.env"
  chmod 600 "$DEST/nep-erp.env"
  echo "  OK  /opt/nep-erp/.env (mode 600 in backup)"
fi

echo "==> mercy-dosa-house compose (if present)"
backup_file /opt/mercy-dosa-house/docker-compose.yml
backup_file /opt/mercy-dosa-house/docker-compose.prod.yml
if [[ -f /opt/mercy-dosa-house/.env ]]; then
  cp -a /opt/mercy-dosa-house/.env "$DEST/mercy-dosa-house.env"
  chmod 600 "$DEST/mercy-dosa-house.env"
  echo "  OK  /opt/mercy-dosa-house/.env (mode 600 in backup)"
fi

echo "==> Running containers snapshot"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}' > "$DEST/docker-ps.txt" || true
docker inspect nep-erp-nginx-1 > "$DEST/nep-erp-nginx-1.inspect.json" 2>/dev/null || true

echo "==> Listening ports snapshot"
ss -tlnp > "$DEST/ss-tlnp.txt" 2>/dev/null || netstat -tlnp > "$DEST/ss-tlnp.txt" 2>/dev/null || true

echo "==> Checksum of nginx.conf"
if [[ -f /opt/nep-erp/nginx/nginx.conf ]]; then
  sha256sum /opt/nep-erp/nginx/nginx.conf | tee "$DEST/nginx.conf.sha256"
fi

echo
echo "Backup complete. Existing sites were NOT modified."
echo "Restore nginx example (only if needed later):"
echo "  cp -a $DEST/nginx/nginx.conf /opt/nep-erp/nginx/nginx.conf"
echo "  docker exec nep-erp-nginx-1 nginx -t && docker exec nep-erp-nginx-1 nginx -s reload"
echo
ls -la "$DEST"
