"""Retrospective STL of confirmed recorded regional PHP; no gap imputation."""
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import numpy as np
import statsmodels
from statsmodels.tsa.seasonal import STL

REGIONS=['CALABARZON','MIMAROPA','BICOL']
PROTOCOL=dict(period=12,seasonal_window=13,robust=True,minimum_contiguous_months=36,
              missing_policy='no_imputation_split_at_gaps',interpretation='full_segment_retrospective_not_origin_safe_forecast_feature')


def month_id(month):
    year,number=map(int,month.split('-'));assert 1<=number<=12
    return year*12+number-1


def label(number):return f'{number//12:04d}-{number%12+1:02d}'


def analyze(source):
    assert source['status']=='user_confirmed_regional_financial_review'
    assert source['source']['fact_version']==0
    assert source['source']['dataset_id']=='e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10'
    assert source['source']['policy_version']=='original_source_layers_v1_candidate_only'
    assert source['source']['mapping_sha256']=='4c5f44013464395efa49c133f2d141646930f9437a23e60e8b05cf0298392df4'
    assert source['source']['current_monthly_sha256']=='3c3732944ea115a3e12465bd48ee1d0322a503beb7c44e60a64e85b54cff586c'
    assert source['scope']['contracts_excluded'] is True and source['scope']['forecast_approved'] is False
    assert source['scope']['financial_publication_approved'] is False and source['scope']['external_join_approved'] is False
    assert len({(r['region'],r['period']) for r in source['months']})==len(source['months'])
    for key in ['records','net_eligible_records','margin_eligible_records','unreviewed_records']:
        assert sum(r[key] for r in source['months'])==source['company'][key]
    for key in ['net_sales_php','gross_profit_php','margin_revenue_basis_php']:
        assert sum((Decimal(r[key]) for r in source['months'] if r[key] is not None),Decimal(0))==Decimal(source['company'][key])
    assert source['company']['records']==40171 and Decimal(source['company']['net_sales_php'])==Decimal('638015351.53')
    first=month_id(source['source']['calendar_start']);last=month_id(source['source']['calendar_end'])
    series=[]
    for region in REGIONS:
        observed={r['period']:r for r in source['months'] if r['region']==region}
        calendar=[];runs=[]
        for i in range(first,last+1):
            period=label(i);row=observed.get(period);amount=row['net_sales_php'] if row else None
            calendar.append(dict(period=period,observed_net_sales_php=amount,records=row['records'] if row else 0,
                unreviewed_records=row['unreviewed_records'] if row else 0,
                status='recorded' if amount is not None else 'no_eligible_net_sales' if row else 'no_regional_source_records'))
            if amount is not None:
                assert Decimal(amount).is_finite()
                if not runs or month_id(runs[-1][-1]['period'])!=i-1:runs.append([])
                runs[-1].append(calendar[-1])
        components=[];fitted=[];excluded=[]
        for run in runs:
            meta=dict(start=run[0]['period'],end=run[-1]['period'],months=len(run))
            if len(run)<PROTOCOL['minimum_contiguous_months']:
                excluded.append(dict(**meta,reason='fewer_than_36_contiguous_observed_months'));continue
            values=np.array([float(r['observed_net_sales_php']) for r in run])
            fit=STL(values,period=12,seasonal=13,robust=True).fit()
            error=float(np.max(np.abs(values-fit.trend-fit.seasonal-fit.resid)))
            assert np.isfinite(fit.trend).all() and np.isfinite(fit.seasonal).all() and np.isfinite(fit.resid).all() and error<1e-6
            fitted.append(dict(**meta,max_reconstruction_error_php=error))
            for i,row in enumerate(run):components.append(dict(period=row['period'],observed_net_sales_php=row['observed_net_sales_php'],
                trend_php=float(fit.trend[i]),seasonal_php=float(fit.seasonal[i]),residual_php=float(fit.resid[i]),segment_start=meta['start'],segment_end=meta['end']))
        bridge=None
        by_period={r['period']:r for r in components}
        pairs=[(by_period['2025-'+f'{m:02d}'],by_period['2026-'+f'{m:02d}']) for m in range(1,10)
               if '2025-'+f'{m:02d}' in by_period and '2026-'+f'{m:02d}' in by_period]
        if pairs:
            before=sum((Decimal(a['observed_net_sales_php']) for a,b in pairs),Decimal(0));after=sum((Decimal(b['observed_net_sales_php']) for a,b in pairs),Decimal(0))
            parts={key:sum(b[key]-a[key] for a,b in pairs) for key in ['trend_php','seasonal_php','residual_php']}
            error=abs(float(after-before)-sum(parts.values()));assert error<1e-6
            bridge=dict(base_year=2025,target_year=2026,matched_months=[b['period'][5:] for a,b in pairs],base_net_sales_php=str(before),target_net_sales_php=str(after),
                recorded_change_php=str(after-before),component_changes_php=parts,reconstruction_error_php=error,
                interpretation='retrospective_accounting_decomposition_not_causal_attribution')
        series.append(dict(region=region,calendar=calendar,components=components,fitted_segments=fitted,excluded_segments=excluded,
            maximum_contiguous_observed_months=max(map(len,runs),default=0),latest_observed_region_month=max(observed) if observed else None,matched_change=bridge))
    return dict(schema_version='confirmed_regional_stl_v1',status='RETROSPECTIVE_REGIONAL_STL_CANDIDATE',source=source['source'],protocol=PROTOCOL,
        environment=dict(statsmodels=statsmodels.__version__,numpy=np.__version__),series=series,diagnostic_fits=sum(len(s['fitted_segments']) for s in series),
        forecast_models_trained=0,future_forecasts_generated=False,financial_publication_approved=False,forecast_approved=False,external_join_approved=False,
        limitations=['Recorded PHP for nine user-confirmed delivery labels only; not complete regional or company sales.',
            'Unallocated labels are excluded from regional fits, not spread across regions.',
            'Missing regional months remain unknown; source presence does not prove completeness.',
            'Full-segment retrospective STL uses later observations; not an origin-safe forecast feature.',
            'Component change is an accounting decomposition, not disease/weather/price/stockout causation.',
            'Shorter Bicol/MIMAROPA runs are retained without fitted values under the existing 36-month rule.'])


def main():
    directory=Path('outputs/so1_regional_stl_20261028');raw=(directory/'source.json').read_bytes()
    result=analyze(json.loads(raw));result['input_sha256']=hashlib.sha256(raw).hexdigest();result['analyzer_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    (directory/'analysis.json').write_bytes((json.dumps(result,indent=2,allow_nan=False)+'\n').encode())
    print(json.dumps(dict(status=result['status'],regions=[dict(region=s['region'],fitted=s['fitted_segments'],max_contiguous=s['maximum_contiguous_observed_months'],change=s['matched_change']) for s in result['series']])))


if __name__=='__main__':main()
