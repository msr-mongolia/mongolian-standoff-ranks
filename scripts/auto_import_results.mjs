#!/usr/bin/env node
// Import only complete OCR matches that match an ACTUAL, still-open MSL Swiss fixture.
// A wrong/unknown tag, uncertain stat, incomplete map or missing fixture stays on hold.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(root, 'index.html');
const archivePath = path.join(root, 'scripts/auto-verified-results.json');
const dryRun = process.argv.includes('--dry-run');
const fixtureArg = process.argv.find(a => a.startsWith('--fixture='));
const endpoint = 'https://gqepygqtgosvpfirahgd.supabase.co/functions/v1/msr-results-export';
const text = fs.readFileSync(htmlPath, 'utf8');
const first = /window\.MSR_SCREENSHOT_MATCHES\s*=\s*(\[[^\n]*\]);/;
const second = /const screenshotMatches=(\[[^\n]*\]);/;
const one = text.match(first), two = text.match(second);
if (!one || !two) throw Error('Ledger copies missing: refusing to edit site');
const ledger = JSON.parse(one[1]);
if (JSON.stringify(ledger) !== JSON.stringify(JSON.parse(two[1]))) throw Error('Ledger copies differ');

const seedStart = text.indexOf('var MSR_S3_TAGS =');
const seedEnd = text.indexOf('function ensureS3Matches()', seedStart);
if (seedStart < 0 || seedEnd < 0) throw Error('MSL Stage 3 fixture generator not found');
const norm = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = new Map([
  ['kingzz','kngzz'], ['vampempire','6vmp6'],
  ['dxvil13','dxiii'], ['2990red','2990'], ['2990purple','2990purple'],
  ['2990white','2990white'], ['0men','omen'], ['omnisover','omv'],
  ['elitekings','eks'], ['elitekingzz','eknz'], ['everlasted','evkz'],
]);
const canonical = t => aliases.get(norm(t)) || norm(t);
const keyOf = m => [canonical(m.a), canonical(m.b)].sort().join('|') +
  '|' + (m.stage3 ? 'stage3:' + (m.round || '?') : m.stage4 ? 'stage4' : m.slot || 'other');
const known = new Set(ledger.map(keyOf));
const stored = fs.existsSync(archivePath) ? JSON.parse(fs.readFileSync(archivePath, 'utf8')) : [];
if (!Array.isArray(stored)) throw Error('Auto-verification audit archive must be an array');
const sources = new Set(stored.map(row => String(row.source_message_id)));

function fixtures() {
  // Use exactly the same Swiss pairing algorithm/data as the public MSR bracket.
  const window = { MSR_SCREENSHOT_MATCHES: ledger };
  vm.runInNewContext(text.slice(seedStart, seedEnd), { window }, { timeout: 3000 });
  return window.msrS3().rounds.flatMap(r => r.groups.flatMap(g =>
    g.matches.filter(m => m.a && m.b && !m.res && !m.bye)
      .map(m => ({ a: m.a, b: m.b, round: r.n }))));
}

function validate(raw) {
  if (!raw || typeof raw.a !== 'string' || typeof raw.b !== 'string' ||
      !Array.isArray(raw.uncertain) || raw.uncertain.length ||
      !Array.isArray(raw.maps) || raw.maps.length < 2 || raw.maps.length > 3) return false;
  const allowed = new Set(['Rust','Province','Breeze','Dune','Hanami','Sandstone','Prison','Sakura']);
  const names = new Set(), wins = [0,0];
  for (const m of raw.maps) {
    if (!allowed.has(m.map) || names.has(m.map) ||
        !Number.isInteger(m.aScore) || !Number.isInteger(m.bScore) ||
        m.aScore === m.bScore || Math.max(m.aScore,m.bScore) < 13 ||
        m.aScore < 0 || m.bScore < 0) return false;
    names.add(m.map);
    wins[m.aScore > m.bScore ? 0 : 1]++;
    for (const side of ['a','b']) {
      if (!Array.isArray(m[side]) || m[side].length !== 5) return false;
      const nicks = new Set();
      for (const p of m[side]) {
        if (!Array.isArray(p) || p.length !== 4 || typeof p[0] !== 'string' ||
            !p[0].trim() || p[0].length > 70 ||
            nicks.has(p[0].toLowerCase()) ||
            !p.slice(1).every(v => Number.isInteger(v) && v >= 0 && v <= 150)) return false;
        nicks.add(p[0].toLowerCase());
      }
    }
    const sum = (side, i) => m[side].reduce((acc,p) => acc+p[i],0);
    if (Math.abs(sum('a',1)-sum('b',2)) > 10 ||
        Math.abs(sum('b',1)-sum('a',2)) > 10) return false;
  }
  return Math.max(...wins) === 2 && (raw.maps.length === 2 ? Math.min(...wins) === 0 : Math.min(...wins) === 1);
}

const payload = fixtureArg ? JSON.parse(fs.readFileSync(fixtureArg.slice('--fixture='.length), 'utf8'))
  : await (async () => { const r = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw Error('Results export unavailable: HTTP ' + r.status);
      return r.json(); })();
const rows = Array.isArray(payload) ? payload : payload.results;
if (!Array.isArray(rows)) throw Error('Expected results array from MSR export');
let added = 0, held = 0, duplicates = 0;
for (const row of rows.slice().sort((a,b) => String(a.source_timestamp).localeCompare(String(b.source_timestamp)))) {
  const sourceId = String(row.source_message_id || '');
  const raw = row.match;
  if (!/^\d{15,25}$/.test(sourceId) || !validate(raw)) { held++; continue; }
  if (sources.has(sourceId)) { duplicates++; continue; }
  const matches = fixtures().filter(f =>
    [canonical(f.a),canonical(f.b)].sort().join('|') ===
    [canonical(raw.a),canonical(raw.b)].sort().join('|'));
  if (matches.length !== 1) { held++; continue; }
  const f = matches[0];
  const reversed = canonical(raw.a) === canonical(f.b);
  const match = {
    a: f.a, b: f.b,
    maps: raw.maps.map(m => ({ map: m.map,
      aScore: reversed ? m.bScore : m.aScore,
      bScore: reversed ? m.aScore : m.bScore,
      a: reversed ? m.b : m.a, b: reversed ? m.a : m.b })),
    stage3: true, round: f.round, date: 'NOV ' + (16 + f.round),
  };
  const key = keyOf(match);
  if (known.has(key)) { duplicates++; continue; }
  ledger.push(match); known.add(key); sources.add(sourceId);
  stored.push({ source_message_id: sourceId, source_timestamp: row.source_timestamp,
    verification: 'automatic-ocr-validated-and-matched-to-official-swiss-fixture', match });
  added++;
  console.log('AUTO VERIFIED:', sourceId, match.a, 'vs', match.b, 'round', match.round);
}
console.log(`Auto results: added=${added} held=${held} already_registered=${duplicates}`);
if (added && !dryRun) {
  const next = text.replace(first, `window.MSR_SCREENSHOT_MATCHES = ${JSON.stringify(ledger)};`)
    .replace(second, `const screenshotMatches=${JSON.stringify(ledger)};`);
  if (next === text) throw Error('Ledger update failed');
  fs.writeFileSync(htmlPath, next);
  fs.writeFileSync(archivePath, JSON.stringify(stored, null, 2) + '\n');
}
if (dryRun) console.log('DRY RUN: no changes written');
