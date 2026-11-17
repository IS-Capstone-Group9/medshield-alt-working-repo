"""Calibrate fixed product-occurrence forecasts using completed origin-local errors."""
import math
from statistics import median

VERSION='occurrence_completed_error_calibration_v1'
BASE_ID='product_tsb_gap_a30_b10'
RAW_CONTROL='occurrence_raw_control'
CONFIGS=(dict(model_id='occurrence_residual_mean12',method='mean'),
         dict(model_id='occurrence_residual_median12',method='median'),
         dict(model_id='occurrence_ratio12',method='ratio'))


def predict(company,cache,origin,config):
    if config not in CONFIGS:raise ValueError('Unregistered calibration recipe')
    current=[r for r in cache if r['origin']==origin]
    if len(current)!=1 or current[0]['target']!=origin+1:raise ValueError('Unique current one-month base forecast required')
    # Current/future target actuals may be stored for evaluation but never enter fit.
    completed=[r for r in cache if origin-11<=r['target']<=origin]
    completed.sort(key=lambda r:r['target'])
    targets=[r['target'] for r in completed]
    if (len(completed)<8 or len(set(targets))!=len(targets) or targets[-1]!=origin or
            targets!=list(range(targets[0],origin+1)) or any(r['target']!=r['origin']+1 for r in completed)):
        raise ValueError('Eight contiguous completed one-step targets required')
    if any(p not in company or not math.isfinite(company[p]) for p in range(origin-11,origin+1)):
        raise ValueError('Twelve contiguous observed financial months required')
    if any(not math.isfinite(r[k]) for r in completed for k in ('actual','prediction')):
        raise ValueError('Nonfinite completed base case')
    for r in completed:
        if r['actual']!=company.get(r['target']):raise ValueError('Completed actual/source mismatch')
    base=current[0]['prediction']
    if not math.isfinite(base):raise ValueError('Nonfinite current base forecast')
    residuals=[r['actual']-r['prediction'] for r in completed]
    cap=.5*math.fsum(abs(company[p]) for p in range(origin-11,origin+1))/12
    if config['method']=='ratio':
        denominator=math.fsum(r['prediction'] for r in completed)
        if denominator<=0:raise ValueError('Positive completed prediction denominator required')
        raw=math.fsum(r['actual'] for r in completed)/denominator
        factor=max(.5,min(2.,raw));prediction=base*factor
        correction=None
    else:
        raw=math.fsum(residuals)/len(residuals) if config['method']=='mean' else median(residuals)
        correction=max(-cap,min(cap,raw));prediction=base+correction;factor=None
    if not math.isfinite(prediction):raise ValueError('Nonfinite calibrated forecast')
    return prediction,dict(origin=origin,base_prediction=base,inner=completed,
        raw_adjustment=raw,additive_cap=cap,correction=correction,factor=factor,
        max_completed_target=targets[-1],current_target_actual_used=False)
