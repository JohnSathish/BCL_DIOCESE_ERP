# Multi-tenant model

## Hierarchy (Diocese ERP)

```
Platform
  └── Organization (tenant root)
        └── Diocese profile
              └── Deanery
                    └── Parish
                          └── SubStation / BCC
                                └── Family
                                      └── Member
```

## Isolation strategy (Phase 1)

- **Single PostgreSQL database**, row-level isolation via `organizationId` on domain tables.
- Parish-scoped users also filter by `parishId` (from JWT scope).
- Diocese-level roles (Bishop, Diocese Administrator, etc.) see all parishes in their organization.
- Super Admin / Platform Admin can operate across organizations.

## Scope tree

`Scope` rows store hierarchical `path` strings (ltree-style ancestry) for future fine-grained ACL and reporting. Each Parish/Deanery gets a scope with `refId` pointing at the domain entity.

## Future options (no domain rewrite required)

- Schema-per-tenant or database-per-tenant can be introduced behind Prisma / connection routing.
- Domain services already take `AuthPayload` and call `TenancyService.assertOrgAccess` / `assertParishAccess`.

## Enforcement

1. JWT carries `organizationId`, `parishId`, `roles`, `permissions`, `scopeIds`.
2. Controllers use permission guards.
3. Services apply tenant filters and soft deletes (`deletedAt`).
