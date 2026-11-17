"""Register then execute a separate retrospective WP4 PHP tournament."""
import argparse
import csv
from datetime import datetime
import hashlib
import json
from pathlib import Path
import platform
from zoneinfo import ZoneInfo
from ..sales_external_tournament import protocol,evaluate
from ..predictive.contracts import month
from ..predictive.engine import package_versions


def encoded(value):
    return (json.dumps(value,indent=2,allow_nan=False)+'\n').encode()


def identity(source_path):
    import services.analytics_service.sales_external_tournament as implementation
    from ..predictive import models,metrics
    return dict(protocol=protocol(),source_sha256=hashlib.sha256(source_path.read_bytes()).hexdigest(),
                code_sha256={str(Path(p).resolve().relative_to(Path(__file__).resolve().parents[3])):hashlib.sha256(Path(p).read_bytes()).hexdigest()
                             for p in (__file__,implementation.__file__,models.__file__,metrics.__file__)},
                environment=dict(package_versions(),platform=platform.platform()))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--mode',choices=['register','execute'],required=True)
    args=parser.parse_args()
    source=json.loads(args.source.read_bytes())
    pin=source['source_identity']
    if (source.get('source')!='databricks' or pin.get('contracts_excluded') is not True or
        pin.get('forecast_approval') is not False or not pin.get('dataset_id') or not pin.get('policy_version')):
        raise ValueError('Expected explicitly unpublished retained Databricks source')
    registration=identity(args.source)
    args.output.mkdir(parents=True,exist_ok=True)
    target=args.output/'registration.json'
    if args.mode=='register':
        if target.exists() and target.read_bytes()!=encoded(registration):
            raise ValueError('Registration already exists with different source/code/protocol')
        if not target.exists():
            target.write_bytes(encoded(registration))
        print('REGISTERED_BEFORE_NEW_EXECUTION')
        return
    if json.loads(target.read_bytes())!=registration:
        raise ValueError('Registration source/code/environment changed')
    if (args.output/'results.json').exists():
        raise ValueError('Refusing to overwrite executed tournament')
    observed={month(r['month']):float(r['net_sales_php']) if r['net_sales_php'] is not None else None for r in source['monthly']}
    if len(observed)!=len(source['monthly']):
        raise ValueError('Duplicate source month')
    from threadpoolctl import threadpool_limits
    with threadpool_limits(limits=1):
        result=evaluate(observed,registration['protocol'])
    result.update(source_identity=pin,source_sha256=registration['source_sha256'],code_sha256=registration['code_sha256'],
                  executed_at=datetime.now(ZoneInfo('Asia/Manila')).isoformat(),
                  assumption_ids=[],target_unit='PHP',retained_source=True,fresh_warehouse_query=False)
    (args.output/'results.json').write_bytes(encoded(result))
    with (args.output/'T4.1_new_tournament_leaderboard.csv').open('w',encoding='utf-8',newline='') as handle:
        fields=['stage','lead_months','model_id','n','mae','rmse','wape','normalized_bias','mase','dataset_id','policy_version','evidence_label','assumption_ids']
        writer=csv.DictWriter(handle,fieldnames=fields);writer.writeheader()
        for row in result['reports']:
            writer.writerow(dict(stage=row['stage'],lead_months=row['lead_months'],model_id=row['model_id'],
                **{k:row['common'][k] for k in ('n','mae','rmse','wape','normalized_bias')},mase=row['common_scaled_error']['mase'],
                dataset_id=pin['dataset_id'],policy_version=pin['policy_version'],evidence_label='Forecast',assumption_ids='[]'))
    with (args.output/'T4.2_new_tournament_dm.csv').open('w',encoding='utf-8',newline='') as handle:
        fields=['stage','lead_months','model_id','n','statistic','p_value','reason','dataset_id','policy_version','evidence_label']
        writer=csv.DictWriter(handle,fieldnames=fields);writer.writeheader()
        for row in result['reports']:
            dm=row['dm_vs_seasonal_naive']
            if dm:
                writer.writerow(dict(stage=row['stage'],lead_months=row['lead_months'],model_id=row['model_id'],
                    **{k:dm[k] for k in ('n','statistic','p_value','reason')},dataset_id=pin['dataset_id'],policy_version=pin['policy_version'],evidence_label='Derived'))
    print(json.dumps(dict(status='EVALUATED_UNPUBLISHED',points=len(result['predictions']),selections=result['selections'])))


if __name__=='__main__':
    main()
