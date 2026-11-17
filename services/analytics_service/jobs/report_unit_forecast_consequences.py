"""Translate scoped unit-baseline errors using frozen training-only reference rates."""
import argparse,csv,hashlib,json
from decimal import Decimal
from pathlib import Path
from ..bupiright_baselines import evaluate


def report(candidate,protocol,pilot):
    if pilot['dataset_id']!=candidate['dataset_id'] or pilot['unit_scope']!='user_confirmed_BUPIRIGHT_4mL_ampoule_HOSPITAL':
        raise ValueError('Unit/source scope mismatch')
    evaluation=evaluate(candidate,protocol)
    # Fixed first training-year rates keep all comparisons on the same reference population.
    mean_monthly=Decimal(sum(pilot['training'].values()))/Decimal(len(pilot['training']))
    daily=mean_monthly/Decimal('30.44')
    cost=Decimal(str(pilot['acquisition_cost_php_per_ampoule']))
    if daily<=0 or cost<=0:raise ValueError('Positive training reference demand/cost required')
    rows=[]
    for metric in evaluation['metrics']:
        mae=Decimal(metric['MAE_ampoules'])
        rows.append(dict(dataset_id=pilot['dataset_id'],policy_version=pilot['policy_version'],evidence_label='Derived',
            assumption_ids=['D1'],unit_scope=pilot['unit_scope'],lead_months=metric['lead'],method=metric['method'],
            n=metric['cases'],mae_ampoules=str(mae),mae_equivalent_training_mean_demand_days=str(mae/daily),
            mae_acquisition_value_php=str(mae*cost),reference_monthly_ampoules=str(mean_monthly),
            reference_daily_ampoules=str(daily),reference_acquisition_php_per_ampoule=str(cost),
            reference_window='2025-04_to_2026-03',days_per_month='30.44',
            selected_method=False,operational_approval=False,
            interpretation='error_scale_translation_not_actual_stockout_days_or_losses'))
    return dict(status='CONDITIONAL_UNIT_ERROR_CONSEQUENCE_REVIEW',rows=rows,cases=evaluation['cases'],
        selected_method=None,operational_approval=False,model_publication_approved=False,
        limitations=evaluation['limitations']+['Acquisition exposure is absolute forecast error times derived training cost; not measured loss or safety-stock cost.',
            'Equivalent days are a scale translation, not actual stockout duration or an operational error tolerance.'])


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-directory',type=Path,required=True)
    parser.add_argument('--pilot',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    paths=[args.source_directory/'unit-candidate.json',args.source_directory/'baseline-protocol.json',args.pilot]
    raw=[p.read_bytes() for p in paths];candidate,protocol,pilot=map(json.loads,raw)
    if hashlib.sha256(raw[0]).hexdigest()!=protocol['candidate_sha256']:raise ValueError('Frozen candidate mismatch')
    result=report(candidate,protocol,pilot)
    result['input_sha256']={str(p):hashlib.sha256(r).hexdigest() for p,r in zip(paths,raw)}
    result['code_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    args.output.mkdir(parents=True,exist_ok=False)
    (args.output/'results.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    with (args.output/'T4.3_unit_error_consequence_translation.csv').open('x',encoding='utf-8-sig',newline='') as handle:
        writer=csv.DictWriter(handle,fieldnames=list(result['rows'][0]));writer.writeheader()
        writer.writerows({**r,'assumption_ids':';'.join(r['assumption_ids'])} for r in result['rows'])
    print(json.dumps(dict(status=result['status'],rows=len(result['rows']))))


if __name__=='__main__':main()
