"""Versioned, scale-conditioned ETS research recipes; frozen adapters stay intact."""
import math
import warnings

METHOD_VERSION = 'scale_conditioned_ets_v1'


def forecast(training, origin, leads, *, damped):
    """Fit only contiguous origin-known data and reject unsuccessful optimization.

    Dividing by an origin-local positive scale is reversible, including for signed
    financial observations. It does not log-transform, clip, or impute the target.
    """
    if isinstance(origin, bool) or not isinstance(origin, int):
        raise ValueError('Origin must be an integer calendar month')
    if not isinstance(damped, bool):
        raise ValueError('Damped must be an explicit boolean')
    if (not isinstance(leads, (list, tuple)) or not leads or
            any(isinstance(h, bool) or not isinstance(h, int) or not 1 <= h <= 12 for h in leads) or
            len(set(leads)) != len(leads)):
        raise ValueError('Distinct integer calendar leads 1–12 required')
    if any(isinstance(p, bool) or not isinstance(p, int) for p in training):
        raise ValueError('Training keys must be integer calendar months')
    known = {p: v for p, v in training.items() if p <= origin}
    details = dict(method_version=METHOD_VERSION, converged=False, scale=None,
                   training_months=len(known), reason=None)
    if not known or origin not in known:
        return {}, dict(details, reason='Missing training origin')
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v)
           for v in known.values()):
        raise ValueError('Finite observed training values required')
    start = min(known)
    if sorted(known) != list(range(start, origin + 1)) or len(known) < 36:
        return {}, dict(details, reason='Requires 36 contiguous origin-known training months')

    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    from statsmodels.tools.sm_exceptions import ConvergenceWarning
    values = [known[p] for p in range(start, origin + 1)]
    scale = max(map(abs, values)) or 1.0
    details['scale'] = scale
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always', ConvergenceWarning)
        fitted = ExponentialSmoothing(
            [v / scale for v in values], trend='add' if damped else None,
            damped_trend=damped, seasonal='add', seasonal_periods=12,
            initialization_method='estimated').fit(
                optimized=True, method='SLSQP', minimize_kwargs={
                    'options': {'maxiter': 1000, 'ftol': 1e-10}})
    optimizer = getattr(fitted, 'mle_retvals', None)
    success = bool(optimizer.get('success', False)) if optimizer is not None else False
    failed_warning = any(issubclass(w.category, ConvergenceWarning) for w in caught)
    details['optimizer_message'] = str(optimizer.get('message', '')) if optimizer is not None else ''
    if not success or failed_warning:
        return {}, dict(details, reason='ETS optimization did not converge; prediction unavailable')
    predictions = fitted.forecast(max(leads))
    result = {h: float(predictions[h - 1]) * scale for h in leads}
    if any(not math.isfinite(v) for v in result.values()):
        return {}, dict(details, reason='Nonfinite ETS prediction')
    return result, dict(details, converged=True)
