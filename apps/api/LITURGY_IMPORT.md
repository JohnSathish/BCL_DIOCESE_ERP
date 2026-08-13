# Daily Liturgy Engine — CSV / JSON import

Upload at **App Control → Liturgy** (`/diocese/app-control/liturgy`) or:

- `POST /api/v1/liturgy/import` (multipart `file` or JSON `{ "days": [...] }`)
- `GET /api/v1/liturgy/template` — sample CSV
- `GET /api/v1/mobile/daily-content?date=YYYY-MM-DD&parishId=` — public daily payload

## Required column

| Column | Notes |
|--------|--------|
| `date` | `YYYY-MM-DD` (unique per organization) |

## Optional columns

`liturgicalYear`, `season`, `weekNumber`, `rank`, `feastName`, `liturgicalColour`, `saintOfDay`, `saintBio`, `saintPatronage`, `firstReading`, `psalm`, `secondReading`, `gospelReference`, `gospelTitle`, `gospelText`, `bibleVerse`, `bibleVerseReference`, `bibleVerseTheme`, `prayerTitle`, `prayerText`, `reflectionText`, `massNotes`, `language`

Upsert is idempotent on `(organizationId, date)`. Formats: **CSV**, **JSON**, **XLSX**.

## Phase 2 — overrides

Admin UI: `/diocese/app-control/liturgy/overrides`

| Endpoint | Purpose |
|----------|---------|
| `PUT /api/v1/liturgy/overrides` | Upsert diocese or parish overlay for a date |
| `GET /api/v1/liturgy/overrides?from=&to=&parishId=` | List |
| `DELETE /api/v1/liturgy/overrides/:id` | Soft-delete |

**Merge rule:** parish → diocese → master for **reflection** and **announcements** only.  
**Bishop message** comes from the diocese layer.  
**Gospel / readings / liturgical colour stay master-locked.**

## Phase 3 — AI reflection variants

Admin UI: `/diocese/app-control/liturgy/reflections`

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/liturgy/reflections/generate` | Generate children / youth / family / homily drafts from Gospel |
| `GET /api/v1/liturgy/reflections?date=` | List stored variants |
| `PUT /api/v1/liturgy/reflections/:id` | Edit title, body, homily bullet points |
| `DELETE /api/v1/liturgy/reflections/:id` | Soft-delete |

Variants are merged into `GET /api/v1/mobile/daily-content` under `meta.reflectionVariants`  
(`children`, `youth`, `family`, `homily`). Gospel text remains master-locked; drafts are rule-based from imported liturgy and should be reviewed before wide publication.
