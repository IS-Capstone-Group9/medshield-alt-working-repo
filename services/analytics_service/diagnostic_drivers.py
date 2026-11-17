"""Offline, presentation-scoped diagnostics; never a runtime source or causal model."""
from decimal import Decimal
import math
import numpy as np
from scipy.stats import pearsonr, spearmanr


def _number(value):
    if isinstance(value, bool) or value is None:
        raise ValueError('Missing or boolean numeric input')
    result = Decimal(str(value))
    if not result.is_finite():
        raise ValueError('Nonfinite numeric input')
    return result


def price_volume_mix(rows):
    """Each row is one raw product × reviewed presentation in two matched periods.

    Net amounts include signed adjustments. Unreviewed units reconcile as an
    adjustment bucket, rather than being converted or silently excluded.
    """
    result = []
    seen = set()
    for row in rows:
        identity = (row['product'], row.get('unit_scope'))
        if identity in seen:
            raise ValueError('Duplicate product/presentation cohort')
        seen.add(identity)
        before, after = (_number(row[k]) for k in ('base_net', 'target_net'))
        q0, q1 = (None if row.get(k) is None else _number(row[k])
                  for k in ('base_qty', 'target_qty'))
        volume = price = interaction = Decimal(0)
        delta = after - before
        if row.get('unit_reviewed') is True and row.get('unit_scope') and q0 is not None and q1 is not None and q0 > 0 and q1 > 0:
            p0, p1 = before / q0, after / q1
            volume, price = (q1 - q0) * p0, (p1 - p0) * q0
            interaction = (q1 - q0) * (p1 - p0)
            bucket, remainder = 'Comparable', Decimal(0)
        else:
            bucket = ('New_In_Period' if before == 0 and q0 == 0 and q1 is not None and q1 > 0
                      else 'Absent_In_Period' if after == 0 and q1 == 0 and q0 is not None and q0 > 0
                      else 'Adjustment_Only')
            remainder = delta
        error = delta - volume - price - interaction - remainder
        if abs(error) > Decimal('0.00000001'):
            raise ArithmeticError('PVM does not reconcile')
        result.append(dict(product=row['product'], unit_scope=row.get('unit_scope'),
                           bucket=bucket, base_net=str(before), target_net=str(after),
                           delta_net=str(delta), volume_effect=str(volume), price_effect=str(price),
                           interaction_effect=str(interaction), other_effect=str(remainder),
                           evidence_label='Derived', assumption_ids=['D1']))
    return result


def stl_strength(trend, seasonal, residual):
    arrays = [np.asarray(values, dtype=float) for values in (trend, seasonal, residual)]
    if len({len(a) for a in arrays}) != 1 or not arrays[0].size or not all(np.isfinite(a).all() for a in arrays):
        raise ValueError('Expected aligned finite STL components')
    t, s, r = arrays
    def strength(component):
        denominator = float(np.var(component + r))
        return None if denominator == 0 else max(0.0, 1 - float(np.var(r)) / denominator)
    return dict(trend_strength=strength(t), seasonal_strength=strength(s), evidence_label='Derived',
                interpretation='retrospective_not_causal_or_origin_safe')


def residual_anomalies(rows):
    """Robust z over a single fitted segment; zero MAD stays unavailable."""
    values = np.asarray([r['residual'] for r in rows], dtype=float)
    if not values.size or not np.isfinite(values).all():
        raise ValueError('Expected finite residuals')
    median = float(np.median(values))
    scale = 1.4826 * float(np.median(np.abs(values - median)))
    return [dict(row, robust_z=(float(value) - median) / scale if scale else None,
                 anomaly=abs((float(value) - median) / scale) > 3 if scale else None,
                 reason=None if scale else 'zero_mad', source_evidence_label=row.get('evidence_label'), evidence_label='Derived')
            for row, value in zip(rows, values)]


def benjamini_hochberg(pvalues):
    """One prespecified family; unavailable tests are preserved, not replaced by 0."""
    valid = [(i, p) for i, p in enumerate(pvalues) if p is not None]
    if any(not math.isfinite(p) or not 0 <= p <= 1 for _, p in valid):
        raise ValueError('Invalid p-value')
    ordered = sorted(valid, key=lambda pair: pair[1])
    output, previous = [None] * len(pvalues), 1.0
    for rank in range(len(ordered), 0, -1):
        index, p = ordered[rank - 1]
        previous = min(previous, p * len(ordered) / rank)
        output[index] = previous
    return output


def lagged_associations(demand, external, lags=(0, 1, 2, 3)):
    """Integer calendar-month keys; external[t-lag] paired with demand[t].

    Inputs must already be a single compatible unit/territory/disease/provider
    cohort. Pearson bands are descriptive ±1.96/sqrt(n), not time-series proof.
    """
    if any(isinstance(lag, bool) or not isinstance(lag, int) or lag < 0 for lag in lags):
        raise ValueError('Invalid month lag')
    output = []
    for lag in lags:
        pairs = [(external[t - lag], y) for t, y in sorted(demand.items())
                 if y is not None and external.get(t - lag) is not None]
        if any(not math.isfinite(v) for pair in pairs for v in pair):
            raise ValueError('Nonfinite association input')
        n = len(pairs)
        valid = n >= 3 and len({p[0] for p in pairs}) > 1 and len({p[1] for p in pairs}) > 1
        pearson = pearsonr(*zip(*pairs)) if valid else None
        spearman = spearmanr(*zip(*pairs)) if valid else None
        output.append(dict(lag_months=lag, n=n, pearson_r=float(pearson.statistic) if valid else None,
                           pearson_p=float(pearson.pvalue) if valid else None,
                           spearman_rho=float(spearman.statistic) if valid else None,
                           spearman_p=float(spearman.pvalue) if valid and n > 500 else None,
                           spearman_inference='asymptotic' if valid and n > 500 else 'unavailable_small_sample_no_permutation_protocol',
                           descriptive_band=1.96 / math.sqrt(n) if n else None,
                           evidence_label='Derived', interpretation='exploratory_association_not_causation',
                           inference_limit='Pearson iid reference only; autocorrelation is not corrected.'))
    # Both reported tests belong to the same declared family.
    adjusted = benjamini_hochberg([r[k] for r in output for k in ('pearson_p', 'spearman_p')])
    for i, row in enumerate(output):
        row.update(pearson_q=adjusted[2*i], spearman_q=adjusted[2*i+1],
                   fdr_family='all_requested_lags_both_correlation_tests')
    return output
