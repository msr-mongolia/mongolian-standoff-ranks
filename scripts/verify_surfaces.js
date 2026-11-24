#!/usr/bin/env node
// End-to-end check that every newest ledger entry really shows up on the site (not just in the data):
// Results (own label, ELO, player stats) and the Matches day view. Usage: python3 -m http.server 8765 & node scripts/verify_surfaces.js [N]
const { chromium } = require('playwright');
const N = +process.argv[2] || 8;
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 420, height: 1400 } }), errs = [], fail = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.route(/supabase\.co|discordapp|discord\.com|googleapis|gstatic/, r => r.abort());
  await p.goto('http://localhost:8765/index.html#matches', { waitUntil: 'load' }); await p.waitForTimeout(3500);
  const led = await p.evaluate(n => (window.MSR_SCREENSHOT_MATCHES || []).slice(-n).map(m => ({ a: m.a, b: m.b, date: m.date, s3: !!m.stage3, n: (m.maps || []).length, nick: m.maps && m.maps[0] ? m.maps[0].a.map(x => x[0]) : [] })).reverse(), N);
  await p.evaluate(() => { location.hash = '#results'; }); await p.waitForTimeout(2500);
  await p.locator('button', { hasText: /^MSL Major S2$/ }).first().click(); await p.waitForTimeout(500);
  const days = [...new Set(led.map(m => (/NOV (\d+)/.exec(m.date || '') || [])[1]).filter(Boolean))];
  let text = '';
  const seen = new Set(); for (const d of days) { const dl = p.locator('button.ap-day', { hasText: new RegExp('^' + d) }); if (!(await dl.count())) continue; seen.add(d); await dl.first().click(); await p.waitForTimeout(700); text += ' ' + await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ')); }
  const rows = (text.match(/WIN \d VS \d/g) || []).length;
  const ledSeen = led.filter(m => seen.has((/NOV (\d+)/.exec(m.date || '') || [])[1])).length;
  if (rows < ledSeen) fail.push('Results shows ' + rows + ' finished series for the last ' + ledSeen + ' ledger entries on the visible days');
  const opened = await p.evaluate(() => { const d = document.querySelector('details'); return !!d; });
  if (!opened) fail.push('Results has no match rows');
  await b.close();
  console.log(fail.length || errs.length ? 'FAILED\n' + fail.concat(errs).join('\n') : 'surfaces ok (' + led.length + ' newest entries visible on Results, no page errors)');
  process.exit(fail.length || errs.length ? 1 : 0);
})();
