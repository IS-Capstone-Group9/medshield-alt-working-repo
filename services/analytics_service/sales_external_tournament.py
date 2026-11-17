"""Separately versioned WP4 research tournament; existing frozen grids unchanged."""
import math
from .predictive.contracts import month, period
from .predictive.metrics import compare, diebold_mariano, mase_scale
from .predictive.models import BENCHMARKS, CHALLENGERS, EXTENDED_CHALLENGERS, forecast, lag_features

POLICY = 'sales_external_tournament_v1_candidate_only'
CONFIGS = [*BENCHMARKS, *CHALLENGERS, *EXTENDED_CHALLENGERS,
           dict(model_id='hist_gbdt_direct', family='hist_gbdt', max_iter=60, max_leaf_nodes=7,
                min_samples_leaf=3, l2_regularization=1.0)]


def protocol():
    def months(start,end):
        return [period(p) for p in range(month(start),month(end)+1)]
    return dict(policy_version=POLICY, training_start='2020-01', leads=[1,3,6],
                development_origins=months('2022-12','2024-06'),
                retrospective_audit_origins=months('2024-12','2025-06'),
                inspected_extension_origins=months('2025-12','2026-03'),
                configs=CONFIGS, seed=20261030,
                selection='development_only_MASE_lt_1_MAE_strictly_below_last_and_seasonal_abs_bias_le_5',
                limitations=['New registration is not an untouched future holdout.',
                             'Revised retained source has no verified historical availability vintages.',
                             'No operational publication or clinical/unit/geographic approval.'])


def histogram_forecast(training,origin,leads,config,seed):
    from sklearn.ensemble import HistGradientBoostingRegressor
    start=min(training)
    if sorted(training)!=list(range(start,origin+1)):
        raise ValueError('Histogram training must be contiguous')
    predictions={}
    for lead in leads:
        origins=list(range(start+11,origin-lead+1))
        if len(origins)<12:
            return {},'Histogram GBDT requires 12 origin-known examples per lead'
        features=[lag_features(training,p,p+lead) for p in origins]
        targets=[training[p+lead] for p in origins]
        model=HistGradientBoostingRegressor(max_iter=config['max_iter'],max_leaf_nodes=config['max_leaf_nodes'],
            min_samples_leaf=config['min_samples_leaf'],l2_regularization=config['l2_regularization'],
            early_stopping=False,random_state=seed)
        model.fit(features,targets)
        predictions[lead]=float(model.predict([lag_features(training,origin,origin+lead)])[0])
    return predictions,None


def select_by_lead(comparisons,lead):
    """No audit results enter this function. Missing any reference means unavailable."""
    if not all(name in comparisons for name in ('last_value','seasonal_naive')):
        return dict(lead_months=lead,model_id=None,status='UNAVAILABLE_BASELINE_COMPARISON')
    season,last=(comparisons[name]['common']['mae'] for name in ('seasonal_naive','last_value'))
    candidates=[]
    for name,report in comparisons.items():
        if name in ('last_value','seasonal_naive'):
            continue
        scores=report['common'];mase=report['common_scaled_error']['mase']
        if (mase is not None and mase<1 and scores['mae'] is not None and
            scores['mae']<season and scores['mae']<last and scores['normalized_bias'] is not None and
            abs(scores['normalized_bias'])<=5):
            candidates.append((scores['mae'],name))
    return dict(lead_months=lead,model_id=min(candidates)[1] if candidates else 'seasonal_naive',
                status='RESEARCH_RULE_CHALLENGER_SELECTED' if candidates else 'NO_PROMOTION_RETAIN_BASELINE',
                publication_approved=False)


def evaluate(series,spec,predictor=None):
    if spec!=protocol():
        raise ValueError('Tournament protocol differs from its versioned definition')
    first=month(spec['training_start'])
    data={p:v for p,v in series.items() if p>=first}
    if not data or sorted(data)!=list(range(first,max(data)+1)):
        raise ValueError('Required history has missing months; not zero filled')
    if any(isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) for v in data.values()):
        raise ValueError('Expected finite observed target values')
    points=[]
    for stage in ('development','retrospective_audit','inspected_extension'):
        for origin_label in spec[stage+'_origins']:
            origin=month(origin_label)
            if origin+max(spec['leads'])>max(data):
                raise ValueError('Required target history unavailable')
            training={p:v for p,v in data.items() if p<=origin}
            scale=mase_scale(training)
            for config in spec['configs']:
                try:
                    adapter=predictor or (histogram_forecast if config.get('family')=='hist_gbdt' else forecast)
                    values,reason=adapter(training,origin,spec['leads'],config,spec['seed'])
                except (ValueError,RuntimeError,ArithmeticError,ImportError) as error:
                    values,reason={},type(error).__name__+': '+str(error)
                for lead in spec['leads']:
                    value=values.get(lead)
                    if value is not None and not math.isfinite(value):
                        value,reason=None,'Nonfinite prediction'
                    points.append(dict(series_id='original_itemized_all_buyers_PHP',target_name='net_sales',
                        model_id=config['model_id'],origin_period=origin_label,target_period=period(origin+lead),
                        lead_months=lead,actual=data[origin+lead],prediction=value,stage=stage,
                        mase_scale=scale['value'],mase_scale_lag_months=scale['lag_months'],missing_reason=reason))
    reports=[];selections=[];support=[]
    for stage in ('development','retrospective_audit','inspected_extension'):
        for lead in spec['leads']:
            subset=[p for p in points if p['stage']==stage and p['lead_months']==lead]
            expected=len(spec[stage+'_origins'])
            complete=[config['model_id'] for config in spec['configs'] if
                      sum(p['prediction'] is not None and p['model_id']==config['model_id'] for p in subset)==expected]
            comparisons=compare(subset,complete)
            support.append(dict(stage=stage,lead_months=lead,common_origins=expected,complete_models=complete,
                unavailable_models=[c['model_id'] for c in spec['configs'] if c['model_id'] not in complete]))
            if stage=='development':
                selections.append(select_by_lead(comparisons,lead))
            for name,values in comparisons.items():
                reports.append(dict(stage=stage,lead_months=lead,model_id=name,**values,
                    dm_vs_seasonal_naive=diebold_mariano(subset,name,lead=lead) if name!='seasonal_naive' else None))
    return dict(schema_version='sales_external_tournament_v1',protocol=spec,predictions=points,
                reports=reports,selections=selections,support=support,evidence_label='Forecast',
                publication_approved=False,operational_approval=False,
                unavailable_targets=['A: reviewed unit-pilot source not supplied to this PHP execution',
                                     'B: reviewed territorial therapeutic-unit cohort not supplied'],
                consequence_units=None,consequence_tp_php=None,
                consequence_reason='PHP forecast errors cannot be converted to physical unit demand or TP exposure')
