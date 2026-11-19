#!/usr/bin/env node
// Import staff-verified screenshot matches into both identical MSR ledgers.
// Usage: node scripts/import_verified_matches.mjs scripts/verified-results.json
import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2];
if (!input) throw new Error('Expected a JSON file containing verified match entries');
const root = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(root, 'index.html');
const original = fs.readFileSync(htmlPath, 'utf8');
const entries = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
if (!Array.isArray(entries) || !entries.length) throw new Error('No matches to import');

const first = /window\.MSR_SCREENSHOT_MATCHES\s*=\s*(\[[^\n]*\]);/;
const second = /const screenshotMatches=(\[[^\n]*\]);/;
const a = original.match(first), b = original.match(second);
if (!a || !b) throw new Error('MSR ledger copies not found');
const main = JSON.parse(a[1]), mirror = JSON.parse(b[1]);
if (JSON.stringify(main) !== JSON.stringify(mirror)) throw new Error('Existing ledger copies differ: refusing import');
const keyOf = m => [m.a.toLowerCase(), m.b.toLowerCase()].sort().join('|') + '|' + (m.stage3 ? 's3' : m.slot || '');
const known = new Set(main.map(keyOf));
let added = 0;

for (const item of entries) {
  const m = item.match ?? item;
  if (typeof m.a !== 'string' || typeof m.b !== 'string' || !Array.isArray(m.maps)) throw new Error('Invalid match');
  if (m.maps.length < 2 || m.maps.length > 3) throw new Error('A verified Bo3 requires 2–3 maps');
  const wins = [0, 0];
  for (const map of m.maps) {
    if (typeof map.map !== 'string' || !Number.isInteger(map.aScore) || !Number.isInteger(map.bScore) || map.aScore === map.bScore) throw new Error('Invalid map score');
    for (const side of ['a', 'b']) {
      if (!Array.isArray(map[side]) || map[side].length !== 5) throw new Error('Each map needs exactly five verified players per team');
      for (const p of map[side]) {
        if (!Array.isArray(p) || p.length !== 4 || typeof p[0] !== 'string' || !p[0] || !p.slice(1).every(n => Number.isInteger(n) && n >= 0)) throw new Error('Invalid player K/D/A');
      }
    }
    wins[map.aScore > map.bScore ? 0 : 1]++;
  }
  if (Math.max(...wins) !== 2 || (m.maps.length === 3 && Math.min(...wins) !== 1)) throw new Error('Bo3 series winner mismatch');
  const key = keyOf(m);
  if (known.has(key)) { console.log('Already registered:', m.a, 'vs', m.b); continue; }
  known.add(key); main.push(m); added++;
}
if (!added) { console.log('No new matches'); process.exit(0); }
const updated = original.replace(first, `window.MSR_SCREENSHOT_MATCHES = ${JSON.stringify(main)};`).replace(second, `const screenshotMatches=${JSON.stringify(main)};`);
if (updated === original) throw new Error('Ledger replacement failed');
fs.writeFileSync(htmlPath, updated);
console.log(`Imported ${added} match(es) to both ledgers, total=${main.length}`);
