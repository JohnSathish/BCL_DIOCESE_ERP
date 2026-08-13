# RBAC

## Model

- **Roles** — named job functions (`PARISH_PRIEST`, `DIOCESE_ADMINISTRATOR`, …)
- **Permissions** — fine-grained codes (`family.read`, `member.write`, …)
- **UserRole** — assignment of a role to a user, optionally at a **Scope** (e.g. a specific parish)

`isSuperAdmin` on `User` bypasses permission checks.

## Seeded roles

Super Admin, Platform Admin, Diocese Administrator, Bishop, Vicar General, Finance Officer, Dean, Parish Priest, Assistant Priest, Secretary, Office Staff, Catechist, Finance Staff, Youth Coordinator, Choir Coordinator, Volunteer, Family Head, Family Member, Guest.

## Permission codes (Phase 1)

`org.*`, `diocese.*`, `deanery.*`, `parish.*`, `family.*`, `member.*`, `rbac.*`, `audit.read`, `files.write`, `i18n.read`, `i18n.write`, `i18n.translate`

## Guards

- `@Public()` — skip JWT
- `@RequirePermissions('family.read')` — permission gate
- `@RequireRoles('SUPER_ADMIN', 'PLATFORM_ADMIN')` — role gate

## Extending for OneCampus

Add permission codes namespaced by product (`campus.student.read`) and attach them to campus roles. Do not overload Diocese permission strings.
