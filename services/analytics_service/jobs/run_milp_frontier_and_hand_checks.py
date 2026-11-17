"""WP9 exact budget/capacity scenarios; retained sales are not operating stock."""
from __future__ import annotations
import argparse
import csv
from decimal import Decimal,ROUND_HALF_UP,ROUND_FLOOR
from fractions import Fraction
import hashlib
from itertools import product
import json
import platform
from math import ceil,lcm,prod
from pathlib import Path
import subprocess

import numpy as np
from scipy.optimize import milp,Bounds,LinearConstraint

from services.analytics_service.jobs.run_solver_parity import candidate_options
from services.analytics_service.unit_planning_pilot import prepare_pilot,SOURCE_SHA
from services.analytics_service.bupiright_unit_candidate import LABELS
from services.analytics_service.planning_assumptions import load_register

ROOT=Path(__file__).resolve().parents[3]


def validate_case(case):
    def integer(value,maximum=1_000_000_000):return type(value) is int and 0<=value<=maximum
    if case['kind']!='ordinary' or not 1<=len(case['items'])<=5 or not integer(case['budget_cents'],10**12) or not integer(case['capacity_units']):raise ValueError('Invalid bounded ordinary frontier case')
    if not isinstance(case.get('unit_label'),str) or not case['unit_label'].strip():raise ValueError('A common reviewed/assumed unit label is required')
    if type(case['minimum_pct']) not in (int,float) or not 0<=case['minimum_pct']<=100:raise ValueError('Invalid minimum fulfillment')
    seen=set()
    for item in case['items']:
        if not isinstance(item['product'],str) or not item['product'].strip() or item['product'] in seen:raise ValueError('Duplicate/empty product')
        seen.add(item['product'])
        for key in ('demand','available','pack','pack_cost_cents','max_packs','score'):
            if not integer(item[key],100 if key=='score' else 100000 if key=='max_packs' else 10**9):raise ValueError('Invalid integer scenario field '+key)
        if not item['demand'] or not item['pack'] or not item['pack_cost_cents']:raise ValueError('Demand/pack/cost must be positive')
    if not sum(i['score'] for i in case['items']):raise ValueError('Positive priority required')
    if prod(i['max_packs']+1 for i in case['items'])>1_000_000:raise ValueError('Enumeration acceptance domain exceeds one million combinations')


def objective(case,packs):
    return sum((Fraction(i['score']*min(i['demand'],i['available']+q*i['pack']),i['demand']) for i,q in zip(case['items'],packs)),Fraction())/sum(i['score'] for i in case['items'])


def enumerate_case(case):
    feasible=[]
    for options in product(*candidate_options(case)):
        packs=tuple(o['packs'] for o in options)
        if sum(o['cost_cents'] for o in options)<=case['budget_cents'] and sum(q*i['pack'] for q,i in zip(packs,case['items']))<=case['capacity_units']:
            feasible.append((objective(case,packs),packs))
    if not feasible:return dict(status='infeasible',objective=None,packs=None,optima=0)
    best=max(v for v,_ in feasible);optima=[p for v,p in feasible if v==best]
    return dict(status='optimal',objective=str(best),packs=list(optima[0]),optima=len(optima))


def solve_models(case):
    groups=candidate_options(case)
    if any(not g for g in groups):return {name:dict(status='infeasible',packs=None) for name in ('scipy','pulp')}
    flat=[(i,o) for i,g in enumerate(groups) for o in g];scale=lcm(*(o['score'].denominator for _,o in flat))
    profits=[int(o['score']*scale) for _,o in flat]
    constraints=np.zeros((len(groups)+2,len(flat)))
    for pos,(i,o) in enumerate(flat):
        constraints[i,pos]=1;constraints[-2,pos]=o['cost_cents'];constraints[-1,pos]=o['packs']*case['items'][i]['pack']
    high=[1]*len(groups)+[case['budget_cents'],case['capacity_units']]
    low=[1]*len(groups)+[-np.inf,-np.inf]
    result=milp(-np.array(profits,dtype=float),integrality=np.ones(len(flat)),bounds=Bounds(0,1),constraints=LinearConstraint(constraints,low,high),options={'mip_rel_gap':0,'time_limit':30})
    def selected(values):
        chosen=[(i,o) for value,(i,o) in zip(values,flat) if value>.5]
        if len(chosen)!=len(groups) or len({i for i,_ in chosen})!=len(groups):raise ValueError('Invalid solver choice')
        packs=[o['packs'] for _,o in chosen]
        return dict(status='optimal',packs=packs,objective=str(objective(case,packs)))
    scipy=selected(result.x) if result.status==0 else dict(status='infeasible' if result.status==2 else 'not_solved',packs=None)
    import pulp
    model=pulp.LpProblem('capacity_frontier',pulp.LpMaximize);variables=[pulp.LpVariable('choice_'+str(j),cat='Binary') for j in range(len(flat))]
    model+=pulp.lpSum(v*p for v,p in zip(variables,profits))
    for i in range(len(groups)):model+=pulp.lpSum(v for v,(index,_) in zip(variables,flat) if index==i)==1
    model+=pulp.lpSum(v*o['cost_cents'] for v,(_,o) in zip(variables,flat))<=case['budget_cents']
    model+=pulp.lpSum(v*o['packs']*case['items'][i]['pack'] for v,(i,o) in zip(variables,flat))<=case['capacity_units']
    model.solve(pulp.HiGHS(msg=False,gapRel=0,timeLimit=30));status=pulp.LpStatus[model.status]
    other=selected([pulp.value(v) for v in variables]) if status=='Optimal' else dict(status='infeasible' if status=='Infeasible' else 'not_solved',packs=None)
    return dict(scipy=scipy,pulp=other)


def prepare_unit(source,confirmation):
    pilot=prepare_pilot(source,confirmation)
    training=pilot['training'];costs=[r for r in source['queries']['detail']['rows'] if r['normalized_product'] in LABELS and r['raw_area']=='HOSPITAL' and r['date'][:7] in training and r['is_acquisition_cost_technically_eligible'] in (True,'true')]
    if not costs or any(r['acquisition_cost'] is None for r in costs):raise ValueError('Missing eligible acquisition amount')
    basis=sum((Decimal(r['acquisition_cost']) for r in costs),Decimal(0))/12
    if basis<=0:raise ValueError('Positive monthly recorded acquisition basis required')
    ratios=sorted({Decimal(str(v)) for p in load_register()['parameters'] if p['id']=='A8' for v in p['sensitivity_values']}|{Decimal('.5'),Decimal('1.5')})
    caps=[Decimal(str(v)) for p in load_register()['parameters'] if p['id']=='A9' for v in p['sensitivity_values']]
    p95=Decimal(str(float(np.percentile(list(training.values()),95,method='linear'))))
    demand=ceil(sum(training[p] for p in sorted(training)[-6:])/6)
    cost_cents=int((Decimal(str(pilot['acquisition_cost_php_per_ampoule']))*100).quantize(Decimal(1),rounding=ROUND_HALF_UP))
    cases=[]
    for ratio in ratios:
        budget=int((basis*ratio*100).quantize(Decimal(1),rounding=ROUND_HALF_UP))
        for cap_ratio in caps:
            capacity=int((p95*cap_ratio).to_integral_value(rounding=ROUND_FLOOR))
            cases.append(dict(id=f'budget_{ratio}_capacity_{cap_ratio}',kind='ordinary',budget_ratio=str(ratio),capacity_ratio=str(cap_ratio),
                budget_cents=budget,capacity_units=capacity,unit_label='user_confirmed_ampoules',minimum_pct=0,
                items=[dict(product='BUPIRIGHT confirmed 4mL cohort',demand=demand,available=0,pack=1,pack_cost_cents=cost_cents,max_packs=demand,score=100)]))
    return dict(schema_version='offline_budget_frontier_v1',evidence_kind='retained_source_scenario',dataset_id=pilot['dataset_id'],
        policy_version=pilot['policy_version'],source_sha256=SOURCE_SHA,scope=pilot['unit_scope'],as_of='2026-04-01',
        training=training,training_monthly_acquisition_basis_php=str(basis),acquisition_source_record_ids=[r['source_record_id'] for r in costs],
        training_p95_ampoules=str(p95),demand_recipe='ceiling prior-six observed monthly mean; unselected scenario target',
        assumptions=dict(stock_units=0,minimum_fulfillment_pct=0,supplier_max='scenario demand ceiling, not supplier evidence',
            acquisition_cost='rounded training median, not verified supplier quote',A8='registered ratios plus explicit .50/1.50 plan endpoints',A9='training p95 throughput proxy, not storage capacity'),
        cases=cases,operational_approval=False)


def run(payload,output):
    if payload['schema_version']!='offline_budget_frontier_v1' or payload['operational_approval'] is not False:raise ValueError('Explicit offline scenario required')
    if payload['evidence_kind'] not in ('synthetic_fixture','retained_source_scenario'):raise ValueError('Unsupported evidence')
    if payload['evidence_kind']=='synthetic_fixture' and not payload['dataset_id'].startswith('synthetic_'):raise ValueError('Synthetic identity required')
    if payload['evidence_kind']=='retained_source_scenario' and payload['source_sha256']!=SOURCE_SHA:raise ValueError('Unsupported retained source identity')
    if len({c['id'] for c in payload['cases']})!=len(payload['cases']) or not payload['cases']:raise ValueError('Unique nonempty case IDs required')
    for c in payload['cases']:validate_case(c)
    output.mkdir(parents=True,exist_ok=False);input_path=output/'scenario-input.json'
    input_path.write_text(json.dumps(payload,indent=2)+'\n',encoding='utf-8')
    ts_path=output/'typescript-results.json'
    subprocess.run(['node','--import','tsx','scripts/check-budget-frontier.ts',str(input_path.resolve()),str(ts_path.resolve())],cwd=ROOT/'backend',check=True,capture_output=True,text=True)
    ts={r['id']:r for r in json.loads(ts_path.read_bytes())['rows']};rows=[]
    for case in payload['cases']:
        expected=enumerate_case(case);models=solve_models(case);gateway=ts[case['id']]['weighted']
        gateway['objective']=str(Fraction(int(gateway['objective_numerator']),int(gateway['objective_denominator']))) if gateway['objective_numerator'] is not None else None
        gateway['status']='optimal' if gateway['status']=='scenario_allocation' and gateway['proof_status']=='optimal' else gateway['status']
        for name,result in dict(typescript=gateway,**models).items():
            if result['status']!=expected['status']:raise ValueError('Solver status mismatch '+case['id']+' '+name)
            if result['status']=='optimal':
                if result['objective']!=expected['objective']:raise ValueError('Solver primary objective mismatch')
                packs=result['packs']
                if sum(q*i['pack'] for q,i in zip(packs,case['items']))>case['capacity_units'] or sum(q*i['pack_cost_cents'] for q,i in zip(packs,case['items']))>case['budget_cents']:raise ValueError('Solver constraint violation')
        greedy=ts[case['id']]['greedy'];greedy_obj=objective(case,greedy['packs']) if greedy['packs'] is not None else None
        rows.append(dict(case_id=case['id'],budget_cents=case['budget_cents'],capacity_units=case['capacity_units'],
            capacity_ratio=case.get('capacity_ratio'),budget_ratio=case.get('budget_ratio'),status=expected['status'],weighted_fulfillment_pct=float(Fraction(expected['objective'])*100) if expected['objective'] is not None else None,
            balanced_weighted_fulfillment_pct=float(greedy_obj*100) if greedy_obj is not None else None,
            weighted_advantage_pp=float((Fraction(expected['objective'])-greedy_obj)*100) if greedy_obj is not None else None,
            solvers=dict(typescript=gateway,**models),enumerated_optima=expected['optima'],greedy=greedy))
    for row in rows:
        previous=sorted((r for r in rows if r['capacity_units']==row['capacity_units'] and r['budget_cents']<row['budget_cents']),key=lambda r:r['budget_cents'])
        prior=previous[-1] if previous else None
        row['discrete_gain_pp_per_php10000']=((row['weighted_fulfillment_pct']-prior['weighted_fulfillment_pct'])/((row['budget_cents']-prior['budget_cents'])/100)*10000 if prior and row['status']==prior['status']=='optimal' else None)
    paths=[Path(__file__),ROOT/'backend/scripts/check-budget-frontier.ts',ROOT/'services/analytics_service/jobs/run_solver_parity.py',ROOT/'config/planning_assumptions.json']
    paths += [ROOT/'backend/src'/name for name in ('weightedPlanning.ts','planningScenario.ts','planningInputs.ts','inventoryPolicyScenario.ts','inventoryFeasibility.ts','forecastEvidence.ts')]
    paths += [ROOT/'services/analytics_service'/name for name in ('unit_planning_pilot.py','bupiright_unit_candidate.py','bupiright_lineage.py','planning_research.py','planning_assumptions.py')]
    hashes={str(p.relative_to(ROOT)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    import scipy,pulp,highspy
    result=dict(status='PASS_SCOPED_THREE_SOLVER_CAPACITY_FRONTIER',evidence_label='Simulated',evidence_kind=payload['evidence_kind'],
        dataset_id=payload['dataset_id'],policy_version=payload['policy_version'],scope=payload['scope'],assumption_ids=['A8','A9','D1'],rows=rows,
        input_sha256=hashlib.sha256(input_path.read_bytes()).hexdigest(),code_hashes=hashes,operational_approval=False,measured_benefit=False,
        environment=dict(python=platform.python_version(),numpy=np.__version__,scipy=scipy.__version__,pulp=pulp.__version__,highspy=highspy.Highs().version()),
        limitation='Entered stock/supplier/capacity/priority assumptions; sales acquisition is not procurement spend. Discrete gains are not LP dual prices. Primary-objective ties may select different vectors. SciPy/PuLP use HiGHS-family engines.')
    (output/'results.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    with (output/'T9.3_budget_frontier_and_shadow_value.csv').open('x',encoding='utf-8-sig',newline='') as f:
        export=[{k:v for k,v in row.items() if k not in ('solvers','greedy')}|{k:result[k] for k in ('dataset_id','policy_version','scope','evidence_label','assumption_ids','input_sha256','operational_approval')} for row in rows]
        writer=csv.DictWriter(f,fieldnames=list(export[0]));writer.writeheader();writer.writerows({k:json.dumps(v) if isinstance(v,list) else v for k,v in row.items()} for row in export)
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__);group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--input',type=Path);group.add_argument('--unit-source-directory',type=Path)
    parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    if args.input:
        payload=json.loads(args.input.read_bytes())
        if payload['evidence_kind']!='synthetic_fixture':raise ValueError('Retained-source scenarios require the checked unit-source-directory path')
    else:
        source=args.unit_source_directory/'source.json';confirmation=args.unit_source_directory/'user-confirmation.json'
        if hashlib.sha256(source.read_bytes()).hexdigest()!=SOURCE_SHA or json.loads(confirmation.read_bytes())['source_sha256']!=SOURCE_SHA:raise ValueError('Confirmed source hash mismatch')
        payload=prepare_unit(json.loads(source.read_bytes()),json.loads(confirmation.read_bytes()))
        payload['confirmation_sha256']=hashlib.sha256(confirmation.read_bytes()).hexdigest()
    result=run(payload,args.output);print(json.dumps(dict(status=result['status'],cases=len(result['rows']),operational_approval=False)))


if __name__=='__main__':main()
