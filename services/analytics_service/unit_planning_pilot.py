"""Bounded retrospective BUPIRIGHT scenario, never a procurement recommendation."""
from calendar import monthrange
from decimal import Decimal
import math
from statistics import median,NormalDist

from .bupiright_unit_candidate import prepare,LABELS
from .planning_assumptions import load_register
from .planning_research import eoq_rop_scenario

VERSION='bupiright_six_month_planning_research_v1'
SOURCE_SHA='17a9a717bcee77359ddcd1a43f223cfc9aeb5ddc76c02f3c62625ea1e4a7b98a'


def prepare_pilot(source,confirmation,*,shelf_days=365,lead_days=14):
    candidate=prepare(source,confirmation)
    monthly={r['month']:int(Decimal(r['net_recorded_ampoules'])) for r in candidate['research_window']}
    if any(value<0 for value in monthly.values()):
        raise ValueError('Negative monthly net units require a separate physical-return model')
    training={period:value for period,value in monthly.items() if period<'2026-04'}
    evaluation={period:value for period,value in monthly.items() if period>='2026-04'}
    if len(training)!=12 or len(evaluation)!=6:
        raise ValueError('Frozen pilot requires 12 training and six evaluation months')
    # Only origin-known cost support; source total acquisition divided by reviewed billed unit.
    cost_rows=[r for r in source['queries']['detail']['rows'] if r['normalized_product'] in LABELS and
               r['raw_area']=='HOSPITAL' and '2025-04'<=r['date'][:7]<'2026-04' and
               r['is_acquisition_cost_technically_eligible'] in (True,'true') and
               r['acquisition_cost'] is not None and Decimal(r['recorded_quantity'])>0]
    unit_costs=[Decimal(r['acquisition_cost'])/Decimal(r['recorded_quantity']) for r in cost_rows]
    if not unit_costs or any(value<=0 or not value.is_finite() for value in unit_costs):
        raise ValueError('Positive eligible training acquisition support is required')
    cost=float(median(unit_costs))
    params={p['id']:p['base_values'] for p in load_register()['parameters']}
    if shelf_days not in (180,365,730) or lead_days not in (7,14,30):
        raise ValueError('Pilot supports only its declared shelf/lead sensitivity grid')
    holding,ordering,lead_sd,probability,seed_months=(params[k][0] for k in ('A1','A2','A4','A5','A7'))
    z=NormalDist().inv_cdf(probability)
    annual=sum(training.values())
    def recipe(annual_units):
        # Poisson daily dispersion is a separate explicit assumption, not observed daily demand.
        return eoq_rop_scenario(annual_demand=annual_units,acquisition_cost=cost,order_cost=ordering,
            holding_fraction=holding,pack_size=1,lead_days=lead_days,daily_demand_sd=math.sqrt(annual_units/365),
            lead_sd_days=lead_sd,service_z=z,shelf_life_days=shelf_days)
    fixed=recipe(annual)
    order,rop,means,origins=[],[],[],[]
    for period in sorted(evaluation):
        known=[monthly[p] for p in sorted(monthly) if p<period]
        if len(known)<12:raise ValueError('Insufficient origin-known policy history')
        forecast=sum(known[-6:])/6
        days=monthrange(*map(int,period.split('-')))[1]
        # Annualization preserves daily forecast intensity for this calendar month.
        dynamic=recipe(forecast/days*365)
        order.extend([dynamic['order_units']]*days);rop.extend([dynamic['reorder_point_units']]*days)
        means.extend([forecast/days]*days)
        origins.append(dict(target_period=period,origin_period=max(p for p in monthly if p<period),
                            training_months=len(known),forecast_ampoules=forecast,forecast_method='mean_6_research_unselected',
                            order_units=dynamic['order_units'],reorder_point_units=dynamic['reorder_point_units'],
                            daily_mean=forecast/days,evidence_label='Forecast'))
    initial=math.ceil(sum(training.values())/len(training)*seed_months)
    return dict(dataset_id=candidate['dataset_id'],policy_version=source['release']['policy_version'],
        method_version=VERSION,unit_scope='user_confirmed_BUPIRIGHT_4mL_ampoule_HOSPITAL',
        evidence_label='Simulated',assumption_ids=[f'A{i}' for i in range(1,8)]+['D1'],
        training=training,evaluation=evaluation,acquisition_cost_php_per_ampoule=cost,
        acquisition_evidence=dict(status='Derived',training_only=True,eligible_records=len(cost_rows),
            source_record_ids=[r['source_record_id'] for r in cost_rows]),
        fixed_policy_inputs=dict(annual_demand=annual,acquisition_cost=cost,order_cost=ordering,
            holding_fraction=holding,pack_size=1,lead_days=lead_days,daily_demand_sd=math.sqrt(annual/365),
            lead_sd_days=lead_sd,service_z=z,shelf_life_days=shelf_days),
        fixed_scenario=fixed,policy_origins=origins,
        policies=[dict(name='P0',previous_month_units=training['2026-03']),
                  dict(name='P1',reorder_point_units=fixed['reorder_point_units'],order_units=fixed['order_units']),
                  dict(name='P2',pack_size=1,reorder_point_units=rop,order_units=order,
                       mean_daily_demand=means,origin_available_confirmed=True)],
        simulation_inputs=dict(initial_lots=[dict(lot_id='assumed_opening',units=initial,expiry_day=shelf_days)],
            lead_mean_days=lead_days,lead_sd_days=lead_sd,shelf_life_days=shelf_days,burn_in_days=0),
        assumptions=dict(A1=holding,A2=ordering,A3=lead_days,A4=lead_sd,A5=probability,A6=shelf_days,A7=seed_months,
            daily_dispersion='assumed_Poisson_sd_sqrt_mean',daily_disaggregation_concentration=1.,
            opening_stock='ceiling_A7_times_training_monthly_mean',
            policy_P1='fixed_training12_EOQ_ROP_FEFO',policy_P2='rolling_mean6_research_shelf_capped_FEFO_no_DII',
            replenishment_cost='fixed_training_median_acquisition_value_not_verified_supplier_quote'),
        operational_approval=False,forecast_selected=False,external_join_approved=False,
        limitations=['Retained source; no fresh warehouse query or independent invoice validation.',
            'HOSPITAL is a channel, not verified delivery territory.',
            'Recorded fulfilled sales are not unconstrained pharmaceutical demand.',
            'Only six evaluation months; no 84-month history, six-month inventory burn-in or measured benefit.',
            'Mean6 is an explicit research policy, not a promoted unit champion; no DII uplift.',
            'All stock, expiry, lead-time and inventory policy settings are assumed.'])
