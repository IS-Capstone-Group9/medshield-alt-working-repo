"""Source-bound financial ABC report; unavailable XYZ/accounts remain explicit."""
from __future__ import annotations

import argparse
from collections import defaultdict
import csv
from datetime import datetime
from decimal import Decimal
import hashlib
import json
from pathlib import Path
from zoneinfo import ZoneInfo

SOURCE_SHA = '9c48b9da2353d184420f1c5dea0713b7360d09130520e44d87384ef88f531673'
DATASET = 'e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10'
META = dict(evidence_label='Derived', dataset_id=DATASET,
            policy_version='original_source_layers_v1_candidate_only', assumption_ids='[]')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_csv(path, rows):
    with path.open('x', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader(); writer.writerows(rows)


def build(source_path, output):
    if sha(source_path) != SOURCE_SHA:
        raise ValueError('Reviewed source capture hash differs')
    source = json.loads(source_path.read_text(encoding='utf-8'))
    if (source['release']['dataset_id'] != DATASET or source['release']['fact_delta_version'] != 0
            or source['contracts_excluded'] is not True or source['physical_quantity_approved'] is not False):
        raise ValueError('Unsupported source population/quantity scope')
    for query in source['queries'].values():
        if hashlib.sha256(query['sql'].encode()).hexdigest() != query['sql_sha256']:
            raise ValueError('Captured SQL hash differs')
    rows = source['queries']['products']['rows']
    products = {}
    for row in rows:
        key, label = row['product_key'], row['normalized_product']
        if hashlib.sha256(label.encode()).hexdigest() != key:
            raise ValueError('Recorded-label identity differs')
        item = products.setdefault(key, dict(product=label, net=Decimal(0), positive=Decimal(0),
            negative=Decimal(0), records=0, eligible=0, provenance=set()))
        if row['source_data_status'] in item['provenance']:
            raise ValueError('Repeated product/provenance aggregate')
        item['provenance'].add(row['source_data_status'])
        for destination, field in [('net','revenue'),('positive','positive_revenue'),('negative','negative_revenue')]:
            item[destination] += Decimal(row[field] or '0')
        item['records'] += int(row['records']); item['eligible'] += int(row['revenue_records'])
        if int(row['quantity_records']) != 0 or row['recorded_quantity'] is not None:
            raise ValueError('Quantity capture contract changed')
    net = sum((p['net'] for p in products.values()), Decimal(0))
    if net != Decimal('638015351.53'):
        raise ValueError('Signed financial control differs')
    denominator = sum((max(Decimal(0), p['net']) for p in products.values()), Decimal(0))
    cumulative = Decimal(0)
    classified = []
    for rank, (key, item) in enumerate(sorted(products.items(), key=lambda pair: (-pair[1]['net'], pair[1]['product'])), 1):
        abc = ('Unclassified' if item['net'] <= 0 else 'A' if cumulative < denominator * Decimal('.80')
               else 'B' if cumulative < denominator * Decimal('.95') else 'C')
        classified.append(dict(rank=rank, product_key=key, product=item['product'], net_sales=str(item['net']),
            positive_transaction_sales=str(item['positive']), negative_adjustments=str(item['negative']),
            positive_net_share_before=str(cumulative / denominator), abc=abc,
            xyz='Unavailable_Unreviewed_Presentation_And_Quantity', recorded_quantity=None,
            source_records=item['records'], revenue_eligible_records=item['eligible'],
            source_provenance=';'.join(sorted(item['provenance'])), absence_not_stock_on_hand=True, **META))
        cumulative += max(Decimal(0), item['net'])
    write_csv(output / 'T2.0_financial_product_classes.csv', classified)
    matrix = []
    for abc in ('A', 'B', 'C', 'Unclassified'):
        selected = [r for r in classified if r['abc'] == abc]
        amount = sum((Decimal(r['net_sales']) for r in selected), Decimal(0))
        matrix.append(dict(abc=abc, xyz='Unavailable_Unreviewed_Presentation_And_Quantity',
            recorded_label_count=len(selected), net_sales=str(amount), signed_net_share_pct=str(amount / net * 100),
            mean_margin_pct=None, margin_reason='Not captured in this inherited product aggregate',
            review_policy='Financial contribution review only; XYZ/stock policy unavailable', **META))
    write_csv(output / 'T2.1_abc_xyz_matrix_summary.csv', matrix)
    company_months = source['queries']['company_months']['rows']
    base_months = {r['month'][5:7] for r in company_months if r['month'][:4] == '2025'}
    target_months = {r['month'][5:7] for r in company_months if r['month'][:4] == '2026'}
    common = sorted(base_months & target_months)
    changes = defaultdict(lambda: {'base': Decimal(0), 'target': Decimal(0), 'base_rows':0, 'target_rows':0})
    for row in source['queries']['comparison_months']['rows']:
        if row['month'][5:7] not in common:
            continue
        side = 'base' if row['month'][:4] == '2025' else 'target'
        changes[row['product_key']][side] += Decimal(row['revenue'] or '0')
        changes[row['product_key']][side + '_rows'] += int(row['records'])
    top = [dict(section='top_20_full_history_contributors', product_key=r['product_key'], product=r['product'],
        full_history_net_sales=r['net_sales'], matched_base_net=None, matched_target_net=None,
        matched_delta_net=None, matched_months=';'.join(common), absence_interpretation=None, **META) for r in classified[:20]]
    for key, values in sorted(changes.items(), key=lambda pair: (pair[1]['target'] - pair[1]['base'], pair[0]))[:20]:
        top.append(dict(section='largest_20_matched_2025_2026_recorded_declines', product_key=key,
            product=products[key]['product'], full_history_net_sales=str(products[key]['net']),
            matched_base_net=str(values['base']), matched_target_net=str(values['target']),
            matched_delta_net=str(values['target'] - values['base']), matched_months=';'.join(common),
            absence_interpretation='No recorded product rows is not zero demand, stockout, or physical inventory', **META))
    write_csv(output / 'T2.2_top_products_and_matched_declines.csv', top)
    write_csv(output / 'T2.3_derived_account_readiness.csv', [dict(status='UNAVAILABLE',
        derived_account_key=None, reason='Capture contains no stable account ID or reviewed account linkage; area/DR cannot establish an account', **META)])
    audit = [dict(check='signed_financial_conservation', status='PASS', value=str(net),
                  limitation='Itemized candidate; contracts excluded; not complete company sales', **META),
             dict(check='negative_financial_adjustments', status='RETAINED_SEPARATELY',
                  value=str(sum((p['negative'] for p in products.values()), Decimal(0))),
                  limitation='Signed financial adjustments do not establish physical returned units', **META),
             dict(check='quantity_and_xyz', status='UNAVAILABLE', value='0 eligible captured quantities',
                  limitation='No recorded_quantity is present; do not invent monthly quantity or unit conversion', **META),
             dict(check='derived_accounts', status='UNAVAILABLE', value=None,
                  limitation='No reviewed D2 mapping is supplied; no account Pareto or inactivity result', **META),
             dict(check='historical_mapping_capture', status='HISTORICAL_UNAPPROVED_CAPTURE', value=str(len(source['queries']['mappings']['rows'])),
                  limitation='27 October capture predates later nine-label confirmation; no current mapping status or new territory allocation is inferred', **META)]
    write_csv(output / 'T2.4_mapping_and_data_quality_audit.csv', audit)
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    positive = [r for r in classified if Decimal(r['net_sales']) > 0]
    curve, value = [], Decimal(0)
    for row in positive:
        value += Decimal(row['net_sales']); curve.append(float(value / denominator * 100))
    fig, axis = plt.subplots(figsize=(9,5), layout='constrained')
    axis.plot(range(1,len(positive)+1), curve)
    axis.axhline(80, color='gray', linestyle='--'); axis.axhline(95, color='gray', linestyle=':')
    axis.set(xlabel='Positive-net recorded product labels ranked by net sales', ylabel='Cumulative positive-net share (%)',
        title='Financial Pareto; recorded labels are not verified SKUs')
    fig.suptitle(f'Derived | Dataset {DATASET}\nPolicy {META["policy_version"]}; assumption_ids []', fontsize=8)
    fig.savefig(output / 'F2.1_product_pareto_curve.png', dpi=160); plt.close(fig)
    result = dict(status='PARTIAL_WP2_FINANCIAL_REVIEW_ONLY', **META,
        checked_at=datetime.now(ZoneInfo('Asia/Manila')).isoformat(), source_path=str(source_path), source_sha256=SOURCE_SHA,
        source_generated_at=source['generated_at'], source_records=sum(p['records'] for p in products.values()),
        revenue_eligible_records=sum(p['eligible'] for p in products.values()), recorded_labels=len(products),
        signed_net_sales=str(net), positive_product_net_denominator=str(denominator),
        abc_counts={r['abc']:r['recorded_label_count'] for r in matrix}, matched_months_2025_2026=common,
        xyz_available=False, account_linkage_available=False, financial_release_approved=False,
        publication_approved=False, new_mapping_approval=False, warehouse_queries_this_run=0,
        limitations=['Inherited 27 October Gold capture; no fresh warehouse read.',
            'ABC uses positive product net totals, not positive transaction amounts; signed adjustments are retained.',
            'No full-history aggregate is assigned a synthetic month.',
            'XYZ, unit demand, account Pareto, inactivity, margin and growth-share-margin bubble are unavailable.',
            'Capture mapping metadata is historical; current nine-label mapping is not replaced.'])
    result['assumption_ids'] = []
    (output/'results.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    (output/'README.md').write_text('# WP2 partial financial priority and readiness — 30 October 2026\n\n'
        'This packet recomputes financial ABC from the source-hashed inherited Gold capture. It does not duplicate the raw source, '
        'publish models, infer accounts or convert units. T2.0 supplies every recorded-label classification; T2.1 explicitly leaves XYZ '
        'unavailable; T2.2 contains full-history contributors and exact company-calendar matched 2025/2026 declines. Product absence '
        'means no recorded rows in this capture, not zero demand or stockout. T2.3/T2.4 retain missing account/unit inputs and historical '
        'mapping limitations. F2.1 describes positive product net contribution; signed negative strata remain in totals.\n\n'
        'Run `python -X utf8 outputs/wp2_product_area_account_priority_20261030/verify.py`. The separate verifier recomputes source '
        'sums, cutoff crossings, signed classes and matched-month changes with Decimal arithmetic and checks input/code/output hashes. '
        'No API/UI/export parity or complete WP2 acceptance is claimed. Next source/catalog owners supply reviewed D1/D2 mappings; '
        'engineering integrates only source-compatible reviewed candidates.\n',encoding='utf-8')
    (output/'PAPER_INSERT.md').write_text('# Chapter 4 insert — partial financial prioritization\n\n'
        f'Table T2.1 reconciles {len(products):,} recorded product labels and ₱{net:,.2f} signed itemized net sales from an inherited '
        'Gold Delta-0 capture. The positive-product-net ABC convention retains the cutoff-crossing label in its starting class; '
        'Table T2.0 preserves all classifications and signed adjustments. Figure F2.1 shows financial concentration, while Table T2.2 '
        'separates full-history contributors from matched-calendar 2025/2026 declines. These are recorded-label financial findings, '
        'not verified SKU unit-demand or stock-policy classifications. XYZ and account analyses remain unavailable because the capture '
        'contains no approved quantities/presentations or reviewed account linkage. Historical mapping metadata is not evidence against '
        'the later nine-label delivery mapping. No source refresh, new mapping acceptance, publication or full WP2 closure is inferred.\n',encoding='utf-8')
    manifest=dict(source_path=str(source_path),source_sha256=SOURCE_SHA,
        code_path=str(Path(__file__).resolve()),code_sha256=sha(Path(__file__)),
        files={str(p.relative_to(output)).replace('\\','/'):sha(p) for p in output.rglob('*')
               if p.is_file() and p.name not in ('manifest.json','verification.json')})
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,required=True);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    result=build(args.source,args.output)
    print(json.dumps({k:result[k] for k in ('recorded_labels','signed_net_sales','abc_counts')}))


if __name__=='__main__':main()
