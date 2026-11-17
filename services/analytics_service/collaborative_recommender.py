"""Offline candidate account-product recommendations with temporal evaluation.

No runtime serving, account inference, clinical suitability or procurement
approval is supplied here. Callers provide reviewed D2 accounts and D3 Medical
eligibility. Area/channel fallbacks must be evaluated in a separate run/cohort.
"""
from __future__ import annotations

from collections import defaultdict
import math
import numpy as np

from services.analytics_service.account_priority import period_index


MODELS = ("global_popularity", "territory_popularity", "item_knn_cosine", "implicit_als")


def _eligible(row: dict) -> bool:
    return (row.get("category") == "Medical" and
            row.get("buyer_sector") not in {"Internal", "INTERNAL"} and
            row.get("area", "").upper() not in {"INTERNAL", "SUPPLIES", "ADMIN"} and
            row.get("match_confidence") in {"exact_reference_match", "reviewed_alias_match"} and
            bool(row.get("derived_account_key")) and bool(row.get("product")))


class CollaborativeRecommender:
    def __init__(self, *, factors: int = 8, iterations: int = 15,
                 regularization: float = .1, alpha: float = 1.,
                 neighbors: int = 10, shrinkage: float = 10., seed: int = 20261030):
        if (factors not in {8, 16} or neighbors not in {10, 20} or
                iterations < 1 or regularization <= 0 or alpha < 0 or shrinkage < 0):
            raise ValueError("Invalid frozen recommender configuration")
        self.factors, self.iterations = factors, iterations
        self.regularization, self.alpha = regularization, alpha
        self.neighbors, self.shrinkage, self.seed = neighbors, shrinkage, seed

    def fit(self, records: list[dict], *, origin_period: str,
            dataset_id: str, policy_version: str):
        origin = period_index(origin_period)
        if not dataset_id or not policy_version:
            raise ValueError("Source dataset and policy identity required")
        self.origin_period, self.dataset_id, self.policy_version = origin_period, dataset_id, policy_version
        training = []
        for row in records:
            # Future rows are excluded before category, identity or value inspection.
            if period_index(row["period"]) > origin:
                continue
            if not _eligible(row):
                continue
            value = float(row["net_sales"])
            if not math.isfinite(value):
                raise ValueError("Invalid training revenue")
            if value > 0:
                training.append(row)
        last = defaultdict(lambda: -1)
        for row in training:
            last[row["product"]] = max(last[row["product"]], period_index(row["period"]))
        self.products = sorted(p for p, month in last.items() if origin - month <= 12)
        self.product_index = {p: i for i, p in enumerate(self.products)}
        training = [r for r in training if r["product"] in self.product_index]
        self.seen = defaultdict(set)
        groups = defaultdict(set)
        orders, revenue = defaultdict(set), defaultdict(float)
        self.territory_scores = defaultdict(lambda: np.zeros(len(self.products)))
        popularity_orders = defaultdict(set)
        for row in training:
            user, product = row["derived_account_key"], row["product"]
            # Missing order identity cannot turn every line into an order.
            order = row.get("order_id")
            if not order:
                raise ValueError("Training interactions require a delivery/order reference")
            self.seen[user].add(product)
            groups[user].add(row.get("territory") or "Unallocated")
            orders[user, product].add(str(order))
            revenue[user, product] += float(row["net_sales"])
            popularity_orders[product].add((user, str(order)))
        self.user_territory = {u: next(iter(g)) if len(g) == 1 else "Unallocated"
                               for u, g in groups.items()}
        self.users = sorted(u for u in self.seen if len(self.seen[u]) >= 2)
        self.user_index = {u: i for i, u in enumerate(self.users)}
        self.popularity = np.array([len(popularity_orders[p]) for p in self.products], dtype=float)
        for (user, product), refs in orders.items():
            self.territory_scores[self.user_territory[user]][self.product_index[product]] += len(refs)
        matrix = np.zeros((len(self.users), len(self.products)))
        confidence = np.ones_like(matrix)
        for (user, product), refs in orders.items():
            if user not in self.user_index:
                continue
            i, j = self.user_index[user], self.product_index[product]
            matrix[i, j] = 1
            confidence[i, j] = 1 + self.alpha * np.log1p(len(refs) * np.log1p(revenue[user, product]))
        # TF-IDF item cosine, shrunk by co-purchasing-account count.
        frequency = matrix.sum(axis=0)
        weighted = matrix * (np.log((1 + len(self.users)) / (1 + frequency)) + 1)
        row_norm = np.linalg.norm(weighted, axis=1, keepdims=True)
        weighted = np.divide(weighted, row_norm, out=np.zeros_like(weighted), where=row_norm > 0)
        norm = np.linalg.norm(weighted, axis=0)
        divisor = np.outer(norm, norm)
        self.similarity = np.divide(weighted.T @ weighted, divisor,
                                    out=np.zeros_like(divisor), where=divisor > 0)
        common = matrix.T @ matrix
        self.co_purchase_counts = common
        self.similarity *= np.divide(common, common + self.shrinkage,
                                     out=np.zeros_like(common), where=(common + self.shrinkage) > 0)
        np.fill_diagonal(self.similarity, 0)
        for j in range(len(self.products)):
            keep = np.argsort(-self.similarity[j], kind="stable")[:self.neighbors]
            mask = np.ones(len(self.products), dtype=bool)
            mask[keep] = False
            self.similarity[j, mask] = 0
        self.preference = matrix
        rng = np.random.default_rng(self.seed)
        self.user_factors = rng.normal(0, .01, (len(self.users), self.factors))
        self.item_factors = rng.normal(0, .01, (len(self.products), self.factors))
        if self.users and self.products:
            identity = np.eye(self.factors) * self.regularization
            for _ in range(self.iterations):
                for i in range(len(self.users)):
                    y = self.item_factors
                    self.user_factors[i] = np.linalg.solve(
                        y.T @ (confidence[i, :, None] * y) + identity,
                        y.T @ (confidence[i] * matrix[i]))
                for j in range(len(self.products)):
                    x = self.user_factors
                    self.item_factors[j] = np.linalg.solve(
                        x.T @ (confidence[:, j, None] * x) + identity,
                        x.T @ (confidence[:, j] * matrix[:, j]))
        return self

    def recommend(self, account: str, *, model: str = "item_knn_cosine", k: int = 10,
                  territory: str | None = None) -> list[dict]:
        if model not in MODELS or isinstance(k, bool) or k < 1:
            raise ValueError("Invalid recommendation request")
        selected = model
        territory = territory or self.user_territory.get(account, "Unallocated")
        if account not in self.user_index and model in {"implicit_als", "item_knn_cosine"}:
            selected = "territory_popularity"
        if selected == "territory_popularity" and territory not in self.territory_scores:
            selected = "global_popularity"
        if selected == "global_popularity":
            scores = self.popularity
        elif selected == "territory_popularity":
            scores = self.territory_scores.get(territory, self.popularity)
        elif selected == "item_knn_cosine":
            scores = self.preference[self.user_index[account]] @ self.similarity
        else:
            scores = self.item_factors @ self.user_factors[self.user_index[account]]
        candidates = [p for p in self.products if p not in self.seen.get(account, set())]
        ranked = sorted(candidates, key=lambda p: (-float(scores[self.product_index[p]]), p))[:k]
        recommendations = [{"product": p, "score": float(scores[self.product_index[p]]),
                 "model": selected, "requested_model": model,
                 "derived_account_key": account, "evidence_label": "Derived",
                 "dataset_id": self.dataset_id, "policy_version": self.policy_version,
                 "origin_period": self.origin_period, "assumption_ids": ["D2", "D3", "D4"],
                 "operational_approval": False} for p in ranked]
        for row in recommendations:
            j = self.product_index[row["product"]]
            neighbors = [{"product": prior,
                          "co_purchasing_account_count": int(self.co_purchase_counts[self.product_index[prior], j]),
                          "cosine_similarity": float(self.similarity[self.product_index[prior], j])}
                         for prior in sorted(self.seen.get(account, set()))
                         if self.co_purchase_counts[self.product_index[prior], j] > 0]
            row["historical_neighbor_context"] = sorted(
                neighbors, key=lambda n: (-n["co_purchasing_account_count"], n["product"]))[:5]
            # Co-purchases are transparent context, not an ALS causal explanation.
            row["neighbor_context_is_model_explanation"] = selected == "item_knn_cosine"
        return recommendations


def ranking_metrics(recommended: list[str], relevant: set[str], *, k: int = 10) -> dict:
    if k < 1 or len(set(recommended)) != len(recommended):
        raise ValueError("Ranking must contain unique products and positive K")
    hits = [int(p in relevant) for p in recommended[:k]]
    count = sum(hits)
    dcg = sum(hit / math.log2(i + 2) for i, hit in enumerate(hits))
    ideal = sum(1 / math.log2(i + 2) for i in range(min(len(relevant), k)))
    return {"precision_at_k": count / k,
            "recall_at_k": count / len(relevant) if relevant else None,
            "ndcg_at_k": dcg / ideal if ideal else None,
            "hit_rate_at_k": float(count > 0)}


def evaluate_temporal_holdout(fitted: CollaborativeRecommender, records: list[dict], *,
                              end_period: str, k: int = 10,
                              bootstrap_runs: int = 1000, seed: int = 20261030) -> dict:
    """Six-month untouched holdout. Do not tune configuration on this output.

    Denominators include held-out unseen products outside training catalog,
    preventing artificially optimistic recall through unknown-item exclusion.
    Accounts without unseen adoptions are separately counted, not assigned recall.
    """
    start, end = period_index(fitted.origin_period), period_index(end_period)
    if end - start != 6 or bootstrap_runs < 1:
        raise ValueError("Expected six-month holdout and positive bootstrap count")
    relevant, active = defaultdict(set), set()
    for row in records:
        month = period_index(row["period"])
        if not start < month <= end or not _eligible(row):
            continue
        value = float(row["net_sales"])
        if not math.isfinite(value):
            raise ValueError("Invalid holdout revenue")
        if value <= 0:
            continue
        account = row["derived_account_key"]
        active.add(account)
        if row["product"] not in fitted.seen.get(account, set()):
            relevant[account].add(row["product"])
    users = sorted(relevant)
    leaderboard = []
    cohort_leaderboards = []
    for model in MODELS:
        scores, recommended_catalog = [], set()
        cohorts = defaultdict(list)
        for account in users:
            ranking = [r["product"] for r in fitted.recommend(account, model=model, k=k)]
            recommended_catalog.update(ranking)
            metrics = ranking_metrics(ranking, relevant[account], k=k)
            scores.append(metrics)
            cohort = ('established_training_account' if account in fitted.user_index
                      else 'low_history_training_account' if account in fitted.seen
                      else 'cold_account_no_origin_metadata')
            cohorts[cohort].append(metrics)
        summary = {"model": model, "evaluated_accounts": len(users), "k": k,
                   "catalog_coverage_pct": 100 * len(recommended_catalog) / len(fitted.products)
                   if fitted.products else None}
        rng = np.random.default_rng(seed)
        for metric in ("precision_at_k", "recall_at_k", "ndcg_at_k", "hit_rate_at_k"):
            values = np.array([s[metric] for s in scores], dtype=float)
            summary[metric] = float(values.mean()) if len(values) else None
            boot = [float(values[rng.integers(0, len(values), len(values))].mean())
                    for _ in range(bootstrap_runs)] if len(values) else []
            summary[metric + "_bootstrap_95_ci"] = np.quantile(boot, [.025, .975]).tolist() if boot else None
        leaderboard.append(summary)
        for cohort in ('established_training_account', 'low_history_training_account',
                       'cold_account_no_origin_metadata'):
            subset = cohorts[cohort]
            cohort_leaderboards.append({'model': model, 'cohort': cohort,
                'evaluated_accounts': len(subset), **{metric: sum(row[metric] for row in subset) / len(subset)
                if subset else None for metric in ('precision_at_k', 'recall_at_k', 'ndcg_at_k', 'hit_rate_at_k')}})
    return {"leaderboard": leaderboard, "active_accounts": len(active),
            "cohort_leaderboards": cohort_leaderboards,
            "accounts_without_unseen_adoption": len(active - set(relevant)),
            "out_of_catalog_adoptions": sum(len(items - set(fitted.products)) for items in relevant.values()),
            "origin_period": fitted.origin_period, "end_period": end_period,
            "evidence_label": "Derived", "dataset_id": fitted.dataset_id,
            "policy_version": fitted.policy_version, "assumption_ids": ["D2", "D3", "D4"],
            "operational_approval": False}


def main():
    """Explicit offline run; JSON assessed records only, with no default source."""
    import argparse
    import hashlib
    import json
    from pathlib import Path

    parser = argparse.ArgumentParser(description=main.__doc__)
    parser.add_argument("--records", type=Path, required=True)
    parser.add_argument("--origin-period", required=True)
    parser.add_argument("--end-period", required=True)
    parser.add_argument("--dataset-id", required=True)
    parser.add_argument("--policy-version", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    records = json.loads(args.records.read_text(encoding="utf-8"))
    model = CollaborativeRecommender().fit(records, origin_period=args.origin_period,
        dataset_id=args.dataset_id, policy_version=args.policy_version)
    result = evaluate_temporal_holdout(model, records, end_period=args.end_period)
    result["input_sha256"] = hashlib.sha256(args.records.read_bytes()).hexdigest()
    result["sample_selection"] = "First ten sorted training account keys; illustrative, not representative"
    result["sample_recommendations"] = [row for user in model.users[:10]
        for row in model.recommend(user, model="item_knn_cosine", k=5)]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2, allow_nan=False)
        handle.write("\n")


if __name__ == "__main__":
    main()
