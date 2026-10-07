import sys
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
import re

c = Path('frontend/lib/medshieldReference.ts').read_text(encoding='utf-8')
exports = [(i, c[i:i+40]) for i in range(len(c)) if c[i:i+14] == 'export const M']
print(f'Total exports: {len(exports)}')
for pos, snip in exports:
    print(f'  pos={pos}: {repr(snip)}')

funcs = re.findall(r'^(async function|function) \w+', c, re.MULTILINE)
print(f'Top-level functions: {funcs}')

checks = ['clickable-season', 'active-season', 'seasonalDrilldownTable', 'drilldownTitle',
          'selectSeasonRestock', 'window.selectSeasonRestock', 'drilldown-prompt', 'ts-nocheck']
for k in checks:
    pos = c.find(k)
    status = 'FOUND' if pos != -1 else 'MISSING'
    print(f'{k}: {status} at pos {pos}')

print(f'File length: {len(c)} chars, {c.count(chr(10))} real newlines')
