# MedShield Predictive Analytics: Technical Logic, Process, and Checklist

This explainer outlines the mathematical models, data integration pathways, and classification patterns utilized in the predictive modeling layer of the MedShield Decision Support System (DSS). It serves as a verification baseline to ensure system implementation matches the methodology and equations documented in the capstone manuscript (**`PRIVATE_SUMMER_CAPSTONE_2 - GROUP9_ISB (1).docx`**).

---

### 1. The Environmental Causal Cascade Flow (Establishing Seasonality & Demand Patterns)
In alignment with the capstone's conceptual framework, the DSS establishes historical and predictive patterns using a cascading relational flow:
**Weather/Climate Data** $\rightarrow$ **Disease Patterns** $\rightarrow$ **Therapeutic Medicine Demand**

* **Step A: Meteorological Triggers (Weather/Climate)**:
  * Environmental variables (rainfall probability, severity indicators, seasonal temperature, and humidity) serve as the leading indicators.
  * *Example*: Bounded heavy precipitation and flooding during typhoon seasons (high Rainfall Severity Index).
* **Step B: Disease Dynamics (Epidemiology)**:
  * Extreme weather and seasonal climate transitions alter transmission dynamics, vector breeding, and infection exposure (reflected in spikes of the Disease Intensity Indicator).
  * *Example*: Sustained heavy rainfall increases standing water (vector breeding) $\rightarrow$ surge in Dengue cases. Flooding/typhoons $\rightarrow$ surge in Leptospirosis cases. Amihan (cooler dry season) or Habagat (warm wet season) transitions $\rightarrow$ surges in Influenza-like Illnesses (ILI).
* **Step C: Differentiated Medicine Demand (Therapeutic Classification)**:
  * Disease surges drive specific procurement cycles for matched therapeutic classes:
    * **Dengue surges** $\rightarrow$ Antipyretics (Paracetamol) and Intravenous (IV) fluids.
    * **Leptospirosis surges** $\rightarrow$ Antibiotics (Doxycycline) and anti-leptospirosis medications.
    * **Influenza/Respiratory surges** $\rightarrow$ Cough/cold medications, antihistamines, and vitamins.

By defining these sequential patterns, the system uses weather indices not just as independent regressors, but as contextual predictors for disease-driven demand cycles.

---

### 2. External Signal Feature Engineering (DII & RSI)
* **Goal**: Transform raw epidemiological counts and meteorological forecasts into normalized, model-compatible index regressors.
* **Disease Intensity Indicator (DII)**:
  * Raw Department of Health (DOH) weekly morbidity data is normalized against regional historical baselines to produce a relative indicator of disease burden.
  * Let $Cases(r, d, t)$ be the case count for disease $d$ (e.g., Dengue, ILI, Leptospirosis) in region $r$ at time $t$.
  * Let $AvgCases(r, d)$ be the monthly historical average case count for that disease-region pair during the digital baseline period (2021–2025).
  * The DII is calculated as:
    $$DII(r, d, t) = \frac{Cases(r, d, t)}{AvgCases(r, d)}$$
  * **Temporal Lag Adjustments**: To account for the latency between disease onset, clinical reporting, and MedShield's procurement replenishment cycles, a lagged variable is engineered:
    $$DII_{lag}(r, d, t) = DII(r, d, t - k)$$
    where $k$ is the lag period (weeks/months) determined from historical correlation peaks.

* **Rainfall Severity Index (RSI)**:
  * Derived from historical meteorological observations and cross-validated against daily weather observations (NASA POWER, Open-Meteo) and PAGASA forecasts.
  * Measures the probability of above-normal precipitation:
    $$RSI(r, t) = P(\text{above-normal rainfall} \mid r, t)$$
  * **Categorical Risk Classification**:
    * **Low Risk**: $RSI < 40\%$ (No planning adjustments)
    * **Moderate Risk**: $40\% \le RSI < 44\%$ (Triggers mild demand adjustments for vitamins and OTC flu medications)
    * **High Risk**: $RSI \ge 45\%$ (Triggers higher adjustments for antibiotics and anti-leptospirosis medications)

---

### 2. Time-Series Forecasting (Facebook Prophet with Regressors)
* **Goal**: Generate macro-level and territory-level monthly demand forecasts using historical sales combined with weather and disease regressors.
* **The Process & Formula**:
  * Facebook Prophet decomposes monthly sales demand at the territory and aggregate levels. Exogenous disease and weather regressors scale the baseline demand curve.
  * The forecast value $y(t)$ at planning horizon $t$ is calculated as:
    $$y(t) = g(t) + s(t) + h(t) + \beta_1 \cdot DII_{lag}(r, d, t) + \beta_2 \cdot RSI(r, t) + \epsilon_t$$
  * **Variables**:
    * $y(t)$: Forecasted demand units at time $t$.
    * $g(t)$: Trend function representing long-term trajectory growth or decline (seeded by STL trend decomposition).
    * $s(t)$: Seasonal component capturing periodic demand variations (configured from STL seasonality index).
    * $h(t)$: Holiday or event effects representing irregular procurement spikes (e.g., government bidding cycles).
    * $\beta_1$: Regression coefficient estimated from training data for the lagged disease intensity signal.
    * $\beta_2$: Regression coefficient estimated from training data for the rainfall severity index.
    * $\epsilon_t$: Unexplained residual variance.
  * **Baseline Reduction**: If weather and disease data are unavailable or set to baseline, $\beta_1$ and $\beta_2$ default to zero, reducing the model to a historical sales-only baseline.

---

### 3. Tabular Product priority (XGBoost Classifier & Regressor)
* **Goal**: Solve the product-level priority classification (ABC groupings) and estimate product-specific demand urgency.
* **Tabular Feature Vector**:
  * Unlike Prophet (which runs on sequential time-series aggregates), XGBoost operates on static tabular feature vectors $x_i$ built for each product $i$:
    $$x_i = [SalesVolume_i, RevenueContribution_i, CVdemand_i, TherapeuticCategory_i, DIIscore_i, RSIflag_i]$$
    where $CVdemand_i$ represents the coefficient of variation measuring demand volatility, and $RevenueContribution_i$ is the Pareto percentage from descriptive analysis.
* **Product ABC Classification (Supervised)**:
  * Products with sufficient history are assigned categories (A, B, C) based on Pareto boundaries.
  * XGBoost is trained on these observed categories to learn a classifier that predicts the priority class (A: top 80%, B: 80–95%, C: bottom 5%) for low-history, new, and "cold-start" SKUs.
* **Demand Urgency Scoring**:
  * XGBoost is also trained to output a numerical Demand Urgency Score representing relative procurement urgency:
    $$Score(i) = \sum f_k(x_i), \quad f_k \in F$$
    where $f_k$ represents individual regression trees in the XGBoost ensemble $F$.

---

### 4. Predictive Analytics Checklist

Use this checklist to verify that forecasting models, classification pipelines, data sources, and accuracy metrics conform to business requirements:

#### Data Preparation & Alignment
- [ ] Confirm sales transactions are loaded from `sales_transactions_area_allocated` to isolate bulk service contract noise.
- [ ] Validate that DII calculations utilize the official 2021–2025 DOH baseline dataset.
- [ ] Verify that PAGASA rain probabilities are cross-validated against NASA POWER or Open-Meteo weather proxies.
- [ ] Ensure that geographic areas are standard physical territories (CALABARZON, MIMAROPA, Bicol Region).
- [ ] Validate weather-disease-medicine correlation patterns (e.g., verifying that seasonal rain triggers disease index surges, which map directly to target therapeutic categories).

#### Forecasting & Modeling
- [ ] Verify Prophet baseline forecast is generated with external coefficients set to zero ($\beta_1 = 0, \beta_2 = 0$).
- [ ] Verify DII regression coefficients ($\beta_1$) and weather indicators ($\beta_2$) are calculated and statistically significant.
- [ ] Run rolling-validation tests on 2021–2025 training data and compute MAE, RMSE, and MAPE against 2026 actuals.
- [ ] Check that XGBoost ABC classifier achieves adequate precision, recall, and F1-score across all categories (A, B, C).
- [ ] Ensure new/low-history products are successfully classified into ABC priority classes instead of showing empty metrics.

---

### 5. Final QA Cross-Analysis Against Your Capstone Paper
We verified the mathematical and methodology alignment of these equations against your capstone manuscript (**`PRIVATE_SUMMER_CAPSTONE_2 - GROUP9_ISB (1).docx`**):

1. **Section 3.4.2 (Predictive Modeling Horizons)**:
   * Training is performed on 2021–2025 data, evaluation is verified against 2026 actuals, and forecasts are generated for 2027.
   * Prophet models and evaluations in the analytics service mirror this chronological sequence.
2. **Equation (3) - Prophet with External Regressors**:
   * $y(t) = g(t) + s(t) + h(t) + \beta_1 \cdot DII_{lag}(r, d, t) + \beta_2 \cdot RSI_{flag}(r, t) + \epsilon_t$.
   * Formulations are verified; $\beta_1$ scales the epidemiological lag, and $\beta_2$ scales the rainfall proxy category flag.
3. **Equation (4) & (5) - Disease Intensity Indicator**:
   * $DII(r, d, t) = Cases(r, d, t) / AvgCases(r, d)$, with lag adjustment $DII(r, d, t - k)$.
   * Matches the engineered feature parameters built during data transformation.
4. **Equation (6) - Rainfall Severity Index**:
   * $RSI(r, t) = P(\text{above-normal rainfall} \mid r, t)$, categorized into Low (<40%), Moderate (40-44%), and High (>=45%).
   * This classification matches the alert multipliers mapped in the decision engine.
5. **Equation (8) - XGBoost Urgency Score**:
   * $Score(i) = \sum f_k(x_i)$, utilizing tabular sales features, Pareto share, CV, DII, and RSI.
   * Captures product-specific risk parameters separately from aggregate time series.
