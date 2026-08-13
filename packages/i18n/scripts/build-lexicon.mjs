/**
 * Builds offline Garo ↔ English lexicon from Wiktionary TSV export.
 * Source: https://github.com/Vuizur/Wiktionary-Dictionaries (CC BY-SA)
 *
 * Usage: node packages/i18n/scripts/build-lexicon.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const rawPath = join(root, 'lexicon', 'garo-wiktionary.raw.tsv');
const outDir = join(root, 'lexicon');

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractGlosses(definitionHtml) {
  const text = stripHtml(definitionHtml);
  return text
    .split(/(?<=\.)\s+/)
    .map((s) => s.replace(/^\(\w+\)\s*/, '').trim())
    .filter(Boolean);
}

function normalizeGaro(word) {
  return word.split('|')[0].trim();
}

function normalizeEn(gloss) {
  return gloss.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();
}

const raw = readFileSync(rawPath, 'utf8');
const garoToEn = {};
const enToGaro = {};

for (const line of raw.split('\n')) {
  if (!line.trim()) continue;
  const tab = line.indexOf('\t');
  if (tab < 0) continue;
  const garoRaw = line.slice(0, tab);
  const defHtml = line.slice(tab + 1);
  const glosses = extractGlosses(defHtml);
  if (!glosses.length) continue;

  const garo = normalizeGaro(garoRaw);
  garoToEn[garo] = glosses;

  for (const gloss of glosses) {
    const key = normalizeEn(gloss);
    if (!key || key.length < 2) continue;
    if (!enToGaro[key]) enToGaro[key] = [];
    if (!enToGaro[key].includes(garo)) enToGaro[key].push(garo);
  }
}

mkdirSync(outDir, { recursive: true });

const meta = {
  source: 'Wiktionary via Vuizur/Wiktionary-Dictionaries',
  license: 'CC BY-SA 3.0',
  garoEntries: Object.keys(garoToEn).length,
  englishEntries: Object.keys(enToGaro).length,
  builtAt: new Date().toISOString(),
};

writeFileSync(
  join(outDir, 'garo-en.json'),
  JSON.stringify({ meta, entries: garoToEn }, null, 2),
);
writeFileSync(
  join(outDir, 'en-garo.json'),
  JSON.stringify({ meta, entries: enToGaro }, null, 2),
);

console.log(`Garo lexicon built: ${meta.garoEntries} Garo → EN, ${meta.englishEntries} EN → Garo`);
