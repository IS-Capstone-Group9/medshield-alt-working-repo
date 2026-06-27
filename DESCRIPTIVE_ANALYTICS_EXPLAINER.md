# MedShield Descriptive Analytics: Business Explainer

This document connects the descriptive analytics code logic directly to the MedShield North Star Diagram nodes. It explains, in plain business terms, how the system answers the primary descriptive questions to support the overall objective of optimizing inventory and reducing losses.

---

## Strategic Objective: The North Star Question
> **How can MedShield optimize its inventory and reduce losses?**
> Before the system can predict future demand (Predictive Path) or recommend inventory decisions (Prescriptive Path), it must first understand historical sales performance. The descriptive analytics path provides this analytical foundation.

---

## 1. The Quality Gatekeeper (Data Preparation)
Before any calculations begin, the system screens the data to ensure accuracy. 
The system filters out:
* Sales records with missing delivery dates
* Transactions marked as rejected
* Transactions that are not marked as accepted clean sales

This prevents duplicate invoices, invalid transactions, and other data quality issues from affecting the analysis.

---

## 2. Mapping the Business (North Star Node 2A)
> **Question 2A**: *How are products, territories, and customers grouped by behavior?*  
> **Method**: *Area and industry rule-based encoding*

The system standardizes raw sales records into meaningful business categories.

### Territory and Customer Grouping
Locations are grouped into three categories:
1. **Physical territories** (such as Batangas and Laguna)
2. **Customer channels** (such as Government and Hospitals)
3. **Internal business lines** (such as Administration and Losses)

This separation allows geographic performance and customer demand to be analyzed independently.

### Product Grouping
Products are checked against the product master list. If a product is not found, the system applies business rules to determine whether it is:
* A medicine or medical supply
* A non-medical operational item

This prevents office supplies and operational purchases from distorting pharmaceutical inventory analysis.

---

## 3. The Seasonal Demand Cycle (North Star Node 3A)
> **Question 3A**: *What seasonal demand cycles exist in the 2021–2025 sales data?*  
> **Method**: *Seasonal Index Calculation*

The system identifies recurring monthly demand patterns caused by seasonal illnesses, weather conditions, or procurement cycles.

### Baseline Calculation
The average monthly sales volume is calculated using five years of historical sales data.

### Seasonality Index
Each month's average sales are compared with the overall monthly average.
* A Seasonality Index of **1.20** indicates demand is typically **20% above average** for that month.
* A Seasonality Index of **0.80** indicates demand is typically **20% below average** for that month.

### Seasonal Strength
The system also measures **Seasonal Strength**, which represents the difference between peak-demand and low-demand periods. Higher values indicate stronger seasonal fluctuations.

---

## 4. Revenue Contribution (North Star Node 4A)
> **Question 4A**: *What are the current revenue contributions across products, territories, and account types?*  
> **Method**: *ABC (80/20) Revenue Sorting & Grouping*

Products are ranked according to their total sales revenue. The system groups products into three revenue tiers:
* **Tier A**: Products generating approximately **80%** of total revenue.
* **Tier B**: Products generating the next **15%** of revenue.
* **Tier C**: Products generating the remaining **5%** of revenue.

This helps prioritize inventory management and purchasing decisions without running predictive classification models at this stage.

---

## 5. Year-over-Year Growth Trends (North Star Node 5A)
> **Question 5A**: *What are the Year-over-Year growth trends across product, territory, and account-type levels?*  
> **Method**: *Time-Series Trend Analysis*

The system compares each month's sales with the same month from the previous year.
* For example: **May 2025** is compared with **May 2024**, and **June 2025** is compared with **June 2024**.

Comparing identical calendar months removes the effects of normal seasonality and reveals true business growth or decline.

---

## 6. Territory Performance (North Star Node 6A)
> **Question 6A**: *Which service territories generate the most revenue and net income?*  
> **Method**: *Geographic Revenue Ranking*

The system removes non-geographic categories such as administrative accounts and internal losses. The remaining geographic territories are ranked according to revenue and gross margin. This identifies the regions that contribute most to sales and profitability.

---

## 7. Customer Concentration (North Star Node 7A)
> **Question 7A**: *Which institutional customers generate the majority of total revenue?*  
> **Method**: *Customer Concentration Ranking*

The system ranks customer segments according to total sales volume. Primary customer groups include:
* **Government**
* **Hospitals**
* **Pharmacies**

This analysis identifies the customer segments that contribute the greatest share of revenue, enabling planners to prioritize procurement, government bidding cycles, and hospital contracts.
