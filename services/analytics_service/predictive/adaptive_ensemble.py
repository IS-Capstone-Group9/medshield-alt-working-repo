"""Origin-local adaptation to completed forecast errors; research recipes only."""
import math
import statistics

VERSION = 'origin_local_absolute_loss_v1'
EXPERTS = ('last_value', 'seasonal_naive', 'mean_3', 'mean_6', 'mean_12', 'median_6')
CONFIGS = [dict(model_id=f'l1_blend_w{w}_p{p}', method='blend', window=w, penalty=p)
           for w in (12, 24) for p in (0., .05, .2)] + [
    dict(model_id=f'{method}_w{w}', method=method, window=w, penalty=0.)
    for method in ('switch', 'bias') for w in (12, 24)]


def expert(training, origin, lead, name):
    if name == 'last_value':
        return training[origin]
    if name == 'seasonal_naive':
        target = origin + lead
        while target > origin:
            target -= 12
        return training[target]
    width = int(name.split('_')[-1])
    values = [training[p] for p in range(origin - width + 1, origin + 1)]
    return statistics.median(values) if name.startswith('median') else math.fsum(values) / width


def predict(series, origin, lead, config):
    if (isinstance(origin, bool) or not isinstance(origin, int) or isinstance(lead, bool)
            or not isinstance(lead, int) or not 1 <= lead <= 12 or config not in CONFIGS):
        raise ValueError('Registered configuration and integer origin/lead1–12 required')
    if any(isinstance(p, bool) or not isinstance(p, int) for p in series):
        raise ValueError('Integer calendar keys required')
    known = {p: v for p, v in series.items() if p <= origin}
    if not known or origin not in known:
        raise ValueError('Missing origin')
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v)
           for v in known.values()):
        raise ValueError('Finite observed values required')
    start = min(known)
    if sorted(known) != list(range(start, origin + 1)) or len(known) < 36:
        raise ValueError('Requires36 contiguous observed months;missing is not zero')
    inner = list(range(max(start + 11, origin - lead - config['window'] + 1), origin - lead + 1))
    if len(inner) < 8:
        raise ValueError('Insufficient completed inner forecast cases')
    matrix = [[expert(known, p, lead, name) for name in EXPERTS] for p in inner]
    actual = [known[p + lead] for p in inner]
    current = [expert(known, origin, lead, name) for name in EXPERTS]
    losses = [math.fsum(abs(row[i] - y) for row, y in zip(matrix, actual)) / len(inner)
              for i in range(len(EXPERTS))]
    trace = dict(method_version=VERSION, inner_origins=inner,
                 inner_target_end=max(inner) + lead, samples=len(inner), experts=list(EXPERTS),
                 mean_absolute_errors=losses, current_predictions=current)
    if config['method'] == 'switch':
        i = min(range(len(EXPERTS)), key=lambda i: (losses[i], i))
        prediction = current[i]
        trace.update(selected_expert=EXPERTS[i])
    elif config['method'] == 'bias':
        i = EXPERTS.index('mean_6')
        residual = statistics.median(y - row[i] for row, y in zip(matrix, actual))
        cap = .5 * math.fsum(abs(known[p]) for p in range(origin - 5, origin + 1)) / 6
        correction = max(-cap, min(cap, residual))
        prediction = current[i] + correction
        trace.update(correction=correction, unbounded_correction=residual, cap=cap)
    else:
        import numpy as np
        from scipy.optimize import linprog
        n, k = len(inner), len(EXPERTS)
        scale = max(max(map(abs, actual)), max(abs(v) for row in matrix for v in row)) or 1.
        x, y = np.asarray(matrix) / scale, np.asarray(actual) / scale
        anchor = np.zeros(k)
        anchor[EXPERTS.index('mean_6')] = 1.
        # w>=0,sum(w)=1;u bounds absolute forecast errors;d bounds distance from anchor.
        a = np.vstack([np.c_[x, -np.eye(n), np.zeros((n, k))],
                       np.c_[-x, -np.eye(n), np.zeros((n, k))],
                       np.c_[np.eye(k), np.zeros((k, n)), -np.eye(k)],
                       np.c_[-np.eye(k), np.zeros((k, n)), -np.eye(k)]])
        fit = linprog(np.r_[np.zeros(k), np.ones(n) / n, np.full(k, config['penalty'])],
                      A_ub=a, b_ub=np.r_[y, -y, anchor, -anchor],
                      A_eq=np.r_[np.ones(k), np.zeros(n + k)][None, :], b_eq=[1.],
                      bounds=[(0, None)] * (2 * k + n), method='highs')
        if not fit.success:
            raise ValueError('Absolute-loss ensemble optimizer failed')
        weights = fit.x[:k]
        if not np.isfinite(weights).all() or min(weights) < -1e-8 or abs(sum(weights) - 1) > 1e-8:
            raise ValueError('Invalid ensemble weights')
        prediction = float(np.asarray(current) @ weights)
        trace.update(weights=weights.tolist(), scale=scale, objective=float(fit.fun))
    if not math.isfinite(prediction):
        raise ValueError('Nonfinite forecast')
    return prediction, trace
