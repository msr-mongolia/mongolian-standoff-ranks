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
// Swiss opponents may meet again in a later round: do not discard that result.
const keyOf = m => [m.a.toLowerCase(), m.b.toLowerCase()].sort().join('|') + '|' +
  (m.stage3 ? 's3:' + (m.round || 1) : m.slot || '');
const known = new Map(main.map(m => [keyOf(m), m]));
let added = 0;
let correctedDates = 0;

function updateVerifiedDate(originalMatch, correctedMatch, sourceId) {
  if (!sourceId || originalMatch.date === correctedMatch.date) return;
  // An amended date must never silently overwrite existing map scores or KDA.
  if (originalMatch.a !== correctedMatch.a || originalMatch.b !== correctedMatch.b ||
      JSON.stringify(originalMatch.maps) !== JSON.stringify(correctedMatch.maps) ||
      JSON.stringify(originalMatch.auto ?? null) !== JSON.stringify(correctedMatch.auto ?? null)) {
    throw new Error('Date correction has conflicting scoreboard: ' + correctedMatch.a + ' vs ' + correctedMatch.b);
  }
  if (typeof correctedMatch.date !== 'string' || !/^NOV \d{1,2}$/.test(correctedMatch.date)) throw new Error('Invalid corrected date');
  originalMatch.date = correctedMatch.date;
  correctedDates++;
}

for (const item of entries) {
  const m = item.match ?? item;
  if (typeof m.a !== 'string' || typeof m.b !== 'string' || !Array.isArray(m.maps)) throw new Error('Invalid match');
  // Organizer-confirmed walkovers have no screenshots and must never create
  // fabricated map or player statistics. The Swiss bracket reads m.auto.
  if (m.maps.length === 0 && m.auto) {
    if (!m.stage3 || !Number.isInteger(m.round) || ![2, 0].includes(m.auto.a) ||
        ![2, 0].includes(m.auto.b) || m.auto.a + m.auto.b !== 2 ||
        !item.source_message_id) throw new Error('Invalid organizer-confirmed walkover');
    const key = keyOf(m);
    if (known.has(key)) { updateVerifiedDate(known.get(key), m, item.source_message_id); console.log('Already registered auto:', m.a, 'vs', m.b); continue; }
    known.set(key, m); main.push(m); added++;
    continue;
  }
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
  if (known.has(key)) { updateVerifiedDate(known.get(key), m, item.source_message_id); console.log('Already registered:', m.a, 'vs', m.b); continue; }
  known.set(key, m); main.push(m); added++;
}
if (!added && !correctedDates) { console.log('No new matches or corrected dates'); process.exit(0); }
const updated = original.replace(first, `window.MSR_SCREENSHOT_MATCHES = ${JSON.stringify(main)};`).replace(second, `const screenshotMatches=${JSON.stringify(main)};`);
if (updated === original) throw new Error('Ledger replacement failed');
fs.writeFileSync(htmlPath, updated);
console.log(`Imported ${added} match(es), corrected ${correctedDates} date(s) in both ledgers, total=${main.length}`);
