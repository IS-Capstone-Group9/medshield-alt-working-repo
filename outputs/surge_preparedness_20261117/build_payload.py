"""Builds surge_payload.json (observed DOH/PAGASA risk calendar + registered alert results) from results.json.
The gateway pins its SHA-256. Run from repo root after run.py:  python -X utf8 outputs/surge_preparedness_20261117/build_payload.py
"""
from pathlib import Path
import hashlib, json

OUT = Path.cwd() / 'outputs/surge_preparedness_20261117'
r = json.loads((OUT / 'results.json').read_text(encoding='utf-8'))
EXPOSED = {a['alert']: a['exposed'] for a in r['alerts'] if a['alert'] != 'Typhoon'}
payload = {
    'schema_version': 'surge_preparedness_v1',
    'status': 'candidate_observed_calendar',
    'evidence': 'outputs/surge_preparedness_20261117',
    'rules_sha256': r['rules_sha256'],
    'doh_sha256': r['doh_sha256'],
    'category_mapping_sha256': r['category_mapping_sha256'],
    'surge_index_rule': 1.2,
    'calendar': [{k: c[k] for k in ('disease', 'geography', 'seasonal_index', 'surge_months', 'total_cases_2021_2025', 'pandemic_flag')} for c in r['calendar']],
    'exposed_categories': EXPOSED,
    'weather': r['weather'],
    'alerts': [{k: a[k] for k in ('alert', 'exposed', 'hit_rate_alert', 'hit_rate_no_alert', 'p_holm', 'useful')} | {'alert_months': len(a['alert_months'])} for a in r['alerts']],
    'alert_note': 'Only Diarrhoeal passed, and it fires in 28 of 36 months (rising trend): not a usable early warning. Alerts are preparedness reminders, not demand signals.',
    'forecast_approved': False,
    'procurement_approved': False,
}
raw = json.dumps(payload, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
(OUT / 'surge_payload.json').write_text(raw, encoding='utf-8')
print(hashlib.sha256(raw.encode('utf-8')).hexdigest())
