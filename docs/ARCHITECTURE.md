# BCL Enterprise Suite Architecture

## Overview

BCL Enterprise Suite is a **modular monorepo** that hosts multiple BaseCode Labs products on a shared platform kernel:

| Product | Code | Status |
|---------|------|--------|
| BCL Diocese ERP | `DIOCESE_ERP` | Phase 1 (this repo) |
| BCL OneCampus ERP | `ONECAMPUS` | Plug-in ready |
| BCL School ERP | `SCHOOL_ERP` | Planned |
| BCL HRMS | `HRMS` | Planned |
| BCL CRM | `CRM` | Planned |
| BCL Accounts | `ACCOUNTS` | Planned |

## Monorepo layout

- `apps/api` — NestJS modular monolith (`/api/v1`)
- `apps/web` — Next.js admin shell; product routes under `/diocese/*` (and later `/campus/*`)
- `apps/mobile` — reserved for Expo/Android (Phase 4)
- `packages/ui` — shared design system
- `packages/types` — shared enums/DTOs
- `packages/auth-client` / `packages/sdk` — browser auth + typed HTTP client

## Shared platform modules

Product-agnostic NestJS modules under `apps/api/src/modules/`:

- `identity` — JWT access/refresh, sessions, 2FA
- `rbac` — roles & permissions
- `tenancy` — organization scopes & access helpers
- `platform` — organizations, licenses, subscriptions (stubs)
- `audit` — mutation/activity timeline
- `files` — storage adapter (`local` now; S3/R2 ready)
- `notifications` — email/SMS/WhatsApp stubs
- `reports` — report registry stub

## Product domains

Diocese ERP lives in `apps/api/src/modules/diocese/` and **must not** import other product domains.

### OneCampus plug-in points

1. Add `apps/api/src/modules/campus/` (or similar) with Nest module registration in `AppModule`.
2. Map `Organization.productCode = ONECAMPUS`.
3. Mount UI routes under `apps/web/src/app/campus/*`.
4. Reuse `@bcl/sdk`, auth, RBAC, files, audit, notifications without change.

## API convention

Stable REST under `/api/v1`. OpenAPI at `/api/docs`. Prefer additive versioning over breaking changes so OneCampus and Diocese clients can share the SDK.

## Tenancy & security

See [TENANCY.md](./TENANCY.md) and [RBAC.md](./RBAC.md).
