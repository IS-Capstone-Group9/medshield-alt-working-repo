"""Report retained regional STL residual anomalies; no causes or DR joins inferred."""
from __future__ import annotations

import argparse
import csv
from datetime import datetime
import hashlib
import json
from pathlib import Path
from zoneinfo import ZoneInfo

from ..diagnostic_drivers import residual_anomalies

SOURCE_SHA='946a0e92017e64720a36bf3845162821991dc0e2989e4a35cabe1c0e985e740e'
ANALYSIS_SHA='b681c59b6fa1365d82c5a5b04d740ff43b6c3bdba661d6877b158f5b5d0e712f'


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def write_csv(path,rows):
    with path.open('x',encoding='utf-8',newline='') as handle:
        writer=csv.DictWriter(handle,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)


def build(source_path,analysis_path,output):
    if sha(source_path)!=SOURCE_SHA or sha(analysis_path)!=ANALYSIS_SHA:
        raise ValueError('Retained regional STL source/analysis changed')
    source=json.loads(source_path.read_text(encoding='utf-8'))
    analysis=json.loads(analysis_path.read_text(encoding='utf-8'))
    if analysis['input_sha256']!=SOURCE_SHA or analysis['source']!=source['source']:
        raise ValueError('Retained STL source binding differs')
    identity=source['source']
    meta=dict(evidence_label='Derived',dataset_id=identity['dataset_id'],
              policy_version=identity['policy_version'],mapping_sha256=identity['mapping_sha256'],
              assumption_ids='["D4"]')
    rows=[]
    readiness=[]
    for series in analysis['series']:
        components=series['components']
        if not components:
            readiness.append(dict(region=series['region'],residual_points=0,status='UNAVAILABLE_NO_QUALIFYING_CONTIGUOUS_SEGMENT',**meta))
            continue
        if len(series['fitted_segments'])!=1:
            raise ValueError('Each MAD cohort must be exactly one fitted contiguous segment')
        values=residual_anomalies([dict(period=r['period'],residual=r['residual_php'],
                                       evidence_label='Derived') for r in components])
        for component,value in zip(components,values):
            rows.append(dict(region=series['region'],period=component['period'],
                segment_start=component['segment_start'],segment_end=component['segment_end'],
                observed_net_sales_php=component['observed_net_sales_php'],
                residual_php=component['residual_php'],robust_z=value['robust_z'],
                anomaly=value['anomaly'],unavailable_reason=value['reason'],
                dr_linkage_status='UNAVAILABLE_NOT_EXTRACTED',dr_number=None,
                interpretation='Retrospective residual exception for source review; cause unverified',**meta))
        readiness.append(dict(region=series['region'],residual_points=len(components),status='RETAINED_RETROSPECTIVE_RESIDUALS',**meta))
    write_csv(output/'T3.2_stl_residual_anomaly_dr_log.csv',rows)
    write_csv(output/'T3.0_regional_residual_readiness.csv',readiness)
    write_csv(output/'T3.1_pvm_readiness.csv',[dict(status='UNAVAILABLE',
        reason='No reviewed paired presentation/quantity cohort supplied in retained regional net-sales capture',
        price_effect=None,volume_effect=None,interaction_effect=None,**meta)])
    write_csv(output/'T3.3_ccf_disease_rainfall_readiness.csv',[dict(status='UNAVAILABLE',
        reason='No reviewed D3 therapeutic class and provider-linked external cohort supplied; existing D4 mapping is retained',
        pearson_r=None,spearman_rho=None,q_value=None,**meta)])
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from statistics import median
    series_rows=[r for r in rows if r['region']=='CALABARZON']
    residuals=[r['residual_php'] for r in series_rows]
    center=median(residuals);scale=1.4826*median([abs(x-center) for x in residuals])
    x=[datetime.strptime(r['period'],'%Y-%m') for r in series_rows]
    fig,axis=plt.subplots(figsize=(10,5),layout='constrained')
    axis.plot(x,residuals,label='Retained STL residual',linewidth=1)
    flagged=[i for i,r in enumerate(series_rows) if r['anomaly']]
    axis.scatter([x[i] for i in flagged],[residuals[i] for i in flagged],color='firebrick',label='|robust z| > 3')
    axis.axhline(center,color='gray',linestyle=':')
    for sign in (-1,1):axis.axhline(center+sign*3*scale,color='gray',linestyle='--')
    axis.set(title='CALABARZON retrospective residual exceptions; causes and DR linkage unverified',
        ylabel='Residual net sales (PHP)',xlabel='Observed month')
    axis.legend(fontsize=8)
    fig.suptitle(f'Derived | Dataset {meta["dataset_id"]}\nPolicy {meta["policy_version"]}; assumption_ids [D4]',fontsize=8)
    fig.savefig(output/'F3.1_regional_stl_residual_exceptions.png',dpi=160);plt.close(fig)
    count=sum(r['anomaly'] is True for r in rows)
    result=dict(status='PARTIAL_WP3_RETAINED_RESIDUAL_REVIEW_ONLY',**meta,
        checked_at=datetime.now(ZoneInfo('Asia/Manila')).isoformat(),source=identity,
        source_path=str(source_path),analysis_path=str(analysis_path),source_sha256=SOURCE_SHA,analysis_sha256=ANALYSIS_SHA,
        residual_points=len(rows),flagged_points=count,flagged_periods=[r['period'] for r in rows if r['anomaly']],
        median_residual_php=center,mad_php=scale/1.4826,robust_scale_php=scale,
        dr_linkage_available=False,pvm_available=False,ccf_available=False,
        new_stl_fits=0,warehouse_queries_this_run=0,publication_approved=False,
        limitations=['Retained fitted residuals are retrospective, not origin-safe forecasting features.',
            'A residual exception does not identify a cause, a stockout or a disease/weather effect.',
            'DR-level evidence was not extracted; no transaction drilldown is claimed.',
            'MIMAROPA and BICOL lack qualifying retained fitted segments; unavailable does not mean zero anomalies.'])
    result['assumption_ids']=['D4']
    (output/'results.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    (output/'README.md').write_text('# WP3 partial retained residual review — 30 October 2026\n\n'
        f'T3.2 freshly computes robust residual z-scores over {len(rows)} retained CALABARZON monthly STL points '
        f'(January 2020–September 2026), flagging {count} months at |z| > 3. T3.0 keeps missing regional fits unavailable. '
        'This packet references the existing source/analysis files without duplicating them. Residuals use the complete '
        'retrospective fitted segment and are not forecast-origin features. No cause or transaction drilldown is established.\n\n'
        'T3.1 explicitly leaves PVM effects unavailable without a reviewed paired unit cohort. T3.3 leaves correlations '
        'unavailable without a reviewed therapeutic/provider cohort. The existing nine-label D4 mapping is preserved; '
        'no mapping acceptance or additional geography is inferred. F3.1 shows retained residuals and robust thresholds.\n\n'
        'Run `python -X utf8 outputs/wp3_diagnostic_drivers_20261030/verify.py`. The verifier independently recomputes '
        'median/MAD/z, component reconstruction and source bindings without importing the diagnostic implementation. '
        'This is partial WP3 evidence; DR linkage, real PVM/CCF cohorts, API/UI/export parity and full acceptance remain open. '
        'Next analyst/source owner binds reviewed paired units/external joins; gateway engineering extracts version-bound DR evidence.\n',encoding='utf-8')
    (output/'PAPER_INSERT.md').write_text('# Chapter 4 insert — retained residual exception review\n\n'
        f'Table T3.2 and Figure F3.1 identify {count} robust residual exceptions among 81 retained CALABARZON monthly '
        'STL points for January 2020–September 2026, using median-centered residuals divided by 1.4826 times their '
        'median absolute deviation and a strict |z| > 3 threshold. These are derived retrospective diagnostics, not '
        'causal findings or origin-safe forecasts. Transaction DR linkage remains unavailable. The retained MIMAROPA/Bicol '
        'series lack qualifying fitted residual segments; their absence is not evidence of no anomalies. Tables T3.1 and '
        'T3.3 explicitly retain unavailable PVM and external association analyses until reviewed unit and therapeutic/provider '
        'cohorts are bound. No new fit, source refresh, publication or whole-WP3 completion is claimed.\n',encoding='utf-8')
    code=[Path(__file__).resolve(),Path(__file__).resolve().parents[1]/'diagnostic_drivers.py']
    manifest=dict(inputs={str(source_path):SOURCE_SHA,str(analysis_path):ANALYSIS_SHA},
        code={str(p):sha(p) for p in code},files={str(p.relative_to(output)).replace('\\','/'):sha(p)
        for p in output.rglob('*') if p.is_file() and p.name not in ('manifest.json','verification.json')})
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,required=True);parser.add_argument('--analysis',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    result=build(args.source,args.analysis,args.output)
    print(json.dumps({k:result[k] for k in ('residual_points','flagged_points','flagged_periods')}))


if __name__=='__main__':main()
