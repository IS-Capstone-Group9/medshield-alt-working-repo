"""Registered completed-error calibration of fixed occurrence forecasts; offline only."""
import argparse
import csv
from datetime import datetime,timezone
import hashlib
import json
import math
from pathlib import Path
import platform

from ..predictive import contracts,metrics,occurrence_rates as occurrence,occurrence_calibration as model
from ..predictive import online_baseline_ensemble as baseline
from . import run_product_occurrence as panel_reader,run_online_ensemble as guard,run_stable_ets_review as retained

ROOT=Path(__file__).resolve().parents[3]
STAGES=('development','retrospective_audit','inspected_extension')


def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()


def write(path,value):
    with path.open('x',encoding='utf-8') as h:json.dump(value,h,indent=2,ensure_ascii=False,allow_nan=False);h.write('\n')


def specification(source,panel,reference):
    capture=json.loads(panel.read_bytes())
    for path,digest in capture['input_sha256'].items():
        if sha(ROOT/path)!=digest:raise ValueError('Product reconstruction input drift')
    choice=ROOT/'outputs/occurrence_rates_20261101/study/selection.json'
    if json.loads(choice.read_bytes())['selected_model']!=model.BASE_ID:raise ValueError('Fixed base research choice differs')
    paths=[Path(__file__),Path(model.__file__),Path(occurrence.__file__),Path(baseline.__file__),
        Path(panel_reader.__file__),Path(guard.__file__),Path(retained.__file__),Path(contracts.__file__),Path(metrics.__file__),
        ROOT/'services/tests/test_occurrence_calibration.py',ROOT/'outputs/occurrence_calibration_20261101/PLAN.md']
    protocol=json.loads(reference.read_bytes())['protocol']
    return dict(version=model.VERSION,inputs={p.relative_to(ROOT).as_posix():sha(p) for p in (source,panel,reference,choice)},
        code={p.relative_to(ROOT).as_posix():sha(p) for p in paths},python=platform.python_version(),
        configs=list(model.CONFIGS),base_model=model.BASE_ID,control=model.RAW_CONTROL,baselines=list(baseline.BASELINES),
        origins={stage:protocol[stage+'_origins'] for stage in STAGES},
        calibration='12 completed one-step targets<=issue origin,min8 contiguous;additive cap .5*mean(abs(last12));ratio clip .5..2',
        selection='Development new calibrators only:>=5% MAE gain vs strongest complete company baseline AND abs normalized bias<=5%;else mean6',
        untouched_test=False,fresh_warehouse_query=False,publication_approved=False)


def generate_cache(company,products,negative):
    config=next(c for c in occurrence.CONFIGS if c['model_id']==model.BASE_ID)
    cache=[]
    for origin in range(min(company)+11,max(company)):
        known={p:v for p,v in company.items() if p<=origin}
        known_products={key:{p:v for p,v in series.items() if p<=origin} for key,series in products.items()}
        known_products={key:s for key,s in known_products.items() if s}
        known_negative={p:v for p,v in negative.items() if p<=origin}
        prediction,trace=occurrence.predict(known,known_products,known_negative,origin,config)
        cache.append(dict(origin=origin,target=origin+1,origin_period=contracts.period(origin),target_period=contracts.period(origin+1),
            actual=company[origin+1],prediction=prediction,positive_prediction=trace['positive_prediction'],
            negative_prediction=trace['negative_correction_prediction'],known_labels=len(trace['products'])))
    return cache


def run(source_path,panel_path,reference_path,output,mode):
    source_path,panel_path,reference_path,output=[p.resolve() for p in (source_path,panel_path,reference_path,output)]
    spec=specification(source_path,panel_path,reference_path)
    source,panel,reference=[json.loads(p.read_bytes()) for p in (source_path,panel_path,reference_path)]
    company,products,negative=panel_reader.load_panel(source,panel,reference,sha(source_path))
    if mode=='register':
        output.mkdir(parents=True,exist_ok=False)
        write(output/'registration.json',dict(specification=spec,registered_at=datetime.now(timezone.utc).isoformat()))
        return dict(status='REGISTERED_BEFORE_BASE_CACHE_AND_CALIBRATION')
    if json.loads((output/'registration.json').read_bytes())['specification']!=spec:raise ValueError('Registration drift')
    if any((output/p).exists() for p in ('cache.json','development.json','selection.json','results.json','metrics.csv')):
        raise ValueError('Refusing overwrite of executed/partial study')
    cache=generate_cache(company,products,negative);write(output/'cache.json',cache)
    points,reports=[],[]
    for stage in STAGES:
        if stage!='development' and not (output/'selection.json').exists():raise ValueError('Selection must freeze first')
        for label in spec['origins'][stage]:
            origin=contracts.month(label);actual=company[origin+1]
            known={p:v for p,v in company.items() if p<=origin}
            vector=baseline.baseline_vector(known,origin)
            for name,prediction in zip(baseline.BASELINES,vector):
                rows=[r for r in reference['predictions'] if r['stage']==stage and r['origin_period']==label and r['model_id']==name and r['lead_months']==1]
                if len(rows)!=1 or actual!=rows[0]['actual'] or not math.isclose(prediction,rows[0]['prediction'],rel_tol=1e-12,abs_tol=1e-6):
                    raise ValueError('Retained baseline parity failed')
                points.append(dict(stage=stage,model_id=name,origin_period=label,target_period=contracts.period(origin+1),actual=actual,prediction=prediction,trace=None,failure=None))
            raw=next(r['prediction'] for r in cache if r['origin']==origin)
            points.append(dict(stage=stage,model_id=model.RAW_CONTROL,origin_period=label,target_period=contracts.period(origin+1),actual=actual,prediction=raw,trace=None,failure=None))
            for config in model.CONFIGS:
                prediction,trace,failure=None,None,None
                try:prediction,trace=model.predict(known,cache,origin,config)
                except ValueError as error:failure=str(error)
                points.append(dict(stage=stage,model_id=config['model_id'],origin_period=label,target_period=contracts.period(origin+1),actual=actual,prediction=prediction,trace=trace,failure=failure))
        current=[]
        for name in (*baseline.BASELINES,model.RAW_CONTROL,*(c['model_id'] for c in model.CONFIGS)):
            rows=[p for p in points if p['stage']==stage and p['model_id']==name];failed=sum(p['failure'] is not None for p in rows)
            current.append(dict(stage=stage,model_id=name,expected_n=len(spec['origins'][stage]),failed=failed,
                **metrics.score([] if failed else [(p['actual'],p['prediction']) for p in rows])))
        reports.extend(current)
        if stage=='development':
            write(output/'development.json',dict(points=points,reports=current))
            write(output/'selection.json',guard.choose([r for r in current if r['model_id']!=model.RAW_CONTROL]))
    result=dict(points=points,reports=reports,selection=json.loads((output/'selection.json').read_bytes()),
        source_identity=source['source_identity'],target_unit='PHP',base_cache_rows=len(cache),
        untouched_test=False,publication_approved=False,operational_approval=False,executed_at=datetime.now(timezone.utc).isoformat())
    write(output/'results.json',result)
    with (output/'metrics.csv').open('x',encoding='utf-8',newline='') as h:
        writer=csv.DictWriter(h,fieldnames=list(reports[0]));writer.writeheader();writer.writerows(reports)
    return dict(status='EXECUTED',cache=len(cache),points=len(points),groups=len(reports),failed=sum(p['failure'] is not None for p in points),selection=result['selection'])


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode',choices=('register','execute'),required=True)
    for name in ('source','panel','reference','output'):parser.add_argument('--'+name,type=Path,required=True)
    a=parser.parse_args();print(json.dumps(run(a.source,a.panel,a.reference,a.output,a.mode)))


if __name__=='__main__':main()
