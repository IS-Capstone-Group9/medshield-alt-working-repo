import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/medshieldReference.ts', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

pos = text.find('id=\\"page-products\\"')
if pos != -1:
    end = text.find('id=\\"page-territory\\"', pos)
    snippet = text[pos:end].replace('\\n', '\n').replace('\\"', '"')
    print("PAGE PRODUCTS SNIPPET:")
    print(snippet)
