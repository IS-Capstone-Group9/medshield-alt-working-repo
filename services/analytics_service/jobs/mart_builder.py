"""Mart Builder for canonical demand and external-signal features."""

from __future__ import annotations

import pandas as pd

from services.analytics_service.jobs.data_contracts import SalesDataContract


def build_monthly_demand_mart(sales: list[SalesDataContract]) -> pd.DataFrame:
    """Constructs canonical monthly demand marts.
    
    Aggregates by:
      - overall month
      - territory month
      - product month
      - product-territory month
    """
    if not sales:
        return pd.DataFrame()

    data = []
    for s in sales:
        data.append({
            "period": s.date_delivered.replace(day=1),
            "area": s.area,
            "product": s.product,
            "quantity": s.quantity,
            "revenue": s.net_cost,
        })
    df = pd.DataFrame(data)
    
    overall = df.groupby(["period"])[["quantity", "revenue"]].sum().reset_index()
    overall["grain"] = "overall"
    overall["area"] = "ALL"
    overall["product"] = "ALL"
    
    territory = df.groupby(["period", "area"])[["quantity", "revenue"]].sum().reset_index()
    territory["grain"] = "territory"
    territory["product"] = "ALL"
    
    product = df.groupby(["period", "product"])[["quantity", "revenue"]].sum().reset_index()
    product["grain"] = "product"
    product["area"] = "ALL"
    
    tp = df.groupby(["period", "area", "product"])[["quantity", "revenue"]].sum().reset_index()
    tp["grain"] = "territory_product"
    
    combined = pd.concat([overall, territory, product, tp], ignore_index=True)
    return combined
