# MedShield Prescriptive Analytics: Technical Logic, Process, and Checklist

> [!NOTE]
> **Prerequisite Phases Completed**: Both descriptive analytics (establishing historical baselines, cleaning taxonomy, allocating service contracts, and historical growth trends) and predictive analytics (FB Prophet time-series forecasts with exogenous regressors, and XGBoost-based priority classification and demand urgency scoring) have been completed. The prescriptive layer builds directly on top of these historical and forecasting outputs to optimize inventory parameters and territory allocations.

This explainer outlines the mathematical models, operational constraints, and optimization processes utilized in the prescriptive analytics layer of the MedShield Decision Support System (DSS). It serves as a verification baseline to ensure system implementation matches the methodology and equations documented in the capstone manuscript (**`PRIVATE_SUMMER_CAPSTONE_2 - GROUP9_ISB (1).docx`**).

---

### 1. Multi-Criteria Decision Analysis (MCDA) for Regional Prioritization [North Star 6C: Constrained Procurement Priority]
* **Goal**: Score and rank MedShield's delivery territories by procurement priority, incorporating commercial and epidemiological metrics.
* **Timing**: Runs before the Linear Programming (LP) allocation model because priority scores serve as objective weights.
* **The Process**:
  1. **Dimension Sourcing**: Sourced from historical sales (descriptive layer) and active DOH disease alert levels (predictive layer).
  2. **Priority Score Calculation**: Combine normalized ranks using weights:
     `Priority Score = w1 * Revenue Rank + w2 * Growth Rank + w3 * Outbreak Risk Index`
     where:
     * `w1` = revenue weight
     * `w2` = growth weight
     * `w3` = epidemiological risk weight
     * `w1 + w2 + w3 = 1.0`
  * **Real-World Example**:
    * Target Territory: **Quezon**
    * Indicators: Revenue Rank = 2nd (normalized score: 0.90), Growth Rank = 5th (normalized score: 0.70), Outbreak Risk Index = 2.0 (high Dengue surge, normalized score: 0.80).
    * Weight Configuration: `w1 = 0.50` (revenue priority), `w2 = 0.20` (growth priority), `w3 = 0.30` (health risk priority).
    * Calculation:
      `Priority Score = 0.50 * 0.90 + 0.20 * 0.70 + 0.30 * 0.80`
      `Priority Score = 0.45 + 0.14 + 0.24 = 0.83`

---

### 2. Core Inventory Control Parameters
Three modules compute the operational inventory boundaries monthly:

#### A. Economic Order Quantity (EOQ) [North Star 2C: Cost-Minimizing Reorder Quantity]
* **Goal**: Determine the cost-minimizing order quantity by balancing ordering and holding costs.
* **Formula**:
  `EOQ = sqrt((2 * D * S) / H)`
  where:
  * `D` = forecasted annual demand in units (output from Prophet)
  * `S` = ordering cost per purchase order in PHP (estimated from procurement records)
  * `H` = holding cost per unit per year in PHP
* **Real-World Example**:
  * Product: **MONOWEL 1G IV** (Antibiotic)
  * Annual Demand (`D`): 12,000 vials (1,000/month forecast from Prophet)
  * Ordering Cost (`S`): 1,500 PHP per purchase order
  * Annual Holding Cost (`H`): 40 PHP per vial (representing capital, storage space, and wastage risk)
  * Calculation:
    `EOQ = sqrt((2 * 12,000 * 1,500) / 40)`
    `EOQ = sqrt(36,000,000 / 40) = sqrt(900,000) = 948.68 (approx. 949 vials)`

#### B. Safety Stock & C. Reorder Point (ROP) [North Star 3C: Reorder Trigger]
* **Goal**: Maintain buffer stock to absorb demand uncertainty during replenishment lead times and trigger new orders.
* **Safety Stock Formula**:
  `Safety Stock = Z * std_dev_daily_demand * sqrt(Lead Time)`
  where:
  * `Z` = service factor (calibrated to maintain safety targets)
  * `std_dev_daily_demand` = standard deviation of daily demand from historical sales
  * `Lead Time` = supplier replenishment lead time in days
* **Real-World Example**:
  * Product: **MONOWEL 1G IV**
  * Daily Volatility (`std_dev_daily_demand`): 15 units
  * Replenishment Lead Time (`Lead Time`): 14 days
  * Service Factor (`Z`): 1.96 (for a 95% target service level)
  * Calculation:
    `Safety Stock = 1.96 * 15 * sqrt(14)`
    `Safety Stock = 1.96 * 15 * 3.74 = 109.95 (approx. 110 vials)`

* **Reorder Point (ROP) Formula**:
  `ROP = (Average Daily Demand * Lead Time) + Safety Stock`
  where:
  * `Average Daily Demand` = Prophet forecast disaggregated to daily level
  * `Lead Time` = supplier lead time in days
* **Real-World Example**:
  * Product: **MONOWEL 1G IV**
  * Daily demand baseline: 33 vials per day
  * Lead Time: 14 days
  * Safety Stock buffer: 110 vials
  * Calculation:
    `ROP = (33 * 14) + 110 = 462 + 110 = 572 vials`
  * *Operational Action*: The procurement officer places an order for 949 vials (EOQ) once physical stock drops to 572 vials (ROP).

---

### 3. Linear Programming (LP) for Stock Allocation Optimization [North Star 2C: Cost-Minimizing Reorder Quantity & 6C: Constrained Procurement Priority]
* **Goal**: Maximize regional demand fulfillment under constrained supply and capacity.
* **Objective Function**:
  `Maximize Z = sum(Priority Score_i * x_i)`
  where `x_i` represents allocated inventory units for product/territory `i`.
* **Constraints**:
  1. **Supply Constraint**: `sum(x_i) <= Total Available Stock`
  2. **Budget Constraint**: `sum(Cost_i * x_i) <= Total Budget`
  3. **Safety Stock Constraint**: `x_i >= Safety Stock_i` (forces minimum buffer maintenance)
  4. **Warehouse Capacity**: `sum(x_i) <= Warehouse Capacity`
  5. **Non-negativity Function**: `x_i >= 0`
* **Real-World Example**:
  * Product: **MONOWEL 1G IV**
  * Total Available Supply: 1,500 vials
  * Target Territories:
    * **Quezon**: MCDA Weight = 0.83, Demand Forecast = 700 vials, Safety Stock = 110 vials
    * **Batangas**: MCDA Weight = 0.72, Demand Forecast = 900 vials, Safety Stock = 150 vials
  * *Constraint Check*: Total demand (1,600 vials) exceeds supply (1,500 vials).
  * Optimization:
    `Maximize Z = 0.83 * x_Quezon + 0.72 * x_Batangas`
    Subject to:
    * `x_Quezon + x_Batangas <= 1,500`
    * `x_Quezon >= 110` (Quezon Safety Stock)
    * `x_Batangas >= 150` (Batangas Safety Stock)
    * `x_Quezon <= 700` (Fulfill max demand for Quezon)
    * `x_Batangas <= 900` (Fulfill max demand for Batangas)
  * *Optimal Output*: Since Quezon has a higher priority weight, the LP allocates max demand to Quezon and splits the remainder:
    * `x_Quezon = 700 vials` (fully fulfilled)
    * `x_Batangas = 800 vials` (partially fulfilled, but satisfies safety stock of 150 vials)

---

### 4. Collaborative Filtering for Product-Region Matching [North Star 7C: Product-Region Expansion]
* **Goal**: Identify historically successful product-region pairings to recommend stocking in new areas.
* **Method**: Cosine similarity between monthly demand vectors:
  `Cosine Similarity = (A . B) / (||A|| * ||B||)`
  where `A` and `B` are monthly demand vectors for two product-region combinations.
* **Real-World Example**:
  * Target: Recommend whether **SPEEDA 2.5IU/0.5ML** (Rabies Vaccine) should be expanded to **Bicol Region** (not currently active).
  * Demand Vectors:
    * Vector `A` (Bicol demand profile across general vaccines): `[50, 45, 60, 55, ...]`
    * Vector `B` (SPEEDA monthly demand in its top region, CALABARZON): `[55, 40, 65, 50, ...]`
  * Calculation: The cosine similarity evaluates to `0.94`.
  * *Operational Action*: The high score signifies highly aligned demand behavior, making SPEEDA a strong match for expansion to the Bicol Region.

---

### 5. Parallel Alert-Based Overrides [North Star 4C: Disease Emergency Alert & 5C: Typhoon Emergency Stock Response]
* **Goal**: Issue condition-triggered procurement alerts that override normal parameters during outbreaks or typhoons.
* **Rule-Based Thresholding (Disease Outbreaks)**:
  * *Trigger*: `reported weekly cases > historical mean + 2 * historical standard deviation`
  * *Action*: Apply a demand multiplier `gamma` to the Prophet forecast:
    `Adjusted Demand = Prophet Forecast * (1 + gamma)`
    (e.g., `gamma = 0.20` to `0.35` for dengue; `gamma = 0.15` to `0.25` for influenza).
  * **Real-World Example**:
    * Territory: **Quezon**
    * Weekly Dengue Cases: 320 cases
    * Historical Baseline: Mean (`mu`) = 120 cases, Std Dev (`sigma`) = 45 cases
    * Trigger Threshold: `120 + 2 * 45 = 210 cases`
    * *Outbreak Status*: Since `320 > 210`, a Dengue alert triggers.
    * Multiplier: Applying a `gamma` coefficient of `0.30` for Dengue products.
    * Adjusted Demand: Normal Prophet forecast of 1,000 units is adjusted to:
      `Adjusted Demand = 1,000 * (1 + 0.30) = 1,300 units`
* **Typhoon Contingency Alerts**:
  * *Trigger*: WeatherAPI wind/rain signals meet PAGASA Warning Signal >= 2.
  * *Action*: Apply multipliers to emergency categories (wound care, PPE, oral rehydration salts, antibiotics) and double minimum stock levels in affected provinces.
  * **Real-World Example**:
    * Territory: **Batangas**
    * Weather Trigger: PAGASA Signal 3 detected.
    * *Contingency Status*: Wound care products double their Safety Stock buffer from 150 to 300 units immediately to counter logistics blockages, overriding standard EOQ/ROP.

---

### 5.5. Stop-Purchasing Flag [North Star 8C: Stop-Purchasing Flag]
* **Goal**: Identify low-movement or zero-movement SKUs and flag them to halt procurement, minimizing warehouse congestion and expiry risk.
* **Method**: Dead-stock flagging driven by the predicted **XGBoost ABC classification** and historical velocity analysis:
  * *Trigger*: If a product is classified under the bottom Pareto category (**Class C**) AND has registered zero sales transactions over the trailing 6-month period, the system flags the SKU as `stop_purchasing = true` (Dead Stock).
  * **Real-World Example**:
    * Product: A legacy surgical tape brand has been displaced by a new hypo-allergenic alternative.
    * Class: XGBoost predicts Class C (revenue share < 1%).
    * Movement: Trailing 6 months shows 0 sales.
    * *Action*: System automatically flags this SKU for administrative review, setting the reorder recommendation to zero and warning against additional purchasing.

---

### 6. Prescriptive Analytics Checklist
* [ ] Confirm that MCDA weights are normalized and sum to 1.
* [ ] Verify that EOQ values are recalculated monthly as new forecasts are generated.
* [ ] Ensure that safety stock minimums are enforced as hard constraints in the LP model.
* [ ] Validate that emergency multipliers override normal EOQ/ROP parameters during active alerts.
* [ ] Ensure that the Stop-Purchasing flag correctly isolates dead stock Class C items based on the trailing 6-month transaction velocity.
