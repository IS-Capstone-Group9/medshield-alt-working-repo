import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/medshieldReference.ts', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

pos = text.find('id=\\"page-overview\\"')
if pos != -1:
    end = text.find('id=\\"page-revenue\\"', pos)
    snippet = text[pos:end].replace('\\n', '\n').replace('\\"', '"')
    print("PAGE OVERVIEW SNIPPET:")
    print(snippet)
