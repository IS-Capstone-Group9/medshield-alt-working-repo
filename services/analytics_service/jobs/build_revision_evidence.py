"""Reproduce local capstone evidence without modifying source data or publishing models."""
import argparse
import hashlib
import json
import math
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

from services.analytics_service.sales_heatmap import load_heatmap
from services.analytics_service.sales_sectors import load_sectors
from services.analytics_service.forecast_validation import build_validation
from services.analytics_service.external_regression import load_external, build_regression
from services.analytics_service.prescriptive_planning import build_shortlist
from services.data_pipeline import sales_summary

ROOT = Path(__file__).resolve().parents[3]


def build(as_of):
    sales, heatmap = load_sectors(), load_heatmap()
    sector_counts = Counter()
    sector_revenue = defaultdict(float)
    for row in sales['rows']:
        sector_counts[row['sector']] += row['row_count']
        sector_revenue[row['sector']] += row['revenue']
    # Independently reconcile the two granular endpoints by product/month.
    units = defaultdict(float)
    for row in sales['rows']:
        units[(row['product'], row['period'])] += row['quantity']
    heat_units = defaultdict(float)
    for row in heatmap['monthly']:
        heat_units[(row['product'], row['period'])] += row['quantity']
    assert units.keys() == heat_units.keys(), 'Heatmap/sector product-month coverage differs'
    assert all(math.isclose(v, heat_units[k], abs_tol=1e-6) for k, v in units.items()), 'Quantity reconciliation failed'
    assert sales['source']['input_rows'] == sales['source']['included_rows'] + sum(sales['source']['excluded'].values())
    forecast = build_validation(sales, today=as_of)
    signals, sources = load_external()
    regression = build_regression(sales, signals, sources, metric='revenue', today=as_of)
    shortlist = build_shortlist(sales, today=as_of)
    ledger = sales_summary()
    source_files = [sales['source']['file'], 'datasources/templates/product_master_mapping.csv',
                    'datasources/templates/buyer_sector_mapping.csv', 'datasources/templates/area_classification_mapping.csv',
                    'datasources/templates/regression_station_mapping.csv', 'data/medshield/processed/regression_external_monthly.json']
    return {
        'as_of': as_of.isoformat(), 'scope_note': 'Local source evidence; not authenticated UI or operational validation.',
        'source_file_sha256': {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in source_files},
        'source': sales['source'], 'rows_by_ownership': dict(sector_counts), 'net_sales_by_ownership': dict(sector_revenue),
        'quantity_reconciliation': {'status': 'passed', 'product_months': len(units), 'mixed_product_total': 'Intentionally not reported'},
        'heatmap': {'source': heatmap['source'], 'raw_product_count': len(heatmap['products'])},
        'separate_financial_ledger': {k: ledger[k] for k in ('financial_reconciliation', 'gross_margin_rate')},
        'forecast': {k: v for k, v in forecast.items() if k not in {'products', 'actuals', 'views'}},
        'forecast_12_month_comparison': {m: v['comparison_metrics'] for m, v in forecast['views']['12']['models'].items()},
        'regression': {k: v for k, v in regression.items() if k not in {'products', 'territories', 'evaluation'}},
        'planning_shortlist': shortlist,
        'release_gates': ['Authenticated workflow evidence', 'Approved buyer and canonical SKU mappings',
                          'Approved weather station mapping and sufficient history', 'Client-approved planning objective and operational inputs'],
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--as-of', type=date.fromisoformat, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    report = build(args.as_of)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False), encoding='utf-8')
    print('Evidence saved:', args.output)
    print('Quantity reconciliation:', report['quantity_reconciliation'])
