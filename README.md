# BCL Enterprise Suite — Diocese ERP

Modern multi-tenant Catholic Diocese & Parish management platform by BaseCode Labs.

## Stack

- **Web:** Next.js, React, TypeScript, Tailwind CSS 4, TanStack Query, Zustand
- **API:** NestJS modular monolith, Prisma, PostgreSQL, JWT + refresh + 2FA
- **Packages:** shared UI, types, auth-client, SDK

## Quick start (local)

### Prerequisites

- Node 22+, pnpm 10+
- Docker (for Postgres) **or** a local PostgreSQL 16 instance

### 1. Install

```bash
pnpm install
cp .env.example .env
cp .env.example apps/api/.env
```

### 2. Database

```bash
docker compose -f docker/docker-compose.yml up -d postgres redis
pnpm db:generate
pnpm --filter @bcl/api exec prisma migrate dev --name init
pnpm db:seed
```

> **Note:** Postgres is mapped to host port **5433** (see `DATABASE_URL` in `.env`) to avoid clashes with a local Postgres on 5432.

### 3. Run apps

```bash
pnpm --filter @bcl/types build
pnpm --filter @bcl/auth-client build
pnpm --filter @bcl/sdk build
pnpm --filter @bcl/api dev
pnpm --filter @bcl/web dev
```

- Web: http://localhost:3000  
- API: http://localhost:4000/api/v1  
- Swagger: http://localhost:4000/api/docs  

### Seed users

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@basecodelabs.com | Admin@12345 |
| Diocese Admin | diocese@demo-diocese.org | Diocese@12345 |
| Parish Priest (St. Mary) | priest@stmary.org | Priest@12345 |
| Parish Priest (Sacred Heart) | priest@sacredheart-tura.org | Priest@12345 |

### Parish auto-provisioning

When a diocese admin creates a parish under **Parishes → New parish**, the API automatically provisions:

- Parish scope + dashboard access
- Public CMS website at `/site/{slug}` (default pages, welcome post, gallery)
- Current-year sacrament register books
- Starter finance chart of accounts + default cemetery
- Optional Parish Priest invite (temp password shown once in the UI)

Re-run provisioning anytime with **Re-provision** on the parish list (`POST /parishes/:id/provision`).

## Docker (full stack)

```bash
docker compose -f docker/docker-compose.yml up --build
```

Nginx gateway: http://localhost:8080

## Production (Sacred Heart first tenant)

See [`docs/PRODUCTION.md`](docs/PRODUCTION.md), [`docs/HOSTINGER_VPS.md`](docs/HOSTINGER_VPS.md) (shared VPS with other apps), and [`docs/DIOCESE_MULTI_PARISH.md`](docs/DIOCESE_MULTI_PARISH.md) for Diocese of Tura hosts, env separation, Docker, and launch checklist.

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml --env-file .env.production up -d --build
```

## Phase 1 scope

Authentication & RBAC, multi-tenant organizations, Diocese / Parish / Family / Member management, family QR + print book, family tree graph, audit log, file upload adapter.

## Phase 2 scope (Sacramental Core)

Baptism, Marriage (wizard), Confirmation, Holy Communion, Death registers; automatic certificate issuance with QR verification; digital register books with page/line pagination; member sacrament timeline.

## Phase 3 scope (Parish Operations)

Mass scheduling (intentions/bookings), donations & receipts, finance (accounts/transactions/budget), cemetery plots, catechism classes & attendance, parish calendar, communications stubs, runnable reports registry.

## Phase 4 scope (Diocese Expansion)

Enhanced diocese dashboard (youth/senior ratios, parish breakdown), priest directory & transfers, deanery UI, parish website CMS (`/site/:slug`), AI search / OCR review / analytics, Expo mobile app (`apps/mobile` — `pnpm --filter @bcl/mobile dev`).

See `docs/ARCHITECTURE.md` for OneCampus plug-in design.
