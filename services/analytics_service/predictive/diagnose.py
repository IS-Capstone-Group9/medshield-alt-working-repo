"""Diagnose frozen forecast errors without fitting or selecting a new recipe."""
import argparse
from collections import defaultdict
import hashlib
import json
from pathlib import Path
from .metrics import score


def group_scores(points, field):
    groups = defaultdict(list)
    for p in points:
        if p.get('actual') is not None and p.get('prediction') is not None:
            groups[str(field(p))].append((p['actual'], p['prediction']))
    return {key: score(values) for key, values in sorted(groups.items())}


def diagnose(run):
    chosen = run['selection']['model_id']
    points = [p for p in run['predictions'] if p['model_id'] == chosen and p['stage'] != 'future']
    result = {'run_id': run['run_id'], 'model_id': chosen, 'stages': {}}
    for stage in sorted({p['stage'] for p in points}):
        rows = [p for p in points if p['stage'] == stage and p['prediction'] is not None and p['actual'] is not None]
        total = sum(abs(p['prediction']-p['actual']) for p in rows)
        ranked = sorted([dict(p, signed_error=p['prediction']-p['actual'], absolute_error=abs(p['prediction']-p['actual']),
                             absolute_error_share=abs(p['prediction']-p['actual'])/total if total else None) for p in rows], key=lambda p: -p['absolute_error'])
        by_target = defaultdict(float)
        for p in rows:
            by_target[p['target_period']] += abs(p['prediction']-p['actual'])
        result['stages'][stage] = dict(overall=score([(p['actual'],p['prediction']) for p in rows]),
            mean_absolute_actual=sum(abs(p['actual']) for p in rows)/len(rows) if rows else None,
            by_origin=group_scores(rows,lambda p:p['origin_period']), by_lead=group_scores(rows,lambda p:p['lead_months']),
            by_band=group_scores(rows,lambda p:'1–3' if p['lead_months']<=3 else '4–6' if p['lead_months']<=6 else '7–12'),
            by_origin_band=group_scores(rows,lambda p:p['origin_period']+' / '+('1–3' if p['lead_months']<=3 else '4–6' if p['lead_months']<=6 else '7–12')),
            worst_points=ranked, by_target_absolute_error=dict(sorted(by_target.items(),key=lambda item:-item[1])),
            top_three_error_share=sum(p['absolute_error'] for p in ranked[:3])/total if total else None)
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run',type=Path,required=True)
    parser.add_argument('--composition',type=Path)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    raw=args.run.read_bytes()
    assert hashlib.sha256(raw).hexdigest()==json.loads((args.run.parent/'artifact-hashes.json').read_text())['run.json']
    run=json.loads(raw); result=diagnose(run)
    lines=['# Frozen forecast error diagnosis', '', f"Run: `{run['run_id']}`. Selected method: `{result['model_id']}`.",
        '', 'No training, reselection, data correction or publication occurred in this diagnosis.',
        'Development folds overlap: 60 origin/target/lead observations are not 60 independent months.',
        'Audit is retrospective. Completeness is user-attested, not independently verified.', '']
    for stage, values in result['stages'].items():
        lines += [f'## {stage}', '', '| Lead band | N | WAPE | MAE PHP | Normalized bias |', '|---|---:|---:|---:|---:|']
        for band, m in values['by_band'].items():
            lines.append(f"| {band} | {m['n']} | {m['wape']:.2f}% | {m['mae']:,.2f} | {m['normalized_bias']:+.2f}% |")
        lines += ['', '| Origin | N | WAPE | Signed bias PHP |', '|---|---:|---:|---:|']
        for origin,m in values['by_origin'].items():
            lines.append(f"| {origin} | {m['n']} | {m['wape']:.2f}% | {m['bias']:+,.2f} |")
        lines += ['', f"Three worst origin/target observations account for {values['top_three_error_share']:.1%} of absolute error.",
            '', '| Origin | Target | Lead | Actual PHP | Prediction PHP | Signed error PHP | Error share |','|---|---|---:|---:|---:|---:|---:|']
        for p in values['worst_points'][:8]:
            lines.append(f"| {p['origin_period']} | {p['target_period']} | {p['lead_months']} | {p['actual']:,.2f} | {p['prediction']:,.2f} | {p['signed_error']:+,.2f} | {p['absolute_error_share']:.1%} |")
    if args.composition:
        composition_raw=args.composition.read_bytes()
        assert hashlib.sha256(composition_raw).hexdigest()==args.composition.with_suffix('.sha256').read_text().strip()
        composition=json.loads(composition_raw)
        for key in ('dataset_id','fact_delta_version','source_checksum'):
            assert composition['manifest'][key]==run['manifest'][key]
        result['composition_deltas']=[]
        annual=defaultdict(lambda: defaultdict(float))
        for row in composition['groups']['source_provenance']:
            annual[row['period'][:4]][row['label'] or '(missing label)'] += float(row['net_sales'] or 0)
        result['annual_provenance_revenue']=dict(annual)
        lines += ['', '## Annual recorded revenue by source provenance', '', '| Year | Provenance | Revenue PHP |', '|---|---|---:|']
        for year, sources in sorted(annual.items()):
            for source, amount in sources.items():
                lines.append(f'| {year} | {source} | {amount:,.2f} |')
        for stage, values in result['stages'].items():
            selected_periods={p['target_period'] for p in values['worst_points']}
            subset=[r for r in composition['groups']['source_provenance'] if r['period'] in selected_periods]
            result['stages'][stage]['unique_period_signed_returns']=sum(float(r['signed_returns'] or 0) for r in subset)
        lines += ['', '## Recorded sales composition at the largest misses', '',
            'For last-value, target minus origin revenue is exactly the negative forecast error.',
            'These decompositions explain accounting contributions, not causal business drivers.',
            'Raw area/product labels are not approved customer/SKU identities. Provenance categories are source attribution, not independent verification.', '']
        for stage, values in result['stages'].items():
            for point in values['worst_points'][:3]:
                lines += [f"### {stage}: {point['origin_period']} → {point['target_period']}", '']
                for dimension, rows in composition['groups'].items():
                    delta=defaultdict(float)
                    for row in rows:
                        if row['period'] in (point['origin_period'],point['target_period']):
                            delta[row['label'] or '(missing label)'] += float(row['net_sales'] or 0)*(1 if row['period']==point['target_period'] else -1)
                    assert abs(sum(delta.values())-(point['actual']-point['prediction']))<.02
                    ordered=sorted(delta.items(),key=lambda kv:-abs(kv[1]))
                    result['composition_deltas'].append(dict(stage=stage,origin=point['origin_period'],target=point['target_period'],dimension=dimension,deltas=ordered))
                    lines += [f'**{dimension}** — signed revenue change (PHP):','']
                    for label,amount in ordered[:5]:
                        lines.append(f'- {str(label).replace(chr(10), " ")}: {amount:+,.2f}')
                    lines.append(f'- Remaining labels combined: {sum(v for _,v in ordered[5:]):+,.2f}\n')
    args.output.mkdir(parents=True,exist_ok=True)
    (args.output/'diagnostics.json').write_text(json.dumps(result,indent=2,allow_nan=False),encoding='utf-8')
    (args.output/'DIAGNOSIS.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, axes=plt.subplots(2,1,figsize=(11,8),layout='constrained')
    audit=[p for p in run['predictions'] if p['model_id']==result['model_id'] and p['stage']=='retrospective_audit']
    axes[0].plot([p['target_period'] for p in audit],[p['actual']/1e6 for p in audit],marker='o',label='Recorded actual')
    axes[0].plot([p['target_period'] for p in audit],[p['prediction']/1e6 for p in audit],linestyle='--',label='Fixed December 2024 origin')
    axes[0].set(ylabel='Recorded net sales (PHP millions)',title='2025 retrospective audit: one constant forecast misses changing monthly revenue')
    axes[0].legend(); axes[0].tick_params(axis='x',rotation=35)
    bands=['1–3','4–6','7–12']; xpos=list(range(3))
    for offset,(stage,v) in zip([-.18,.18],result['stages'].items()):
        axes[1].bar([x+offset for x in xpos],[v['by_band'][b]['wape'] for b in bands],width=.36,label=stage.replace('_',' '))
    axes[1].set_xticks(xpos,bands); axes[1].set(xlabel='True forecast lead in months',ylabel='WAPE (%)',title='Shortening the horizon has not established reliable accuracy')
    axes[1].legend()
    fig.suptitle('Frozen last-value forecast diagnosis • user-attested coverage • no model retuning',fontsize=12)
    fig.savefig(args.output/'error-diagnosis.png',dpi=150)
    plt.close(fig)
    print(json.dumps({stage:{'overall':v['overall'],'bands':v['by_band'],'top_three_share':v['top_three_error_share']} for stage,v in result['stages'].items()}))


if __name__=='__main__':
    main()
