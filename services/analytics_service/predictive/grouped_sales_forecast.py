"""Origin-known raw-label financial decomposition, not approved geographic demand."""
from decimal import Decimal, InvalidOperation
import hashlib
import math
import re

from .contracts import month, period

VERSION = 'origin_known_raw_label_bottom_up_v1'
BASELINES = ('last_value', 'seasonal_naive', 'mean_3', 'mean_6')
CONFIGS = [dict(model_id='group_select_w12', window=12, group_weight=1.),
           dict(model_id='group_select_w24', window=24, group_weight=1.),
           dict(model_id='group_select_w12_half_mean6', window=12, group_weight=.5)]
IDENTITY_FIELDS = ('dataset_id', 'policy_version', 'source_table', 'delta_version',
                   'receipt_sha256', 'source_keys_sha256', 'scope')


def integer(value):
    if isinstance(value, bool) or not re.fullmatch(r'[0-9]+', str(value)):
        raise ValueError('Nonnegative exact record counts required')
    return int(value)


def money(value):
    if not isinstance(value, str) or not re.fullmatch(r'-?[0-9]+(?:\.[0-9]{1,6})?', value):
        raise ValueError('Exact signed decimal financial amount required')
    try:
        result = Decimal(value)
    except InvalidOperation as error:
        raise ValueError('Invalid financial amount') from error
    if not result.is_finite():
        raise ValueError('Nonfinite financial amount')
    return result


def label_key(value):
    # Type tags preserve null/blank separately from any literal raw string.
    if value is None:
        return 'null:'
    if not isinstance(value, str):
        raise ValueError('Raw label must be a string or null')
    return 'string:' + value


def reconcile(capture, source, training_start='2020-01'):
    """Require a complete additive partition of the frozen captured financial row set."""
    identity = source['source_identity']
    actual_identity = capture['release']['original_itemized']
    if (capture.get('source') != 'databricks' or capture.get('warehouse_writes') != 0
            or any(actual_identity.get(k) != identity.get(k) for k in IDENTITY_FIELDS)
            or integer(capture['source_latest_version_before']) != integer(identity['delta_version'])
            or integer(capture['source_latest_version_after']) != integer(identity['delta_version'])):
        raise ValueError('Grouped capture source/version/receipt differs from company target')
    query = capture['queries']['monthly_control']
    if hashlib.sha256(query['sql'].encode()).hexdigest() != query['sql_sha256']:
        raise ValueError('Grouped query text/hash mismatch')
    first = month(training_start)
    panel = {}
    for row in source['monthly']:
        key = month(row['month'])
        if key < first:
            continue
        if key in panel or row['net_sales_php'] is None:
            raise ValueError('Missing/duplicate company month; no imputation')
        retained, eligible = integer(row['source_records']), integer(row['net_eligible_records'])
        if not retained or not eligible or eligible > retained:
            raise ValueError('Company captured month must have retained and eligible source records')
        panel[key] = dict(company_net_sales_php=str(money(row['net_sales_php'])),
                          records=retained, eligible_records=eligible, groups={})
    if not panel or sorted(panel) != list(range(first, max(panel) + 1)):
        raise ValueError('Contiguous captured company months required')
    for row in query['rows']:
        if not isinstance(row['month'], str) or not re.fullmatch(r'[0-9]{4}-(?:0[1-9]|1[0-2])-01', row['month']):
            raise ValueError('Grouped month must be exact first-of-month ISO date')
        key = month(row['month'][:7])
        if key < first:
            continue
        if key not in panel:
            raise ValueError('Grouped row outside captured target calendar')
        label = label_key(row['normalized_area'])
        if label in panel[key]['groups']:
            raise ValueError('Duplicate group/month would inflate company finance')
        retained, eligible = integer(row['records']), integer(row['eligible_records'])
        if not retained or eligible > retained:
            raise ValueError('Invalid grouped source counts')
        amount = money(row['revenue']) if row['revenue'] is not None else None
        if eligible and amount is None or not eligible and amount not in (None, Decimal(0)):
            raise ValueError('Grouped financial eligibility/amount mismatch')
        panel[key]['groups'][label] = dict(raw_label=row['normalized_area'], records=retained,
            eligible_records=eligible, net_sales_php=str(amount if amount is not None else Decimal(0)),
            source_amount_null=amount is None, row_present=True,
            zero_kind='empty_eligible_financial_rowset' if not eligible else None)
    for key, frame in panel.items():
        groups = list(frame['groups'].values())
        if (sum(r['records'] for r in groups) != frame['records']
                or sum(r['eligible_records'] for r in groups) != frame['eligible_records']
                or sum((money(r['net_sales_php']) for r in groups), Decimal(0)) != money(frame['company_net_sales_php'])):
            raise ValueError(f'Grouped source does not reconcile to company captured month {period(key)}')
    return panel


def baseline_vector(values, origin):
    return [values[origin], values[origin - 11],
            math.fsum(values[p] for p in range(origin - 2, origin + 1)) / 3,
            math.fsum(values[p] for p in range(origin - 5, origin + 1)) / 6]


def predict(panel, origin, config):
    if (isinstance(origin, bool) or not isinstance(origin, int) or config not in CONFIGS
            or any(isinstance(p, bool) or not isinstance(p, int) for p in panel)):
        raise ValueError('Registered configuration and integer calendar required')
    known = {p: frame for p, frame in panel.items() if p <= origin}
    if not known or origin not in known:
        raise ValueError('Missing captured origin')
    first = min(known)
    if sorted(known) != list(range(first, origin + 1)) or len(known) < 20:
        raise ValueError('At least20 contiguous captured company months required')
    company = {p: float(money(frame['company_net_sales_php'])) for p, frame in known.items()}
    if any(not math.isfinite(v) for v in company.values()):
        raise ValueError('Finite company amounts required')
    # The future capture's label vocabulary does not enter this origin's model.
    labels = sorted({label for frame in known.values() for label, row in frame['groups'].items()
                     if row['records'] > 0})
    if not labels:
        raise ValueError('No origin-observed raw groups')
    inner = list(range(first + 11, origin))[-config['window']:]
    if len(inner) < 8:
        raise ValueError('At least8 completed inner origins required')
    groups, baseline_sums = [], [0.] * len(BASELINES)
    for label in labels:
        values, absent, ineligible = {}, [], []
        for p, frame in known.items():
            row = frame['groups'].get(label)
            if row is None:
                # Additive empty financial subset, not observed zero sales or demand.
                values[p] = 0.; absent.append(p)
            else:
                values[p] = float(money(row['net_sales_php']))
                if not row['eligible_records']:
                    ineligible.append(p)
        if any(not math.isfinite(v) for v in values.values()):
            raise ValueError('Finite group amounts required')
        matrix = [baseline_vector(values, p) for p in inner]
        actual = [values[p + 1] for p in inner]
        losses = [math.fsum(abs(row[i] - y) for row, y in zip(matrix, actual)) / len(inner)
                  for i in range(len(BASELINES))]
        selected = min(range(len(BASELINES)), key=lambda i: (losses[i], i))
        current = baseline_vector(values, origin)
        for i, value in enumerate(current):
            baseline_sums[i] += value
        groups.append(dict(group_key=label, first_captured_period=min(p for p, frame in known.items()
            if label in frame['groups']), selected_expert=BASELINES[selected],
            inner_predictions=matrix, inner_actuals=actual, mean_absolute_errors=losses,
            current_predictions=current, prediction=current[selected],
            absent_contribution_periods=absent, ineligible_only_contribution_periods=ineligible))
    company_current = baseline_vector(company, origin)
    for value, expected in zip(baseline_sums, company_current):
        if not math.isclose(value, expected, rel_tol=1e-12, abs_tol=1e-6):
            raise ValueError('Linear bottom-up control does not conserve company finance')
    bottom_up = math.fsum(g['prediction'] for g in groups)
    prediction = config['group_weight'] * bottom_up + (1 - config['group_weight']) * company_current[3]
    return prediction, dict(method_version=VERSION, inner_origins=inner, inner_target_end=max(inner) + 1,
        samples=len(inner), groups=groups, baseline_order=list(BASELINES),
        linear_group_sums=baseline_sums, company_baseline_predictions=company_current,
        bottom_up_prediction=bottom_up, group_weight=config['group_weight'],
        unseen_remainder_prediction=0., remainder_kind='unseen_future_labels_not_forecast;their_recorded_amounts_stay_in_company_actual_error',
        zero_kind='additive_empty_captured_eligible_financial_subset_not_observed_zero_demand')
