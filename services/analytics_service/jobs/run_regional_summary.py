"""WP1 source-bound offline tables; preserves the frozen 36-month STL policy."""
import argparse
import csv
from decimal import Decimal
import hashlib
import json
from pathlib import Path
from ..regional_stl import analyze
from ..diagnostic_drivers import stl_strength


def summary(source, analysis):
    meta = dict(dataset_id=source['source']['dataset_id'], policy_version=source['source']['policy_version'],
                evidence_label='Derived', assumption_ids='D4')
    groups = {}
    for row in source['months']:
        groups.setdefault((row['region'], row['period'][:4]), []).append(row)
    annual = []
    for (region, year), rows in sorted(groups.items()):
        def total(field, subset=rows):
            values = [Decimal(r[field]) for r in subset if r[field] is not None]
            return sum(values, Decimal(0)) if values else None
        net, margin, basis = (total(k) for k in ('net_sales_php','gross_profit_php','margin_revenue_basis_php'))
        prior = {r['period'][5:]:r for r in groups.get((region, str(int(year)-1)), []) if r['net_sales_php'] is not None}
        current = {r['period'][5:]:r for r in rows if r['net_sales_php'] is not None}
        common = sorted(set(prior) & set(current))
        base = sum((Decimal(prior[m]['net_sales_php']) for m in common), Decimal(0))
        target = sum((Decimal(current[m]['net_sales_php']) for m in common), Decimal(0))
        annual.append(dict(**meta, region=region, year=year, net_sales_php=str(net) if net is not None else None,
                           gross_margin_php=str(margin) if margin is not None else None,
                           margin_revenue_basis_php=str(basis) if basis is not None else None,
                           margin_pct=str(100*margin/basis) if margin is not None and basis else None,
                           matched_months=';'.join(common), matched_base_php=str(base) if common else None,
                           matched_target_php=str(target) if common else None,
                           matched_yoy_pct=str(100*(target-base)/base) if common and base else None,
                           cagr_pct=None, cagr_status='unavailable_without_comparable_complete_years'))
    coverage, strengths = [], []
    for series in analysis['series']:
        for row in series['calendar']:
            coverage.append(dict(**meta, region=series['region'], **row))
        for segment in series['fitted_segments']:
            points = [r for r in series['components'] if segment['start'] <= r['period'] <= segment['end']]
            strength = stl_strength(*[[r[field] for r in points] for field in ('trend_php','seasonal_php','residual_php')])
            seasonal_months = {m: [r['seasonal_php'] for r in points if r['period'][5:] == m] for m in [f'{i:02d}' for i in range(1,13)]}
            seasonal_means = {m: sum(v)/len(v) for m,v in seasonal_months.items() if v}
            strengths.append(dict(**meta, region=series['region'], start=segment['start'], end=segment['end'],
                                  months=segment['months'], trend_strength=strength['trend_strength'],
                                  seasonal_strength=strength['seasonal_strength'],
                                  reconstruction_error_php=segment['max_reconstruction_error_php'],
                                  peak_month=max(seasonal_means,key=seasonal_means.get), trough_month=min(seasonal_means,key=seasonal_means.get),
                                  seasonal_swing_php=max(seasonal_means.values())-min(seasonal_means.values())))
        if not series['fitted_segments']:
            strengths.append(dict(**meta, region=series['region'], start=None,end=None,
                                  months=series['maximum_contiguous_observed_months'], trend_strength=None,
                                  seasonal_strength=None, reconstruction_error_php=None, peak_month=None, trough_month=None, seasonal_swing_php=None))
    return dict(schema_version='regional_summary_v1', source=source['source'], evidence_label='Derived',
                assumption_ids=['D4'], annual=annual, coverage=coverage, strengths=strengths,
                minimum_contiguous_months=36, publication_approved=False,
                limitations=['Retained Gold capture; not a fresh warehouse query.',
                             'Only nine confirmed delivery labels; unallocated channels remain separate.',
                             'Frozen 36-month STL rule retained; changing to 24 requires a separately versioned candidate.',
                             'CAGR unavailable without a completeness and comparable-period contract.',
                             'No API/UI publication of new strength measures.'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists() and any(args.output.iterdir()):
        raise ValueError('Refusing to overwrite a nonempty packet')
    raw = args.input.read_bytes()
    source = json.loads(raw)
    analysis = analyze(source)
    result = summary(source, analysis)
    result['input_sha256'] = hashlib.sha256(raw).hexdigest()
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output/'results.json').write_text(json.dumps(result, indent=2, allow_nan=False)+'\n',encoding='utf-8')
    for field, name in [('annual','T1.1_regional_annual_summary.csv'),('coverage','T1.2_calendar_coverage_matrix.csv'),
                        ('strengths','T1.3_stl_strength_and_peaks.csv')]:
        with (args.output/name).open('w',encoding='utf-8',newline='') as handle:
            writer = csv.DictWriter(handle, fieldnames=list(result[field][0]))
            writer.writeheader()
            writer.writerows(result[field])
    # Plot only observed months; matplotlib preserves gaps with NaN.
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, axes = plt.subplots(3,1,figsize=(12,9),constrained_layout=True)
    for axis, series in zip(axes, analysis['series']):
        rows = series['calendar']
        axis.plot([r['period'] for r in rows], [float(r['observed_net_sales_php']) if r['observed_net_sales_php'] is not None else float('nan') for r in rows])
        axis.set_title(series['region']+' — recorded PHP; gaps unavailable')
        axis.set_xticks(range(0,len(rows),12),[r['period'] for r in rows[::12]])
        axis.tick_params(axis='x',rotation=30)
    fig.savefig(args.output/'F1.1_regional_monthly_trends.png',dpi=140)
    plt.close(fig)
    fitted = [s for s in analysis['series'] if s['components']]
    fig, axes = plt.subplots(4,1,figsize=(12,9),constrained_layout=True)
    for series in fitted:
        for axis, field in zip(axes, ['observed_net_sales_php','trend_php','seasonal_php','residual_php']):
            points = series['components']
            axis.plot([r['period'] for r in points], [float(r[field]) for r in points], label=series['region'])
            axis.set_title(field+' — retrospective PHP')
            axis.set_xticks(range(0,len(points),12),[r['period'] for r in points[::12]])
            axis.legend()
    fig.savefig(args.output/'F1.2_stl_decomposition_panels.png',dpi=140)
    plt.close(fig)
    fig, axis = plt.subplots(figsize=(10,3),constrained_layout=True)
    data = [[sum(r['seasonal_php'] for r in s['components'] if r['period'][5:]==f'{m:02d}') /
             len([r for r in s['components'] if r['period'][5:]==f'{m:02d}']) for m in range(1,13)] for s in fitted]
    chart = axis.imshow(data, aspect='auto', cmap='coolwarm')
    axis.set_yticks(range(len(fitted)),[s['region'] for s in fitted])
    axis.set_xticks(range(12),range(1,13))
    axis.set_title('Derived mean seasonal PHP by month — fitted regions only')
    fig.colorbar(chart,ax=axis,label='PHP seasonal component')
    fig.savefig(args.output/'F1.3_seasonal_index_heatmap.png',dpi=140)
    plt.close(fig)


if __name__ == '__main__':
    main()
