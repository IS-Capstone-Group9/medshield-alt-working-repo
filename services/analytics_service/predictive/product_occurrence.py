"""Intermittent recorded positive PHP occurrence research; never physical demand."""
import math

VERSION='product_occurrence_php_v1'
CONFIGS=(dict(model_id='product_tsb_a10_b10',method='tsb',alpha=.1,beta=.1),
         dict(model_id='product_tsb_a20_b10',method='tsb',alpha=.2,beta=.1),
         dict(model_id='product_sba_a10',method='sba',alpha=.1,beta=None))


def state(values,config):
    if config not in CONFIGS:
        raise ValueError('Unregistered occurrence recipe')
    if any(isinstance(v,bool) or not math.isfinite(v) or v<0 for v in values):
        raise ValueError('Positive component must be finite and nonnegative')
    alpha,beta=config['alpha'],config['beta']
    size,probability,interval=0.,0.,1.
    first,last=None,None
    positives=0
    for index,value in enumerate(values):
        if first is None:
            if value==0:continue
            first=last=index
            size=value;probability=1.;positives=1
            continue
        if config['method']=='tsb':
            probability=(1-beta)*probability+beta*int(value>0)
        if value>0:
            size=(1-alpha)*size+alpha*value
            interval=(1-alpha)*interval+alpha*(index-last)
            last=index;positives+=1
    prediction=(probability*size if config['method']=='tsb' else (1-alpha/2)*size/interval) if first is not None else 0.
    return dict(prediction=prediction,size=size,probability=probability if config['method']=='tsb' else None,
                interval=interval if config['method']=='sba' else None,
                first_positive_index=first,last_positive_index=last,positive_months=positives)


def predict(company,products,negative,origin,config):
    if not company or origin not in company:
        raise ValueError('Observed issue origin required')
    first=min(company)
    periods=list(range(first,origin+1))
    if len(periods)<12 or any(p not in company or p not in negative for p in periods):
        raise ValueError('Complete company financial calendar required')
    if any(not math.isfinite(company[p]) or not math.isfinite(negative[p]) or negative[p]>0 for p in periods):
        raise ValueError('Invalid signed financial history')
    contributions=[]
    for key,series in sorted(products.items()):
        # Future-only labels never enter the issue-time vocabulary or state.
        if not any(p<=origin for p in series):continue
        values=[series.get(p,0.) for p in periods]
        result=state(values,config)
        contributions.append(dict(product_key=key,**result))
    correction=sum(negative[p] for p in range(origin-5,origin+1))/6
    positive=math.fsum(row['prediction'] for row in contributions)
    return positive+correction,dict(origin=origin,history_start=first,positive_prediction=positive,
        negative_correction_prediction=correction,products=contributions,
        absent_financial_cell='empty_eligible_positive_row_set_not_verified_zero_demand')
