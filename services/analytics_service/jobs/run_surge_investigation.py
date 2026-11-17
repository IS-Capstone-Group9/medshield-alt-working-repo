"""Offline surge localization using the reviewed original-source parser."""
import argparse
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

from ..predictive.surge_investigation import contributions

ROOT = Path(__file__).resolve().parents[3]
TARGETS = ('2023-02', '2023-05', '2025-06', '2026-02', '2026-04')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    if args.out.exists():
        raise ValueError('Refusing to overwrite evidence')
    project = ROOT / 'databricks_updated_2/medshield_project'
    parser_path = project / 'original_source_20261026/01_original_sales_bronze_20261026.py'
    spec = importlib.util.spec_from_file_location('surge_original_source', parser_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    bundle = module.original_bundle(project.parent / 'medshield_project_csv')
    assessed = module.assess_bundle(bundle['raw'])
    acceptance_path = project.parent / 'category_releases/category_b160d6aad4376d64/category_acceptance.json'
    gold = module.gold_candidates(assessed, json.loads(acceptance_path.read_bytes()), bundle['files'])['itemized']
    company_path = ROOT / 'outputs/wp4_forecast_tournament_20261030/source.json'
    company = json.loads(company_path.read_bytes())
    controls = {r['month']: r for r in company['monthly'] if r['month'] >= '2020-01'}
    monthly = defaultdict(list)
    for row in gold:
        month = str(row['date_delivered'])[:7]
        if month in controls:
            monthly[month].append(row)
    checks = 0
    for month, control in controls.items():
        rows = monthly[month]
        assert len(rows) == int(control['source_records'])
        assert sum(r['is_net_sales_technically_eligible'] for r in rows) == int(control['net_eligible_records'])
        assert sum((Decimal(str(r['net_sales'])) for r in rows if r['is_net_sales_technically_eligible']), Decimal(0)) == Decimal(control['net_sales_php'])
        checks += 3
    review_path = ROOT / 'outputs/catalog_preparation/product_evidence/review_candidates.json'
    review = json.loads(review_path.read_bytes())
    candidates = {r['raw_product']: r for r in review['candidate_matches']}
    summaries, all_contributions, daily, priority = [], [], [], {}
    for target in TARGETS:
        history = sorted(m for m in controls if m < target)[-6:]
        rows = [r for month in [*history, target] for r in monthly[month]]
        for row in rows:
            row['product_buyer_key'] = json.dumps([row['normalized_product'], row['area']], ensure_ascii=False)
        actual = Decimal(controls[target]['net_sales_php'])
        baseline = sum((Decimal(controls[m]['net_sales_php']) for m in history), Decimal(0)) / 6
        dimensions = {}
        for dimension, field in [('product', 'normalized_product'), ('buyer_channel', 'area'), ('product_buyer_channel', 'product_buyer_key')]:
            result = contributions(rows, history, target, field)
            assert abs(sum((Decimal(r['surge_contribution_php']) for r in result), Decimal(0)) - (actual-baseline)) < Decimal('.000001')
            checks += 1
            for r in result:
                all_contributions.append(dict(target=target, dimension=dimension, **r))
                if dimension == 'product' and Decimal(r['surge_contribution_php']) > 0:
                    priority[r['label']] = priority.get(r['label'], Decimal(0)) + Decimal(r['surge_contribution_php'])
            dimensions[dimension] = result[:5]
        days = defaultdict(lambda: dict(net=Decimal(0), records=0, eligible_records=0, positive=Decimal(0), negative=Decimal(0)))
        for row in monthly[target]:
            day = days[str(row['date_delivered'])]
            day['records'] += 1
            if row['is_net_sales_technically_eligible']:
                value = Decimal(str(row['net_sales']))
                day['eligible_records'] += 1
                day['net'] += value
                day['positive'] += max(value, 0)
                day['negative'] += min(value, 0)
        assert sum((d['net'] for d in days.values()), Decimal(0)) == actual
        checks += 1
        day_rows = [dict(target=target, delivery_day=d, **{k:str(v) if isinstance(v, Decimal) else v for k,v in values.items()}) for d,values in sorted(days.items())]
        daily.extend(day_rows)
        summaries.append(dict(target=target, history=history, actual_php=str(actual), mean6_php=str(baseline),
            underforecast_php=str(actual-baseline), top_contributions=dimensions,
            top_delivery_days=sorted(day_rows, key=lambda d:Decimal(d['net']), reverse=True)[:3]))
    queue = []
    for product, amount in sorted(priority.items(), key=lambda item:-item[1])[:30]:
        candidate = candidates.get(product)
        queue.append(dict(recorded_product_label=product, positive_surge_contribution_php=str(amount),
            match_status='prior_brand_text_candidate_needs_original_label_and_historical_pack_review' if candidate else 'no_exact_label_in_prior_candidate_queue',
            catalog_candidates=[{k:r[k] for k in ('evidence_id','page','generic_description','brand_text','sku_column_as_printed','package_qty_as_printed')} for r in candidate['catalog_candidates']] if candidate else [],
            identity_approved=False, historical_unit_approved=False, historical_availability_verified=False,
            required_evidence=['dated product/invoice code','generic/strength/form/pack','recorded quantity basis','reviewer/evidence hash/as-of date']))
    inputs = [parser_path, acceptance_path, company_path, review_path, Path(__file__), ROOT/'services/analytics_service/predictive/surge_investigation.py']
    inputs += [project.parent/'medshield_project_csv'/f['source_workbook'] for f in bundle['files']]
    hashes = {p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in inputs}
    # Existing frozen protocol is assessed, never changed or backdated.
    run = subprocess.run([sys.executable, '-m', 'analytics_service.company_php_forward', 'readiness', '--design', str(ROOT/'outputs/company_php_forward_20261031/protocol.json')], capture_output=True, text=True)
    readiness = json.loads(run.stdout) if run.returncode == 0 else dict(status='PROTOCOL_READINESS_FAILED', returncode=run.returncode, error=run.stderr[-800:])
    args.out.mkdir(parents=True)
    def write(name, value):
        with (args.out/name).open('x', encoding='utf-8') as handle:
            json.dump(value, handle, indent=2, ensure_ascii=False, default=str)
            handle.write('\n')
    write('results.json', dict(generated_at=datetime.now(timezone.utc).isoformat(), source_identity=company['source_identity'],
        evidence_kind='explicit_offline_reconstruction_reconciled_to_retained_gold', fresh_warehouse_read=False,
        controls=dict(months=len(controls), exact_amount_count_checks=checks), summaries=summaries,
        source_sha256=hashes, raw_records_exported=False, publication_approved=False, model_changed=False))
    write('contributions.json', all_contributions)
    write('delivery_days.json', daily)
    write('product_review_queue.json', queue)
    write('signal_readiness.json', dict(scope='inspected original local CSV/parser schemas and retained evidence only',
        inspected_gold_fields=sorted({k for r in gold for k in r}), inspected_assessed_fields=sorted({k for r in assessed for k in r}),
        confirmed_order_history='not_found_in_inspected_sources', known_at_history='not_found_in_inspected_sources',
        order_status_revisions='not_found_in_inspected_sources', stable_customer_identity='not_verified',
        delivery_date='observed_outcome_not_advance_signal', dr_number='delivery_reference_not_verified_customer_or_order_date',
        eligible_real_advance_events=0, timing_feature_fit_performed=False,
        required_event_fields=['event_id','revision','known_at','captured_at','planned_month','population_scope','evidence_kind','source_evidence_id','custody_verified','linkage_verified','status','net_sales_basis_php'],
        owner='business/source owner verifies permitted anonymous evidence; analyst validates as-of use',
        price_list='existing 2026 brand candidates only; no historical price or unit approval'))
    write('forward_readiness.json', dict(existing_protocol_check=readiness, verified_successor_snapshot_available=False,
        research_candidate='product_tsb_gap_a30_b10', candidate_in_existing_frozen_protocol=False,
        candidate_later_regressions=True, candidate_promoted=False, forecast_issued=False,
        blockers=['verified latest controlled snapshot and custody not present in inspected evidence',
                  'no verified advance event history', 'candidate not part of existing frozen protocol; separate reviewed registration required before any future candidate issue',
                  'future outcomes not yet observable'],
        next_action='operator provides real snapshot/receipt; model owner preserves existing protocol and registers separate candidate design before its first genuine issue'))
    print(json.dumps(dict(months=len(controls), checks=checks, surge_months=len(summaries), contribution_rows=len(all_contributions), delivery_days=len(daily), priority_labels=len(queue), advanced_events=0, forecast_issued=False)))


if __name__ == '__main__':
    main()
