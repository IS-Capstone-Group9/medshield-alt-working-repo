# MedShield North Star Diagram

## Purpose

This document is the text reference for the MedShield North Star Diagram. It defines the primary inventory optimization question and the descriptive, predictive, and prescriptive analytical paths that support it. The approved internal-sales scope is 2017 onward. External DOH, PAGASA, and provider-derived weather signals retain their own documented coverage periods.

The 2017-2019 records remain in scope, but Net CP revenue and revenue-derived KPIs for those years must remain unavailable until the historical financial mapping is reconciled. Available quantity and data-quality evidence may still be reported with explicit coverage labels.

## North Star Question

**1. How can MedShield optimize its inventory and reduce losses?**

**Capstone objective:** Develop an integrated descriptive, predictive, and prescriptive DSS by December 2026 to improve demand visibility and reduce expiry-driven wastage for December 2026 and future planning cycles.

## Objective Alignment

| Objective | North Star path | Primary completion measures |
|---|---|---|
| Analyze validated sales from 2017 onward | Descriptive | Quantity, Net CP revenue where available, workbook gross profit, monthly trend, STL seasonality, year-over-year movement, territory completeness |
| Prioritize products, areas, and accounts | Descriptive and predictive | Pareto contribution, actual ABC class, demand growth, territory and buyer-cluster share, mapping coverage, provisional XGBoost performance for eligible low-history products |
| Forecast territory demand from December 2026 onward | Predictive | MAE, RMSE, MAPE or WAPE, bias, improvement over a simple baseline, 3/6/12-month coverage |
| Improve inventory planning and reduce expiry-driven wastage | Prescriptive | Wastage rate at or below 5%, fulfillment, unmet demand, inventory turnover, stockout rate, cost deviation, allocation feasibility |
| Deliver governed DSS modules | All paths | Five-module availability, ingestion quality, freshness, publication status, alert validation, recommendation acknowledgement, outcome capture |

## Descriptive Path

### 2A. Product, Territory, and Customer Grouping

**Question:** How are products, territories, and customers grouped by behavior?

**Method:** Area + industry rule-based encoding

### 3A. Seasonal Demand Cycles

**Question:** What seasonal demand cycles exist in validated sales data from 2017 onward?

**Method:** STL decomposition

### 4A. Revenue Contribution

**Question:** What are the current revenue contributions across products, territories, and account types?

**Method:** 80/20 ranking

### 5A. Year-over-Year Growth

**Question:** What are YoY growth trends across entry, territory, and account-type levels?

**Method:** Time-series trend analysis

### 6A. Territory Revenue and Workbook Gross Profit

**Question:** Which service territories generate the most revenue and workbook gross profit?

**Method:** Geographic revenue ranking

### 7A. High-Value Institutional Clients

**Question:** Who are the high-value institutional clients driving 80% of total revenue?

**Method:** Customer concentration ranking

## Predictive Path

### 2B. Monthly Product Demand

**Question:** How much of each product will MedShield need per month across all territories?

**Method:** Prophet baseline forecast

### 3B. Forecast Accuracy

**Question:** How accurate is the Prophet model versus prior months?

**Methods and metrics:**

- Naive seasonal benchmark
- MAPE
- RMSE
- MAE

### 4B. Disease-Driven Demand

**Question:** By how much does Dengue, ILI, or Leptospirosis increase demand?

**Methods:**

- Prophet + DOH
- DLI regressor

### 5B. Rainfall-Driven Demand

**Question:** How does above-normal rainfall affect product demand per region?

**Methods:**

- Prophet + PAGASA
- RSI regressor

### 6B. Forecasting Urgency

**Question:** Which products require the most urgent forecasting attention?

**Method:** XGBoost demand urgency scoring

### 7B. Future SKU Classification

**Question:** What ABC class will each SKU belong to in the next period?

**Method:** XGBoost ABC classification

## Prescriptive Path

### 2C. Cost-Minimizing Reorder Quantity

**Question:** How much of each product should be reordered to minimize cost?

**Methods:**

- Economic Order Quantity (EOQ)
- Linear programming

### 3C. Reorder Trigger

**Question:** At what stock level should a reorder be triggered per SKU?

**Method:** ROP + safety stock

### 4C. Disease Emergency Alert

**Question:** When should the system raise an emergency alert based on disease cases?

**Method:** Rule-based threshold where cases > mu + 2 sigma

### 5C. Typhoon Emergency Stock Response

**Question:** What should the emergency stock response be when a typhoon warning is issued?

**Method:** Scenario-based decision tree

### 6C. Constrained Procurement Priority

**Question:** Which regions should receive priority procurement when supply is constrained?

**Methods:**

- Linear programming
- MCDA composite scoring

### 7C. Product-Region Expansion

**Question:** Which product-region pairings should be expanded based on demand similarity?

**Method:** Collaborative filtering using cosine similarity

### 8C. Stop-Purchasing Flag

**Question:** Which SKUs should be flagged for stop purchasing due to low or zero movement?

**Method:** Dead-stock flagging from XGBoost ABC classification

## Source

Transcribed from the two supplied image slices of the MedShield North Star Diagram.
