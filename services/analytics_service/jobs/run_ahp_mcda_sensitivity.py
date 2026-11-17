"""Offline WP10 normalization/AHP sensitivity; no default weights or disease joins."""
from __future__ import annotations

import argparse
import calendar
import csv
from datetime import date,datetime
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from scipy.stats import rankdata

from services.analytics_service.planning_research import ahp_weights,ranking_sensitivity

SOURCE_SHA='9c48b9da2353d184420f1c5dea0713b7360d09130520e44d87384ef88f531673'
CRITERIA=['log_positive_revenue_12m','winsorized_matched_net_growth','reviewed_disease_signal']


def number(value,name):
    if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value):
        raise ValueError(name+' must be an explicit finite number')
    return float(value)


def minmax(values):
    low,high=min(values),max(values)
    return ([0.0]*len(values) if low==high else [(v-low)/(high-low)*100 for v in values]),dict(min=low,max=high,constant=low==high)


def evaluate(payload):
    for field in ('dataset_id','policy_version','scope','input_provenance'):
        if not isinstance(payload.get(field),str) or not payload[field].strip():raise ValueError('Missing '+field)
    kind=payload.get('evidence_kind')
    if kind not in ('synthetic_fixture','reviewed_candidate'):raise ValueError('Explicit evidence_kind required')
    if kind=='synthetic_fixture' and not payload['dataset_id'].startswith('synthetic_'):
        raise ValueError('Synthetic fixtures require a synthetic dataset identity')
    origin=date.fromisoformat(payload['as_of']);end=date.fromisoformat(payload['window_end']);start=date.fromisoformat(payload['window_start'])
    if not start<=end<origin or (end.year,end.month)>=(origin.year,origin.month):raise ValueError('Window must end before the origin month')
    if start.day!=1 or (end.year*12+end.month)-(start.year*12+start.month)!=11:
        raise ValueError('Revenue window must span twelve calendar months')
    if end.day!=calendar.monthrange(end.year,end.month)[1]:raise ValueError('Window must end on the last day of a closed month')
    base_year=payload.get('base_year');target_year=payload.get('target_year');common=payload.get('matched_months')
    if type(base_year) is not int or type(target_year) is not int or target_year!=base_year+1 or base_year<2017:
        raise ValueError('Explicit consecutive comparison years required')
    if not isinstance(common,list) or not common or len(set(common))!=len(common) or any(type(m) is not int or not 1<=m<=12 for m in common):
        raise ValueError('Explicit common matched-month cohort required')
    if (target_year,max(common))>=(origin.year,origin.month):raise ValueError('Comparison includes an unclosed/future month')
    reviews=payload.get('reviews',{})
    if kind=='reviewed_candidate' and (not payload.get('source_bindings') or any(reviews.get(k) is not True for k in ('criteria_reviewed','disease_linkage_reviewed','external_join_approved','availability_reviewed'))):
        raise ValueError('Reviewed criteria, linkage, external join and availability evidence required')
    if kind=='reviewed_candidate':
        roles=[binding.get('role') for binding in payload['source_bindings']]
        if len(set(roles))!=len(roles) or not {'criteria','disease_mapping','external_availability','review'}.issubset(roles):
            raise ValueError('Bind criteria, disease mapping, availability and review evidence by distinct roles')
    scale=number(payload.get('dii_scale_ceiling'),'dii_scale_ceiling')
    if scale<=0:raise ValueError('Positive explicit DII scale ceiling required')
    ahp=ahp_weights(payload['pairwise_matrix'])
    items=payload['items']
    if not isinstance(items,list) or not 2<=len(items)<=10000:raise ValueError('Provide 2–10000 criterion records')
    rows=[];excluded=[];seen=set()
    for item in sorted(items,key=lambda r:r['product_key']):
        key=item['product_key']
        if not isinstance(key,str) or not key.strip() or key in seen:raise ValueError('Duplicate/empty product key')
        seen.add(key)
        if not isinstance(item.get('product'),str) or not item['product'].strip():raise ValueError('Missing recorded product label')
        revenue=number(item.get('revenue_12m'),'revenue_12m')
        base=number(item.get('matched_base_net'),'matched_base_net');target=number(item.get('matched_target_net'),'matched_target_net')
        months=item.get('matched_months')
        if not isinstance(months,list) or not months or len(set(months))!=len(months) or any(type(m) is not int or not 1<=m<=12 for m in months):
            raise ValueError('Explicit unique matching month numbers required')
        if set(months)!=set(common):raise ValueError('Mixed matched-month comparison populations')
        linkage=item.get('disease_linkage')
        if linkage=='reviewed_not_linked':
            if item.get('dii') is not None:raise ValueError('Nonlinked criterion must explicitly have no DII')
            outbreak=0.0
        elif linkage=='reviewed_linked':
            dii=number(item.get('dii'),'dii')
            if dii<0:raise ValueError('DII cannot be negative')
            outbreak=min(dii/scale,1.0)*100
        else:raise ValueError('pending_external_join: missing reviewed disease linkage is not zero')
        if revenue<=0 or base<=0:
            excluded.append(dict(product_key=key,product=item['product'],revenue_12m=revenue,matched_base_net=base,
                                 reason='nonpositive_log_revenue_or_growth_denominator'));continue
        growth=(target-base)/base*100
        if not math.isfinite(growth):raise ValueError('Growth is not representable')
        rows.append(dict(product_key=key,product=item['product'],revenue_12m=revenue,log_revenue=math.log(revenue),
                         matched_base_net=base,matched_target_net=target,matched_months=months,
                         matched_net_growth_pct=growth,disease_linkage=linkage,dii=item.get('dii'),outbreak_score=outbreak))
    if len(rows)<2:raise ValueError('Fewer than two comparable eligible products; rankings unavailable')
    # Shared comparable population; numpy's linear percentile convention is explicit.
    p5,p95=(float(v) for v in np.percentile([r['matched_net_growth_pct'] for r in rows],[5,95],method='linear'))
    growth=[max(p5,min(p95,r['matched_net_growth_pct'])) for r in rows]
    revenue_scores,revenue_bounds=minmax([r['log_revenue'] for r in rows]);growth_scores,growth_bounds=minmax(growth)
    scores=[]
    for i,row in enumerate(rows):
        row.update(winsorized_growth_pct=growth[i],revenue_score=revenue_scores[i],growth_score=growth_scores[i])
        scores.append([revenue_scores[i],growth_scores[i],row['outbreak_score']])
        row['mcda_score']=sum(s*w for s,w in zip(scores[-1],ahp['weights']))
    ranks=rankdata([-r['mcda_score'] for r in rows],method='average')
    for row,rank in zip(rows,ranks):row['score_rank']=float(rank)
    ranked=sorted(rows,key=lambda r:(-r['mcda_score'],r['product_key']))
    for i,row in enumerate(ranked,1):row['display_rank']=i
    probes=ranking_sensitivity(scores,ahp['weights'])
    passed=all(r['spearman_rho'] is not None and r['spearman_rho']>=.85 for r in probes)
    return dict(status='EXECUTED_SYNTHETIC_WP10_METHOD_ONLY' if kind=='synthetic_fixture' else 'EXECUTED_CALLER_REVIEWED_CANDIDATE',
        evidence_label='Simulated' if kind=='synthetic_fixture' else 'Derived',dataset_id=payload['dataset_id'],
        policy_version=payload['policy_version'],scope=payload['scope'],as_of=payload['as_of'],
        window_start=payload['window_start'],window_end=payload['window_end'],input_provenance=payload['input_provenance'],
        base_year=base_year,target_year=target_year,matched_months=sorted(common),
        criteria=CRITERIA,ahp=ahp,rankings=ranked,excluded=excluded,probes=probes,
        normalization=dict(revenue=revenue_bounds,growth=growth_bounds,winsor_p5=p5,winsor_p95=p95,
            percentile_method='linear',constant_criterion_score=0,dii_scale_ceiling=scale,
            growth_meaning='matched eligible recorded net sales growth, not unconstrained physical demand'),
        ties='average score ranks for Spearman; product-key order for display and top-k ties',
        sensitivity_gate_passed=passed,minimum_spearman_rho=min((r['spearman_rho'] for r in probes if r['spearman_rho'] is not None),default=None),
        source_reviews_declared=reviews,assumption_ids=['D3','D4'],weights_status='explicit scenario judgments, not accepted business weights',
        source_bindings=payload.get('source_bindings',[]),
        clinical_effectiveness_measured=False,operational_approval=False,business_publication_approved=False,full_wp10_complete=False)


def real_readiness(source_path):
    raw=source_path.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA:raise ValueError('Retained source identity differs')
    source=json.loads(raw)
    if source['release']['fact_delta_version']!=0 or source['contracts_excluded'] is not True:raise ValueError('Unsupported source')
    # This is a readiness assessment of exactly the inherited product aggregation,
    # not a claim that a clinical review cannot exist in a separate future contract.
    rows=source['queries']['products']['rows']
    return dict(status='UNAVAILABLE_REAL_MCDA_REVIEWED_CRITERIA_NOT_BOUND',evidence_label='Derived',
        dataset_id=source['release']['dataset_id'],policy_version=source['release']['policy_version'],
        source_sha256=SOURCE_SHA,recorded_labels=len({r['product_key'] for r in rows}),
        available='Recorded financial aggregates and matched-year financial capture',
        missing=['Reviewed per-product therapeutic/territory DII linkage and origin-availability contract',
                 'Bound twelve-closed-month and matching-month criterion population',
                 'Explicit AHP judgments plus attributable criterion/weight review'],
        rankings=None,disease_score=None,weights=None,stability_measured=False,
        warehouse_queries_this_run=0,business_publication_approved=False,full_wp10_complete=False)


def run(input_path,output,*,readiness=False):
    raw=input_path.read_bytes();payload=json.loads(raw)
    if readiness:result=real_readiness(input_path)
    else:
        for binding in payload.get('source_bindings',[]):
            p=(input_path.parent/binding['path']).resolve()
            if hashlib.sha256(p.read_bytes()).hexdigest()!=binding['sha256']:raise ValueError('Source binding mismatch')
        result=evaluate(payload)
    result.update(input_sha256=hashlib.sha256(raw).hexdigest(),job_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                  method_sha256=hashlib.sha256((Path(__file__).parents[1]/'planning_research.py').read_bytes()).hexdigest(),
                  checked_at=datetime.now().astimezone().isoformat())
    output.mkdir(parents=True,exist_ok=False)
    (output/'results.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    if not readiness:
        matrix_rows=[dict(criterion=CRITERIA[i],**{CRITERIA[j]:payload['pairwise_matrix'][i][j] for j in range(3)},
                          weight=result['ahp']['weights'][i],lambda_max=result['ahp']['lambda_max'],consistency_ratio=result['ahp']['consistency_ratio']) for i in range(3)]
        for name,rows in [('T10.1_ahp_matrix_and_consistency.csv',matrix_rows),('T10.2_mcda_priority_ranking.csv',result['rankings']),('T10.3_weight_perturbation_spearman.csv',result['probes'])]:
            metadata={key:result[key] for key in ('dataset_id','policy_version','scope','as_of','evidence_label','input_sha256')}
            metadata.update(weights_status=result['weights_status'],operational_approval=False,business_publication_approved=False)
            rows=[dict(row,**metadata) for row in rows]
            with (output/name).open('x',encoding='utf-8-sig',newline='') as handle:
                writer=csv.DictWriter(handle,fieldnames=list(rows[0]));writer.writeheader()
                writer.writerows({k:json.dumps(v) if isinstance(v,(dict,list)) else v for k,v in row.items()} for row in rows)
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__);group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--input',type=Path);group.add_argument('--readiness-source',type=Path)
    parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    result=run(args.input or args.readiness_source,args.output,readiness=args.readiness_source is not None)
    print(json.dumps(dict(status=result['status'],full_wp10_complete=False)))


if __name__=='__main__':main()
