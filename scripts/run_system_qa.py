"""
MedShield Full System QA Test
==============================
Tests every API endpoint, frontend health, backend gateway,
analytics service, and product service.
Outputs a full pass/fail report.
"""
import sys, json, time
sys.stdout.reconfigure(encoding='utf-8')
import urllib.request
import urllib.error

BASE_GW  = 'http://localhost:5000'
BASE_ANA = 'http://localhost:5101'
BASE_PRD = 'http://localhost:5102'
BASE_FE  = 'http://localhost:3000'

# Test credentials (local auth)
TEST_USER = 'admin'
TEST_PASS = 'medshield2025'

results = []

def test(label, url, method='GET', body=None, headers=None, expect_status=200, auth_token=None):
    h = {'Content-Type':'application/json'}
    if auth_token:
        h['Authorization'] = f'Bearer {auth_token}'
    if headers:
        h.update(headers)
    try:
        data = json.dumps(body).encode() if body else None
        req  = urllib.request.Request(url, data=data, headers=h, method=method)
        with urllib.request.urlopen(req, timeout=8) as r:
            raw = r.read().decode('utf-8','replace')
            try:    payload = json.loads(raw)
            except: payload = raw[:80]
            status = r.status
            ok = status == expect_status
            results.append({'label':label,'status':status,'ok':ok,'snippet':str(payload)[:100]})
            icon = '[PASS]' if ok else '[WARN]'
            print(f"  {icon} [{status}] {label}")
            if not ok:
                print(f"       Expected {expect_status}, got {status}")
            return payload, status
    except urllib.error.HTTPError as e:
        body_err = e.read().decode('utf-8','replace')[:80]
        ok = e.code == expect_status
        results.append({'label':label,'status':e.code,'ok':ok,'snippet':body_err})
        icon = '[PASS]' if ok else '[FAIL]'
        print(f"  {icon} [{e.code}] {label} — {body_err}")
        return None, e.code
    except Exception as e:
        results.append({'label':label,'status':0,'ok':False,'snippet':str(e)[:80]})
        print(f"  [FAIL] [ERR] {label} — {e}")
        return None, 0

print("=" * 65)
print("MEDSHIELD FULL SYSTEM QA TEST")
print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 65)

# ─── 1. Service Health ────────────────────────────────────────────
print("\n[1] SERVICE HEALTH")
test('Backend Gateway /api/health',   f'{BASE_GW}/api/health')
test('Analytics Service /health',     f'{BASE_ANA}/health')
test('Product Service /health',       f'{BASE_PRD}/health')
test('Frontend root page',            f'{BASE_FE}/', expect_status=200)

# ─── 2. Auth Flow ──────────────────────────────────────────────────
print("\n[2] AUTHENTICATION")
auth_payload, _ = test('POST /api/auth/login (admin)',
    f'{BASE_GW}/api/auth/login', method='POST',
    body={'username': TEST_USER, 'password': TEST_PASS})

token = None
if auth_payload and isinstance(auth_payload, dict):
    token = auth_payload.get('access_token') or auth_payload.get('token')
    if token:
        print(f"       Token obtained: {token[:20]}...")
    else:
        print(f"       [WARN]  No token in response: {str(auth_payload)[:100]}")

test('POST /api/auth/login (bad creds)',
    f'{BASE_GW}/api/auth/login', method='POST',
    body={'username':'wrong','password':'wrong'}, expect_status=401)

test('GET /api/auth/me (with token)',
    f'{BASE_GW}/api/auth/me', auth_token=token)

test('GET /api/auth/me (no token)',
    f'{BASE_GW}/api/auth/me', expect_status=401)

# ─── 3. Core Data Endpoints ───────────────────────────────────────
print("\n[3] CORE DATA ENDPOINTS (require auth)")
for ep in ['/api/summary','/api/monthly','/api/by_area','/api/year_summary',
           '/api/seasonality','/api/forecasts','/api/external_signals',
           '/api/inventory_recommendations','/api/regional_priorities',
           '/api/area_clusters','/api/product_priorities',
           '/api/allocation_recommendations','/api/product_region_matches',
           '/api/decision_alerts','/api/model_evaluation']:
    test(f'GET {ep}', f'{BASE_GW}{ep}', auth_token=token)

# ─── 4. Sales Endpoints ───────────────────────────────────────────
print("\n[4] SALES ENDPOINTS")
test('GET /api/sales/status',        f'{BASE_GW}/api/sales/status', auth_token=token)
test('GET /api/sales/transactions',  f'{BASE_GW}/api/sales/transactions', auth_token=token)
test('GET /api/sales/summary',       f'{BASE_GW}/api/sales/summary', auth_token=token)
test('GET /api/sales/transactions?year=2023', f'{BASE_GW}/api/sales/transactions?year=2023', auth_token=token)

# ─── 5. Analytics ML Endpoints ────────────────────────────────────
print("\n[5] ANALYTICS / ML ENDPOINTS (no auth required)")
for ep in ['/api/seasonal_epidemic_matrix','/api/model_summary',
           '/api/mcda_territories','/api/eoq_scenarios',
           '/api/therapeutic_categories','/api/procurement_orders']:
    test(f'GET {ep}', f'{BASE_GW}{ep}')

# ─── 6. Prescriptive Seasonal Restock (ALL 6 seasons) ────────────
print("\n[6] PRESCRIPTIVE SEASONAL RESTOCK — ALL SEASONS")
for season in ['amihan','summer','pre_monsoon','monsoon','typhoon','holiday']:
    payload, _ = test(
        f'GET /api/seasonal_restock_detail?season_id={season}',
        f'{BASE_GW}/api/seasonal_restock_detail?season_id={season}'
    )
    if payload and isinstance(payload, dict):
        detail = payload.get('detail', {})
        skus = detail.get('skus', [])
        print(f"       → {detail.get('season_name','?')} | {len(skus)} SKUs")

# ─── 7. Direct Analytics Service ─────────────────────────────────
print("\n[7] DIRECT ANALYTICS SERVICE")
for ep in ['/summary','/monthly','/seasonality','/forecasts',
           '/seasonal_epidemic_matrix','/seasonal_restock_detail?season_id=monsoon',
           '/model_summary','/mcda_territories','/eoq_scenarios']:
    test(f'ANA {ep}', f'{BASE_ANA}{ep}')

# ─── 8. Product Service ───────────────────────────────────────────
print("\n[8] PRODUCT SERVICE")
test('PRD /health',                  f'{BASE_PRD}/health')
test('PRD /therapeutic_categories',  f'{BASE_PRD}/therapeutic_categories')
test('PRD /procurement_orders',      f'{BASE_PRD}/procurement_orders')
test('PRD /classify_medicine?name=Paracetamol', f'{BASE_PRD}/classify_medicine?name=Paracetamol')

# ─── 9. Weather Endpoints ─────────────────────────────────────────
print("\n[9] WEATHER ENDPOINTS")
test('GET /api/weather/effects',     f'{BASE_GW}/api/weather/effects', auth_token=token)
test('GET /api/products',            f'{BASE_GW}/api/products', auth_token=token)

# ─── 10. Edge Cases / Error Handling ──────────────────────────────
print("\n[10] EDGE CASES")
test('Invalid products limit',       f'{BASE_GW}/api/products?limit=999', auth_token=token, expect_status=400)
test('Unknown season_id (fallback)', f'{BASE_GW}/api/seasonal_restock_detail?season_id=unknown')
test('Missing token on /api/summary',f'{BASE_GW}/api/summary', expect_status=401)

# ─── SUMMARY ──────────────────────────────────────────────────────
print("\n" + "=" * 65)
passed = sum(1 for r in results if r['ok'])
failed = sum(1 for r in results if not r['ok'])
total  = len(results)
pct    = round(passed/total*100, 1) if total else 0

print(f"QA SUMMARY: {passed}/{total} PASSED ({pct}%)")
if failed:
    print(f"\n[FAIL] FAILED TESTS ({failed}):")
    for r in results:
        if not r['ok']:
            print(f"   [{r['status']}] {r['label']}")
            print(f"        {r['snippet'][:120]}")
else:
    print("[PASS] ALL TESTS PASSED")
print("=" * 65)

# Save report
report = {
    "timestamp": time.strftime('%Y-%m-%dT%H:%M:%S'),
    "summary": {"passed":passed,"failed":failed,"total":total,"pass_rate_pct":pct},
    "results": results
}
import pathlib
pathlib.Path('outputs/system_qa_report.json').write_text(
    json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
print(f"[PASS] Full report saved: outputs/system_qa_report.json")
