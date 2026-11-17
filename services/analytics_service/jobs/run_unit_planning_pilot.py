"""Execute a bounded actual-sales/assumed-inventory pilot and EOQ sensitivity."""
import argparse
import csv
from datetime import datetime
import hashlib,json
from pathlib import Path
from zoneinfo import ZoneInfo
import numpy as np

from ..unit_planning_pilot import prepare_pilot,SOURCE_SHA,VERSION
from ..inventory_simulation import disaggregate_monthly,simulate_daily
from ..planning_assumptions import load_register
from ..planning_research import eoq_sensitivity


def write_json(path,value):
    with path.open('x',encoding='utf-8') as handle:
        json.dump(value,handle,indent=2,allow_nan=False);handle.write('\n')


def table(path,rows):
    with path.open('x',encoding='utf-8-sig',newline='') as handle:
        writer=csv.DictWriter(handle,fieldnames=list(rows[0]));writer.writeheader()
        writer.writerows({k:json.dumps(v,sort_keys=True) if isinstance(v,(dict,list)) else v for k,v in row.items()} for row in rows)


def summarize(rows,metadata):
    metrics=['wastage_pct','unit_fill_rate_pct','annualized_turnover','stockout_days_per_year']
    output=[]
    for shelf,lead,policy in sorted({(r['shelf_days'],r['lead_days'],r['policy']) for r in rows}):
        group=[r for r in rows if (r['shelf_days'],r['lead_days'],r['policy'])==(shelf,lead,policy)]
        for metric in metrics:
            values=[r[metric] for r in group if r[metric] is not None]
            output.append(dict(**metadata,shelf_days=shelf,lead_days=lead,policy=policy,metric=metric,runs=len(group),
                defined_runs=len(values),mean=float(np.mean(values)) if values else None,
                median=float(np.median(values)) if values else None,
                simulation_p025=float(np.quantile(values,.025)) if values else None,
                simulation_p975=float(np.quantile(values,.975)) if values else None))
    return output


def run(source_directory,output,sensitivity_output,*,runs=1000):
    if isinstance(runs,bool) or not isinstance(runs,int) or not 1<=runs<=1000:
        raise ValueError('Explicit run count must be 1–1000; final study uses 1000')
    source_directory,output,sensitivity_output=map(Path,(source_directory,output,sensitivity_output))
    if output.exists() or sensitivity_output.exists():
        raise ValueError('Use new output directories to preserve evidence')
    source_raw=(source_directory/'source.json').read_bytes()
    confirmation_raw=(source_directory/'user-confirmation.json').read_bytes()
    if hashlib.sha256(source_raw).hexdigest()!=SOURCE_SHA:
        raise ValueError('Pilot source differs from retained confirmed scope')
    source,confirmation=map(json.loads,(source_raw,confirmation_raw))
    if confirmation['source_sha256']!=SOURCE_SHA:raise ValueError('Confirmation source mismatch')
    root=Path(__file__).resolve().parents[3]
    code=[Path(__file__),root/'services/analytics_service/unit_planning_pilot.py',root/'services/analytics_service/inventory_simulation.py',
          root/'services/analytics_service/planning_research.py',root/'services/analytics_service/bupiright_unit_candidate.py',
          root/'services/analytics_service/bupiright_lineage.py',root/'services/analytics_service/planning_assumptions.py']
    register_path=root/'config/planning_assumptions.json'
    registration=dict(method_version=VERSION,registered_at=datetime.now(ZoneInfo('Asia/Manila')).isoformat(),runs=runs,seed=20261030,
        source_sha256=SOURCE_SHA,confirmation_sha256=hashlib.sha256(confirmation_raw).hexdigest(),
        register_sha256=hashlib.sha256(register_path.read_bytes()).hexdigest(),
        code_sha256={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in code},
        training_window=['2025-04','2026-03'],evaluation_window=['2026-04','2026-09'],
        sensitivity_shelf_days=[180,365,730],sensitivity_lead_days=[7,14,30],
        evaluation_status='retrospective_previously_inspected_sales_not_untouched_holdout',operational_approval=False)
    output.mkdir(parents=True);sensitivity_output.mkdir(parents=True)
    write_json(output/'registration.json',registration)
    base=prepare_pilot(source,confirmation)
    metadata={k:base[k] for k in ('dataset_id','policy_version','unit_scope','evidence_label','assumption_ids','method_version')}
    observations=[dict(**{**metadata,'evidence_label':'Observed'},period=p,recorded_ampoules=v,
                       split='training' if p<'2026-04' else 'evaluation') for p,v in {**base['training'],**base['evaluation']}.items()]
    table(output/'T11.0_recorded_months_and_split.csv',observations)
    write_json(output/'pilot.json',base)
    records=[];audit=[]
    for shelf in (180,365,730):
        for lead in (7,14,30):
            pilot=prepare_pilot(source,confirmation,shelf_days=shelf,lead_days=lead)
            for repetition in range(runs):
                demand_seed,lead_seed=np.random.SeedSequence([20261030,repetition]).spawn(2)
                path=disaggregate_monthly(pilot['evaluation'],seed=demand_seed,concentration=1.)
                lead_seed=int(lead_seed.generate_state(1)[0])
                for policy in pilot['policies']:
                    retain=(shelf==365 and lead==14 and repetition==0)
                    value=simulate_daily(path['demand'],policy=policy,seed=lead_seed,retain_ledger=retain,**pilot['simulation_inputs'])
                    record=dict(shelf_days=shelf,lead_days=lead,policy=policy['name'],run=repetition,
                        **{k:value[k] for k in ('wastage_pct','unit_fill_rate_pct','annualized_turnover','stockout_days_per_year',
                            'totals','evaluation','evaluated_days','mean_daily_closing_stock','pipeline_units_at_end')})
                    records.append(record)
                    if retain:audit.append(dict(dates=path['dates'],**value))
            print(json.dumps(dict(stage='simulation',shelf_days=shelf,lead_days=lead,runs=runs)),flush=True)
    summaries=summarize(records,metadata)
    result=dict(**metadata,status='BOUNDED_ACTUAL_SALES_ASSUMED_INVENTORY_SIMULATION',runs=runs,seed=20261030,
        source_sha256=SOURCE_SHA,rows=summaries,recorded_evaluation_ampoules=sum(base['evaluation'].values()),
        evaluated_days=183,policy_count=3,sensitivity_cells=9,operational_approval=False,
        limitations=base['limitations'],executed_at=datetime.now(ZoneInfo('Asia/Manila')).isoformat())
    write_json(output/'results.json',result);write_json(output/'run-metrics.json',dict(**metadata,rows=records))
    write_json(output/'sample-ledgers.json',dict(**metadata,rows=audit))
    table(output/'T11.1_policy_comparison_simulation_quantiles.csv',[r for r in summaries if r['shelf_days']==365 and r['lead_days']==14])
    table(output/'T11.2_shelf_lead_sensitivity.csv',summaries)
    register=load_register();params={p['id']:p['sensitivity_values'] for p in register['parameters']}
    from statistics import NormalDist
    ranges=dict(holding_fraction=params['A1'],order_cost=params['A2'],lead_days=params['A3'],
        lead_sd_days=params['A4'],service_z=[NormalDist().inv_cdf(p) for p in params['A5']])
    scenarios=eoq_sensitivity(base['fixed_policy_inputs'],ranges)
    scenario_rows=[dict(**{**metadata,'evidence_label':'Assumed'},scenario_id=i,**r['inputs'],
                   **{k:v for k,v in r.items() if k not in ('inputs','policy_version','evidence_label','assumption_ids')}) for i,r in enumerate(scenarios)]
    table(sensitivity_output/'T8.1_eoq_rop_scenarios.csv',scenario_rows)
    write_json(sensitivity_output/'results.json',dict(**{**metadata,'evidence_label':'Assumed'},rows=scenario_rows,
        source_sha256=SOURCE_SHA,training_only=True,base_inputs=base['fixed_policy_inputs'],ranges=ranges,
        operational_approval=False,limitations=['Daily dispersion assumed; no historical supplier purchase/PO frequency comparison.']))
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-directory',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--sensitivity-output',type=Path,required=True)
    parser.add_argument('--runs',type=int,default=1000)
    args=parser.parse_args()
    result=run(args.source_directory,args.output,args.sensitivity_output,runs=args.runs)
    print(json.dumps(dict(status=result['status'],runs=result['runs'])))


if __name__=='__main__':main()
