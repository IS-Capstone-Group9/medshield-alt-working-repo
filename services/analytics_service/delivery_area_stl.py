"""Separate delivery-area retrospective PHP STL; preserve every missing month."""
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import numpy as np
import statsmodels
from statsmodels.tsa.seasonal import STL
from .regional_stl import PROTOCOL, month_id, label

AREAS=['QUEZON','BATANGAS','CAVITE','LOWER CAVITE','LAGUNA','MARINDUQUE','ALBAY','CAM NORTE','CAM SUR','CAVITE PROVINCE']

def analyze(data):
    assert data['status']=='delivery_area_review_v1'
    source=data['regional']; rows=data['area_months']
    assert source['source']['fact_version']==0
    assert source['source']['current_monthly_sha256']=='3c3732944ea115a3e12465bd48ee1d0322a503beb7c44e60a64e85b54cff586c'
    assert len({(r['area'],r['period']) for r in rows})==len(rows)
    for key in ['records','net_eligible_records','margin_eligible_records','unreviewed_records']:
        assert sum(r[key] for r in rows)==source['company'][key]
    for key in ['net_sales_php','gross_profit_php','margin_revenue_basis_php']:
        assert sum((Decimal(r[key]) for r in rows if r[key] is not None),Decimal(0))==Decimal(source['company'][key])
    series=[]
    for area in AREAS:
        members=['CAVITE','LOWER CAVITE'] if area=='CAVITE PROVINCE' else [area]
        observed={}
        for row in rows:
            if row['area'] in members and row['net_sales_php'] is not None:
                observed[row['period']]=observed.get(row['period'],Decimal(0))+Decimal(row['net_sales_php'])
        runs=[];calendar=[]
        for i in range(month_id(source['source']['calendar_start']),month_id(source['source']['calendar_end'])+1):
            period=label(i);value=observed.get(period)
            calendar.append(dict(period=period,net_sales_php=str(value) if value is not None else None))
            if value is not None:
                if not runs or month_id(runs[-1][-1]['period'])!=i-1:runs.append([])
                runs[-1].append(calendar[-1])
        fitted=[];components=[];excluded=[]
        for run in runs:
            meta=dict(start=run[0]['period'],end=run[-1]['period'],months=len(run))
            if len(run)<PROTOCOL['minimum_contiguous_months']:
                excluded.append(meta);continue
            values=np.array([float(r['net_sales_php']) for r in run])
            fit=STL(values,period=PROTOCOL['period'],seasonal=PROTOCOL['seasonal_window'],robust=PROTOCOL['robust']).fit()
            reconstruction=float(np.max(np.abs(values-fit.trend-fit.seasonal-fit.resid)))
            assert reconstruction<1e-6
            residual=np.var(fit.resid)
            def strength(component):
                denominator=np.var(component+fit.resid)
                return None if denominator==0 else float(max(0,1-residual/denominator))
            fitted.append(dict(**meta,max_reconstruction_error_php=reconstruction,trend_strength=strength(fit.trend),seasonal_strength=strength(fit.seasonal)))
            for i,row in enumerate(run):
                components.append(dict(period=row['period'],observed_net_sales_php=row['net_sales_php'],trend_php=float(fit.trend[i]),seasonal_php=float(fit.seasonal[i]),residual_php=float(fit.resid[i]),segment_start=meta['start'],segment_end=meta['end']))
        series.append(dict(area=area,members=members,calendar=calendar,observed_months=len(observed),first=min(observed) if observed else None,latest=max(observed) if observed else None,maximum_contiguous_months=max(map(len,runs),default=0),fitted_segments=fitted,excluded_segments=excluded,components=components))
    return dict(schema_version='delivery_area_stl_v1',source=source['source'],protocol=PROTOCOL,environment=dict(numpy=np.__version__,statsmodels=statsmodels.__version__),series=series,diagnostic_fits=sum(len(s['fitted_segments']) for s in series),forecast_approved=False,financial_publication_approved=False,external_join_approved=False,future_forecasts_generated=False,interpretation='Retrospective PHP diagnostics, not medicine-unit demand, causal attribution or forecast activation. Cavite province replaces constituent labels; no imputation.')

def main():
    directory=Path('outputs/delivery_area_20261102');raw=(directory/'live-source.json').read_bytes()
    result=analyze(json.loads(raw));result['input_sha256']=hashlib.sha256(raw).hexdigest();result['analyzer_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    (directory/'stl-analysis.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    print(json.dumps([dict(area=s['area'],observed=s['observed_months'],latest=s['latest'],fitted=s['fitted_segments']) for s in result['series']]))
if __name__=='__main__':main()
