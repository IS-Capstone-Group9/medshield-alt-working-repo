"""Offline M6 ABC cold-start hybrid evaluator (persistence + category-prior rule).

Uses prior_abc for established labels and category-level priors for cold-start cohorts.
Retrospective development/evaluation helper; grants no model approval or publication.
"""
from __future__ import annotations

from collections import Counter, defaultdict
import numpy as np

from . import abc_evaluation, abc_protocol

CLASSES = abc_protocol.CLASSES  # ('A', 'B', 'C')
COLD_START_COHORTS = ('no_prior_observation', 'prior_ineligible_only')


def fit_category_priors(training_rows: list[dict], default_class: str = 'C') -> tuple[dict[str, str], str]:
    """Fit modal ABC class per product_category and overall majority class from training rows only."""
    if default_class not in CLASSES:
        raise ValueError('Invalid default ABC class')
    if not training_rows:
        return {}, default_class
    overall_counts = Counter(r['target_abc'] for r in training_rows)
    for cls in overall_counts:
        if cls not in CLASSES:
            raise ValueError(f'Unsupported target ABC class: {cls}')
    majority = max(CLASSES, key=lambda c: (overall_counts[c], -CLASSES.index(c)))
    by_cat: dict[str, Counter] = defaultdict(Counter)
    for row in training_rows:
        cat = str(row.get('product_category') or 'unclassified').strip().lower()
        by_cat[cat][row['target_abc']] += 1
    priors = {
        cat: max(CLASSES, key=lambda c: (counts[c], -CLASSES.index(c)))
        for cat, counts in by_cat.items()
    }
    return priors, majority


def predict_abc_hybrid(
    rows: list[dict],
    category_priors: dict[str, str],
    majority_class: str = 'C',
) -> list[str]:
    """Predict ABC class: prior_abc for established labels, category prior for cold-start items."""
    if majority_class not in CLASSES:
        raise ValueError('Invalid majority_class')
    preds: list[str] = []
    for row in rows:
        cohort = row.get('cohort')
        prior_abc = row.get('prior_abc')
        if cohort not in COLD_START_COHORTS and prior_abc in CLASSES:
            preds.append(prior_abc)
        else:
            cat = str(row.get('product_category') or 'unclassified').strip().lower()
            preds.append(category_priors.get(cat, majority_class))
    return preds


def cluster_bootstrap_f1_diff(
    rows: list[dict],
    cand_preds: list[str],
    ref_preds: list[str],
    *,
    draws: int = 1000,
    seed: int = 20261117,
) -> tuple[float, float] | None:
    """Cluster-bootstrap 95% CI for macro_f1(cand) - macro_f1(ref) grouped by product_family/key."""
    if len(rows) != len(cand_preds) or len(rows) != len(ref_preds):
        raise ValueError('Mismatched row/prediction lengths')
    clusters: dict[str, list[int]] = defaultdict(list)
    for i, r in enumerate(rows):
        key = str(r.get('product_family') or r.get('product_key') or i)
        clusters[key].append(i)
    keys = sorted(clusters)
    if len(keys) < 2 or draws < 1:
        return None
    rng = np.random.default_rng(seed)
    diffs: list[float] = []
    for _ in range(draws):
        sampled = rng.integers(0, len(keys), size=len(keys))
        idxs = [i for k_idx in sampled for i in clusters[keys[k_idx]]]
        actual_s = [rows[i]['target_abc'] for i in idxs]
        c_m = abc_evaluation.metrics(actual_s, [cand_preds[i] for i in idxs])
        r_m = abc_evaluation.metrics(actual_s, [ref_preds[i] for i in idxs])
        if c_m['macro_f1'] is None or r_m['macro_f1'] is None:
            return None
        diffs.append(float(c_m['macro_f1'] - r_m['macro_f1']))
    lo, hi = np.percentile(diffs, [2.5, 97.5])
    return float(lo), float(hi)


def evaluate_abc_hybrid(
    rows: list[dict],
    category_priors: dict[str, str],
    majority_class: str = 'C',
    *,
    draws: int = 1000,
    seed: int = 20261117,
) -> dict:
    """Evaluate cold-start hybrid against majority and prior_abc references."""
    if not rows:
        raise ValueError('Non-empty evaluation rows required')
    actual = [r['target_abc'] for r in rows]
    maj_preds = [majority_class] * len(rows)
    prior_preds = [r['prior_abc'] if r.get('prior_abc') in CLASSES else majority_class for r in rows]
    hyb_preds = predict_abc_hybrid(rows, category_priors, majority_class)
    return {
        'samples': len(rows),
        'majority': abc_evaluation.metrics(actual, maj_preds),
        'prior_abc': abc_evaluation.metrics(actual, prior_preds),
        'cold_start_hybrid': abc_evaluation.metrics(actual, hyb_preds),
        'macro_f1_diff_vs_prior_ci95': cluster_bootstrap_f1_diff(
            rows, hyb_preds, prior_preds, draws=draws, seed=seed
        ),
        'macro_f1_diff_vs_majority_ci95': cluster_bootstrap_f1_diff(
            rows, hyb_preds, maj_preds, draws=draws, seed=seed
        ),
        'publication_approved': False,
    }
