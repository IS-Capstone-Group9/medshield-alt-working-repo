"""Screen exact medicine-label/raw-area histories; evidence matching never approves units."""
import argparse
from collections import defaultdict
from decimal import Decimal
import hashlib
import json
from pathlib import Path

COUNTS=('records','net_records','positive_quantity_records','negative_quantity_records','zero_quantity_records',
        'missing_quantity_records','unit_approved_records','physical_quantity_records','forecast_eligible_records','unreviewed_records')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def month_id(month):
    year,number=map(int,month.split('-'))
    require(1000<=year<=9999 and 1<=number<=12,'Invalid month')
    return year*12+number-1


def month_text(index):
    return f'{index//12:04d}-{index%12+1:02d}'


def tail_length(months,end):
    count=0
    while end-count in months:
        count+=1
    return count


def longest_run(months):
    best=current=0
    previous=None
    for month in sorted(months):
        current=current+1 if previous is not None and month==previous+1 else 1
        best=max(best,current);previous=month
    return best


def aggregate(rows):
    result={name:0 for name in COUNTS}
    amounts=[]
    for row in rows:
        for name in COUNTS: result[name]+=int(row[name])
        require(sum(int(row[k]) for k in ('positive_quantity_records','negative_quantity_records','zero_quantity_records','missing_quantity_records'))==int(row['records']), 'Quantity presence partition differs')
        if row['net_sales'] is not None: amounts.append(Decimal(row['net_sales']))
    result['net_sales']=sum(amounts,Decimal(0)) if amounts else None
    return result


def trivasc_trace(rows, price_evidence, prior_result, asof):
    scoped=[r for r in rows if r['normalized_product']=='TRIVASC 35MG MR' and str(r['raw_area']).upper()=='QUEZON'
            and '2021-01-01'<=r['date']<='2023-06-30']
    positive=[r for r in scoped if r['recorded_quantity'] is not None and Decimal(r['recorded_quantity'])>0]
    negative=[r for r in scoped if r['recorded_quantity'] is not None and Decimal(r['recorded_quantity'])<0]
    quantities=lambda records:sum((Decimal(r['recorded_quantity']) for r in records),Decimal(0))
    proof_hashes={str(r['path']).replace('\\','/').rsplit('/',1)[-1].lower():r['sha256'] for r in price_evidence['sources']}
    file_match=all(proof_hashes.get(r['source_workbook'].lower())==r['source_file_sha256'] for r in scoped)
    cp_compatible=0
    for row in positive:
        if row['gross_sales'] is None:continue
        q,g=Decimal(row['recorded_quantity']),Decimal(row['gross_sales'])
        if g==q*Decimal(1350) or abs(g-q*Decimal('1246.15'))<=q*Decimal('.005'):
            cp_compatible+=1
    cost_compatible=sum(r['recorded_quantity'] is not None and r['acquisition_cost'] is not None and
                       Decimal(r['acquisition_cost'])==Decimal(r['recorded_quantity'])*Decimal('437.50') for r in scoped)
    before=prior_result['reconciliation']
    matches=(len(scoped)==before['rows'] and len(positive)==before['positive_rows'] and len(negative)==before['negative_rows']
             and quantities(positive)==Decimal(before['positive_boxes']) and quantities(negative)==Decimal(before['adjustment_boxes']))
    all_exact=[r for r in rows if r['normalized_product']=='TRIVASC 35MG MR' and str(r['raw_area']).upper()=='QUEZON']
    later=[r for r in all_exact if r['date']>'2023-06-30']
    short=[r for r in rows if r['normalized_product']=='TRIVASC 35MG' and str(r['raw_area']).upper()=='QUEZON']
    latest_if_joined=max((r['date'] for r in all_exact+short),default=None)
    return dict(scope='Exact TRIVASC 35MG MR / recorded Quezon, January 2021-June 2023',records=len(scoped),positive_records=len(positive),
        negative_records=len(negative),positive_recorded_counts=quantities(positive),signed_adjustment=quantities(negative),
        prior_count_reconciliation=matches,source_byte_hashes_match=file_match,cp_price_compatible_positive_records=cp_compatible,
        acquisition_price_compatible_records=cost_compatible,
        historical_inference_reconciled=matches and file_match and cp_compatible==len(positive) and cost_compatible==len(scoped),
        later_exact_label_records=len(later),latest_exact_record=max((r['date'] for r in all_exact),default=None),
        unknown_months_since_historical_pilot=max(0,month_id(asof)-month_id('2023-06')),
        separate_variant_records=sum(r['normalized_product']=='TRIVASC 35MG' for r in rows),
        separate_quezon_variant_records=len(short),separate_quezon_variant_last=max((r['date'] for r in short),default=None),
        hypothetical_identity_join_not_applied=dict(last_record=latest_if_joined,
            unknown_months_since_last_record=max(0,month_id(asof)-month_id(latest_if_joined[:7])) if latest_if_joined else None,
            scope='Counterfactual coverage check only; no alias merge, target series or unit inference created'),
        known_user_confirmation_reused=True,scope_extended=False,operational_unit_approval_added=False,
        limitation='Historical price-supported inferred boxes only; later labels/areas are not aliases or verified units; signed adjustment is not a proven physical return')


def presentation_leads(label, tables):
    result=[]
    normalized=' '.join(label.upper().split())
    for page_index,page in enumerate(tables or [],1):
        for table_index,table in enumerate(page,1):
            for row_index,row in enumerate(table,1):
                if len(row)<5 or not row[1]:continue
                brands={' '.join(part.upper().split()) for part in row[1].split('/')}
                if normalized not in brands:continue
                result.append(dict(evidence_id=f'PL2026-P{page_index}-T{table_index}-R{row_index}',
                    printed_brand=row[1],printed_description=row[0],printed_dosage_form=row[2],
                    printed_sku=row[3],printed_pack_count=row[4],match='exact full source label equals a printed brand token',
                    limitation='Presentation lead only; source strength, historical pack and billed unit not verified; no multiplier applied'))
    return result


def screen(source, unit_decisions, price_evidence, prior_result, company_tables=None):
    require(source['release']['dataset_id']=='e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10','Wrong original source')
    require(source['release']['fact_delta_version']==0 and source['contracts_excluded'] is True,'Wrong source scope/version')
    require(source['warehouse_writes']==source['approvals_created']==source['models_trained']==0,'Screen boundary changed')
    q={k:v['rows'] for k,v in source['queries'].items()}
    all_source=aggregate(q['all_source']);require(all_source['records']==40171,'Original retained control differs')
    require(aggregate(q['categories'])==all_source,'Category controls differ')
    medicine=next(r for r in q['categories'] if r['product_category']=='medicine')
    require(aggregate(q['medicine_controls'])==aggregate([medicine]),'Medicine annual controls differ')
    require(aggregate(q['medicine_months'])==aggregate([medicine]),'Medicine month controls differ')
    by_year=defaultdict(list)
    groups=defaultdict(list)
    seen=set()
    for row in q['medicine_months']:
        key=(row['product_key'],row['normalized_product'],row['raw_area'],row['month'])
        require(key not in seen,'Duplicate medicine month key');seen.add(key)
        require(hashlib.sha256(row['normalized_product'].encode()).hexdigest()==row['product_key'],'Label identity differs')
        by_year[row['month'][:4]].append(row)
        groups[key[:3]].append(row)
    for control in q['medicine_controls']:
        require(aggregate(by_year[control['year']])==aggregate([control]),'Medicine annual/month reconciliation differs')
    asof=q['all_source'][0]['last_date'][:7];end=month_id(asof)
    references={r['source_label']:r for r in unit_decisions['products']}
    series=[]
    for (key,label,area), rows in groups.items():
        months={month_id(r['month']) for r in rows}
        positive={month_id(r['month']) for r in rows if int(r['positive_quantity_records'])>0}
        require(max(months)<=end,'Future source month')
        counts=aggregate(rows)
        recent=[r for r in rows if end-11<=month_id(r['month'])<=end]
        recent_counts=aggregate(recent)
        tail=tail_length(positive,end)
        ref=references.get(label)
        evidence=None if ref is None else dict(kind='prior_presentation_research_reference',reference_unit=ref['descriptive_reference'],
            prior_review=ref['review_decision'],historical_unit_approved=ref['historical_unit_approved'],
            quantity_conversion_allowed=ref['quantity_conversion_allowed'],
            company_catalog_ids=[r['evidence_id'] for r in ref['company_catalog_candidates']],
            scope='Prior dated source/review; not automatically transferred to current original transactions')
        if label=='TRIVASC 35MG MR' and str(area).upper()=='QUEZON':
            evidence=dict(kind='historical_price_supported_inferred_boxes',reference_unit='inferred boxes',
                          scope='2021-01 through 2023-06 only; reuse existing confirmation; no operational approval')
        series.append(dict(product_key=key,label=label,raw_area=area,first_month=month_text(min(months)),last_month=month_text(max(months)),
            observed_months=len(months),longest_observed_run=longest_run(months),trailing_observed_months=tail_length(months,end),
            trailing_positive_quantity_months=tail,recent12_observed_months=len(recent),months_since_last_observation=end-max(months),
            recent12_counts=recent_counts,all_counts=counts,unit_evidence=evidence,company_presentation_leads=presentation_leads(label,company_tables),
            history_review_candidate=tail>=24,
            history_rule='At least 24 consecutive months with positive recorded quantity presence ending at source cutoff; review screen only',
            geography_status='exact_recorded_area_unapproved',operational_forecast_eligible=False,
            blockers=['no current operational unit contract','raw area is not approved geography','reporting completeness not certified']
                +([] if tail>=24 else ['insufficient recent contiguous positive-count history'])))
    series.sort(key=lambda r:(not r['history_review_candidate'],-r['trailing_positive_quantity_months'],
        r['unit_evidence'] is None and not r['company_presentation_leads'],-r['recent12_observed_months'],-r['observed_months'],-r['all_counts']['records'],r['label'],str(r['raw_area'])))
    for rank,row in enumerate(series,1):row['history_review_rank']=rank
    company_positive=defaultdict(set)
    for row in q['medicine_months']:
        if int(row['positive_quantity_records'])>0:company_positive[row['normalized_product']].add(month_id(row['month']))
    company_tails=sorted([dict(label=label,trailing_positive_quantity_months=tail_length(months,end))
        for label,months in company_positive.items()],key=lambda r:(-r['trailing_positive_quantity_months'],r['label']))
    return dict(status='MEDICINE_HISTORY_SCREEN_NOT_MODEL_APPROVAL',source_release=source['release'],as_of_month=asof,
        medicine_controls=aggregate([medicine]),series_screened=len(series),medicine_labels=len({r['label'] for r in series}),
        current_history_review_candidates=sum(r['history_review_candidate'] for r in series),
        history_candidates_with_stored_unit_reference=sum(r['history_review_candidate'] and r['unit_evidence'] is not None for r in series),
        history_threshold_sensitivity={str(n):sum(r['trailing_positive_quantity_months']>=n for r in series) for n in (6,12,24)},
        operationally_eligible_series=0,series=series,
        company_label_presence_scope_check=dict(scope='Exact-label month-presence union across areas, not a territory target or quantity conversion',
            history_review_candidates=sum(r['trailing_positive_quantity_months']>=24 for r in company_tails),
            maximum_positive_tail=max((r['trailing_positive_quantity_months'] for r in company_tails),default=0),top=company_tails[:10]),
        trivasc_trace=trivasc_trace(q['trivasc_detail'],price_evidence,prior_result,asof),
        ranking='History screen first; descending positive-month tail; stored unit/presentation lead breaks equal-tail ties; then recent coverage/observed months/records and deterministic label/raw-area ties. No clinical/revenue score.',
        limitations=['Positive-quantity month presence is not complete reporting or verified physical units',
            'No missing month or label/area variant is merged, zero-filled or imputed',
            'Historical catalog presentations and unit inferences retain their original dates and scope',
            'No external signal is joined before current-source geography/as-of evidence',
            'No medicine-demand model, confidence interval, procurement rule or objective acceptance inferred'],
        warehouse_writes=0,source_files_modified=False,approvals_created=0,models_trained=0)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory',type=Path,required=True)
    args=parser.parse_args();root=Path(__file__).resolve().parents[2]
    raw=(args.directory/'source.json').read_bytes();source=json.loads(raw)
    require(hashlib.sha256(raw).hexdigest()==(args.directory/'source.sha256').read_text().strip(),'Source receipt changed')
    for query in source['queries'].values():require(hashlib.sha256(query['sql'].encode()).hexdigest()==query['sql_sha256'],'SQL changed')
    for name,digest in source['evidence_sha256'].items():require(hashlib.sha256((root/name).read_bytes()).hexdigest()==digest,'Prior evidence changed')
    load=lambda p:json.loads((root/p).read_bytes())
    presentation_path='outputs/catalog_preparation/product_evidence/price_list_tables.json'
    result=screen(source,load('outputs/descriptive_closure_20261017/unit-review-decisions.json'),
        load('outputs/pilot_evidence_step3_20261017/box-price-comparison.json'),load('outputs/trivasc_box_forecast_20261025/results.json'),load(presentation_path))
    result['company_presentation_evidence']={'path':presentation_path,'sha256':hashlib.sha256((root/presentation_path).read_bytes()).hexdigest(),
        'status':'Existing extracted 2026 company presentation lead; no new PDF/source verification or unit approval'}
    content=(json.dumps(result,indent=2,default=str)+'\n').encode();(args.directory/'screen.json').write_bytes(content)
    report={k:result[k] for k in ('status','as_of_month','medicine_labels','series_screened','current_history_review_candidates','history_candidates_with_stored_unit_reference','operationally_eligible_series')}
    report.update(source_sha256=hashlib.sha256(raw).hexdigest(),screen_sha256=hashlib.sha256(content).hexdigest(),
                  analyzer_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
    (args.directory/'calculation-verification.json').write_bytes((json.dumps(report,indent=2)+'\n').encode())
    print(json.dumps(report))


if __name__=='__main__':
    main()
