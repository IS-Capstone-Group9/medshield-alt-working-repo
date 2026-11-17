"""Register/evaluate fresh-source regional financial research without runtime activation."""
import argparse
import csv
from datetime import datetime,timezone
import hashlib
from importlib.metadata import version,PackageNotFoundError
import json
import platform
from pathlib import Path
from zoneinfo import ZoneInfo
from .. import territorial_forecast as study
from ..predictive import models,metrics
from .. import sales_external_tournament as recipes
from .. import unit_prospective_issue as prospective
from .. import unit_gold_extraction as extraction

ROOT=Path(__file__).resolve().parents[3]
encoded=lambda v:(json.dumps(v,indent=2,allow_nan=False)+'\n').encode()
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
now=lambda:datetime.now(ZoneInfo('Asia/Manila')).isoformat()

def load_source(directory):
    source=json.loads((directory/'financial.json').read_bytes())
    capture=json.loads((directory/'capture.json').read_bytes())
    if capture['status']!='PASS_READ_ONLY_TERRITORIAL_FORECAST_SOURCE' or capture['source']!=source['source'] or capture['warehouse_writes']!=0:
        raise ValueError('Validated read-only capture required')
    for name,digest in capture['code_sha256'].items():
        if sha(ROOT/'backend'/name)!=digest:raise ValueError('Capture code identity changed')
    return source

def registration(directory):
    packages={}
    for name in ['numpy','pandas','scipy','scikit-learn','statsmodels','prophet','cmdstanpy','threadpoolctl']:
        try:packages[name]=version(name)
        except PackageNotFoundError:packages[name]=None
    files=[Path(__file__),Path(study.__file__),Path(models.__file__),Path(metrics.__file__),Path(recipes.__file__),Path(prospective.__file__),Path(extraction.__file__)]
    return dict(protocol=study.protocol(),source_sha256={p.name:sha(p) for p in sorted(directory.glob('*.json'))},
        code_sha256={str(p.resolve().relative_to(ROOT)):sha(p) for p in files},packages=packages,python_version=platform.python_version(),
        unit_prospective_protocol_sha256=prospective.PROTOCOL_SHA256)

def prospective_readiness(directory):
    design=prospective.load_design();clock=datetime.now(timezone.utc);local=clock.astimezone(prospective.MANILA)
    source=json.loads((directory/'financial.json').read_bytes())
    confirmation=json.loads((directory/'unit-confirmation.json').read_bytes())
    eligibility=json.loads((directory/'unit-eligibility.json').read_bytes())
    source_end=source['source']['calendar_end'];issue_month=local.strftime('%Y-%m')
    # Exercise the actual current-clock adapter. On 31 October the registered
    # November issue window has not opened; never move its clock forward.
    attempted_queries=[]
    def no_unplanned_query(sql):
        attempted_queries.append(sql)
        raise ValueError('Live issue extraction needs a new controlled source; this study is read-only historical capture')
    try:
        extraction.extract(no_unplanned_query,source['source']['fact_table'],0,
            source['source']['fact_table'].removesuffix('_itemized_candidates')+'_receipt',0,issue_month)
        adapter_status='unexpected_success'
    except ValueError as error:adapter_status=str(error)
    if adapter_status=='unexpected_success':raise ValueError('Historical source must not issue a prospective forecast')
    first=design['schedule']['first_issue_month']
    return dict(status='NOT_ISSUED_CONTRACT_GATES_RETAINED',checked_at=local.isoformat(),actual_issue_month=issue_month,
        registered_first_issue_month=first,window_open=first<=issue_month<=design['schedule']['last_issue_month'],
        source_end=source_end,required_history_end_for_first_issue=prospective.month_after(first,-1),
        source_is_historical_predecessor=source['source']['dataset_id']==design['prior_evidence']['source']['dataset_id'],
        scoped_unit_raw_area=confirmation['applied_raw_area'],territorial_unit_confirmation_available=False,
        source_approved_unit_records=sum(int(r['approved_unit_records']) for r in eligibility['rows']),
        source_forecast_eligible_records=sum(int(r['forecast_eligible_records']) for r in eligibility['rows']),
        actual_adapter_result=adapter_status,adapter_queries_requested=len(attempted_queries),
        forecasts_issued=0,backdating_allowed=False,model_pointer_changes=0,
        remaining=['Registered issue window must be open at actual execution time.',
            'A new controlled candidate with complete preceding-month history and reconciled predecessor is required.',
            'HOSPITAL confirmation does not authorize territorial units; no conversion is inferred.',
            'Future actuals and prospective scores remain unavailable until observed.'])

def write_tables(directory,result,source,run_id):
    common=dict(dataset_id=source['source']['dataset_id'],policy_version=source['source']['policy_version'],
        mapping_sha256=source['source']['mapping_sha256'],registration_sha256=run_id,unit='PHP',model_publication_approved=False)
    with (directory/'leaderboard.csv').open('x',encoding='utf-8',newline='') as stream:
        fields=['region','stage','lead_months','model_id','n','mae','rmse','wape','bias','normalized_bias','mase',*common,'evidence_label']
        writer=csv.DictWriter(stream,fieldnames=fields);writer.writeheader()
        for region in result['regions']:
            for r in region['reports']:
                writer.writerow({**{k:r[k] for k in ['region','stage','lead_months','model_id']},**{k:r['common'][k] for k in ['n','mae','rmse','wape','bias','normalized_bias']},
                    'mase':r['common_scaled_error']['mase'],**common,'evidence_label':'Forecast'})
    with (directory/'predictions.csv').open('x',encoding='utf-8',newline='') as stream:
        fields=['region','stage','model_id','origin_period','target_period','lead_months','actual','prediction','mase_scale','missing_reason','target_source_records','target_unreviewed_source_records','training_window_unreviewed_records_in_current_snapshot',*common,'evidence_label']
        writer=csv.DictWriter(stream,fieldnames=fields);writer.writeheader()
        for region in result['regions']:
            for row in region['predictions']:writer.writerow({**{k:row[k] for k in fields if k in row},**common,'evidence_label':'Forecast'})

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True);parser.add_argument('--mode',choices=['register','execute'],required=True)
    args=parser.parse_args();source=load_source(args.source);series,eligibility=study.prepare(source)
    registered=registration(args.source);args.output.mkdir(parents=True,exist_ok=True);path=args.output/'registration.json'
    if args.mode=='register':
        with path.open('xb') as stream:stream.write(encoded(registered))
        with (args.output/'eligibility.json').open('xb') as stream:stream.write(encoded(eligibility))
        print(json.dumps(dict(status='REGISTERED_BEFORE_TERRITORIAL_FITS',eligibility=eligibility)));return
    if json.loads(path.read_bytes())!=registered:raise ValueError('Registered source/code/environment changed')
    if (args.output/'results.json').exists():raise ValueError('Do not overwrite completed evaluation')
    run_id=sha(path);started_at=now()
    from threadpoolctl import threadpool_limits
    with threadpool_limits(limits=1):
        regions=[study.evaluate_region(series[e['region']],e['region']) for e in eligibility if e['status']=='eligible_financial_research']
    monthly={(r['region'],r['period']):r for r in source['months']}
    for region in regions:
        for point in region['predictions']:
            target=monthly[region['region'],point['target_period']]
            point['target_source_records']=target['records'];point['target_unreviewed_source_records']=target['unreviewed_records']
            point['training_window_unreviewed_records_in_current_snapshot']=sum(r['unreviewed_records'] for r in source['months']
                if r['region']==region['region'] and registered['protocol']['engine']['training_start']<=r['period']<=point['origin_period'])
    result=dict(status='RETROSPECTIVE_TERRITORIAL_PHP_RESEARCH_UNPUBLISHED',registration_sha256=run_id,
        started_at=started_at,finished_at=now(),source=source['source'],eligibility=eligibility,regions=regions,
        evidence_label='Forecast',unit='PHP',publication_approved=False,operational_approval=False,
        warehouse_writes=0,model_pointer_changes=0,future_forecasts_generated=0,
        prospective_readiness=prospective_readiness(args.source),limitations=study.protocol()['limitations'])
    with (args.output/'results.json').open('xb') as stream:stream.write(encoded(result))
    write_tables(args.output,result,source,run_id)
    print(json.dumps(dict(status=result['status'],regions=[dict(region=r['region'],points=len(r['predictions']),selections=r['selections']) for r in regions],
        prospective_status=result['prospective_readiness']['status'],warehouse_writes=0)))

if __name__=='__main__':main()
