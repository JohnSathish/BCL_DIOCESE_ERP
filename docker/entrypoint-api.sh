#!/bin/sh
# API container entrypoint — schema sync, optional seed, demo guard, then Nest.
set -e

cd /app/apps/api

if [ "$PRISMA_SCHEMA_PUSH" = "true" ]; then
  echo "==> prisma db push"
  pnpm exec prisma db push --accept-data-loss
else
  echo "==> prisma migrate deploy"
  pnpm exec prisma migrate deploy
fi

if [ "$SEED_ON_START" = "true" ]; then
  echo "==> seed (SEED_MODE=${SEED_MODE:-production})"
  SEED_MODE="${SEED_MODE:-production}" pnpm exec ts-node --transpile-only prisma/seed.ts
else
  echo "==> skip seed (SEED_ON_START is not true)"
fi

if [ "$NODE_ENV" = "production" ]; then
  echo "==> strip demo sacraments (production guard)"
  node scripts/strip-demo-sacraments.mjs
fi

echo "==> start API"
exec node dist/main.js
