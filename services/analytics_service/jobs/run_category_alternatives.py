"""Register/evaluate category forecasts and export explicit PHP scenarios offline."""
import argparse
import csv
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import platform

from ..predictive import category_alternatives as model, contracts, metrics
from . import run_stable_ets_review as retained

ROOT = Path(__file__).resolve().parents[3]
STAGES = ('development','retrospective_audit','inspected_extension')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path,value):
    with path.open('x',encoding='utf-8') as handle:
        json.dump(value,handle,ensure_ascii=False,indent=2,allow_nan=False)
        handle.write('\n')


def specification(source,categories,reference):
    paths = [Path(__file__),Path(model.__file__),Path(contracts.__file__),Path(metrics.__file__),Path(retained.__file__),
             ROOT/'services/tests/test_category_alternatives.py',ROOT/'outputs/forecast_alternatives_20261101/PLAN.md']
    capture = json.loads(categories.read_bytes())
    for name,digest in capture.get('input_sha256',{}).items():
        if sha(ROOT/name) != digest:
            raise ValueError('Reconstruction input/code changed')
    protocol = json.loads(reference.read_bytes())['protocol']
    return dict(version=model.VERSION,inputs={str(p.relative_to(ROOT)).replace('\\','/'):sha(p) for p in (source,categories,reference)},
        code={p.relative_to(ROOT).as_posix():sha(p) for p in paths},python=platform.python_version(),
        recipes=model.RECIPES,control=model.CONTROL,baselines=model.BASELINES,
        origins={stage:protocol[stage+'_origins'] for stage in STAGES},lead_months=1,training_start='2020-01',
        grouping='Origin-local24 contiguous category months or reconciled residual;no category zero-fill',
        selection='Development MAE>=5% gain vs strongest complete baseline;abs normalized bias<=5%;else retain mean6',
        targets=dict(wape_strictly_below=[10,5]),scenario_assumptions=dict(variation_pct=25,probability_coverage=None),
        historical_vintage_verified=False,fresh_warehouse_query=False,untouched_test=False)


def run(source_path,category_path,reference_path,output,mode):
    source_path,category_path,reference_path,output = [p.resolve() for p in (source_path,category_path,reference_path,output)]
    spec = specification(source_path,category_path,reference_path)
    source,capture,reference = [json.loads(p.read_bytes()) for p in (source_path,category_path,reference_path)]
    retained.validate_source(source,reference,sha(source_path))
    company,categories = model.reconcile(capture,source)
    # JSON tuples become lists; compare normalized registration bytes semantically.
    spec = json.loads(json.dumps(spec))
    if mode == 'register':
        output.mkdir(parents=True,exist_ok=False)
        write(output/'registration.json',dict(specification=spec,registered_at=datetime.now(timezone.utc).isoformat()))
        return dict(status='REGISTERED_BEFORE_FIT')
    if json.loads((output/'registration.json').read_bytes())['specification'] != spec:
        raise ValueError('Registration drift')
    if any((output/name).exists() for name in ('development.json','selection.json','results.json','metrics.csv','scenarios.csv')):
        raise ValueError('Refusing overwrite of executed/partial study')
    points,reports,scenario_rows = [],[],[]
    for stage in STAGES:
        if stage != 'development' and not (output/'selection.json').exists():
            raise ValueError('Selection must freeze before later scoring')
        origins = spec['origins'][stage]
        for label in origins:
            origin = contracts.month(label)
            actual = company[origin+1]
            known = {p:v for p,v in company.items() if p<=origin}
            known_categories = {name:{p:v for p,v in series.items() if p<=origin} for name,series in categories.items()}
            vector = model.baselines(known,origin)
            for name,prediction in vector.items():
                inherited = [p for p in reference['predictions'] if p['stage']==stage and p['lead_months']==1
                    and p['origin_period']==label and p['model_id']==name]
                if len(inherited)!=1 or not math.isclose(prediction,inherited[0]['prediction'],rel_tol=1e-12,abs_tol=1e-6) or actual!=inherited[0]['actual']:
                    raise ValueError('Inherited baseline or actual mismatch')
                points.append(dict(stage=stage,model_id=name,origin_period=label,target_period=contracts.period(origin+1),
                    actual=actual,prediction=prediction,failure=None,trace=None))
            for name in (*model.RECIPES,model.CONTROL):
                prediction,trace,failure = None,None,None
                try:
                    prediction,trace = model.predict(known,known_categories,origin,name)
                    if name==model.CONTROL and not math.isclose(prediction,vector['mean_6'],rel_tol=1e-12,abs_tol=1e-6):
                        raise ValueError('Bottom-up mean6 does not conserve direct mean6')
                except ValueError as error:
                    failure=str(error)
                points.append(dict(stage=stage,model_id=name,origin_period=label,target_period=contracts.period(origin+1),
                    actual=actual,prediction=prediction,failure=failure,trace=trace))
            scenario_rows.append(dict(stage=stage,origin_period=label,target_period=contracts.period(origin+1),
                issue_status='retrospective_illustration',**model.scenarios(vector['mean_6'])))
        current=[]
        for name in (*model.BASELINES,*model.RECIPES,model.CONTROL):
            rows=[p for p in points if p['stage']==stage and p['model_id']==name]
            failed=sum(p['failure'] is not None for p in rows)
            current.append(dict(stage=stage,model_id=name,expected_n=len(origins),failed=failed,
                **metrics.score([] if failed else [(p['actual'],p['prediction']) for p in rows])))
        reports.extend(current)
        if stage=='development':
            write(output/'development.json',dict(points=points,reports=current))
            write(output/'selection.json',model.choose(current))
    latest=max(company)
    scenario_rows.append(dict(stage='latest_history_conditional',origin_period=contracts.period(latest),
        target_period=contracts.period(latest+1),issue_status='conditional_historical_illustration_not_current_issue',
        **model.scenarios(model.baselines(company,latest)['mean_6'])))
    result=dict(points=points,reports=reports,selection=json.loads((output/'selection.json').read_bytes()),
        scenarios=scenario_rows,source_identity=source['source_identity'],target_unit='PHP',
        temporal_status='Retrospective_current_mapping_no_historical_availability_attestation',
        publication_approved=False,operational_approval=False,untouched_test=False,
        generated_at=datetime.now(timezone.utc).isoformat())
    write(output/'results.json',result)
    for name,rows in [('metrics.csv',reports),('scenarios.csv',scenario_rows)]:
        with (output/name).open('x',encoding='utf-8',newline='') as handle:
            writer=csv.DictWriter(handle,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
    return dict(status='EXECUTED',points=len(points),groups=len(reports),failed=sum(p['failure'] is not None for p in points),
                selection=result['selection'],latest_conditional_scenario=scenario_rows[-1])


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode',choices=('register','execute'),required=True)
    for name in ('source','categories','reference','output'):
        parser.add_argument('--'+name,type=Path,required=True)
    args=parser.parse_args()
    print(json.dumps(run(args.source,args.categories,args.reference,args.output,args.mode)))


if __name__=='__main__':
    main()
