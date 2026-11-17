"""Random-grouping null check for the family ABC-XYZ result, 11 Nov 2026. Offline, read-only, retrospective.

REGISTERED BEFORE RUNNING: the F3 statistic (mean share of year-Y A-X value kept in Y+1, years 2021..2025; years with no
A-X item are skipped and the number of such years reported) is computed for 200 random groupings that keep the exact
family-size distribution of candidate mapping v1 (labels shuffled, seed 20261111 + i). A stricter null shuffles only
within product_category. The mapping is judged to capture real product structure if its statistic exceeds the 95th
percentile of both null distributions; otherwise the 52% -> 82% gain is treated as a size effect.
Run from repo root:  python -X utf8 outputs/family_rerun_20261111/null_check.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
import csv, hashlib, importlib.util, io, json, random
import numpy as np

REGISTRATION = __doc__.split('Run from')[0]
ROOT = Path.cwd(); OUT = ROOT / 'outputs/family_rerun_20261111'
CODE = ROOT / 'databricks_updated_2/medshield_project/original_source_20261026/02_original_sales_silver_20261026.py'
spec = importlib.util.spec_from_file_location('canonical', CODE); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
bundle = m.original_bundle(ROOT / 'databricks_updated_2/medshield_project_csv'); assessed = m.assess_bundle(bundle['raw'])
pkg = ROOT / 'databricks_updated_2/category_releases/category_b160d6aad4376d64'
master = list(csv.DictReader(io.StringIO((pkg / 'accepted_product_master.csv').read_text(encoding='utf-8-sig'))))
receipt = json.loads((pkg / 'category_acceptance.json').read_bytes()); contract = json.loads((pkg / 'publication_contract.json').read_bytes())
m.validate_inputs(master, receipt, contract)
el = [r for r in m.gold_candidates(assessed, receipt, bundle['files'])['itemized'] if r['is_net_sales_technically_eligible']]
assert sum(Decimal(str(r['net_sales'])) for r in el) == Decimal('638015351.53')
mp = list(csv.DictReader((ROOT / 'outputs/product_family_draft_20261111/family_mapping_v1_candidate.csv').open(encoding='utf-8')))
family = {r['recorded_label']: r['family_v1'] for r in mp}; category = {r['recorded_label']: r['product_category'] for r in mp}

months = [f'{y}-{mo:02d}' for y in range(2020, 2027) for mo in range(1, 13)]
ix = {p: i for i, p in enumerate(months)}; N = len(months)
label_series = defaultdict(lambda: np.zeros(N))
for r in el:
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10]); p = f'{d.year}-{d.month:02d}'
    if p in ix and p <= '2026-09': label_series[r['normalized_product']][ix[p]] += float(r['net_sales'])
labels = sorted(label_series); L = np.array([label_series[k] for k in labels]); pos = {k: i for i, k in enumerate(labels)}
year_cols = {Y: [ix[f'{Y}-{mo:02d}'] for mo in range(1, 13)] for Y in range(2020, 2027)}

def stat(assign):
    """assign: label -> group. Returns (mean AX value kept, years with AX)."""
    gid = {}; idx = np.array([gid.setdefault(assign[k], len(gid)) for k in labels])
    G = np.zeros((len(gid), N)); np.add.at(G, idx, L)
    def cls(Y):
        c = G[:, year_cols[Y]]; tot = c.sum(1); keep = tot > 0; order = np.argsort(-np.where(keep, tot, -np.inf), kind='stable')
        run, total, out = 0.0, tot[keep].sum(), {}
        for g in order:
            if not keep[g]: break
            abc = 'A' if run < .8 * total else 'B' if run < .95 * total else 'C'; run += tot[g]
            cv = c[g].std() / c[g].mean(); out[g] = abc + ('X' if cv <= .5 else 'Y' if cv <= 1 else 'Z')
        return out, tot
    kept = []
    for Y in range(2021, 2026):
        now, tot = cls(Y); nxt = G[:, year_cols[Y + 1]].sum(1) if Y + 1 < 2026 else G[:, [ix[f'2026-{mo:02d}'] for mo in range(1, 10)]].sum(1)
        ax = [g for g, c in now.items() if c == 'AX']
        if ax: kept.append(nxt[ax].sum() / tot[ax].sum())
    return (float(np.mean(kept)) if kept else None), len(kept)

real, real_years = stat(family)
sizes = defaultdict(int)
for k in labels: sizes[family[k]] += 1
def null(i, within_category):
    rng = random.Random(20261111 + i); assign = {}
    if not within_category:
        shuffled = labels[:]; rng.shuffle(shuffled); it = iter(shuffled)
        for g, n in sizes.items():
            for _ in range(n): assign[next(it)] = g
        return assign
    for cat in {category[k] for k in labels}:
        members = [k for k in labels if category[k] == cat]; groups = [family[k] for k in members]; rng.shuffle(members)
        assign.update(zip(members, groups))  # same family sizes per category, labels shuffled within it
    return assign
res = {'registration_sha256': hashlib.sha256(REGISTRATION.encode()).hexdigest(), 'mapping_statistic': real, 'mapping_ax_years': real_years,
       'label_statistic': stat({k: k for k in labels})[0]}
for name, within in (('size_matched', False), ('size_and_category_matched', True)):
    vals = [stat(null(i, within)) for i in range(200)]
    v = np.array([x for x, _ in vals if x is not None])
    res[name] = dict(runs=200, runs_with_ax=len(v), mean=float(v.mean()), p95=float(np.quantile(v, .95)),
                     share_at_or_above_mapping=float((v >= real).mean()))
res['passes'] = bool(real > res['size_matched']['p95'] and real > res['size_and_category_matched']['p95'])
(OUT / 'null_check.json').write_text(json.dumps(res, indent=1)); print(json.dumps(res, indent=1))
