#!/usr/bin/env node
// Apply organizer-confirmed Swiss pairings without modifying results or stats.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(root, 'index.html');
const configPath = path.join(root, 'scripts/msl-stage3-official-pairings.json');
const html = fs.readFileSync(htmlPath, 'utf8');
const pairs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const expected = { '1-0': 4, '0-1': 4, '2-0': 2, '1-1': 4, '0-2': 2 };
const seedsRow = html.match(/window\.MSR_S3_SEEDS = \[([^\]]+)\];/);
if (!seedsRow) throw new Error('Missing MSL Stage 3 team seed list');
const registered = new Set([...seedsRow[1].matchAll(/'([^']+)'/g)].map(x => x[1]));
if (Object.keys(pairs).length !== Object.keys(expected).length) throw new Error('Unexpected Swiss groups');
for (const [group, n] of Object.entries(expected)) {
  if (!Array.isArray(pairs[group]) || pairs[group].length !== n) throw new Error(`Expected ${n} matchups in ${group}`);
  const used = new Set();
  for (const match of pairs[group]) {
    if (!Array.isArray(match) || match.length !== 2 || match[0] === match[1]) throw new Error('Invalid Swiss pairing');
    for (const team of match) {
      if (!registered.has(team) || used.has(team)) throw new Error(`Unknown or repeated Swiss team: ${team}`);
      used.add(team);
    }
  }
}

const target = /^  window\.MSR_S3_FORCE = [\s\S]*?;[^\n]*$/m;
if (!target.test(html)) throw new Error('Cannot locate Stage 3 Swiss pairing configuration');
const rendered = '  window.MSR_S3_FORCE = ' + JSON.stringify(pairs, null, 2).replaceAll('\n', '\n  ') + '; // organizer-confirmed Stage 3 matchups';
const next = html.replace(target, rendered);
if (next === html) {
  console.log('Official Swiss pairings already up to date');
} else {
  fs.writeFileSync(htmlPath, next);
  console.log('Applied official Swiss pairings to live site source');
}
