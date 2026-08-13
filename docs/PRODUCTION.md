# BCL Diocese ERP — Production launch guide

**Platform:** BCL Diocese ERP (one codebase, multi-tenant)  
**First diocese:** Roman Catholic Diocese of Tura (`turadiocese.in`)  
**First parish:** Sacred Heart Shrine Parish, Tura  

| Role | Host |
|------|------|
| Diocese public site | https://turadiocese.in |
| Diocese ERP | https://erp.turadiocese.in |
| Central API | https://api.turadiocese.in |
| Central media | https://media.turadiocese.in |
| Parish site (subdomain) | https://sacredheart.turadiocese.in |
| Parish custom domain | https://sacredheartshrinetura.in → same tenant |

Do **not** deploy a separate ERP or website per parish. Onboard parishes via Diocese Control Center + database/CMS.

## Architecture rule

```
Diocese → Parish → Users → Families → Persons → Sacraments → …
```

Tenant keys: `organizationId` (diocese) + `parishId` on records. Isolation is enforced in the API (`TenancyService`), not only in the UI.

Host → parish resolution:

1. `ParishDomain.host` mapping
2. `CmsSite.customDomain`
3. `CmsSite.subdomain` + `DioceseProfile.primaryDomain` (e.g. `sacredheart` + `turadiocese.in`)
4. Next middleware: `GET /api/v1/cms/resolve-host?host=…` → rewrite `/site/{slug}`

Premium public layout (optional theme):

```json
themeJson: { "layout": "premium-shrine" }
```

## Environments

| Env | Example file | Notes |
|-----|--------------|--------|
| Development | `.env.development.example` | Local Docker Postgres `:5433` |
| Staging | `.env.staging.example` | Mirror prod; `SEED_ON_START=false` |
| Production | `.env.production.example` | Real secrets only on host |

Set `DIOCESE_PUBLIC_BASE_DOMAIN=turadiocese.in` and `NEXT_PUBLIC_DIOCESE_PRIMARY_DOMAIN=turadiocese.in`.

Never commit `.env`, `.env.production`, or live JWT/DB passwords.

## Deploy (Docker)

**Shared Hostinger VPS** (College ERP / Dosa already on 80/443) — use the isolated stack:

```bash
cp .env.hostinger.example .env.production   # fill secrets
docker compose -f docker/docker-compose.hostinger.yml --env-file .env.production up -d --build
```

Then add host Nginx from `docker/hostinger/nginx-bcl-diocese.conf`. Full steps: [`docs/HOSTINGER_VPS.md`](HOSTINGER_VPS.md).

**Dedicated server only** (this stack owns 80/443):

```bash
cp .env.production.example .env.production   # fill secrets
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml --env-file .env.production up -d --build
```

- API applies schema on start (`PRISMA_SCHEMA_PUSH=true` recommended until migrations are fully reconciled).
- **Seed is off** unless `SEED_ON_START=true` (first bootstrap only).
- Hostinger path does **not** bind host 80/443 / 5432 / 6379.

## DNS / TLS checklist

1. Apex + `www`, `erp`, `api`, `media` for `turadiocese.in`
2. Wildcard `*.turadiocese.in` (or individual parish CNAMEs)
3. Custom parish domains: A/CNAME → same edge as parish subdomain; add row in Domain Management
4. Issue wildcard + apex certificates (Let’s Encrypt DNS-01 or Cloudflare)

## First-time bootstrap

1. Create production Postgres + Redis + object storage (R2/S3).
2. Configure DNS/TLS as above.
3. Deploy with `SEED_ON_START=true` and `SEED_MODE=production` **once**, then set `SEED_ON_START=false`.
4. Confirm seed: Diocese `primaryDomain=turadiocese.in`, Sacred Heart `subdomain=sacredheart`, `customDomain=sacredheartshrinetura.in`, `ParishDomain` rows.
5. Rotate all seed passwords; St. Mary demo parish is inactive under `SEED_MODE=production`.
6. Verify tenant isolation: parish priest cannot read another parish’s families.
7. Point mobile production EAS at `https://api.turadiocese.in/api/v1`.
8. Build Android: `cd apps/mobile && eas build --profile production --platform android`.

## Onboarding a new parish (no new codebase)

Diocese Admin → Create Parish → Assign Priest / Parish Admin → CMS settings (subdomain + optional custom domain) → Mass schedule → Activate.

## Launch checklist

- [ ] Domain + DNS (apex, wildcard, custom parish domains)
- [ ] SSL / HSTS active
- [ ] Production database + backups
- [ ] Redis + object storage
- [ ] API / Web / Nginx deployed
- [ ] CMS content verified
- [ ] Auth + RBAC + parish isolation tested
- [ ] Domain Management mappings verified (`/diocese/domains`)
- [ ] Certificates + notifications + mobile API
- [ ] Demo users / banners removed
- [ ] Final UAT signed off
