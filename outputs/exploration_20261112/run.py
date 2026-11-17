"""Exploratory model search with online (no-peeking) selection, 12 Nov 2026. Local only; not registered evidence.

All months were inspected by earlier studies, so results are EXPLORATORY. To keep the error estimate honest, every
meta-method chooses methods or weights at each origin using only errors already known at that origin.

Series: total, routine (documents < PHP 500k plus no-DR rows), large (documents >= PHP 500k). 2020-01..2026-09.
Scored targets: 2022-01..2026-09, leads 1, 3, 6. Metrics: WAPE, normalized bias, share within +/-15%.
Run from repo root:  python -X utf8 outputs/exploration_20261112/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
import csv, importlib.util, io, json, sys, warnings
import numpy as np

warnings.filterwarnings('ignore')
ROOT = Path.cwd(); OUT = ROOT / 'outputs/exploration_20261112'
sys.path.insert(0, str(ROOT / 'services'))
from analytics_service.predictive.stable_ets import forecast as stable_ets
CODE = ROOT / 'databricks_updated_2/medshield_project/original_source_20261026/02_original_sales_silver_20261026.py'
spec = importlib.util.spec_from_file_location('canonical', CODE); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
bundle = m.original_bundle(ROOT / 'databricks_updated_2/medshield_project_csv'); assessed = m.assess_bundle(bundle['raw'])
pkg = ROOT / 'databricks_updated_2/category_releases/category_b160d6aad4376d64'
master = list(csv.DictReader(io.StringIO((pkg / 'accepted_product_master.csv').read_text(encoding='utf-8-sig'))))
receipt = json.loads((pkg / 'category_acceptance.json').read_bytes()); contract = json.loads((pkg / 'publication_contract.json').read_bytes())
m.validate_inputs(master, receipt, contract)
el = [r for r in m.gold_candidates(assessed, receipt, bundle['files'])['itemized'] if r['is_net_sales_technically_eligible']]
assert sum(Decimal(str(r['net_sales'])) for r in el) == Decimal('638015351.53')

rows = []
for r in el:
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10]); ym = f'{d.year}-{d.month:02d}'
    if '2020-01' <= ym <= '2026-09': rows.append((ym, r['dr_number'], float(r['net_sales'])))
months = sorted({p for p, _, _ in rows}); ix = {p: i for i, p in enumerate(months)}; N = len(months)
doc = defaultdict(float)
for p, dr, v in rows:
    if dr: doc[(p, dr)] += v
S = {k: np.zeros(N) for k in ('total', 'routine', 'large')}
for p, dr, v in rows:
    S['total'][ix[p]] += v
    S['large' if dr and doc[(p, dr)] >= 500_000 else 'routine'][ix[p]] += v
TARGETS = [i for i, p in enumerate(months) if p >= '2022-01']
LEADS = (1, 3, 6)

# ---- base methods: f(y, o, h) -> forecast of y[o+h] using y[:o+1] only
def mean_k(k): return lambda y, o, h: float(np.mean(y[o-k+1:o+1]))
def median_k(k): return lambda y, o, h: float(np.median(y[o-k+1:o+1]))
def seasonal_naive(y, o, h): return float(y[o + h - 12 * ((h - 1) // 12 + 1)])
def drift(y, o, h):
    w = y[o-23:o+1]; return float(w[-1] + h * (w[-1] - w[0]) / 23)
def growth_mean6(y, o, h):
    """mean_6 scaled by the trailing 12-month vs prior 12-month ratio, damped by half and clipped to +/-30%."""
    a, b = y[o-11:o+1].sum(), y[o-23:o-11].sum()
    g = 1.0 if b <= 0 else float(np.clip(1 + 0.5 * (a / b - 1), 0.7, 1.3))
    return float(np.mean(y[o-5:o+1])) * g
def seasonal_index_mean6(y, o, h):
    """mean_6 times a shrunk month-of-year index from the 36 months to the origin (index shrunk halfway to 1)."""
    tgt = (o + h) % 12; hist = y[max(0, o-35):o+1]; base = hist.mean()
    same = [y[k] for k in range(max(0, o-35), o+1) if k % 12 == tgt]
    idx = 1.0 if base <= 0 or not same else 0.5 + 0.5 * (np.mean(same) / base)
    return float(np.mean(y[o-5:o+1])) * idx
_ets_cache = {}
def ets(y, o, h):
    key = (id(y), o)
    if key not in _ets_cache:
        pred, _ = stable_ets({k: float(y[k]) for k in range(o + 1)}, o, list(LEADS), damped=False)
        _ets_cache[key] = pred
    pred = _ets_cache[key]
    return pred.get(h, np.nan)
def theta(y, o, h):
    from statsmodels.tsa.forecasting.theta import ThetaModel
    key = ('theta', id(y), o)
    if key not in _ets_cache:
        try: _ets_cache[key] = np.asarray(ThetaModel(np.maximum(y[:o+1], 1.0), period=12).fit().forecast(max(LEADS)))
        except Exception: _ets_cache[key] = None
    f = _ets_cache[key]; return np.nan if f is None else float(f[h - 1])

BASE = {'mean_3': mean_k(3), 'mean_6': mean_k(6), 'mean_12': mean_k(12), 'median_6': median_k(6), 'seasonal_naive': seasonal_naive,
        'drift_24': drift, 'growth_mean_6': growth_mean6, 'seasonal_index_mean_6': seasonal_index_mean6, 'ets': ets, 'theta': theta}

def run_series(y):
    """Forecast matrix F[method][lead][o] for every origin with enough history."""
    F = {k: {h: {} for h in LEADS} for k in BASE}
    for o in range(24, N - 1):
        for h in LEADS:
            if o + h >= N: continue
            for k, f in BASE.items():
                try: v = f(y, o, h)
                except Exception: v = np.nan
                F[k][h][o] = v
    return F

def meta(F, y, h):
    """Online meta-methods: decide at each origin using only errors of targets <= origin."""
    out = {'select_best_12': {}, 'inverse_error_combo': {}, 'top3_combo': {}, 'equal_combo_simple': {}}
    for o in sorted(F['mean_6'][h]):
        past = [q for q in F['mean_6'][h] if q + h <= o and q + h >= o - 11]  # last 12 known errors at this lead
        err = {}
        for k in BASE:
            e = [abs(F[k][h][q] - y[q + h]) for q in past if np.isfinite(F[k][h].get(q, np.nan))]
            if len(e) >= 6 and np.isfinite(F[k][h].get(o, np.nan)): err[k] = float(np.mean(e))
        simple = [F[k][h][o] for k in ('mean_3', 'mean_6', 'median_6', 'growth_mean_6')]
        out['equal_combo_simple'][o] = float(np.mean(simple))
        if not err: continue
        best = min(err, key=err.get); out['select_best_12'][o] = F[best][h][o]
        w = {k: 1 / v for k, v in err.items() if v > 0}; tot = sum(w.values())
        out['inverse_error_combo'][o] = sum(F[k][h][o] * w[k] / tot for k in w)
        top = sorted(err, key=err.get)[:3]; out['top3_combo'][o] = float(np.mean([F[k][h][o] for k in top]))
    return out

def score(pairs):
    f = np.array([a for a, _ in pairs]); a = np.array([b for _, b in pairs]); den = np.abs(a).sum()
    return dict(cases=len(a), wape=float(np.abs(f - a).sum() / den), bias=float((f - a).sum() / den),
                within15=float(np.mean(np.abs(f - a) <= .15 * np.abs(a))))

res, store = {}, {}
for name in ('total', 'routine', 'large'):
    y = S[name]; F = run_series(y); res[name] = {}; store[name] = {}
    for h in LEADS:
        M = meta(F, y, h); allm = {**{k: F[k][h] for k in BASE}, **M}
        res[name][f'lead{h}'] = {}
        for k, fc in allm.items():
            pairs = [(fc[o], y[o + h]) for o in fc if o + h in TARGETS and np.isfinite(fc[o])]
            if len(pairs) >= 30: res[name][f'lead{h}'][k] = score(pairs)
        store[name][h] = {k: {months[o + h]: fc[o] for o in fc if o + h in TARGETS and np.isfinite(fc[o])} for k, fc in allm.items()}

# Combined total = routine forecast + large-order trailing-24 mean (expected value of lumpy orders)
for h in LEADS:
    comb = {}
    for k in store['routine'][h]:
        common = {p: v + float(np.mean(S['large'][ix[p] - h - 23: ix[p] - h + 1])) for p, v in store['routine'][h][k].items()}
        comb[k] = common
    res['total'][f'lead{h}'].update({f'routine:{k}+large_mean24': score([(v, S['total'][ix[p]]) for p, v in fc.items()])
                                     for k, fc in comb.items() if len(fc) >= 30})
    store['total'][h].update({f'routine:{k}+large_mean24': fc for k, fc in comb.items()})

(OUT / 'results.json').write_text(json.dumps(res, indent=1))
(OUT / 'forecasts.json').write_text(json.dumps({s: {str(h): v for h, v in d.items()} for s, d in store.items()}))
(OUT / 'actuals.json').write_text(json.dumps({s: dict(zip(months, map(float, S[s]))) for s in S}))
for name in res:
    for lead, tab in res[name].items():
        best = sorted(tab.items(), key=lambda kv: kv[1]['wape'])[:5]; ref = tab['mean_6']
        print(name, lead, 'mean_6 %.1f%%/%.1f%%' % (ref['wape'] * 100, ref['bias'] * 100), '| best:',
              ', '.join('%s %.1f%%/%+.1f%%' % (k, v['wape'] * 100, v['bias'] * 100) for k, v in best))
