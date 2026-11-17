"""Reconcile read-only Gold anomaly capture; DR groups are not customer identities."""
import argparse
import csv
from decimal import Decimal
import hashlib
import json
from pathlib import Path


def report(source):
    if source['status']!='PASS_READ_ONLY_GOLD_REGIONAL_ANOMALY_LEDGERS' or source['warehouse_writes']!=0:
        raise ValueError('A controlled read-only source capture is required')
    if source['source']['fact_version']!=0:raise ValueError('Unexpected source snapshot')
    if len(set(source['periods']))!=len(source['periods']) or [c['period'] for c in source['captures']]!=source['periods']:
        raise ValueError('Missing/duplicate anomaly captures')
    ledgers=[];controls=[];top=[];seen=set()
    for capture in source['captures']:
        period=capture['period'];rows=capture['rows'];groups={};net=Decimal(0);negative=Decimal(0);eligible_count=0
        for raw in rows:
            sid=raw['source_record_id']
            if not sid or sid in seen:raise ValueError('Missing/duplicate source record')
            seen.add(sid)
            if raw['date_delivered'][:7]!=period:raise ValueError('Source date outside captured month')
            if raw['net_eligible'] not in ('true','false'):raise ValueError('Unknown eligibility')
            eligible=raw['net_eligible']=='true';amount=Decimal(raw['net_sales']) if eligible else None
            if eligible and not amount.is_finite():raise ValueError('Non-finite eligible net')
            dr=raw['dr_number'];missing=dr is None or not dr.strip()
            key=json.dumps(['missing_dr',sid] if missing else ['area_dr',raw['area'],dr],ensure_ascii=False,separators=(',',':'))
            group=groups.setdefault(key,dict(period=period,region=capture['region'],group_key=key,raw_area=raw['area'],
                recorded_dr=dr,grouping_evidence='source_record_only_missing_dr' if missing else 'raw_area_and_exact_recorded_dr',
                records=0,net_eligible_records=0,eligible_net=Decimal(0),source_record_ids=[]))
            group['records']+=1;group['source_record_ids'].append(sid)
            if eligible:
                eligible_count+=1;net+=amount;group['eligible_net']+=amount;group['net_eligible_records']+=1
                if amount<0:negative+=amount
            ledgers.append(dict(period=period,region=capture['region'],**raw,group_key=key,eligible_net_sales=str(amount) if eligible else None))
        expected=capture['expected']
        if len(rows)!=expected['records'] or eligible_count!=expected['net_eligible_records'] or net!=Decimal(expected['net_sales_php']):
            raise ValueError('Monthly source controls do not reconcile')
        ranked=sorted((g for g in groups.values() if g['net_eligible_records']),key=lambda g:(-abs(g['eligible_net']),g['group_key']))[:5]
        ranked_net=sum((g['eligible_net'] for g in ranked),Decimal(0))
        absolute_net=sum((abs(g['eligible_net']) for g in groups.values() if g['net_eligible_records']),Decimal(0))
        top_absolute=sum((abs(g['eligible_net']) for g in ranked),Decimal(0))
        for rank,g in enumerate(ranked,1):
            top.append(dict(g,rank_abs_signed_net=rank,eligible_net_sales=str(g['eligible_net']),
                            signed_share_of_month=str(g['eligible_net']/net) if net else None))
            del top[-1]['eligible_net']
        controls.append(dict(period=period,region=capture['region'],records=len(rows),net_eligible_records=eligible_count,
            eligible_net_sales=str(net),negative_eligible_net_sales=str(negative),nonnegative_eligible_net_sales=str(net-negative),
            raw_dr_groups=sum(g['net_eligible_records']>0 for g in groups.values()),
            missing_dr_records=sum(g['records'] for g in groups.values() if g['grouping_evidence']=='source_record_only_missing_dr'),
            top5_signed_net=str(ranked_net),other_signed_net=str(net-ranked_net),
            absolute_group_net_sales=str(absolute_net),top5_absolute_group_net_share=str(top_absolute/absolute_net) if absolute_net else None,
            top5_signed_share=str(ranked_net/net) if net else None,source_control_reconciled=True))
    return dict(status='PASS_SCOPED_ANOMALY_DR_LEDGER_RECONCILIATION',evidence_label='Derived',source=source['source'],
        capture_checked_at=source['checked_at'],anomaly_report_sha256=source['anomaly_report_sha256'],
        ranking='descending absolute eligible signed net; ties by exact JSON group key',
        grouping='exact raw area + recorded DR; missing DR remains per source record; no customer merge',
        controls=controls,top5_groups=top,ledger=ledgers,causal_attribution=False,customer_identity_verified=False,
        business_publication_approved=False)


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--anomaly-report',type=Path,required=True);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();raw=args.source.read_bytes();source=json.loads(raw)
    if hashlib.sha256(args.anomaly_report.read_bytes()).hexdigest()!=source['anomaly_report_sha256']:
        raise ValueError('Anomaly report identity mismatch')
    if json.loads(args.anomaly_report.read_bytes())['flagged_periods']!=source['periods']:raise ValueError('Anomaly cohort mismatch')
    result=report(source);result['capture_sha256']=hashlib.sha256(raw).hexdigest()
    result['report_code_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    if (args.output/'results.json').exists():raise FileExistsError('Refusing to replace evidence')
    args.output.mkdir(parents=True,exist_ok=True)
    (args.output/'results.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    for filename,key in [('T3.2_anomaly_month_controls.csv','controls'),('T3.2a_top5_recorded_dr_groups.csv','top5_groups'),('T3.2b_source_ledger.csv','ledger')]:
        rows=result[key]
        with (args.output/filename).open('x',encoding='utf-8-sig',newline='') as f:
            writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader()
            writer.writerows({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v for k,v in r.items()} for r in rows)
    print(json.dumps(dict(status=result['status'],months=len(result['controls']),source_records=len(result['ledger']))))


if __name__=='__main__':main()
