"""Apply a scoped user-confirmed unit interpretation to offline research only."""
from collections import defaultdict
from decimal import Decimal
import hashlib
import json
from pathlib import Path

from .bupiright_lineage import DATASET, history, yes

LABELS=['BUPIRIGHT','BUPIRIGHT 5MG/ML 0.5% IN 8% 4ML']


def prepare(source,confirmation):
    assert source['release']['dataset_id']==DATASET
    assert confirmation['exact_labels']==LABELS
    assert confirmation['same_4ml_product_confirmed'] is True
    assert confirmation['billed_unit']=='one_ampoule_box_of_one'
    assert confirmation['quantity_multiplier']==1
    assert confirmation['applied_raw_area']=='HOSPITAL'
    rows=[r for r in source['queries']['detail']['rows'] if r['normalized_product'] in LABELS and r['raw_area']=='HOSPITAL']
    assert rows and len({r['source_record_id'] for r in rows})==len(rows)
    groups=defaultdict(list)
    for r in rows:
        assert r['recorded_quantity'] is not None
        quantity=Decimal(r['recorded_quantity'])
        assert quantity==quantity.to_integral_value(),'Fractional ampoule requires separate review'
        # Source flags stay intact; user evidence is a separate, scoped interpretation.
        assert not yes(r['source_unit_approved']) and not yes(r['forecast_eligible'])
        groups[r['date'][:7]].append(r)
    monthly=[]
    for month,group in sorted(groups.items()):
        quantities=[Decimal(r['recorded_quantity']) for r in group]
        monthly.append(dict(month=month,source_records=len(group),
            positive_recorded_ampoules=str(sum((q for q in quantities if q>0),Decimal(0))),
            negative_recorded_ampoules=str(sum((q for q in quantities if q<0),Decimal(0))),
            net_recorded_ampoules=str(sum(quantities,Decimal(0))),
            eligible_net_sales_php=str(sum((Decimal(r['net_sales']) for r in group if yes(r['is_net_sales_technically_eligible'])),Decimal(0))),
            unreviewed_source_records=sum(r['source_data_status']=='UNREVIEWED_SOURCE_EXPORT' for r in group),
            source_record_ids=sorted(r['source_record_id'] for r in group)))
    tail=[r for r in monthly if '2025-04'<=r['month']<='2026-09']
    assert len(tail)==18 and history(rows)['positive_tail_at_cutoff']==18
    total=sum((Decimal(r['net_recorded_ampoules']) for r in monthly),Decimal(0))
    assert total==sum((Decimal(r['recorded_quantity']) for r in rows),Decimal(0))
    return dict(status='USER_CONFIRMED_UNIT_OFFLINE_RESEARCH_CANDIDATE',dataset_id=DATASET,
        exact_labels=LABELS,raw_area='HOSPITAL',geography_status='recorded_channel_not_verified_delivery_territory',
        target='recorded_fulfilled_ampoules_with_signed_adjustments_not_unconstrained_demand',
        unit_evidence_status='user_confirmed_same_4ml_product_one_ampoule_box_of_one',quantity_multiplier=1,
        source_records=len(rows),monthly_records=len(monthly),continuous_research_months=18,
        total_recorded_ampoules=str(total),monthly=monthly,research_window=tail,
        unreviewed_source_records=sum(r['source_data_status']=='UNREVIEWED_SOURCE_EXPORT' for r in rows),
        source_quality_flags=sorted({c for r in rows for c in json.loads(r['quality_rule_codes_json'])}),
        source_record_ids_sha256=hashlib.sha256(('\n'.join(sorted(r['source_record_id'] for r in rows))+'\n').encode()).hexdigest(),
        global_product_master_changed=False,warehouse_writes=0,models_trained=0,
        model_publication_approved=False,operational_replenishment_approved=False,
        limitations=['User confirmation is not invoice-level independent verification.',
            'Earlier other labels/packs are excluded.', 'No source or model approval flag is rewritten.',
            'Source quality/late-backfill status and issue-time availability remain separate.',
            'Observed monthly records do not prove complete reporting or market demand.'])


def main():
    directory=Path('outputs/bupiright_lineage_20261027')
    raw=(directory/'source.json').read_bytes()
    assert hashlib.sha256(raw).hexdigest()==(directory/'source.sha256').read_text().strip()
    confirmation_raw=(directory/'user-confirmation.json').read_bytes()
    confirmation=json.loads(confirmation_raw)
    assert confirmation['source_sha256']==hashlib.sha256(raw).hexdigest()
    result=prepare(json.loads(raw),confirmation)
    result.update(source_sha256=hashlib.sha256(raw).hexdigest(),confirmation_sha256=hashlib.sha256(confirmation_raw).hexdigest(),
                  preparer_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
    (directory/'unit-candidate.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:result[k] for k in ['status','source_records','monthly_records','continuous_research_months','total_recorded_ampoules','models_trained']}))


if __name__=='__main__':main()
