from pathlib import Path
ts = Path('frontend/lib/medshieldReference.ts')
content = ts.read_text(encoding='utf-8')

before = len(content)
# Remove the bad window.if assignment in all its escaped forms
bad_variants = [
    'if(typeof window!=="undefined")window.if=if;\\n',
    'if(typeof window!="undefined")window.if=if;\\n',
    'window.if=if;\\n',
    'window.if=if;',
]
for bad in bad_variants:
    content = content.replace(bad, '')

after = len(content)
ts.write_text(content, encoding='utf-8')
print(f'Removed {before - after} chars')
print(f'window.if=if still present: {"window.if=if" in content}')
print(f'window.showPage present:    {"window.showPage" in content}')
print(f'window.toggleNavigation:    {"window.toggleNavigation" in content}')
print(f'File length: {len(content)}')
