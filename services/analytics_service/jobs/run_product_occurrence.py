"""Register/evaluate fixed positive-PHP occurrence recipes on retained company cases."""
import argparse
import csv
from datetime import datetime,timezone
import hashlib
import json
import math
from pathlib import Path
import platform

from ..predictive import contracts,metrics,product_occurrence as model
from ..predictive import online_baseline_ensemble as baseline
from . import run_online_ensemble as guard,run_stable_ets_review as retained

ROOT=Path(__file__).resolve().parents[3]
STAGES=('development','retrospective_audit','inspected_extension')


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path,value):
    with path.open('x',encoding='utf-8') as handle:
        json.dump(value,handle,ensure_ascii=False,indent=2,allow_nan=False);handle.write('\n')


def specification(source,panel,reference):
    capture=json.loads(panel.read_bytes())
    for p,h in capture['input_sha256'].items():
        if sha(ROOT/p)!=h:raise ValueError('Product reconstruction source/code drift')
    paths=[Path(__file__),Path(model.__file__),Path(guard.__file__),Path(baseline.__file__),
           Path(contracts.__file__),Path(metrics.__file__),Path(retained.__file__),
           ROOT/'services/tests/test_product_occurrence.py',ROOT/'outputs/product_occurrence_20261101/PLAN.md']
    ref=json.loads(reference.read_bytes())
    return dict(version=model.VERSION,inputs={p.relative_to(ROOT).as_posix():sha(p) for p in (source,panel,reference)},
        code={p.relative_to(ROOT).as_posix():sha(p) for p in paths},python=platform.python_version(),
        configs=list(model.CONFIGS),baselines=list(baseline.BASELINES),lead_months=1,
        origins={stage:ref['protocol'][stage+'_origins'] for stage in STAGES},
        selection='Development MAE>=5% gain vs strongest complete baseline AND absolute normalized bias<=5%;else mean6',
        initialization='First positive: size=amount,probability=1,interval=1; subsequent updates only through origin',
        correction='Signed company negative trailing6 mean; no clipping',untouched_test=False,
        fresh_warehouse_query=False,publication_approved=False)


def load_panel(source,panel,reference,source_hash):
    company=retained.validate_source(source,reference,source_hash)
    if panel['source_identity']!=source['source_identity'] or panel['contracts_excluded'] is not True:
        raise ValueError('Product panel identity/scope mismatch')
    controls={contracts.month(r['month']):r for r in panel['company_controls']}
    if len(controls)!=len(panel['company_controls']) or set(controls)!=set(company):
        raise ValueError('Complete unique company financial calendar required')
    products={key:{contracts.month(p):float(v) for p,v in series.items()} for key,series in panel['products'].items()}
    for key,series in products.items():
        if not series or any(p not in company or not math.isfinite(v) or v<0 for p,v in series.items()):
            raise ValueError('Invalid sparse positive product cells')
    negative={p:float(r['negative_php']) for p,r in controls.items()}
    for p in company:
        positive=math.fsum(s.get(p,0.) for s in products.values())
        if (negative[p]>0 or not math.isfinite(negative[p]) or
            not math.isclose(positive,float(controls[p]['positive_php']),rel_tol=1e-12,abs_tol=1e-6) or
            not math.isclose(positive+negative[p],company[p],rel_tol=1e-12,abs_tol=1e-6)):
            raise ValueError('Product positive/negative/net conservation failure')
    return company,products,negative


def run(source_path,panel_path,reference_path,output,mode):
    source_path,panel_path,reference_path,output=[p.resolve() for p in (source_path,panel_path,reference_path,output)]
    spec=specification(source_path,panel_path,reference_path)
    source,panel,reference=[json.loads(p.read_bytes()) for p in (source_path,panel_path,reference_path)]
    company,products,negative=load_panel(source,panel,reference,sha(source_path))
    if mode=='register':
        output.mkdir(parents=True,exist_ok=False)
        write(output/'registration.json',dict(registered_at=datetime.now(timezone.utc).isoformat(),specification=spec))
        return dict(status='REGISTERED_BEFORE_FORECAST_EXECUTION')
    if json.loads((output/'registration.json').read_bytes())['specification']!=spec:raise ValueError('Registration drift')
    if any((output/name).exists() for name in ('development.json','selection.json','results.json','metrics.csv')):
        raise ValueError('Refusing overwrite of executed/partial study')
    points,reports=[],[]
    for stage in STAGES:
        if stage!='development' and not (output/'selection.json').exists():raise ValueError('Selection not frozen')
        origins=spec['origins'][stage]
        for label in origins:
            origin=contracts.month(label)
            known={p:v for p,v in company.items() if p<=origin}
            known_products={key:{p:v for p,v in series.items() if p<=origin} for key,series in products.items()}
            known_products={key:s for key,s in known_products.items() if s}
            known_negative={p:v for p,v in negative.items() if p<=origin}
            vector=baseline.baseline_vector(known,origin)
            for name,prediction in zip(baseline.BASELINES,vector):
                saved=[p for p in reference['predictions'] if p['stage']==stage and p['lead_months']==1 and p['origin_period']==label and p['model_id']==name]
                if len(saved)!=1 or saved[0]['actual']!=company[origin+1] or not math.isclose(saved[0]['prediction'],prediction,rel_tol=1e-12,abs_tol=1e-6):
                    raise ValueError('Retained baseline/target parity failure')
                points.append(dict(stage=stage,model_id=name,origin_period=label,target_period=contracts.period(origin+1),
                    actual=company[origin+1],prediction=prediction,trace=None,failure=None))
            for config in model.CONFIGS:
                prediction,trace,failure=None,None,None
                try:prediction,trace=model.predict(known,known_products,known_negative,origin,config)
                except ValueError as error:failure=str(error)
                points.append(dict(stage=stage,model_id=config['model_id'],origin_period=label,target_period=contracts.period(origin+1),
                    actual=company[origin+1],prediction=prediction,trace=trace,failure=failure))
        current=[]
        for name in (*baseline.BASELINES,*(c['model_id'] for c in model.CONFIGS)):
            rows=[p for p in points if p['stage']==stage and p['model_id']==name]
            failed=sum(p['failure'] is not None for p in rows)
            current.append(dict(stage=stage,model_id=name,expected_n=len(origins),failed=failed,
                **metrics.score([] if failed else [(p['actual'],p['prediction']) for p in rows])))
        reports.extend(current)
        if stage=='development':
            write(output/'development.json',dict(points=points,reports=current))
            write(output/'selection.json',guard.choose(current))
    result=dict(points=points,reports=reports,selection=json.loads((output/'selection.json').read_bytes()),
        source_identity=source['source_identity'],target_unit='PHP',untouched_test=False,
        publication_approved=False,operational_approval=False,executed_at=datetime.now(timezone.utc).isoformat())
    write(output/'results.json',result)
    with (output/'metrics.csv').open('x',encoding='utf-8',newline='') as handle:
        writer=csv.DictWriter(handle,fieldnames=list(reports[0]));writer.writeheader();writer.writerows(reports)
    return dict(status='EXECUTED',points=len(points),groups=len(reports),failed=sum(p['failure'] is not None for p in points),selection=result['selection'])


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode',choices=('register','execute'),required=True)
    for name in ('source','panel','reference','output'):parser.add_argument('--'+name,type=Path,required=True)
    args=parser.parse_args();print(json.dumps(run(args.source,args.panel,args.reference,args.output,args.mode)))


if __name__=='__main__':main()
