# MedShield Descriptive Analytics: Technical Logic & Process

### 1. Ingestion & Quality Gatekeeper (Data Validation & Isolation)
* **Goal**: Validate data integrity and filter out unreliable records before any mathematical calculations begin.
* **The Process**:
  1. The system reads all raw sales rows from the uploaded yearly source files, starting from the baseline year of 2017 (the earliest boundary for digitized company records).
  2. It attempts to parse the delivery date field. If the date is blank or unparseable, the row is discarded.
  3. It checks the quality status column. If the status is marked as rejected, the row is discarded.
  4. It checks the sales acceptance status column. If it is not marked as accepted clean sales, the row is discarded.
* **Sparsity & Anomaly Handling**:
  * **Daily Sparsity**: If a calendar day contains no sales, it is not written as a zero-demand row; the system simply moves to the next active transaction date.
  * **Gross Margin Anomalies**: If a row has a negative gross margin or if its margin exceeds its revenue (total trade price), the system flags the row as a margin anomaly. It isolates the anomalous records from overall margin calculations to prevent the company-wide margin rate from exceeding 100 percent.

---

### 2. Business Taxonomy Mapping (Rule-Based Encoding) [North Star 2A: Product, Territory, and Customer Grouping]
* **Goal**: Standardize raw transaction fields into geographic territories, customer channels, and product categories.
* **The Process**:
  * **Location Grouping**: The system looks up each location name in the area classification directory:
    * **Physical Territories**: Provincial regions (such as Batangas, Laguna, Quezon).
    * **Customer Channels**: Institutional groups (such as Government, Hospitals, Pharmacies).
    * **Internal Business Lines**: Non-sales cost centers (such as Administration, Losses).
  * **Product Grouping**: The system looks up the product SKU in the master mapping file. If it is missing:
    * It scans the product name for office supply terms (such as pen, paper, folder, tape).
    * If an office supply term matches, it checks against a medical word whitelist (such as bandage, syringe, penicillin).
    * If no whitelist words are found, the product is categorized as a Non-Medical Operational Item; otherwise, it defaults to a Medicine or Medical Supply.
    * **Service Contracts**: If a product name contains a `#` (e.g., `PAGBILAO # 13,500,000`), it is classified as a bulk service contract (`is_service_contract = true`) rather than a direct medicine or supply.
* **Downstream Model Impact**: Segregates office overhead and internal losses so they do not distort downstream forecasting and prioritization models.

---

### 3. Bulk Service Contract Breakdown (Backward Approximation) [North Star 2A: Product, Territory, and Customer Grouping - Service Contracts]
* **Goal**: Convert bulk area-summary service contracts into detailed product-mix estimates without inflating historical revenue totals.
* **The Process**:
  1. The system identifies parent contract rows using the `is_service_contract` flag (e.g., rows containing `#` like `PAGBILAO # 13,500,000`).
  2. Because these rows represent bulk packages of unknown medicines or supplies, they cannot be modeled as individual SKUs. 
  3. The system scans the previous three years of transactions for the same area and channel to build a historical product-mix profile.
  4. It allocates the bulk contract's total quantity and revenue into five estimated child product rows (e.g., specific medicines and supplies) based on those historical weights.
  5. The child rows are flagged as `estimated_backward_allocation` so they contribute to accurate product-mix analytics but remain clearly marked as estimates.
* **Downstream Model Impact**: Allows product-level exploratory analysis and descriptive statistics to include revenue from bulk service contracts, while keeping the data limitations visible.

---

### 4. The Seasonal Demand Cycle [North Star 3A: Seasonal Demand Cycles]
* **Goal**: Calculate historical monthly demand index multipliers to identify recurring seasonal fluctuations.
* **Variables**:
  * Let Q be the sales quantity of a transaction.
  * Let N be the total number of months in the training period (2017 to 2025).
  * Let B be the overall monthly average baseline sales volume.
  * Let M be the average sales volume for a specific calendar month (e.g., all Januaries in history).
  * Let SI be the Seasonality Index of a specific month.
  * Let SS be the Seasonal Strength (overall seasonal volatility).
* **The Process & Formulas**:
  1. The system aggregates daily transaction quantities into monthly sums across the historical training period (2017 to 2025).
  2. Baseline (B) calculation:
     
     B = Sum of Q / N
     
  3. Monthly Average (M) calculation:
     
     M = Average of Q for a specific calendar month
     
  4. Seasonality Index (SI) calculation:
     
     SI = M / B
     
     * *Note*: The monthly indexes serve as descriptive validation points. Facebook Prophet decomposes time-series seasonality internally using Fourier series during the predictive phase.
  5. Seasonal Strength (SS) calculation:
     
     SS = (Max SI - Min SI) / Max SI

---

### 5. Revenue Contribution (80/20 Analysis) [North Star 4A: Revenue Contribution]
* **Goal**: Analyze the distribution of sales across established products to identify revenue concentration patterns.
* **Variables**:
  * Let R be the product revenue (total trade price).
  * Let R_total be the sum of all product revenues in the subset.
  * Let R_running be the running sum of revenue from the top-ranked product down to product i.
  * Let CS be the Cumulative Share for product i.
* **The Process & Formulas**:
  1. The system isolates the products tagged as Medicine or Medical Supply.
  2. It calculates the total revenue (R) for each product and sorts the list in descending order.
  3. Cumulative Share (CS) calculation:
     
     CS = R_running / R_total
     
  4. It groups the portfolio into concentration bands based on the Pareto principle:
     * **Top Band**: Products generating the first 80 percent of cumulative revenue (CS is less than or equal to 0.80).
     * **Middle Band**: Products generating the next 15 percent of cumulative revenue (CS is greater than 0.80 and less than or equal to 0.95).
     * **Bottom Band**: Products generating the remaining 5 percent of cumulative revenue (CS is greater than 0.95).
* **Downstream Model Impact**: The descriptive cumulative share rankings and concentration patterns serve as the ground-truth training reference data. The downstream ABC Classification model (XGBoost) is trained on the historical reference data to predict and assign priority categories to all products, including new and low-history items.

---

### 6. Year-over-Year (YoY) Growth Trends [North Star 5A: Year-over-Year Growth]
* **Goal**: Measure structural demand growth or decline while removing normal seasonal effects.
* **Variables**:
  * Let S_current be the sales value of the current target month.
  * Let S_prior be the sales value of the same calendar month in the prior year.
  * Let YoY_Growth be the growth rate.
* **The Process & Formula**:
  1. The system groups transactions into monthly buckets.
  2. For a target month, it matches the target month to the exact same calendar month in the previous year (e.g., June 2024 vs. June 2023).
  3. YoY Growth calculation:
     
     YoY_Growth = (S_current - S_prior) / S_prior
     
* **Sparsity & Anomaly Handling**: Because late 2025 is missing several months and contains sparse transaction records, the system flags the period as partial. Because most days in late 2025 lack sales, comparing 2025 to 2024 would register a false business decline.

---

### 7. Territory Performance [North Star 6A: Territory Revenue and Net Income]
* **Goal**: Rank physical delivery regions by revenue and gross margin contribution.
* **Variables**:
  * Let Revenue be the total revenue of a territory.
  * Let Net_Income be the gross margin amount of the territory.
  * Let Margin_Rate be the profit margin rate.
* **The Process & Formula**:
  1. The system excludes non-geographic administrative records and internal losses.
  2. It groups the remaining records by physical territory (such as Laguna, Batangas, Quezon).
  3. It sums the Revenue and the Net_Income.
  4. It ranks the territories descending by total Revenue.
  5. Margin Rate calculation:
     
     Margin_Rate = Net_Income / Revenue
     
* **Downstream Model Impact**: Supplies the raw Revenue Rank and Demand Growth inputs used in the prescriptive Multi-Criteria Decision Analysis prioritization matrix.

---

### 8. Customer Concentration [North Star 7A: High-Value Institutional Clients]
* **Goal**: Map and rank the distribution of sales volumes across buyer channels.
* **The Process**:
  1. The system groups transactions by the institutional buyer channel (Government, Hospital, or Pharmacy).
  2. It sums the quantities sold and total revenue for each group.
  3. It ranks the channels from highest sales volume to lowest.
* **Downstream Model Impact**: Feeds directly into the prescriptive collaborative filtering system for product-region recommendations.

---

## Final QA Cross-Analysis Against Your Capstone Paper

We verified the alignment of this updated technical logic against your capstone manuscript (**`PRIVATE_SUMMER_CAPSTONE_2 - GROUP9_ISB (1).docx`**):

### 1. Section 3.1.2 & 3.2 (Data Baseline Scope)
* **The Paper's Logic**: Digital analytics requires structured transaction records.
* **The Cross-Analysis**: Your baseline begins in **2017** because it represents the earliest boundary of the company's digitized records. The code's ingestion parameters explicitly start at 2017, and manual records prior to this (2013–2016) are excluded to preserve ETL integrity.

### 2. Section 3.4.2 (Chronological Modeling Horizons)
* **The Paper's Logic**: The modeling framework requires clear split horizons for training, evaluation, and out-of-sample forecasting.
* **The Cross-Analysis**: Setting the training data block to **2017–2025** ensures the models learn the entire historical digital dataset (with monthly aggregation smoothing out 2025 sparsity). Evaluating against **2026 actuals** and generating forecasts for **2027** maintains a mathematically clean validation loop.

### 3. Section 3.4.1.3 (Descriptive 80/20 vs. ABC Classifier)
* **The Paper's Logic (Paragraph 956)**: *"...No categorical labels or performance groupings are assigned at this stage; those outputs are produced by the ABC classifier in Section 3.4.2.1.2.1."*
* **The Cross-Analysis**: The descriptive 80/20 logic computes the running cumulative percentages (0.80 and 0.95 boundaries) on historical products. This direct Pareto categorization supplies the necessary baseline training tags to the XGBoost classifier, resolving the role division between descriptive sorting and predictive classification.

### 4. Section 3.4.1.2 (STL Decomposition & Seasonality Index)
* **The Paper's Logic (Paragraph 944)**: Decomposes daily time series into Trend and Seasonal components to validate baseline forecasts.
* **The Cross-Analysis**: The Monthly Seasonality Index provides the exact monthly multipliers needed to plot **Figure 3.38** in your paper. It captures periodic demand fluctuations while daily-to-monthly aggregation handles the 2025 daily transaction sparsity.
