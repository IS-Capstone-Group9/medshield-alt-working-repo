"""Fixed robust unit baseline comparison, offline and retrospective only."""
from decimal import Decimal, localcontext
from fractions import Fraction
import re

BASELINES = ('last_value', 'mean_3', 'mean_6', 'seasonal_naive_12')
CANDIDATE = 'median_four_baselines'
METHODS = (*BASELINES, CANDIDATE)
LEADS = (1, 3)


def month_number(month):
    if not isinstance(month, str) or not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        raise ValueError('Invalid calendar month')
    year, number = map(int, month.split('-'))
    return year * 12 + number - 1


def decimal_string(value):
    with localcontext() as context:
        context.prec = 50
        return str(Decimal(value.numerator) / Decimal(value.denominator))


def observed_series(monthly):
    if not isinstance(monthly, list) or not 13 <= len(monthly) <= 600:
        raise ValueError('Need bounded observed history beyond 12 training months')
    months, values = [], []
    for row in monthly:
        month = row['month']
        number = month_number(month)
        if months and number != month_number(months[-1]) + 1:
            raise ValueError('Missing, duplicate or unordered month; no imputation')
        raw = row.get('net_recorded_ampoules')
        if not isinstance(raw, str) or len(raw) > 64:
            raise ValueError('Expected recorded decimal ampoules, not missing/guessed units')
        value = Decimal(raw)
        if not value.is_finite() or abs(value) > Decimal('1e12'):
            raise ValueError('Invalid recorded quantity')
        months.append(month)
        values.append(Fraction(value))
    return months, values


def forecasts(history, lead):
    if len(history) < 12 or lead not in LEADS:
        raise ValueError('Unsupported training history or lead')
    # Only the supplied origin prefix is accessible to any method.
    predictions = dict(last_value=history[-1], mean_3=sum(history[-3:]) / 3,
                       mean_6=sum(history[-6:]) / 6,
                       seasonal_naive_12=history[len(history) - 1 + lead - 12])
    ordered = sorted(predictions.values())
    predictions[CANDIDATE] = (ordered[1] + ordered[2]) / 2
    return predictions


def summarize(actual, predicted):
    if not actual or len(actual) != len(predicted):
        raise ValueError('Empty or unmatched cohort')
    errors = [p - a for a, p in zip(actual, predicted)]
    absolute = sum(map(abs, errors))
    denominator = sum(map(abs, actual))
    mse = sum(e * e for e in errors) / len(errors)
    with localcontext() as context:
        context.prec = 50
        rmse = (Decimal(mse.numerator) / Decimal(mse.denominator)).sqrt()
    return dict(cases=len(errors), mae_ampoules=decimal_string(absolute / len(errors)),
                rmse_ampoules=str(rmse), mean_signed_error_ampoules=decimal_string(sum(errors) / len(errors)),
                wape_percent=decimal_string(100 * absolute / denominator) if denominator else None,
                normalized_bias_percent=decimal_string(100 * sum(errors) / denominator) if denominator else None)


def evaluate(monthly):
    months, values = observed_series(monthly)
    points, metrics, comparisons = [], [], []
    exact = {}
    for lead in LEADS:
        cohort = list(range(11, len(values) - lead))
        if not cohort:
            continue
        actual = [values[origin + lead] for origin in cohort]
        for method in METHODS:
            predicted = [forecasts(values[:origin + 1], lead)[method] for origin in cohort]
            errors = [p - a for a, p in zip(actual, predicted)]
            exact[lead, method] = errors
            metrics.append(dict(lead=lead, method=method, **summarize(actual, predicted)))
            for origin, a, p in zip(cohort, actual, predicted):
                points.append(dict(origin=months[origin], target_month=months[origin + lead], lead=lead,
                                   method=method, training_months=origin + 1, actual_ampoules=decimal_string(a),
                                   prediction_ampoules=decimal_string(p), error_ampoules=decimal_string(p - a)))
        for baseline in BASELINES:
            paired = list(zip(exact[lead, CANDIDATE], exact[lead, baseline]))
            delta = sum(abs(a) - abs(b) for a, b in paired) / len(paired)
            baseline_error = sum(abs(b) for _, b in paired)
            comparisons.append(dict(lead=lead, candidate=CANDIDATE, baseline=baseline, cases=len(paired),
                mae_delta_ampoules=decimal_string(delta),
                relative_mae_gain_percent=decimal_string(-100 * delta * len(paired) / baseline_error) if baseline_error else None,
                candidate_wins=sum(abs(a) < abs(b) for a, b in paired),
                candidate_losses=sum(abs(a) > abs(b) for a, b in paired),
                ties=sum(abs(a) == abs(b) for a, b in paired)))
    return dict(status='EXPLORATORY_RETROSPECTIVE_UNIT_COMPARISON', points=points,
                metrics=metrics, paired_comparisons=comparisons, selected_method=None,
                operational_forecasting_approved=False, runtime_changed=False, warehouse_writes=0,
                point_accuracy_promotion_allowed=False,
                limitations=['Previously inspected 18-month retrospective scope; no untouched outcomes.',
                             'Only six lead-one and four lead-three targets in the registered source.',
                             'Signed recorded ampoules in the confirmed two-label HOSPITAL channel, not unconstrained demand.',
                             'No verified geographic generalization, future issue, procurement approval or automatic method selection.'])
