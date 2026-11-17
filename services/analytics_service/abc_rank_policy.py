"""Offline ABC rank-policy study helpers (pre-registered 6 Nov 2026).

Inputs for target year Y use only amounts from years < Y. Retrospective
development evidence; no activation, publication or approval follows.
"""
from __future__ import annotations

from decimal import Decimal

import numpy as np

CLASSES = ('A', 'B', 'C')


def abc_labels(amounts: dict, tiebreak=None) -> dict:
    """Crossing-inclusive 80/95 labels; non-positive amounts are 'Unclassified'."""
    total = sum((Decimal(v) for v in amounts.values()), Decimal(0))
    before = Decimal(0)
    out = {}
    for key in sorted(amounts, key=lambda k: (-Decimal(amounts[k]), k if tiebreak is None else tiebreak[k])):
        amount = Decimal(amounts[key])
        out[key] = ('Unclassified' if amount <= 0 or total <= 0 else
                    'A' if before < total * Decimal('.8') else
                    'B' if before < total * Decimal('.95') else 'C')
        before += amount
    return out


def predicted_labels(scores: dict) -> dict:
    """Apply the same rule to predicted scores; zero-score keys are predicted C."""
    positive = {k: v for k, v in scores.items() if Decimal(v) > 0}
    labels = abc_labels(positive)
    return {k: labels.get(k, 'C') for k in scores}


def score(policy: str, annual: dict, year: int) -> dict:
    """annual[year][key] = Decimal positive contribution. Uses only years < `year`."""
    keys = set()
    for y in range(year - 3, year):
        keys |= set(annual.get(y, {}))
    get = lambda y, k: Decimal(annual.get(y, {}).get(k, 0))
    if policy == 'R1':
        return {k: (get(year - 1, k) + get(year - 2, k)) / 2 for k in keys}
    if policy == 'R2':
        return {k: (get(year - 1, k) + get(year - 2, k) + get(year - 3, k)) / 3 for k in keys}
    if policy == 'R3':
        return {k: get(year - 1, k) * Decimal('.5') + get(year - 2, k) * Decimal('.25') + get(year - 3, k) * Decimal('.125') for k in keys}
    raise KeyError(policy)


def predict(policy: str, annual: dict, year: int, population) -> dict:
    prior = abc_labels(annual.get(year - 1, {}))
    if policy == 'B0':
        return {k: prior.get(k, 'C') if prior.get(k) in CLASSES else 'C' for k in population}
    labels = predicted_labels(score(policy, annual, year))
    return {k: labels.get(k, 'C') for k in population}


def macro_f1(actual, predicted) -> float:
    f1 = []
    for c in CLASSES:
        tp = sum(a == c and p == c for a, p in zip(actual, predicted))
        fp = sum(a != c and p == c for a, p in zip(actual, predicted))
        fn = sum(a == c and p != c for a, p in zip(actual, predicted))
        f1.append(0.0 if tp == 0 else 2 * tp / (2 * tp + fp + fn))
    return float(np.mean(f1))


def a_recall(actual, predicted):
    n = sum(a == 'A' for a in actual)
    return None if n == 0 else sum(a == 'A' and p == 'A' for a, p in zip(actual, predicted)) / n


def accuracy(actual, predicted) -> float:
    return sum(a == p for a, p in zip(actual, predicted)) / len(actual)


def cluster_bootstrap_f1_diff(rows, cand, base, draws=4000, seed=20261106):
    """rows: list of (key, actual, {policy: predicted}); resample keys with all their years."""
    by = {}
    for key, actual, preds in rows:
        by.setdefault(key, []).append((actual, preds[cand], preds[base]))
    keys = list(by)
    rng = np.random.default_rng(seed)
    out = np.empty(draws)
    for d in range(draws):
        picks = rng.integers(0, len(keys), size=len(keys))
        a, c, b = [], [], []
        for i in picks:
            for x, y, z in by[keys[i]]:
                a.append(x); c.append(y); b.append(z)
        out[d] = macro_f1(a, c) - macro_f1(a, b)
    lo, hi = np.percentile(out, [2.5, 97.5])
    return float(lo), float(hi)
