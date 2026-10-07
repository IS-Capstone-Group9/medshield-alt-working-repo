"""Reset admin password to a known value for QA testing."""
import sys, json
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path

# Use the same scrypt implementation as localAuth.ts (Python's hashlib)
import hashlib, os, base64

def scrypt_hash(password: str) -> str:
    salt = os.urandom(16)
    salt_b64 = base64.b64encode(salt).decode()
    key = hashlib.scrypt(password.encode(), salt=salt, n=32768, r=8, p=1, dklen=64)
    key_hex = key.hex()
    return f"scrypt:32768:8:1${salt_b64}${key_hex}"

NEW_PASSWORD = "MedShield2026!"
accounts_path = Path('backend/data/local_accounts.json')
accounts = json.loads(accounts_path.read_text(encoding='utf-8'))

for acc in accounts:
    if acc['username'] == 'admin':
        acc['password_hash'] = scrypt_hash(NEW_PASSWORD)
        print(f"Reset admin password to: {NEW_PASSWORD}")

accounts_path.write_text(json.dumps(accounts, indent=2), encoding='utf-8')
print("Saved.")
