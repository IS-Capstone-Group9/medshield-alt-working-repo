# MedShield Prescriptive Analytics: Technical Logic, Process, and Checklist

> [!NOTE]
> **Prerequisite Phases Completed**: Both descriptive analytics (historical baselines, taxonomy cleaning, service contract allocation, and growth trends from **2017–2026**) and predictive analytics (FB Prophet time-series forecasts with exogenous regressors, and XGBoost priority classification and urgency scoring targeting **2027 and beyond**) have been completed. The prescriptive layer builds directly on these outputs to optimize inventory parameters and territory allocations.

> [!IMPORTANT]
> **Optimization Horizon**: All EOQ, ROP, Safety Stock, MCDA priority scores, and LP allocation outputs are generated **for the 2027 planning cycle** using Prophet forecast inputs. Historical parameter distributions (standard deviations, demand averages) are drawn from the **2017–2026 baseline**.

This explainer documents the mathematical models, operational constraints, and optimization processes for the Prescriptive Analytics layer of the MedShield Decision Support System (DSS). The methodology is grounded in the **MedShield North Star Diagram** and the Group 9 ISB capstone research paper (`PRIVATE_SUMMER_CAPSTONE_2 - GROUP9_ISB.pdf`).

---

### 1. Multi-Criteria Decision Analysis (MCDA) for Regional Prioritization [North Star 6C: Constrained Procurement Priority]

* **Goal**: Score and rank MedShield's delivery territories by procurement priority, incorporating commercial performance from the 2017–2026 record and current epidemiological risk signals.
* **Timing**: Runs before the Linear Programming (LP) allocation model because priority scores serve as objective weights.
* **The Process**:
  1. **Dimension Sourcing**: Revenue Rank and Growth Rank are sourced from the 2017–2026 historical sales baseline (descriptive layer). Outbreak Risk Index is sourced from active DOH disease alert levels and DII signals (predictive layer).
  2. **Priority Score Calculation**: Combine normalized ranks using configurable weights:
     `Priority Score = w1 * Revenue Rank + w2 * Growth Rank + w3 * Outbreak Risk Index`
     where `w1 + w2 + w3 = 1.0`
  * **Real-World Example**:
    * Territory: **Quezon**
    * Indicators: Revenue Rank = 2nd (normalized: 0.90), Growth Rank = 5th (normalized: 0.70), Outbreak Risk Index = 2.0 (high Dengue, normalized: 0.80)
    * Weights: `w1 = 0.50, w2 = 0.20, w3 = 0.30`
    * Calculation:
      `Priority Score = 0.50 * 0.90 + 0.20 * 0.70 + 0.30 * 0.80`
      `Priority Score = 0.45 + 0.14 + 0.24 = 0.83`

---

### 2. Core Inventory Control Parameters

Three modules compute operational inventory boundaries monthly, using **2027 Prophet forecasts** as demand inputs and **2017–2026 historical statistics** for volatility estimates:

#### A. Economic Order Quantity (EOQ) [North Star 2C: Cost-Minimizing Reorder Quantity]

* **Goal**: Determine the cost-minimizing order quantity by balancing ordering and holding costs.
* **Formula**:
  `EOQ = sqrt((2 * D * S) / H)`
  where:
  * `D` = forecasted annual demand in units (from 2027 Prophet output)
  * `S` = ordering cost per purchase order in PHP (estimated from procurement records)
  * `H` = holding cost per unit per year in PHP
* **Real-World Example**:
  * Product: **MONOWEL 1G IV** (Antibiotic)
  * Annual Demand (`D`): 12,000 vials (1,000/month from 2027 Prophet forecast)
  * Ordering Cost (`S`): ₱1,500 per purchase order
  * Annual Holding Cost (`H`): ₱40 per vial
  * Calculation:
    `EOQ = sqrt((2 * 12,000 * 1,500) / 40)`
    `EOQ = sqrt(900,000) ≈ 949 vials`

#### B. Safety Stock & C. Reorder Point (ROP) [North Star 3C: Reorder Trigger]

* **Goal**: Maintain buffer stock to absorb demand uncertainty during replenishment lead times and trigger new orders at the right stock level.
* **Safety Stock Formula**:
  `Safety Stock = Z * std_dev_daily_demand * sqrt(Lead Time)`
  where:
  * `Z` = service factor (calibrated to target service level)
  * `std_dev_daily_demand` = standard deviation of daily demand from the **2017–2026 historical series**
  * `Lead Time` = supplier replenishment lead time in days
* **Real-World Example**:
  * Product: **MONOWEL 1G IV**
  * Daily Volatility (`std_dev_daily_demand`): 15 units
  * Lead Time: 14 days
  * Service Factor (`Z`): 1.96 (95% target service level)
  * Calculation:
    `Safety Stock = 1.96 * 15 * sqrt(14) = 1.96 * 15 * 3.74 ≈ 110 vials`

* **Reorder Point (ROP) Formula**:
  `ROP = (Average Daily Demand * Lead Time) + Safety Stock`
  where `Average Daily Demand` is disaggregated from the 2027 Prophet monthly forecast.
* **Real-World Example**:
  * Daily demand (2027 forecast): 33 vials/day
  * Lead Time: 14 days
  * Safety Stock: 110 vials
  * Calculation:
    `ROP = (33 * 14) + 110 = 462 + 110 = 572 vials`
  * *Action*: Procurement places an order for 949 vials (EOQ) once physical stock drops to 572 vials (ROP).

---

### 3. Linear Programming (LP) for Stock Allocation Optimization [North Star 2C & 6C: Cost-Minimizing Reorder Quantity & Constrained Procurement Priority]

* **Goal**: Maximize regional demand fulfillment for 2027 under constrained supply and capacity, weighted by MCDA priority scores.
* **Objective Function**:
  `Maximize Z = Σ (Priority Score_i * x_i)`
  where `x_i` represents allocated inventory units for product/territory `i`.
* **Constraints**:
  1. **Supply Constraint**: `Σ x_i ≤ Total Available Stock`
  2. **Budget Constraint**: `Σ (Cost_i * x_i) ≤ Total Budget`
  3. **Safety Stock Constraint**: `x_i ≥ Safety Stock_i` (forces minimum buffer maintenance)
  4. **Warehouse Capacity**: `Σ x_i ≤ Warehouse Capacity`
  5. **Non-negativity**: `x_i ≥ 0`
* **Real-World Example**:
  * Product: **MONOWEL 1G IV** for 2027 Q1
  * Total Available Supply: 1,500 vials
  * Territory demands:
    * **Quezon**: MCDA = 0.83, 2027 Forecast = 700 vials, Safety Stock = 110 vials
    * **Batangas**: MCDA = 0.72, 2027 Forecast = 900 vials, Safety Stock = 150 vials
  * Total demand (1,600 vials) exceeds supply (1,500 vials) → LP resolves allocation:
    * `x_Quezon = 700 vials` (fully fulfilled — higher MCDA priority)
    * `x_Batangas = 800 vials` (partially fulfilled, safety stock satisfied)

---

### 4. Collaborative Filtering for Product-Region Matching [North Star 7C: Product-Region Expansion]

* **Goal**: Identify historically successful product-region pairings from the 2017–2026 record to recommend stocking in new or underserved areas for 2027.
* **Method**: Cosine similarity between monthly demand vectors:
  `Cosine Similarity = (A · B) / (||A|| * ||B||)`
  where `A` and `B` are monthly demand vectors for two product-region combinations.
* **Real-World Example**:
  * Target: Recommend whether **SPEEDA 2.5IU/0.5ML** (Rabies Vaccine) should expand to **Bicol Region**.
  * Vector `A` (Bicol 2017–2026 general vaccine demand): `[50, 45, 60, 55, ...]`
  * Vector `B` (SPEEDA 2017–2026 CALABARZON demand): `[55, 40, 65, 50, ...]`
  * Result: Cosine similarity = `0.94` → strong alignment; SPEEDA recommended for Bicol expansion in 2027.

---

### 5. Parallel Alert-Based Overrides [North Star 4C: Disease Emergency Alert & 5C: Typhoon Emergency Stock Response]

* **Goal**: Issue condition-triggered procurement alerts that override normal 2027 planning parameters during outbreaks or typhoons.

#### Disease Outbreak Override (Rule-Based Thresholding)
* *Trigger*: `reported weekly cases > historical mean + 2 * historical standard deviation`
  (where `mu` and `sigma` are drawn from the **2017–2026 DOH baseline**)
* *Action*: Apply a demand multiplier `gamma` to the Prophet 2027 forecast:
  `Adjusted Demand = Prophet Forecast * (1 + gamma)`
  (e.g., `gamma = 0.20–0.35` for Dengue; `gamma = 0.15–0.25` for Influenza)
* **Real-World Example**:
  * Territory: **Quezon**
  * Weekly Dengue Cases (2027): 320 cases
  * Historical Baseline (2017–2026): `mu = 120`, `sigma = 45` → Threshold = `120 + 2 * 45 = 210 cases`
  * Since `320 > 210`, a Dengue alert triggers.
  * 2027 base forecast of 1,000 units adjusted to:
    `Adjusted Demand = 1,000 * (1 + 0.30) = 1,300 units`

#### Typhoon Contingency Response
* *Trigger*: WeatherAPI wind/rain signals meet PAGASA Warning Signal ≥ 2.
* *Action*: Apply emergency multipliers to wound care, PPE, oral rehydration salts, and antibiotics; double minimum stock levels in affected provinces.
* **Real-World Example**:
  * Territory: **Batangas** — PAGASA Signal 3 detected.
  * Wound care Safety Stock immediately doubles from 150 to 300 units, overriding standard EOQ/ROP parameters.

---

### 5.5. Stop-Purchasing Flag [North Star 8C: Stop-Purchasing Flag]

* **Goal**: Identify low-movement or zero-movement SKUs and halt procurement to minimize warehouse congestion and expiry risk going into 2027.
* **Method**: Dead-stock flagging driven by XGBoost ABC classification and historical velocity analysis:
  * *Trigger*: A product is classified as **Class C** AND has zero sales transactions over the trailing **6-month window within the 2017–2026 baseline**.
  * *Action*: System flags the SKU as `stop_purchasing = true` (Dead Stock) and sets the 2027 reorder recommendation to zero.
* **Real-World Example**:
  * A legacy surgical tape brand displaced by a new hypo-allergenic alternative:
    * Class: XGBoost predicts Class C (revenue share < 1%)
    * Movement: 0 sales in the trailing 6 months of 2026
    * *Action*: SKU flagged for administrative review; no 2027 procurement order generated.

---

### 6. Prescriptive Analytics Checklist

* [ ] Confirm that MCDA weights are normalized and sum to 1.0.
* [ ] Verify that EOQ values are recalculated monthly as new 2027 Prophet forecasts are generated.
* [ ] Confirm that `std_dev_daily_demand` and `Average Daily Demand` inputs are sourced from the complete **2017–2026 historical series**.
* [ ] Ensure that safety stock minimums are enforced as hard constraints in the LP model.
* [ ] Validate that emergency multipliers (`gamma`) override normal EOQ/ROP parameters during active outbreak or typhoon alerts.
* [ ] Verify LP allocation outputs target **2027 planning periods** and reflect the latest MCDA territory priority scores.
* [ ] Ensure that the Stop-Purchasing flag correctly isolates dead-stock Class C items based on trailing 6-month transaction velocity from the 2026 tail of the historical series.
* [ ] Label all prescriptive outputs as **"Scenario-Based Planning Recommendations"** when actual warehouse capacity, lead-time data, or procurement cost records are incomplete.
