"""Frozen, conditional retrospective baseline comparison; no activation/selection."""
from decimal import Decimal
import hashlib
import json
from pathlib import Path


def evaluate(candidate,protocol):
    assert protocol['methods']==['last_value','mean_3','mean_6','seasonal_naive_12']
    assert protocol['actual_calendar_leads']==[1,3]
    assert protocol['minimum_training_months']==12
    assert protocol['selection_policy']=='report_all_no_method_selection_or_activation'
    monthly=candidate['research_window']
    assert len(monthly)==18
    assert [r['month'] for r in monthly]==[f'{2025+(3+i)//12:04d}-{(3+i)%12+1:02d}' for i in range(18)]
    values=[Decimal(r['net_recorded_ampoules']) for r in monthly]
    cases=[]
    for origin in range(11,len(monthly)-1):
        training=values[:origin+1]
        for lead in protocol['actual_calendar_leads']:
            target=origin+lead
            if target>=len(monthly):continue
            predictions=dict(last_value=training[-1],mean_3=sum(training[-3:])/3,
                mean_6=sum(training[-6:])/6,seasonal_naive_12=training[target-12])
            assert target-12<=origin
            for method,prediction in predictions.items():
                cases.append(dict(origin=monthly[origin]['month'],target_month=monthly[target]['month'],lead=lead,
                    method=method,training_months=len(training),actual_ampoules=str(values[target]),
                    predicted_ampoules=str(prediction),error_ampoules=str(prediction-values[target])))
    metrics=[]
    for lead in protocol['actual_calendar_leads']:
        for method in protocol['methods']:
            group=[c for c in cases if c['lead']==lead and c['method']==method]
            errors=[Decimal(c['error_ampoules']) for c in group]
            denominator=sum(abs(Decimal(c['actual_ampoules'])) for c in group)
            metrics.append(dict(lead=lead,method=method,cases=len(group),
                MAE_ampoules=str(sum(map(abs,errors))/len(errors)),
                RMSE_ampoules=str((sum(e*e for e in errors)/len(errors)).sqrt()),
                WAPE_percent=str(100*sum(map(abs,errors))/denominator) if denominator else None,
                mean_signed_error_ampoules=str(sum(errors)/len(errors))))
    return dict(status='CONDITIONAL_RETROSPECTIVE_UNIT_BASELINE_REVIEW',cases=cases,metrics=metrics,
        candidate_scope='user_confirmed_two_labels_HOSPITAL_recorded_channel',selected_method=None,
        learned_models_trained=0,baseline_predictions_evaluated=len(cases),future_predictions_generated=False,
        source_files_modified=False,warehouse_writes=0,model_publication_approved=False,
        limitations=['Only six lead-one and four lead-three observed targets; unstable error estimates.',
            'Historical source-revision availability is not reconstructed; conditional retrospective evidence.',
            'No untouched holdout, method selection, uncertainty interval or seasonal-effect claim.',
            'Recorded fulfilled ampoules are not market demand or stockout-adjusted demand.',
            'HOSPITAL is not a verified delivery territory; original territorial SO3 remains open.'])


def main():
    p=Path('outputs/bupiright_lineage_20261027')
    raw=(p/'unit-candidate.json').read_bytes();protocol_raw=(p/'baseline-protocol.json').read_bytes()
    protocol=json.loads(protocol_raw)
    assert hashlib.sha256(raw).hexdigest()==protocol['candidate_sha256']
    result=evaluate(json.loads(raw),protocol)
    result.update(candidate_sha256=hashlib.sha256(raw).hexdigest(),protocol_sha256=hashlib.sha256(protocol_raw).hexdigest(),
        evaluator_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
    (p/'baseline-results.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result['metrics'],indent=2))


if __name__=='__main__':main()
