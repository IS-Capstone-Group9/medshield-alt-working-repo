# MedShield Predictive Analytics: Technical Logic, Process, and Checklist

This explainer outlines the mathematical models, data integration pathways, and classification processes utilized in the predictive modeling layer of the MedShield Decision Support System (DSS). It serves as a verification baseline to ensure system implementation matches the methodology and equations documented in the capstone manuscript (**`PRIVATE_SUMMER_CAPSTONE_2 - GROUP9_ISB (1).docx`**).

---

### 1. The Environmental Causal Cascade Flow (Pattern Establishment)
* **Goal**: Establish the sequential correlation patterns connecting meteorological triggers to disease surges and corresponding therapeutic medicine demand.
* **The Process**:
  1. **Meteorological Trigger Assessment**: The system monitors monthly weather and climate signals (such as rainfall probability, wind flags, and temperature deviations) as the leading environmental indicator.
  2. **Epidemiological Shift Detection**: Elevated meteorological risks are mapped to disease transmission vectors and infection rates (measured via the Disease Intensity Indicator).
  3. **Therapeutic Demand Mapping**: Verified disease surges trigger localized planning lifts for specific categories of pharmaceuticals:
     * **Dengue surges** trigger adjustments for Antipyretics (Paracetamol) and Intravenous (IV) fluids.
     * **Leptospirosis surges** trigger adjustments for Antibiotics (Doxycycline) and anti-leptospirosis medications.
     * **Influenza/Respiratory surges** trigger adjustments for Cough/cold medications, antihistamines, and vitamins.

---

### 2. External Signal Feature Engineering (DII & RSI)
* **Goal**: Process and transform raw epidemiological counts and meteorological forecasts into normalized, model-compatible index regressors.
* **The Process**:
  1. **DII Calculation**: Group raw weekly case counts from DOH by region $r$ and disease $d$ for time period $t$, and divide by the monthly historical baseline average:
     $$DII(r, d, t) = \frac{Cases(r, d, t)}{AvgCases(r, d)}$$
     where $AvgCases(r, d)$ is computed from the 2021–2025 baseline period.
  2. **Temporal Lag Application**: Apply a lag factor $k$ (expressed in weeks or months based on replenishment cycles) to align disease triggers with procurement lead times:
     $$DII_{lag}(r, d, t) = DII(r, d, t - k)$$
  3. **RSI Cross-Validation**: Cross-check PAGASA probabilistic rainfall forecasts against historical daily readings from independent weather archives (NASA POWER/Open-Meteo).
  4. **RSI Risk Classification**: Compute the probability of above-normal rainfall ($RSI(r, t) = P(\text{above-normal rainfall} \mid r, t)$) and categorize into discrete risk tiers:
     * **Low Risk ($RSI < 40\%$)**: No demand modifications.
     * **Moderate Risk ($40\% \le RSI < 44\%$)**: Triggers mild demand adjustments for vitamins and OTC flu medications.
     * **High Risk ($RSI \ge 45\%$)**: Triggers higher adjustments for antibiotics and anti-leptospirosis medications.

---

### 3. Time-Series Forecasting (Facebook Prophet with Regressors)
* **Goal**: Generate macro-level and territory-specific monthly demand forecasts using historical sales combined with weather and disease regressors.
* **The Process**:
  1. **STL Decomposition Initialization**: Decompose the historical monthly sales quantity (2021–2025) into trend ($g(t)$) and seasonality ($s(t)$) components to seed the Prophet model configuration.
  2. **Exogenous Regressor Addition**: Add the engineered $DII_{lag}(r, d, t)$ and $RSI(r, t)$ signals as independent linear regressors into the Prophet model.
  3. **Event Effect Mapping**: Configure holiday/event parameters ($h(t)$) to account for irregular demand drivers such as regional government bidding cycles.
  4. **Forecast Inference**: Execute the Prophet model to compute the expected demand quantity $y(t)$:
     $$y(t) = g(t) + s(t) + h(t) + \beta_1 \cdot DII_{lag}(r, d, t) + \beta_2 \cdot RSI(r, t) + \epsilon_t$$
     where $\beta_1$ and $\beta_2$ are coefficients estimated from the training data.
  5. **Baseline Model Fallback**: If external API feeds are missing, set regression coefficients $\beta_1$ and $\beta_2$ to zero to generate a purely historical sales-only baseline forecast.

---

### 4. Tabular Product Prioritization & Urgency Scoring (XGBoost)
* **Goal**: Predict priority categories (ABC classes) for new or low-history SKUs and score product-level procurement urgency.
* **The Process**:
  1. **Feature Vector Assembly**: For each product $i$, construct a feature vector $x_i$:
     $$x_i = [SalesVolume_i, RevenueContribution_i, CVdemand_i, TherapeuticCategory_i, DIIscore_i, RSIflag_i]$$
     incorporating average monthly sales, Pareto revenue share, demand volatility (coefficient of variation), therapeutic group, active regional disease score, and rainfall risk flags.
  2. **Supervised ABC Classification Training**: Train the XGBoost supervised classifier using the historical Pareto classification (A: top 80% cumulative share, B: 80–95%, C: bottom 5%) of established products.
  3. **ABC Priority Inference**: Pass feature vectors of new or low-history ("cold-start") products through the trained classifier to predict their A, B, or C category.
  4. **Urgency Score Computation**: Evaluate the product features using the gradient boosting ensemble of regression trees to output a continuous numerical Demand Urgency Score:
     $$Score(i) = \sum f_k(x_i), \quad f_k \in F$$
     where $f_k$ represents individual trees in the ensemble $F$, flagging high-risk products needing immediate review.

---

### 5. Predictive Analytics Checklist

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

### 6. Final QA Cross-Analysis Against Your Capstone Paper
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
