"""Financial definitions shared by historical sales analytics.

Legacy income fields contain workbook gross profit, not company net income.
Rates are fractions; display layers convert them to percentages.
"""
import math


def gross_margin_rate(gross_profit: float, net_sales: float) -> float | None:
    if not math.isfinite(gross_profit) or not math.isfinite(net_sales) or net_sales == 0:
        return None
    return round(gross_profit / net_sales, 6)
