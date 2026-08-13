# Diocese-centric multi-parish architecture

BCL Diocese ERP is **one** application. Parishes are tenants, not separate deployments.

## Hierarchy

```
BCL Diocese ERP
 └── Organization (= Diocese), e.g. Roman Catholic Diocese of Tura
      ├── DioceseProfile.primaryDomain = turadiocese.in
      └── Parish (e.g. Sacred Heart Shrine Parish)
           ├── CmsSite.subdomain = sacredheart  → sacredheart.turadiocese.in
           ├── CmsSite.customDomain = sacredheartshrinetura.in
           └── ParishDomain rows (host → parishId)
```

`organizationId` is the diocese tenant key in the current schema. `parishId` scopes parish data. Backend `TenancyService` enforces isolation.

## Hosts

| Host | Purpose |
|------|---------|
| `turadiocese.in` | Diocese public site (apex; not rewritten to a parish) |
| `erp.turadiocese.in` | Authenticated ERP |
| `api.turadiocese.in` | Central API |
| `media.turadiocese.in` | Media |
| `{subdomain}.turadiocese.in` | Parish public site |
| Custom domain | Same parish via `ParishDomain` / `CmsSite.customDomain` |

Resolution: `GET /api/v1/cms/resolve-host?host=…` → Next middleware rewrites `/` to `/site/{slug}`.

## Onboarding a parish

1. Create parish (Diocese Admin)
2. Assign priest / parish admin
3. CMS settings: subdomain (+ optional custom domain)
4. Domain Management: DNS/SSL status
5. Mass schedule, CMS content, activate

No new codebase, database, or mobile app per parish.

## Admin UI

- `/diocese/domains` — Domain Management
- `/diocese/cms/settings` — subdomain + custom domain (syncs `ParishDomain`)
