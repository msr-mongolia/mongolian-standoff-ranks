#!/usr/bin/env python3
"""Sanity checks for index.html (run locally or in CI). Exit 1 on any failure.
Checks: JS syntax of every <script>, ledger copies identical, no duplicate pairs, series winners, `results` stays empty."""
import json, re, subprocess, sys
s = open('index.html', encoding='utf-8').read()
fail = []

# 1. JS syntax (needs node)
js = '''
const s=require('fs').readFileSync('index.html','utf8');const re=/<script(?![^>]*ld\\+json)[^>]*>([\\s\\S]*?)<\\/script>/g;let m,n=0,bad=0;
while((m=re.exec(s))){try{new Function(m[1]);n++}catch(e){bad++;console.log('JS syntax error:',e.message)}}
console.log('scripts ok:',n);process.exit(bad?1:0)'''
r = subprocess.run(['node', '-e', js], capture_output=True, text=True)
print(r.stdout.strip())
if r.returncode: fail.append('JS syntax')

# 2. ledger copies
a = re.findall(r'window\.MSR_SCREENSHOT_MATCHES\s*=\s*(\[.*?)\];\n', s, re.S)
b = re.findall(r'const screenshotMatches=(\[.*?)\];\n', s, re.S)
if len(a) != 1 or len(b) != 1:
    fail.append('ledger copies not found exactly once (%d, %d)' % (len(a), len(b)))
else:
    A, B = json.loads(a[0] + ']'), json.loads(b[0] + ']')
    print('ledger entries:', len(A))
    if A != B: fail.append('the two ledger copies differ')
    seen = {}
    for i, e in enumerate(A):
        key = (frozenset([e['a'].lower(), e['b'].lower()]), e.get('slot') or '')
        if key in seen: fail.append('duplicate pair %s vs %s (entries %d, %d)' % (e['a'], e['b'], seen[key], i))
        seen[key] = i
        if not e.get('maps') and not e.get('auto'): fail.append('entry %d (%s-%s) has no maps/auto' % (i, e['a'], e['b']))
        wa = sum(1 for m in e.get('maps', []) if m['aScore'] > m['bScore'])
        wb = sum(1 for m in e.get('maps', []) if m['bScore'] > m['aScore'])
        ties = [m['map'] for m in e.get('maps', []) if m['aScore'] == m['bScore']]
        if ties: fail.append('entry %d (%s-%s) tied map %s' % (i, e['a'], e['b'], ties))
        if e.get('maps') and not e.get('auto') and max(wa, wb) != 2: fail.append('entry %d (%s-%s) series not decided 2-x (%d-%d)' % (i, e['a'], e['b'], wa, wb))

# 3. the empty `results` array must stay empty (a past append into it broke the site)
if s.count('const results=[];') != 1 or s.count('const results=[,') != 0:
    fail.append('`const results=[];` must exist exactly once and stay empty')

print('FAILED:' if fail else 'all checks passed')
for f in fail: print(' -', f)
sys.exit(1 if fail else 0)
