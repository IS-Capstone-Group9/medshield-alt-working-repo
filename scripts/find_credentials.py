import sys, json
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path

candidates = [
    'backend/data/local_accounts.json',
    'backend/src/local_accounts.json',
    'data/local_accounts.json',
    '.data/local_accounts.json',
    'backend/.data/local_accounts.json',
]
found = False
for p in candidates:
    f = Path(p)
    if f.exists():
        found = True
        print(f'Found: {p}')
        raw = json.loads(f.read_text(encoding='utf-8'))
        accounts = raw if isinstance(raw, list) else raw.get('accounts', [raw])
        for acc in accounts:
            print(f'  user={acc.get("username")} email={acc.get("email")} role={acc.get("role")}')

if not found:
    print('No local_accounts.json found. Searching...')
    for f in Path('.').rglob('local_accounts*'):
        print(f'  Found at: {f}')

# Check .env for default creds or seeds
env = Path('.env')
if env.exists():
    for line in env.read_text(encoding='utf-8').splitlines():
        upper = line.upper()
        if any(k in upper for k in ['ADMIN','SEED','DEFAULT_USER','DEFAULT_PASS']):
            print(f'ENV: {line}')

# Check localAuth source for seeded accounts
local_auth = Path('backend/src/localAuth.ts')
if local_auth.exists():
    content = local_auth.read_text(encoding='utf-8')
    # Find any hardcoded seed accounts
    import re
    seeds = re.findall(r"username['\"]?\s*[:=]\s*['\"]([^'\"]+)['\"]", content)
    passwords = re.findall(r"password['\"]?\s*[:=]\s*['\"]([^'\"]+)['\"]", content)
    if seeds:
        print(f'Seed usernames in localAuth.ts: {seeds}')
    if passwords:
        print(f'Seed passwords in localAuth.ts: {passwords[:3]}')
