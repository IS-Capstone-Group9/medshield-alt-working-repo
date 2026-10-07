import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/medshieldReference.ts', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

import re
pos = text.find('id=\\"page-revenue\\"')
if pos == -1:
    pos = text.find('id="page-revenue"')
print("Found page-revenue at:", pos)
if pos != -1:
    end = text.find('id=\\"page-products\\"', pos)
    if end == -1: end = text.find('id="page-products"', pos)
    print("Page revenue snippet:")
    snippet = text[pos:end].replace('\\n', '\n').replace('\\"', '"')
    print(snippet)
