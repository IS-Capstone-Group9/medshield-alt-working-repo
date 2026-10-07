import re
import glob
import sys

# Set stdout encoding
sys.stdout.reconfigure(encoding='utf-8')

files = glob.glob('frontend/**/*.ts', recursive=True) + glob.glob('frontend/**/*.tsx', recursive=True)
files = [f for f in files if 'node_modules' not in f and '.next' not in f]

for path in sorted(files):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        text = f.read()
    
    canvases = re.findall(r'<canvas[^>]*id=\\?["\']([^"\'\\]+)', text)
    if not canvases:
        continue
    
    print(f"\n==========================================")
    print(f"FILE: {path}")
    print(f"Found {len(canvases)} canvases: {canvases}")
    
    for cid in canvases:
        # find the enclosing div or card
        pos = text.find(cid)
        start = max(0, pos - 300)
        end = min(len(text), pos + 300)
        snip = text[start:end].replace('\\n', '\n').replace('\\"', '"')
        print(f"\n  --- Canvas: {cid} ---")
        lines = [l for l in snip.split('\n') if any(w in l for w in ['<div', 'class=', '<canvas', 'chart-', 'height', 'style='])]
        for l in lines:
            try:
                print("   ", l.strip()[:100])
            except Exception:
                pass
