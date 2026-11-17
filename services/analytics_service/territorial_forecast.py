"""Retrospective regional PHP research; never territorial units or operational issuance."""
import math
from decimal import Decimal
from .predictive.contracts import month,period
from .predictive.metrics import compare,diebold_mariano,mase_scale
from .predictive.models import forecast
from .sales_external_tournament import protocol as engine_protocol,histogram_forecast,select_by_lead

REGIONS=('CALABARZON','MIMAROPA','BICOL')
DATASET='e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10'
POLICY='regional_recorded_php_tournament_v1_candidate_only'

def protocol():
    return dict(version=POLICY,target='recorded_confirmed_delivery_region_itemized_net_sales',unit='PHP',
        regions=list(REGIONS),minimum_first_origin_training_months=36,source_end='2026-09',
        engine=engine_protocol(),selection_scope='development_only_per_region_and_lead',
        limitations=['Retrospective revised source; historical issue-time availability is not established.',
            'This is recorded financial activity, not unit demand, regional market completeness or procurement guidance.',
            'Registered now before these fits, after historical source inspection; no untouched prospective claim.',
            'Nominal DM p-values are exploratory, unadjusted across recipes; short cohorts remain explicit.',
            'No model activation, source mutation, calibrated intervals or future forecast issuance.'])

def prepare(financial):
    if financial.get('status')!='user_confirmed_regional_financial_review':raise ValueError('Source-validated regional review required')
    source=financial['source']
    if source['dataset_id']!=DATASET or source['fact_version']!=0 or source['policy_version']!='original_source_layers_v1_candidate_only':
        raise ValueError('Unexpected original source identity')
    if source['calendar_end']!='2026-09':raise ValueError('Changed source window needs a new protocol')
    scope=financial['scope']
    if scope['contracts_excluded'] is not True or scope['financial_publication_approved'] is not False:raise ValueError('Unexpected population/approval')
    spec=protocol();engine=spec['engine'];start=month(engine['training_start']);end=month(spec['source_end'])
    seen=set();series={r:{} for r in REGIONS};quality={r:0 for r in REGIONS}
    for row in financial['months']:
        region=row['region']
        if region not in REGIONS:continue
        key=(region,row['period'])
        if key in seen:raise ValueError('Duplicate regional month')
        seen.add(key);index=month(row['period'])
        if not start<=index<=end:continue
        if row['net_sales_php'] is None:continue
        value=Decimal(row['net_sales_php'])
        if not value.is_finite() or type(row['net_eligible_records']) is not int or row['net_eligible_records']<=0:raise ValueError('Unsupported regional observation')
        series[region][index]=float(value);quality[region]+=row['unreviewed_records']
    eligibility=[]
    for region,values in series.items():
        missing=[period(i) for i in range(start,end+1) if i not in values]
        eligibility.append(dict(region=region,status='eligible_financial_research' if not missing else 'unavailable_incomplete_registered_history',
            expected_months=end-start+1,observed_eligible_months=len(values),missing_months=missing,
            observed_last_month=period(max(values)) if values else None,unreviewed_records_in_window=quality[region],
            unit='PHP',territorial_unit_forecast_eligible=False))
    return series,eligibility

def evaluate_region(values,region,predictor=None):
    if region not in REGIONS:raise ValueError('Unsupported region')
    spec=protocol();engine=spec['engine'];first=month(engine['training_start']);end=month(spec['source_end'])
    if sorted(values)!=list(range(first,end+1)) or any(isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) for v in values.values()):
        raise ValueError('Complete observed registered history required; no zero filling')
    points=[]
    for stage in ('development','retrospective_audit','inspected_extension'):
        for origin_label in engine[stage+'_origins']:
            origin=month(origin_label);training={p:v for p,v in values.items() if p<=origin}
            if len(training)<spec['minimum_first_origin_training_months']:raise ValueError('Insufficient origin-local history')
            scale=mase_scale(training)
            for config in engine['configs']:
                try:
                    adapter=predictor or (histogram_forecast if config.get('family')=='hist_gbdt' else forecast)
                    predictions,reason=adapter(training,origin,engine['leads'],config,engine['seed'])
                except (ValueError,RuntimeError,ArithmeticError,ImportError) as error:
                    predictions,reason={},type(error).__name__+': '+str(error)
                for lead in engine['leads']:
                    value=predictions.get(lead)
                    if value is not None and (isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value)):
                        value,reason=None,'Nonfinite or unsupported prediction'
                    points.append(dict(series_id='confirmed_delivery_'+region+'_itemized_PHP',region=region,target_name='net_sales',
                        unit='PHP',model_id=config['model_id'],origin_period=origin_label,target_period=period(origin+lead),
                        lead_months=lead,actual=values[origin+lead],prediction=value,stage=stage,
                        mase_scale=scale['value'],mase_scale_lag_months=scale['lag_months'],missing_reason=reason))
    reports=[];support=[];selections=[]
    for stage in ('development','retrospective_audit','inspected_extension'):
        for lead in engine['leads']:
            cohort=[p for p in points if p['stage']==stage and p['lead_months']==lead]
            expected=len(engine[stage+'_origins'])
            complete=[c['model_id'] for c in engine['configs'] if sum(p['prediction'] is not None for p in cohort if p['model_id']==c['model_id'])==expected]
            comparisons=compare(cohort,complete)
            support.append(dict(region=region,stage=stage,lead_months=lead,expected_origins=expected,complete_models=complete,
                unavailable_models=[c['model_id'] for c in engine['configs'] if c['model_id'] not in complete]))
            if stage=='development':selections.append(dict(region=region,**select_by_lead(comparisons,lead)))
            for model,metrics in comparisons.items():
                reports.append(dict(region=region,stage=stage,lead_months=lead,model_id=model,**metrics,
                    dm_vs_seasonal_naive=diebold_mariano(cohort,model,lead=lead) if model!='seasonal_naive' else None))
    return dict(region=region,predictions=points,reports=reports,support=support,selections=selections,
        model_publication_approved=False,operational_approval=False,future_forecasts_generated=0)
