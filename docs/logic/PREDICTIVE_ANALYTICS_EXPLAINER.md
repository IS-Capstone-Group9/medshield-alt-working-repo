# MedShield Predictive Analytics: Technical Logic, Process, and Checklist

> [!NOTE]
> **Prerequisite Phase Completed**: Descriptive analytics (including data quality gates, business taxonomy mapping, bulk service contract breakdown, historical seasonality indexing, and Pareto revenue contribution analysis) has been successfully executed on the **2017–2026 historical baseline**, establishing the clean historical baseline and feature foundations for the predictive models.

> [!IMPORTANT]
> **Forecast Horizon**: All predictive model outputs — Prophet demand projections, XGBoost urgency scores, and ABC classifications — target **2027 and beyond**. The 2017–2026 historical block is the training dataset. 2026 actuals serve as the final in-sample validation year before generating out-of-sample forward projections.

This explainer documents the mathematical models, data integration pathways, and classification processes for the Predictive Analytics layer of the MedShield Decision Support System (DSS). The methodology is grounded in the **MedShield North Star Diagram** and the Group 9 ISB capstone research paper (`PRIVATE_SUMMER_CAPSTONE_2 - GROUP9_ISB.pdf`).

---

### 1. The Environmental Causal Cascade Flow (Pattern Establishment)

* **Goal**: Establish sequential correlation patterns connecting meteorological triggers to disease surges and corresponding therapeutic medicine demand.
* **The Process**:
  1. **Meteorological Trigger Assessment**: Monthly weather and climate signals (rainfall probability, wind flags, temperature deviations) are monitored as the leading environmental indicator.
     * *Example*: The Rainfall Severity Index (RSI) for the **Batangas** territory rises above 45% during the monsoon season.
  2. **Epidemiological Shift Detection**: Elevated meteorological risks are mapped to disease transmission vectors and infection rates via the Disease Intensity Indicator.
     * *Example*: Standing water from heavy rainfall in **Batangas** correlates with a surge in **Dengue** and **Leptospirosis** cases.
  3. **Therapeutic Demand Mapping**: Verified disease surges trigger localized planning lifts for specific pharmaceutical categories:
     * **Dengue surges** → Antipyretics (Paracetamol) and Intravenous (IV) fluids.
     * **Leptospirosis surges** → Antibiotics (MONOWEL 1G IV, Doxycycline) and anti-leptospirosis medications.
     * **Influenza/Respiratory surges** → Cough/cold medications, antihistamines, and vitamins.

---

### 2. External Signal Feature Engineering (DLI/DII & RSI) [North Star 4B: Disease-Driven Demand & 5B: Rainfall-Driven Demand]

* **Goal**: Transform raw epidemiological counts and meteorological data into normalized, model-compatible index regressors drawn from the 2017–2026 historical record.
* **The Process**:
  1. **DLI/DII (Disease-Driven) Calculation**: Group raw weekly case counts from DOH by region `r` and disease `d` for time period `t`, then normalize against the historical baseline average:
     `DII(r, d, t) = Cases(r, d, t) / AvgCases(r, d)`
     where `AvgCases(r, d)` is computed from the **2017–2026 DOH historical baseline** aligned with the sales series.
     * *Real-world Case*: In **Quezon** during September, if there are 240 reported Dengue cases and the historical baseline average for September in Quezon is 100 cases:
       `DII = 240 / 100 = 2.4`
  2. **Temporal Lag Application**: Apply a lag factor `k` (in weeks or months) to align disease triggers with procurement lead times:
     `DII_lag(r, d, t) = DII(r, d, t - k)`
     * *Real-world Case*: With a 1-month procurement lag (`k = 1`), the `DII_lag` for October 2027 demand planning uses the September 2026 DII of 2.4.
  3. **RSI Cross-Validation**: PAGASA probabilistic rainfall forecasts are cross-checked against historical daily readings from independent weather archives (NASA POWER / Open-Meteo).
  4. **RSI Risk Classification**: Compute `RSI(r, t) = P(above-normal rainfall | r, t)` and categorize into discrete risk tiers:
     * **Low Risk (`RSI < 40%`)**: No demand modifications.
     * **Moderate Risk (`40% ≤ RSI < 44%`)**: Mild demand adjustments for vitamins and OTC flu medications.
     * **High Risk (`RSI ≥ 45%`)**: Higher adjustments for antibiotics and anti-leptospirosis medications.
     * *Real-world Case*: **Batangas** registers RSI = 48% (High Risk) for July 2027 → warning flag triggers scaled demand estimates for **MONOWEL 1G IV**.
  5. **Disease Data Fallback & Seasonality Logic**: When live DOH API feeds are unavailable, resolve disease intensity via a Weather-Seasonal Boolean mapping rule:
     `is_seasonal_surge_active(r, d, t) = (RSI(r, t) ≥ 45%) AND (month(t) in seasonal_months(d))`
     `DII_fallback = 1.5 if is_seasonal_surge_active is True else 1.0`
     * *Real-world Case*: For **Dengue** (`seasonal_months = [June, July, August, September, October]`), if a 2027 forecast run for **Quezon** in August has no DOH upload but has high weather risk (RSI = 46%), `is_seasonal_surge_active = True` → fallback DII of **1.5** is applied.

---

### 3. Time-Series Forecasting (Facebook Prophet with Regressors) [North Star 2B: Monthly Product Demand]

* **Goal**: Generate macro-level and territory-specific monthly demand forecasts using the 10-year historical training block combined with weather and disease regressors.
* **The Process**:
  1. **STL Decomposition Initialization**: Decompose historical monthly sales across the **2017–2026 training block** (up to 120 months) into trend (`g(t)`) and seasonality (`s(t)`) components to seed the Prophet model configuration.
  2. **Exogenous Regressor Addition**: Add engineered `DII_lag(r, d, t)` and `RSI(r, t)` signals as independent linear regressors.
  3. **Event Effect Mapping**: Configure holiday/event parameters (`h(t)`) to account for irregular demand drivers such as regional government bidding cycles.
  4. **Forecast Inference**: Execute Prophet to compute expected demand for **2027 and beyond**:
     `y(t) = g(t) + s(t) + h(t) + β₁ * DII_lag(r, d, t) + β₂ * RSI_flag(r, t) + ε_t`
     where `β₁` and `β₂` are coefficients estimated from the 2017–2026 training data.
     * *Real-world Case*: Baseline monthly forecast for **MONOWEL 1G IV** in **Quezon** is 500 units. With `β₁ = 30` and `β₂ = 120`:
       `y(Jan 2027) = 500 + 30 * 2.4 + 120 * 1.0 = 692 units`
  5. **Baseline Model Fallback**: If external feeds are missing, set `β₁ = β₂ = 0` to generate a historical-only baseline forecast of 500 units.

---

### 3.5. Forecast Accuracy Evaluation [North Star 3B: Forecast Accuracy]

* **Goal**: Rigorously evaluate and track Prophet model accuracy against 2026 actuals and naive seasonal benchmarks before generating 2027 forward projections.
* **Metrics & Benchmark Methods**:
  1. **Naive Seasonal Benchmark**: Baseline predictions using historical seasonal averages for comparison.
  2. **Mean Absolute Percentage Error (MAPE)**:
     `MAPE = (1/n) * Σ |(Actual - Forecast) / Actual| * 100`
  3. **Root Mean Squared Error (RMSE)**:
     `RMSE = sqrt((1/n) * Σ (Actual - Forecast)²)`
  4. **Mean Absolute Error (MAE)**:
     `MAE = (1/n) * Σ |Actual - Forecast|`
* **Validation Protocol**: Rolling-window cross-validation is run on the 2017–2025 sub-block, with the **2026 actuals held out as the out-of-sample test set** before models are locked for 2027 projection generation.

---

### 4. Tabular Product Prioritization & Urgency Scoring (XGBoost) [North Star 6B: Forecasting Urgency & 7B: Future SKU Classification]

* **Goal**: Predict priority categories (ABC classes) for new or low-history SKUs and score product-level procurement urgency for the 2027 planning cycle.
* **The Process**:
  1. **Feature Vector Assembly**: For each product `i`, construct a feature vector `x_i`:
     `x_i = [SalesVolume_i, RevenueContribution_i, CVdemand_i, TherapeuticCategory_i, DIIscore_i, RSIflag_i]`
     * *Real-world Case*: For **SPEEDA 2.5IU/0.5ML** (Rabies vaccine):
       `x_SPEEDA = [425.0 units/mo, 0.009072 rev_share, 0.35 volatility, Vaccines, 1.2 DII, 0.0 RSI]`
  2. **Supervised ABC Classification Training**: Train XGBoost using historical Pareto classifications (A: top 80% cumulative share, B: 80–95%, C: bottom 5%) from the 2017–2026 baseline.
     * *Real-world Case*: High-revenue medicines like **MONOWEL 1G IV** (Rank 1) are labeled Class A to train the model.
  3. **ABC Priority Inference**: New or low-history ("cold-start") products are passed through the trained classifier to predict their A, B, or C category for the upcoming planning period.
     * *Real-world Case*: A newly introduced rabies vaccine variant with 2 months of history is classified as **Class A** based on feature similarity to **SPEEDA 2.5IU/0.5ML**.
  4. **Urgency Score Computation**: The gradient boosting ensemble produces a continuous Demand Urgency Score:
     `Score(i) = Σ f_k(x_i) for f_k in F`
     where `f_k` represents individual trees in ensemble `F`, flagging high-risk products for immediate 2027 procurement review.

---

### 5. Predictive Analytics Checklist

Use this checklist to verify that forecasting models, classification pipelines, data sources, and accuracy metrics conform to requirements:

#### Data Preparation & Alignment
- [ ] Confirm sales transactions are loaded from `sales_transactions_area_allocated` to isolate bulk service contract noise.
- [ ] Validate that DII calculations utilize the complete **2017–2026 DOH historical baseline dataset**.
- [ ] Verify PAGASA rain probabilities are cross-validated against NASA POWER or Open-Meteo weather proxies.
- [ ] Ensure geographic areas are standard physical territories (CALABARZON, MIMAROPA, Bicol Region, Metro Manila).
- [ ] Validate weather-disease-medicine correlation patterns (seasonal rain → disease index surge → therapeutic demand lift).

#### Forecasting & Modeling
- [ ] Verify Prophet baseline forecast is generated with external coefficients set to zero (`β₁ = 0, β₂ = 0`) for fallback comparison.
- [ ] Verify DII (`β₁`) and RSI (`β₂`) regression coefficients are calculated and statistically significant against 2026 actuals.
- [ ] Run rolling-validation on 2017–2025 sub-block and compute MAE, RMSE, and MAPE against held-out **2026 actuals**.
- [ ] Confirm all forward forecasts target **2027 onwards**, with no actuals being relabeled as projections.
- [ ] Verify XGBoost ABC classifier achieves adequate precision, recall, and F1-score across all categories (A, B, C).
- [ ] Ensure new/low-history products are classified into ABC priority classes rather than showing empty metrics.

---

### 6. Final QA Cross-Analysis Against the North Star & Capstone Paper

Alignment verified against the **MedShield North Star Diagram** (`references/NStar.md`) and Group 9 capstone research (`references/PRIVATE_SUMMER_CAPSTONE_2 - GROUP9_ISB.pdf`):

1. **Modeling Horizons (Paper Section 3.4.2)**:
   * Training is performed on **2017–2026 data** (10 years of digitized company sales records).
   * Model evaluation is validated against **2026 actuals** (held-out test set).
   * Out-of-sample demand forecasts are generated for **2027 and beyond**.

2. **Equation (3) — Prophet with External Regressors**:
   * `y(t) = g(t) + s(t) + h(t) + β₁ * DII_lag(r, d, t) + β₂ * RSI_flag(r, t) + ε_t`
   * `β₁` scales the epidemiological lag regressor; `β₂` scales the rainfall proxy category flag.

3. **Equations (4) & (5) — Disease Intensity Indicator**:
   * `DII(r, d, t) = Cases(r, d, t) / AvgCases(r, d)`, with lag adjustment `DII(r, d, t - k)`.
   * Baseline averages (`AvgCases`) are computed from the 2017–2026 DOH historical series.

4. **Equation (6) — Rainfall Severity Index**:
   * `RSI(r, t) = P(above-normal rainfall | r, t)`, classified into Low (<40%), Moderate (40–44%), High (≥45%).

5. **Equation (8) — XGBoost Urgency Score**:
   * `Score(i) = Σ f_k(x_i)`, utilizing tabular sales features, Pareto share, CV, DII, and RSI from the 2017–2026 baseline.
