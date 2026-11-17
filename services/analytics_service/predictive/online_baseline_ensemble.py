"""Narrow joint-affine extension of prior convex blends; offline research only."""
import math

VERSION = 'origin_local_joint_affine_l1_v1'
BASELINES = ('last_value', 'seasonal_naive', 'mean_3', 'mean_6')
CONFIGS = [dict(model_id=f'joint_affine_{label}', window=window)
           for label, window in (('w12', 12), ('w24', 24), ('all', None))]


def baseline_vector(series, origin):
    """One-step reference predictions, all observed by this origin."""
    return [series[origin], series[origin - 11],
            math.fsum(series[p] for p in range(origin - 2, origin + 1)) / 3,
            math.fsum(series[p] for p in range(origin - 5, origin + 1)) / 6]


def predict(series, origin, config):
    if isinstance(origin, bool) or not isinstance(origin, int) or config not in CONFIGS:
        raise ValueError('Registered recipe and integer calendar origin required')
    if any(isinstance(p, bool) or not isinstance(p, int) for p in series):
        raise ValueError('Integer calendar keys required')
    known = {p: v for p, v in series.items() if p <= origin}
    if not known or origin not in known:
        raise ValueError('Missing origin')
    first = min(known)
    if sorted(known) != list(range(first, origin + 1)) or len(known) < 20:
        raise ValueError('At least20 contiguous observed months required; missing is not zero')
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v)
           for v in known.values()):
        raise ValueError('Finite observed values required')
    inner = list(range(first + 11, origin))
    if config['window'] is not None:
        inner = inner[-config['window']:]
    if len(inner) < 8:
        raise ValueError('At least8 completed one-step training cases required')
    matrix = [baseline_vector(known, p) for p in inner]
    actual = [known[p + 1] for p in inner]
    current = baseline_vector(known, origin)
    recent_abs_mean = math.fsum(abs(known[p]) for p in range(origin - 11, origin + 1)) / 12
    cap = .2 * recent_abs_mean
    scale = max(max(map(abs, actual)), max(abs(v) for row in matrix for v in row),
                max(map(abs, current)))
    if scale == 0:
        raise ValueError('All-zero fit scale; no affine LP fitted')
    import numpy as np
    from scipy.optimize import linprog
    x, y = np.asarray(matrix) / scale, np.asarray(actual) / scale
    n, k = x.shape
    # Jointly estimate simplex weights and one bounded signed intercept.
    fit = linprog(np.r_[np.zeros(k + 1), np.ones(n) / n],
                  A_ub=np.vstack([np.c_[x, np.ones(n), -np.eye(n)],
                                   np.c_[-x, -np.ones(n), -np.eye(n)]]),
                  b_ub=np.r_[y, -y],
                  A_eq=np.r_[np.ones(k), np.zeros(n + 1)][None, :], b_eq=[1.],
                  bounds=[(0., 1.)] * k + [(-cap / scale, cap / scale)] + [(0., None)] * n,
                  method='highs')
    if not fit.success:
        raise ValueError('Joint affine LP failed; no fallback prediction')
    weights, intercept = fit.x[:k], float(fit.x[k] * scale)
    if (not np.isfinite(fit.x).all() or min(weights) < -1e-8
            or abs(sum(weights) - 1) > 1e-8
            or abs(intercept) > cap + max(1e-8, scale * 1e-8)):
        raise ValueError('Invalid affine fit constraints')
    prediction = float(np.asarray(current) @ weights + intercept)
    training_predictions = [math.fsum(w * p for w, p in zip(weights, row)) + intercept
                            for row in matrix]
    mae = math.fsum(abs(p - y) for p, y in zip(training_predictions, actual)) / n
    if not math.isfinite(prediction) or not math.isclose(mae, fit.fun * scale,
                                                       rel_tol=1e-7, abs_tol=max(1e-7, scale * 1e-7)):
        raise ValueError('Nonfinite or inconsistent affine fit')
    return prediction, dict(method_version=VERSION, experts=list(BASELINES),
        inner_origins=inner, inner_target_end=max(inner) + 1, samples=n,
        inner_predictions=matrix, inner_actuals=actual, current_predictions=current,
        weights=weights.tolist(), intercept_php=intercept, intercept_cap_php=cap,
        recent_abs_mean_php=recent_abs_mean, scale=scale, training_mae_php=mae,
        normalized_objective=float(fit.fun), solver_status=int(fit.status))
