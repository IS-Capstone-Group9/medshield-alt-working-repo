import pathlib

p = pathlib.Path('frontend/app/page.tsx')
content = p.read_text(encoding='utf-8')
lines = content.splitlines()

print("Searching for 'Function' in page.tsx:")
for i, line in enumerate(lines):
    if 'Function' in line or 'runDashboardScript' in line:
        print(f"Line {i+1}: {line}")
