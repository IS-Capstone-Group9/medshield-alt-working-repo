# MedShield North Star Diagram

## Purpose

This document is the text reference for the MedShield North Star Diagram. It defines the primary inventory optimization question and the descriptive, predictive, and prescriptive analytical paths that support it.

## North Star Question

**1. How can MedShield optimize its inventory and reduce losses?**

## Descriptive Path

### 2A. Product, Territory, and Customer Grouping

**Question:** How are products, territories, and customers grouped by behavior?

**Method:** Area + industry rule-based encoding

### 3A. Seasonal Demand Cycles

**Question:** What seasonal demand cycles exist in 2017 onwards sales data?

**Method:** STL decomposition

### 4A. Revenue Contribution

**Question:** What are the current revenue contributions across products, territories, and account types?

**Method:** 80/20 ranking

### 5A. Year-over-Year Growth

**Question:** What are YoY growth trends across entry, territory, and account-type levels?

**Method:** Time-series trend analysis

### 6A. Territory Revenue and Net Income

**Question:** Which service territories generate the most revenue and net income?

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
