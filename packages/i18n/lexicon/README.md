# Offline Garo Lexicon

Word-level Garo ↔ English dictionary bundled with `@bcl/i18n` for offline use.

## Source

- **Raw:** `garo-wiktionary.raw.tsv` — extracted from [Wiktionary](https://en.wiktionary.org/) via [Vuizur/Wiktionary-Dictionaries](https://github.com/Vuizur/Wiktionary-Dictionaries)
- **License:** CC BY-SA 3.0 (Wiktionary contributors)

## Files

| File | Description |
|------|-------------|
| `garo-en.json` | Garo word → English glosses (~950 entries) |
| `en-garo.json` | English word → Garo candidates (~866 entries) |
| `garo-wiktionary.raw.tsv` | Original TSV export |

## Rebuild

```bash
node packages/i18n/scripts/build-lexicon.mjs
```

## Usage notes

- This is a **word dictionary**, not a sentence translator. Sacred Heart UI uses curated `parishSite.json` strings for full-page Garo.
- The lexicon helps expand translations and can power future auto-suggest in `/diocese/languages`.
- Garo Christian terminology often uses established loanwords (Mass, Sacrament, Parish) mixed with A∙chik grammar — review with local speakers.
