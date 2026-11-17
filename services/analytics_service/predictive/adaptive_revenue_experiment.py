"""Registered missing-aware, calendar and robust revenue models; offline research only."""
import argparse
import csv
from datetime import datetime, timezone
import hashlib
from importlib.metadata import version
import json
import math
from pathlib import Path
import platform
import sys
import warnings

from .contracts import month, period
from .metrics import score
from .sector_policy_experiment import validate_input

BASE_MODELS=('last_value','kalman_level','kalman_trend','anchored_calendar','damped_calendar','huber_direct')
MODELS=BASE_MODELS+('equal_blend','convex_blend')
WINDOWS=('2017-01','2020-01')
SCHEDULES=('annual','monthly')
PROTOCOL=dict(version='adaptive-revenue-v1',target='company monthly signed net-sales PHP',windows=list(WINDOWS),
    meta_training_year=2023,validation_year=2024,retrospective_year=2025,
    schedules={'annual':'previous December origin, leads1-12','monthly':'previous month origin, lead1'},
    models=list(MODELS),kalman=dict(min_observed=24,maxiter=200,require_converged=True),
    calendar=dict(harmonics=2,ridge_alpha=1.,min_observed=24,anchor_residual_damping=[1.,.9]),
    huber=dict(epsilon=1.35,alpha=.1,maxiter=1000,min_examples=18,
               features='Current/mean4/observed-mean12/same-calendar-reference scaled by median absolute observed12; two Fourier harmonics',
               examples='Require exact current and previous3, seasonal reference, at least6 observed of12; target<=outer origin',
               weighting='Example scale divided by median example scale; training-only feature standardization'),
    equal_blend_members=['last_value','kalman_level','anchored_calendar'],
    convex='LAD nonnegative weights summing1; retain only complete meta-training members; min2 else explicit last-value fallback',
    weight_schedule='Fit2023 out-of-origin forecasts for2024 validation; refit2023-2024 before2025 evaluation',
    selection='Separate schedule/window: lowest MAE on all12 matching2024 cases, listed-order ties; freeze before2025 scores',
    missing='No target imputation, no clipping signed predictions; failed or nonconverged model unavailable',
    limits=['2025 already inspected; all later scores are exploratory, not untouched confirmation',
            'Revised history does not establish actual historical release/revision timing',
            'Monthly updates assume timely accepted observations; current live source has no2026 actuals',
            'No original-model replacement, cloud publication, medicine-unit forecast or procurement authorization'])


def stamp():return datetime.now(timezone.utc).isoformat()
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def require(value,message):
    if not value:raise ValueError(message)
def save(path,value):
    with Path(path).open('x',encoding='utf-8') as handle:handle.write(json.dumps(value,indent=2,allow_nan=False)+'\n')
def point_key(p):return p['schedule'],p['origin_period'],p['target_period'],p['lead_months']


def calendar_features(date,start):
    return [(date-start)/12]+[value for harmonic in (1,2) for value in (math.sin(2*math.pi*harmonic*(date%12)/12),math.cos(2*math.pi*harmonic*(date%12)/12))]


def calendar_fit(training,origin,leads,start,rho):
    import numpy as np
    dates=sorted(p for p,v in training.items() if p>=start and v is not None)
    require(len(dates)>=24 and training.get(origin) is not None,'Calendar requires24 observed months and observed origin')
    x=np.asarray([calendar_features(p,start) for p in dates])
    y=np.asarray([training[p] for p in dates])
    center=x.mean(axis=0);scale=x.std(axis=0);scale=np.where(scale==0,1.,scale)
    z=(x-center)/scale
    intercept=float(y.mean())
    coefficients=np.linalg.solve(z.T@z+np.eye(z.shape[1]),z.T@(y-intercept))
    fitted=lambda p:float(intercept+((np.asarray(calendar_features(p,start))-center)/scale)@coefficients)
    residual=float(training[origin]-fitted(origin))
    predictions={lead:fitted(origin+lead)+rho**lead*residual for lead in leads}
    trace=dict(observed=len(dates),training_periods=[period(p) for p in dates],center=center.tolist(),scale=scale.tolist(),
               coefficients=coefficients.tolist(),intercept=intercept,origin_residual=residual,rho=rho)
    return predictions,trace


def kalman_fit(training,origin,leads,start,trend):
    import numpy as np
    from statsmodels.tsa.statespace.structural import UnobservedComponents
    dates=list(range(start,origin+1))
    observed=[training.get(p) for p in dates]
    finite=[v for v in observed if v is not None]
    require(len(finite)>=24 and training.get(origin) is not None,'Kalman requires24 observed months and observed origin')
    scale=float(np.std(finite)) or max(map(abs,finite)) or 1.
    values=np.asarray([np.nan if value is None else value/scale for value in observed])
    level='local linear trend' if trend else 'local level'
    with warnings.catch_warnings(record=True) as captured:
        warnings.simplefilter('always')
        fitted=UnobservedComponents(values,level=level).fit(disp=False,method='lbfgs',maxiter=200,cov_type='none')
    require(bool(fitted.mle_retvals.get('converged',False)),'Kalman optimizer did not converge within200 iterations')
    predictions=fitted.forecast(max(leads))*scale
    trace=dict(observed=len(finite),calendar_rows=len(values),missing_count=len(values)-len(finite),scale=scale,
               level=level,parameters=list(map(float,fitted.params)),parameter_names=fitted.param_names,
               converged=True,warnings=[str(w.message)[:250] for w in captured])
    return {lead:float(predictions[lead-1]) for lead in leads},trace


def direct_features(training,origin,target):
    import numpy as np
    current=[training.get(origin-i) for i in range(4)]
    annual=[training.get(origin-i) for i in range(12) if training.get(origin-i) is not None]
    seasonal=training.get(target-12)
    if any(v is None for v in current) or len(annual)<6 or seasonal is None:return None
    require(target-12<=origin,'Seasonal feature would use future data')
    scale=float(np.median(np.abs(annual))) or float(np.mean(np.abs(annual))) or 1.
    features=[current[0]/scale,math.fsum(current)/4/scale,math.fsum(annual)/len(annual)/scale,seasonal/scale]
    features += [value for harmonic in (1,2) for value in (math.sin(2*math.pi*harmonic*(target%12)/12),math.cos(2*math.pi*harmonic*(target%12)/12))]
    return features,scale


def huber_fit(training,origin,leads,start):
    import numpy as np
    from sklearn.linear_model import HuberRegressor
    predictions={};traces={}
    for lead in leads:
        examples=[]
        for p in range(start,origin-lead+1):
            if training.get(p+lead) is None:continue
            record=direct_features(training,p,p+lead)
            if record is not None:examples.append((p,*record,training[p+lead]))
        require(len(examples)>=18,f'Huber lead{lead} has fewer than18 training examples')
        current=direct_features(training,origin,origin+lead)
        require(current is not None,f'Huber lead{lead} origin features unavailable')
        x=np.asarray([r[1] for r in examples]);scales=np.asarray([r[2] for r in examples]);y=np.asarray([r[3]/r[2] for r in examples])
        center=x.mean(axis=0);spread=x.std(axis=0);spread=np.where(spread==0,1.,spread)
        with warnings.catch_warnings(record=True) as captured:
            warnings.simplefilter('always')
            fitted=HuberRegressor(epsilon=1.35,alpha=.1,max_iter=1000).fit((x-center)/spread,y,sample_weight=scales/np.median(scales))
        require(fitted.n_iter_<1000,'Huber optimizer did not converge within1000 iterations')
        features,scale=current
        predictions[lead]=float(fitted.predict([(np.asarray(features)-center)/spread])[0]*scale)
        traces[str(lead)]=dict(examples=len(examples),target_cutoff=period(max(r[0]+lead for r in examples)),
            feature_origins=[period(r[0]) for r in examples],center=center.tolist(),spread=spread.tolist(),
            coefficients=fitted.coef_.tolist(),intercept=float(fitted.intercept_),origin_features=features,origin_scale=scale,
            iterations=int(fitted.n_iter_),warnings=[str(w.message)[:250] for w in captured])
    return predictions,traces


def base_forecast(values,origin,leads,start,model):
    # Subset first: all fitting helpers receive only origin-known calendar values.
    training={p:v for p,v in values.items() if start<=p<=origin}
    metadata=dict(model_id=model,training_start=period(start),training_end=period(origin),
                  training_sha256=hashlib.sha256(json.dumps(sorted(training.items()),allow_nan=False).encode()).hexdigest())
    try:
        require(model in BASE_MODELS,'Unknown base model')
        require(leads and all(isinstance(h,int) and not isinstance(h,bool) and 1<=h<=12 for h in leads),'Only integer leads1-12')
        require(training.get(origin) is not None,'Observed origin required')
        if model=='last_value':predictions={h:training[origin] for h in leads};trace=dict(observed=sum(v is not None for v in training.values()))
        elif model.startswith('kalman_'):predictions,trace=kalman_fit(training,origin,leads,start,model=='kalman_trend')
        elif model in ('anchored_calendar','damped_calendar'):predictions,trace=calendar_fit(training,origin,leads,start,1. if model=='anchored_calendar' else .9)
        else:predictions,trace=huber_fit(training,origin,leads,start)
        require(all(math.isfinite(v) for v in predictions.values()),'Nonfinite prediction')
        return predictions,dict(metadata,status='available',fit=trace)
    except (ValueError,RuntimeError,ArithmeticError,ImportError) as error:
        return {},dict(metadata,status='unavailable',reason=f'{type(error).__name__}: {error}')


def years_points(series,start,year,cache):
    result=[]
    for schedule in SCHEDULES:
        for target in range(month(f'{year}-01'),month(f'{year}-12')+1):
            origin=month(f'{year-1}-12') if schedule=='annual' else target-1
            lead=target-origin
            if origin not in cache:
                leads=list(range(1,13)) if origin%12==11 else [1]
                cache[origin]={model:base_forecast(series,origin,leads,month(start),model) for model in BASE_MODELS}
                print(f'fit window={start} origin={period(origin)}',flush=True)
            for model,(predictions,trace) in cache[origin].items():
                result.append(dict(window_start=start,schedule=schedule,year=year,origin_period=period(origin),target_period=period(target),
                                   lead_months=lead,model_id=model,actual=series.get(target),prediction=predictions.get(lead),reason=trace.get('reason')))
    return result


def fit_weights(points,schedule):
    import numpy as np
    from scipy.optimize import linprog
    relevant=[p for p in points if p['schedule']==schedule]
    keys=sorted({point_key(p) for p in relevant if p['model_id']=='last_value' and p['actual'] is not None})
    require(keys,'No meta-training cases')
    indexes={m:{point_key(p):p for p in relevant if p['model_id']==m and p['prediction'] is not None and p['actual'] is not None} for m in BASE_MODELS}
    members=[m for m in BASE_MODELS if set(indexes[m])==set(keys)]
    require(all(indexes[m][k]['actual']==indexes['last_value'][k]['actual'] for m in members for k in keys),'Meta-training actuals differ')
    if len(members)<2 or 'last_value' not in members:
        return dict(members=['last_value'],weights=[1.],fallback=True,training_keys=[list(k) for k in keys],excluded=[m for m in BASE_MODELS if m not in members])
    actual=np.asarray([indexes['last_value'][k]['actual'] for k in keys])
    matrix=np.asarray([[indexes[m][k]['prediction'] for m in members] for k in keys])
    scale=float(np.median(np.abs(actual))) or 1.
    matrix=matrix/scale;actual=actual/scale
    n,p=matrix.shape
    fitted=linprog(np.r_[np.zeros(p),np.ones(n)],A_ub=np.vstack([np.c_[matrix,-np.eye(n)],np.c_[-matrix,-np.eye(n)]]),
                   b_ub=np.r_[actual,-actual],A_eq=np.r_[np.ones(p),np.zeros(n)][None,:],b_eq=[1.],bounds=[(0,None)]*(p+n),method='highs')
    require(fitted.success,'Convex absolute-loss optimizer failed')
    weights=fitted.x[:p]
    require(np.isfinite(weights).all() and min(weights)>=-1e-9 and abs(sum(weights)-1)<1e-8,'Invalid convex weights')
    return dict(members=members,weights=weights.tolist(),fallback=False,training_keys=[list(k) for k in keys],
                excluded=[m for m in BASE_MODELS if m not in members],objective_mean_absolute_error=float(fitted.fun*scale/n))


def with_combinations(points,weights):
    result=list(points)
    indexes={m:{point_key(p):p for p in points if p['model_id']==m} for m in BASE_MODELS}
    for k,reference in indexes['last_value'].items():
        for model,members,coefficients in [('equal_blend',PROTOCOL['equal_blend_members'],[1/3]*3),
                                           ('convex_blend',weights[reference['schedule']]['members'],weights[reference['schedule']]['weights'])]:
            # Zero-weight members remain part of the frozen contract; no missing-member renormalization.
            values=[indexes[m][k]['prediction'] for m in members]
            value=math.fsum(v*w for v,w in zip(values,coefficients)) if all(v is not None for v in values) else None
            result.append(dict(reference,model_id=model,prediction=value,reason=None if value is not None else 'A frozen blend member is unavailable'))
    return result


def compare(points,schedule,limit=12):
    selected=[p for p in points if p['schedule']==schedule and (int(p['target_period'][5:])<=limit)]
    baseline={point_key(p):p for p in selected if p['model_id']=='last_value' and p['actual'] is not None and p['prediction'] is not None}
    result={}
    for model in MODELS:
        index={point_key(p):p for p in selected if p['model_id']==model and p['actual'] is not None and p['prediction'] is not None}
        require(len(index)==sum(p['model_id']==model and p['actual'] is not None and p['prediction'] is not None for p in selected),'Duplicate evaluation key')
        common=sorted(set(baseline)&set(index))
        require(all(index[k]['actual']==baseline[k]['actual'] for k in common),'Mismatched actuals')
        result[model]=dict(native=score([(p['actual'],p['prediction']) for p in index.values()]),common_keys=[list(k) for k in common],
                           candidate=score([(index[k]['actual'],index[k]['prediction']) for k in common]),
                           baseline=score([(baseline[k]['actual'],baseline[k]['prediction']) for k in common]))
    return result


def choose(validation,schedule):
    require(all(p['year']==2024 and p['target_period'][:4]=='2024' for p in validation),'Selection permits2024 validation only')
    metrics=compare(validation,schedule)
    eligible=[m for m in MODELS if metrics[m]['candidate']['n']==12]
    require('last_value' in eligible,'Complete baseline unavailable')
    selected=min(eligible,key=lambda m:(metrics[m]['candidate']['mae'],MODELS.index(m)))
    return dict(selected_model=selected,validation_metrics=metrics,criterion='Lowest complete12-case validation MAE; frozen before2025')


def identity(input_path):
    directory=Path(__file__).parent
    return dict(input_sha256=sha(input_path),code_sha256={name:sha(directory/name) for name in ('adaptive_revenue_experiment.py','sector_policy_experiment.py','contracts.py','metrics.py')},
                runtime=dict(executable=sys.executable,python=platform.python_version(),packages={name:version(name) for name in ('numpy','scipy','statsmodels','scikit-learn')}))


def prepare(input_path,output):
    data=json.loads(Path(input_path).read_text(encoding='utf-8-sig'));validate_input(data)
    output=Path(output);require(not output.exists() or not any(output.iterdir()),'Registration needs a new empty directory')
    output.mkdir(parents=True,exist_ok=True)
    registration=dict(status='registered',registered_at_utc=stamp(),identity=identity(input_path),protocol=PROTOCOL,source_manifest=data['manifest'])
    save(output/'registration.json',registration)
    return registration


def run(input_path,output):
    output=Path(output);registration=json.loads((output/'registration.json').read_text())
    require(registration['identity']==identity(input_path) and registration['protocol']==PROTOCOL,'Registration drift; use a new registration')
    require(set(p.name for p in output.iterdir())=={'registration.json'},'Registered output already used')
    data=json.loads(Path(input_path).read_text(encoding='utf-8-sig'));require(data['manifest']==registration['source_manifest'],'Source manifest drift')
    series=validate_input(data)['All'];caches={start:{} for start in WINDOWS};development={};choices={};final_weights={}
    for start in WINDOWS:
        meta=years_points(series,start,2023,caches[start])
        provisional={schedule:fit_weights(meta,schedule) for schedule in SCHEDULES}
        validation_base=years_points(series,start,2024,caches[start])
        validation=with_combinations(validation_base,provisional)
        choices[start]={schedule:choose(validation,schedule) for schedule in SCHEDULES}
        final_weights[start]={schedule:fit_weights(meta+validation_base,schedule) for schedule in SCHEDULES}
        development[start]=dict(meta=meta,provisional_weights=provisional,validation=validation)
    save(output/'development.json',development)
    selection=dict(frozen_at_utc=stamp(),choices=choices,final_weights=final_weights,training_target_cutoff='2024-12',
                   publication_approved=False,audit_already_inspected=True,registration_sha256=sha(output/'registration.json'))
    save(output/'selection.json',selection)
    audit_started=stamp();audits={}
    for start in WINDOWS:
        audits[start]=with_combinations(years_points(series,start,2025,caches[start]),final_weights[start])
    result=dict(status='completed_research_only',audit_started_at_utc=audit_started,completed_at_utc=stamp(),
                registration_sha256=sha(output/'registration.json'),selection_sha256=sha(output/'selection.json'),
                comparisons={start:{schedule:{str(limit):compare(points,schedule,limit) for limit in (3,6,12)} for schedule in SCHEDULES} for start,points in audits.items()},
                retrospective_points=audits,limits=PROTOCOL['limits'])
    save(output/'fit-traces.json',{start:{period(origin):{m:trace for m,(_,trace) in models.items()} for origin,models in cache.items()} for start,cache in caches.items()})
    save(output/'results.json',result)
    with (output/'PREDICTIONS.csv').open('x',encoding='utf-8',newline='') as handle:
        fields=('window_start','schedule','year','origin_period','target_period','lead_months','model_id','actual','prediction','reason')
        writer=csv.DictWriter(handle,fieldnames=fields);writer.writeheader()
        for start in WINDOWS:writer.writerows(development[start]['meta']+development[start]['validation']+audits[start])
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--prepare',action='store_true')
    args=parser.parse_args()
    result=prepare(args.input,args.output) if args.prepare else run(args.input,args.output)
    print(json.dumps(dict(status=result['status'],registered_at_utc=result.get('registered_at_utc'),completed_at_utc=result.get('completed_at_utc'))))
