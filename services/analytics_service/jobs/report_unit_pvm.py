"""Matched-month unit-consistent revenue bridge; accounting, never causal attribution."""
import argparse,csv,hashlib,json
from decimal import Decimal
from pathlib import Path
from ..bupiright_unit_candidate import prepare,LABELS
from ..diagnostic_drivers import price_volume_mix


def report(source,confirmation):
    candidate=prepare(source,confirmation)
    rows=[r for r in source['queries']['detail']['rows'] if r['normalized_product'] in LABELS and r['raw_area']=='HOSPITAL']
    eligible=[r for r in rows if r['is_net_sales_technically_eligible'] in (True,'true')]
    periods={r['date'][:7] for r in rows}
    matched=[f'{month:02d}' for month in range(4,10) if '2025-'+f'{month:02d}' in periods and '2026-'+f'{month:02d}' in periods]
    if len(matched)!=6:raise ValueError('Frozen comparison requires every April–September month in both years')
    meta=dict(dataset_id=candidate['dataset_id'],policy_version=source['release']['policy_version'],
              unit_scope='user_confirmed_BUPIRIGHT_4mL_ampoule_HOSPITAL',evidence_label='Derived',
              assumption_ids=['D1'],base_year=2025,target_year=2026,matched_months=matched)
    def side(year):
        selected=[r for r in eligible if r['date'][:4]==str(year) and r['date'][5:7] in matched]
        comparable=[];adjustments=[]
        for r in selected:
            if r['recorded_quantity'] is None:raise ValueError('Eligible net lacks reviewed recorded quantity')
            q,net=Decimal(r['recorded_quantity']),Decimal(r['net_sales'])
            (comparable if q>0 and net>=0 else adjustments).append(r)
        def total(group,field):return sum((Decimal(r[field]) for r in group),Decimal(0))
        return dict(records=selected,comparable=comparable,adjustments=adjustments,
            comparable_qty=total(comparable,'recorded_quantity'),comparable_net=total(comparable,'net_sales'),
            adjustment_net=total(adjustments,'net_sales'),eligible_net=total(selected,'net_sales'))
    base,target=side(2025),side(2026)
    bridge=price_volume_mix([dict(product='two_user_confirmed_BUPIRIGHT_4mL_labels',unit_scope=meta['unit_scope'],
        unit_reviewed=True,base_qty=base['comparable_qty'],target_qty=target['comparable_qty'],
        base_net=base['comparable_net'],target_net=target['comparable_net'])])[0]
    remainder=target['adjustment_net']-base['adjustment_net']
    delta=target['eligible_net']-base['eligible_net']
    if abs(Decimal(bridge['delta_net'])+remainder-delta)>Decimal('.00000001'):
        raise ArithmeticError('Cohort bridge fails signed financial reconciliation')
    summary=dict(**meta,base_records=len(base['records']),target_records=len(target['records']),
        base_comparable_qty=str(base['comparable_qty']),target_comparable_qty=str(target['comparable_qty']),
        base_comparable_net=str(base['comparable_net']),target_comparable_net=str(target['comparable_net']),
        base_eligible_net=str(base['eligible_net']),target_eligible_net=str(target['eligible_net']),
        delta_eligible_net=str(delta),volume_effect=bridge['volume_effect'],price_effect=bridge['price_effect'],
        interaction_effect=bridge['interaction_effect'],adjustment_change=str(remainder),
        company_revenue_reconciled=False,causal_attribution=False,publication_approved=False)
    ledger=[]
    for year,part in [(2025,base),(2026,target)]:
        for r in part['records']:
            ledger.append(dict(**meta,comparison_year=year,source_record_id=r['source_record_id'],
                source_workbook=r['source_workbook'],source_file_sha256=r['source_file_sha256'],
                source_row_number=r['source_row_number'],period=r['date'][:7],recorded_label=r['normalized_product'],
                recorded_quantity=r['recorded_quantity'],eligible_net_sales=r['net_sales'],
                bucket='Comparable' if r in part['comparable'] else 'Adjustment_Only',source_data_status=r['source_data_status']))
    return dict(status='MATCHED_UNIT_PVM_ACCOUNTING_REVIEW',**meta,summary=summary,ledger=ledger,
        unavailable_scope='No company-wide or territorial physical-volume decomposition; unsupported labels are outside this scoped report.',
        interpretation='price_effect_is_effective_net_realization_not_source_recorded_price_change_or_cause',
        limitations=['Two exact confirmed labels/HOSPITAL only; not global SKU or regional unit approval.',
          'Interaction is the arithmetic price-times-quantity cross-term, not an independently identified product-mix effect.',
          'Net/quantity eligibility uses the same rows; adjustments remain a signed separate bridge.',
          'Recorded fulfilled sales are not unconstrained demand; no causal or business-impact claim.'])


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-directory',type=Path,required=True);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();source=args.source_directory/'source.json';confirmation=args.source_directory/'user-confirmation.json'
    raw=source.read_bytes();confirmed=confirmation.read_bytes()
    if json.loads(confirmed)['source_sha256']!=hashlib.sha256(raw).hexdigest():raise ValueError('Source/confirmation mismatch')
    result=report(json.loads(raw),json.loads(confirmed))
    result['source_sha256']=hashlib.sha256(raw).hexdigest();result['confirmation_sha256']=hashlib.sha256(confirmed).hexdigest()
    result['code_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    args.output.mkdir(parents=True,exist_ok=False)
    (args.output/'results.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    for name,rows in [('T3.1_unit_pvm_reconciliation.csv',[result['summary']]),('T3.1a_scoped_source_ledger.csv',result['ledger'])]:
        with (args.output/name).open('x',encoding='utf-8-sig',newline='') as handle:
            writer=csv.DictWriter(handle,fieldnames=list(rows[0]));writer.writeheader()
            writer.writerows({k:json.dumps(v) if isinstance(v,(list,dict)) else v for k,v in r.items()} for r in rows)
    print(json.dumps(dict(status=result['status'],rows=len(result['ledger']),delta_eligible_net=result['summary']['delta_eligible_net'])))


if __name__=='__main__':main()
