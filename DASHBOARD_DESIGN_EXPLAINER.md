# MedShield Executive DSS Dashboard: Business-Friendly Design & Step-by-Step Build Guide

This document defines the step-by-step methodology for constructing an executive-level Decision Support System (DSS) dashboard for **MedShield Pharmaceutical Corporation**. It bridges technical data engineering, predictive forecasting, and prescriptive optimization into a clean, business-friendly interface aligned directly with Capstone manuscript Section 3.8 and Group 9 presentation requirements.

---

## 1. Deliverables & Next Meeting Preparation Guide

### A. Immediate Assignment Uploads (LMS Portal)
1. **Updated Revised Manuscript:** Upload latest post-defense Capstone 1 paper containing all revisions requested by advisers and panel members.
2. **Panel Approval Form:** Attach the signed approval document/sheet from panel members as supporting documentation.

---

### B. Objective-to-Solution Mapping Matrix

| Objective / Phase | Target Outcome | Proposed Solution / Analytics Technique |
| --- | --- | --- |
| **Sales Diagnostic** | Analyze 2021–2025 sales performance baseline across territories | **STL Decomposition** (descriptive layer) |
| **Product & Area Prioritization** | Identify key revenue drivers, client accounts, and slow movers | **80/20 Analysis** (descriptive) & **XGBoost ABC Classifier** (predictive) |
| **Demand Forecasting** | Forecast territory-level pharmaceutical demand & urgency scoring | **Facebook Prophet** with DII & RSI external regressors + **XGBoost Urgency Scoring** |
| **Prescriptive Planning** | Optimize procurement & allocation (target expiry wastage $\le 5\%$) | **EOQ**, **ROP**, **Safety Stock**, **MCDA**, and **Linear Programming Allocation** |

---

## The Executive Dashboard Philosophy

An executive DSS dashboard must support **critical decisions, not display raw data clutter**. Executives require:
1. **Immediate Context**: High-level, red-or-green strategic metrics.
2. **Actionable Recommendations**: Clear, cost-justified suggestions (what to order, where to allocate).
3. **Auditable Guardrails**: Full visibility into assumptions, data limitations, and override audit trails.
4. **No Black Boxes**: Explainable optimization constraints and models.

---

## Consolidated Analytics Pipeline Outputs

To ensure the executive DSS dashboard functions as a unified decision engine, it consolidates and exposes the **entire set of outputs** generated across all three analytical stages, mapped directly to our North Star Mind Map items:

### 1. Descriptive Analytics Outputs (Historical Baseline)
* **Ingestion Quality Logs**: Total rows processed vs. accepted clean rows, highlighting isolated margin anomalies.
* **Geographic & Channel Segmentations** `[North Star 2A & 6A & 7A]`: Clean actual sales vs. sales with backward-allocated service contracts (clearly flagged as `estimated_backward_allocation`).
* **Seasonality Indices** `[North Star 3A]`: Calculated monthly historical demand multipliers via STL decomposition (e.g., historical Dengue seasonal surges).
* **YoY Demand Growth Trends** `[North Star 5A]`: Comparative monthly growth percentages between consecutive baseline years (2021–2025).
* **Pareto Revenue Share bands** `[North Star 4A]`: Categorized product groups (A, B, C bands based on historical sales concentration).

### 2. Predictive Analytics Outputs (Forecasting & Risk Scoring)
* **Prophet Demand Forecasts** `[North Star 2B]`: Monthly expected demand volumes `y(t)` for the target planning period (2026/2027), mapped with upper and lower confidence intervals.
* **Forecast Accuracy Metrics** `[North Star 3B]`: Display of MAPE, RMSE, MAE, and naive seasonal benchmarks to establish trust.
* **Model Fallback Indicators** `[North Star 4B & 5B]`: Visual flags showing whether forecast calculations are using active exogenous regressors (`DLI/DII` for disease-driven demand, `RSI` for rainfall-driven demand) or have safely downgraded to a historical naive baseline.
* **XGBoost Classifications & Scores** `[North Star 6B & 7B]`: Predicted ABC class designations and continuous numerical Demand Urgency Scores for cold-start (new/low-history) and existing SKUs.

### 3. Prescriptive Analytics Outputs (Optimization & Action)
* **MCDA Priority Scores** `[North Star 6C]`: Unified territory priority scores calculated via weighted multi-criteria ranks (revenue, growth, and epidemiological risk).
* **Inventory Control Parameters** `[North Star 2C & 3C]`: Cost-minimized Economic Order Quantities (EOQ), reorder triggers (Reorder Points - ROP), and target Safety Stock buffers.
* **LP Allocation Matrices** `[North Star 2C & 6C]`: Optimized stock distribution quantities mapped by product and province, detailing active binding constraints (e.g., budget limits or capacity ceilings) while targeting expiry wastage $\le 5\%$.
* **Collaborative Filtering Recommendations** `[North Star 7C]`: Recommended product-territory expansion pairings with matching cosine similarity metrics.
* **Stop-Purchasing Flag** `[North Star 8C]`: System flag isolating dead-stock Class C items based on the trailing 6-month transaction velocity.
* **System Override Records** `[North Star 4C & 5C]`: High-contrast typhoon and outbreak alert banners overriding default parameters, paired with mandatory planner comments in the immutable audit log.

---

## Weather & Disease Data Integration (Baselines & Context)

To support environmental decision models, the dashboard relies on the following clean external datasets. The interface must explicitly present their parameters and limitations:

1. **Department of Health (DOH) Disease Data (2021–2025)**:
   * *UI Representation*: Sourced from [doh_historical_clean.csv](file:///c:/Users/Ethan/medshield-alt-working-repo/datasources/clean/doh/doh_historical_clean.csv).
   * *Metric*: Monthly Disease Intensity Indicator (DII) by province for Dengue, Leptospirosis, and Influenza.
   * *Limitation*: The system must label this data as **"Historical epidemiological reference signals"** and *never* describe it as a live, real-time disease outbreak surveillance alert.
2. **PAGASA Meteorological Reference (2021–2024)**:
   * *UI Representation*: Sourced from [pagasa_historical_clean.csv](file:///c:/Users/Ethan/medshield-alt-working-repo/datasources/clean/pagasa/pagasa_historical_clean.csv).
   * *Metric*: Rainfall (mm), humidity, wind speed, and temperature from historical station logs.
   * *Limitation*: Sourced from historical logs only; cannot be used for post-2024 active forecasting.
3. **Open-Meteo Weather API Reanalysis Proxy (2021–2025)**:
   * *UI Representation*: Sourced from [weather_api_observations_clean.csv](file:///c:/Users/Ethan/medshield-alt-working-repo/datasources/clean/weather_api/weather_api_observations_clean.csv).
   * *Metric*: Localized weather patterns by coordinates, used to generate the Monthly Severity Proxy (0.0 to 1.0) and Rainfall Severity Index (RSI).
   * *Limitation*: Must be labeled as **"Provider-derived weather proxy observations"** and *never* presented as official PAGASA alert signals.

---

## Interface Layout & Navigation Architecture (Section 3.8 Alignment)

To support executive workflows and align directly with **Section 3.8** of the Capstone manuscript (Figures 3.11 through 3.48), the MedShield DSS interface is organized into **5 Core Modules**:

```text
+---------------------------------------------------------------------------------------------------+
| MedShield DSS  [Mod 1: Home/Nav]  [Mod 2: Sales Diag]  [Mod 3: Prioritization]  [Mod 4: Forecast]  [Mod 5: Prescriptive/Upload] |
+---------------------------------------------------------------------------------------------------+
```

### Module 1: Home Page & Navigation (Figures 3.11–3.18)
* **Target Audience**: Chief Executive Officer (CEO), Chief Operations Officer (COO), and VP of Procurement.
* **Layout Goal**: Provide immediate, read-only situational awareness within 5 seconds of loading the page.
* **Page Elements**:
  * **Assignment & Mapping Banner**: Top collapsible card summarizing immediate assignment uploads and the Objective-to-Solution matrix.
  * **Top Banner**: High-contrast, dynamic environmental alerts (disease outbreaks or typhoon triggers).
  * **KPI Summary Cards**: Corporate Revenue, Gross Profit Margin, Active Risk Index, and ETL Pipeline Data Health.
  * **Unified Strategic Overview**: Historical actual sales transitioning into Prophet demand forecasts with shaded confidence bounds.

### Module 2: Sales Diagnostic Module (Figures 3.19–3.22)
* **Target Audience**: Business Analysts and Operations Researchers.
* **Layout Goal**: Analyze 2021–2025 historical sales baselines across delivery territories.
* **Page Elements**:
  * **Interactive Granularity Sidebar**: Time granularity selectors (Monthly, Weekly, Annual) and territory/channel dropdowns.
  * **Service Contract Toggle**: Switch to toggle between actual sales only vs. backward-allocated service contract estimates (`estimated_backward_allocation`).
  * **STL Decomposition Heatmap**: Visual grid translating time-series decompositions into monthly seasonality multipliers (e.g., Dengue surges in July–August).
  * **YoY Comparative Growth Chart**: Dual-axis line and bar chart comparing baseline years (2021–2025).

### Module 3: Product & Area Prioritization Modules (Figures 3.24–3.35)
* **Target Audience**: Category Managers, Procurement Officers, and Sales Leads.
* **Layout Goal**: Identify key revenue drivers, client account channels, and slow-moving items.
* **Page Elements**:
  * **Pareto 80/20 Revenue Curve**: Cumulative revenue chart isolating Class A (top 80% revenue), Class B (next 15%), and Class C (bottom 5%).
  * **Pareto Doughnut Chart**: Portfolio mix breakdown showing product group concentrations.
  * **Account Channel Leaderboard**: Comparative ranking by institutional channel (Government Bidding, Hospital Tenders, Retail Pharmacies).
  * **Slow-Movers & Stop-Purchasing Flags**: Table identifying dead-stock Class C items based on trailing 6-month transaction velocity.
  * **XGBoost ABC Classifier**: Machine learning predicted ABC ranks and feature importance scores.

### Module 4: Forecast Modeling Module (Figures 3.36–3.41)
* **Target Audience**: Supply Chain Analysts and Lead Demand Forecasters.
* **Layout Goal**: Forecast territory-level pharmaceutical demand and score stockout vulnerability.
* **Page Elements**:
  * **Facebook Prophet Demand Projections**: Interactive trend lines mapping expected demand `y(t)` for 2026/2027 with upper and lower confidence intervals.
  * **Model Fallback Indicators**: Visual flags showing active DII & RSI external regressors vs historical Naive Baseline fallback state.
  * **XGBoost Urgency Scoring Table**: Continuous Demand Urgency Scores (0.00 to 1.00) combining forecast volume, velocity, and stock levels.

### Module 5: Prescriptive Planning & Data Upload Modules (Figures 3.42–3.48)
* **Target Audience**: Inventory Planners, Procurement Directorate, and System Administrators.
* **Layout Goal**: Optimize procurement, execute regional stock allocation (targeting expiry wastage $\le 5\%$), and manage data ingestion.
* **Page Elements**:
  * **Scenario Control Sidebar**: Interactive sliders for adjusting replenishment Lead Time, Holding Cost rates, Target Service Levels (Z-factor), and LP Budget Ceiling.
  * **EOQ & ROP Planning Table**: Cost-minimizing order quantities (EOQ), Safety Stock buffers, Reorder Points (ROP), and inline "Approve Order" actions.
  * **MCDA & Linear Programming Allocation Matrix**: Optimized stock distribution grid by province detailing active binding constraints.
  * **Collaborative Filtering Expansion**: Product-region pairing suggestions based on cosine similarity metrics.
  * **Live Data Ingestion & Audit Console**: Drag-and-drop CSV parser, raw vs accepted row counter, isolated margin anomaly log, and immutable human-in-the-loop DSS audit trail.

---
* **Layout Goal**: Monitor system logs, audit decision trails, and manage data parameters.
* **Page Elements**:
  * **DSS Action Log Table**: Immutable audit log of all human approvals, quantity modifications, timestamps, and planner comments.
  * **Manual Alert Override Console**: Administrator toggle panel to manually simulate DOH disease alerts or PAGASA typhoon contingencies.
  * **ETL Ingestion Log**: Detail panel showing file run statistics, duplicate records isolated, and data contract validations.

---

## Step-by-Step Dashboard Build Process

```mermaid
graph TD
    S1[Step 1: Ingestion & Quality Gates] --> S2[Step 2: Taxonomy & Segmentation]
    S2 --> S3[Step 3: Descriptive Baselines]
    S3 --> S4[Step 4: Forecast Projections]
    S4 --> S5[Step 5: Prescriptive Optimization]
    S5 --> S6[Step 6: Human Approvals & Actions]
```

### Step 1: Establish Data Trust & Quality Gates (Ingestion Layer)
Executives will reject a dashboard if they find even a minor math discrepancy. Building trust starts at the ingestion gate.
* **Objective**: Ensure the data feeding the dashboard is audited and clean.
* **UI Elements to Add (Page 4)**:
  * **Data Health Status Badge**: A high-level visual indicator (e.g., green "100% Reconciled" or amber "Warning: Anomalies Isolated").
  * **ETL Cleanliness Summary Card**: Shows raw transaction row count, accepted clean sales row count, and the number of isolated or unmapped records.
* **Design Considerations**:
  * *Background Aggregations*: Raw file validation must run asynchronously in background jobs (e.g., using scheduled tasks) rather than on page load, keeping page load times under 2 seconds.
  * *Audit Log Security*: Store all ingestion validation flags and rejected row logs in a read-only audit table in Supabase.
* **Bad Practices to Avoid**:
  * *Never hide data quality issues*: Do not average out or ignore anomalous dates. Display a simple status card outlining raw rows loaded versus accepted rows.
  * *Isolate Gross Margin anomalies*: If cost exceeds sales price in error, flag it and separate it. Do not let company-wide gross margins display skewed numbers.

---

### Step 2: Align Clean Business Taxonomy (Segmentation Layer)
Before displaying sales or product performance, clean historical files of operational noise that skew business performance.
* **Objective**: Group records into standard, approved corporate segments.
* **UI Elements to Add (Page 2)**:
  * **Global Segmentation & Time Granularity Filters**: Dropdown selectors for Physical Territory (e.g., Batangas, Quezon), Customer Channel (e.g., Government, Hospital, Pharmacy), Product Category, and **Time Granularity (Weekly, Monthly, Annual)**.
  * **Allocated Service Contract Toggle**: A visible switch allowing planners to view "Actual Sales Only" versus "Sales with Allocated Service Contracts."
  * **Backward-Allocated Row Indicator**: Clear tags or color-coding next to product rows generated via backward approximation.
* **Design Considerations**:
  * *Client-side Caching*: Store segment filter configurations locally in client memory. Swapping territories or channels should trigger instant client-side transitions without sluggish full-page refreshes.
* **Bad Practices to Avoid**:
  * *Do not mix internal cost centers with sales*: Non-sales rows (like administrative costs or inventory write-offs) must be automatically filtered out of revenue metrics.
  * *Separate Service Contracts from Product Sales*: Bulk area contracts (e.g., "PAGBILAO # 13,500,000") must be allocated to estimated child SKUs via a historical product-mix profile. The dashboard must clearly label these rows as `estimated_backward_allocation` so executives know they are estimates.

---

### Step 3: Render Descriptive Strategic Baselines (Historical Layer)
Provide the backward-looking context that anchors executive goals.
* **Objective**: Show how the business has performed historically, accounting for seasonality and growth.
* **UI Elements to Add (Pages 1 & 2)**:
  * **YoY Demand Growth Chart**: Dual-axis line and bar chart displaying monthly sales trends compared against prior years.
  * **Seasonality Index Heatmap**: Visual grid translating time-series decompositions into simple monthly demand multipliers (e.g., "Dengue medicines see a 1.3x typical demand spike in August").
  * **Territory Revenue & Margin Leaderboard**: Clean ranked lists of physical delivery areas sorted by profit margin and total revenue contribution.
* **Design Considerations**:
  * *Visual Hierarchy*: Place high-level KPI cards at the top of this view, followed by seasonality heatmaps, and detail lists at the bottom.
* **Bad Practices to Avoid**:
  * *Do not compare partial periods directly*: Late 2025 contains incomplete records. Comparing late 2025 to 2024 without a disclaimer is a bad practice that displays a false business decline. The dashboard must grey out and label partial periods.

---

### Step 4: Project Demand Ranges & Confidence Limits (Predictive Layer)
Look forward using predictive forecasting, but always frame predictions within risk boundaries.
* **Objective**: Show expected demand for the upcoming planning cycle.
* **UI Elements to Add (Pages 1 & 2)**:
  * **Demand Forecast Chart**: Interactive trend chart displaying historical sales transitioning seamlessly into a forecast line (e.g., 2026/2027) surrounded by a shaded forecast demand range (upper and lower confidence bounds).
  * **Model Fallback Status Indicator**: A badge showing if the model is currently using exogenous disease/weather regressors (e.g., `DII_lag`, `RSI`) or if it has downgraded to the historical Naive Baseline.
  * **Cold-Start ABC Classifier Labels**: A badge indicating XGBoost-predicted ABC ranks for new/low-history SKUs, accompanied by a classifier performance score.
* **Design Considerations**:
  * *Readable Visualizations*: Always pair forecast lines with hover tooltips displaying the exact upper and lower bounds to help planners assess inventory risk.
* **Bad Practices to Avoid**:
  * *Do not present forecasts as absolute certainty*: Always display the shaded confidence interval.
  * *Disclose forecast model fallbacks*: If external DOH disease or PAGASA weather data feeds are offline, display a fallback label showing that the system has downgraded to a historical-only Naive Baseline.

---

### Step 5: Display Prescriptive Scenarios & Cost Levers (Optimization Layer)
Provide actionable guidance for stock purchases and allocations, while making operational limits transparent.
* **Objective**: Provide recommended order quantities (EOQ), reorder triggers (ROP), and regional stock allocations.
* **UI Elements to Add (Page 3)**:
  * **Scenario Sliders Sidebar**: Interactive input sliders for lead times, holding costs, target service levels, and optimization budgets.
  * **EOQ & ROP Planning Table**: Reorder list detailing current stock, Safety Stock target, ROP trigger, and recommended order quantity (EOQ).
  * **LP Stock Allocation Table**: Multi-column matrix showing optimized allocation splits by region, highlighting unmet demand.
  * **Product-Region Recommendations Matrix**: Sourced from collaborative filtering, showing products recommended for expansion into new regions based on cosine similarity.
* **Design Considerations**:
  * *Explain optimization limits (No Black Boxes)*: Provide a sidebar showing which **binding constraints** restricted allocations (e.g., "Allocation limited by: Budget Limit" or "Allocation limited by: Safety Stock minimum").
* **Bad Practices to Avoid**:
  * *Do not label illustrative outputs as finalized optimizations*: If actual operating costs, warehouse capacity, and lead-time data are incomplete in the database, the dashboard must label these views as **"Scenario-Based Demonstrations"** rather than "Cost-Minimizing Recommendations."

---

### Step 6: Enforce Human-in-the-Loop Approvals (Action Layer)
A decision support system should support the executive, not replace them.
* **Objective**: Convert dashboard views into recorded business actions.
* **UI Elements to Add (Page 3 & 4)**:
  * **Approval Buttons**: Interactive "Approve Recommendation" and "Modify and Apply" actions next to every ROP/EOQ and allocation row.
  * **Override Entry Form**: A text area to capture the planner's mandatory justification before applying custom reorder or allocation numbers.
  * **DSS Action Log**: A historical log table displaying planner approvals, custom quantity adjustments, timestamps, and reviews.
  * **Dynamic Override Alert Banners**: High-contrast banners showing when typhoon overrides (PAGASA Warning Signal >= 2) or disease alerts (cases > baseline + 2 * std dev) have bypassed normal rules.
* **Design Considerations**:
  * *Role-Based Security*: Restrict approval actions and override configurations to authorized procurement officers and executives.
  * *Immutable Audit Logging*: Ensure that every approved action and approval comment is written to an immutable history table in Supabase.
* **Bad Practices to Avoid**:
  * *No automated unchecked actions*: Any approved reorder or stock transfer must prompt the user for an approval comment and record the action, creating a transparent **Audit Trail** in the system database.

---

## Future-Proofing Architecture & Maintenance Strategy

To ensure MedShield Corporation's DSS remains maintainable, scalable, and resilient beyond Capstone 2, the system incorporates the following **6 Future-Proofing Pillars**:

```mermaid
graph TD
    P1[Pillar 1: Dynamic Data Contracts] --> P2[Pillar 2: Model Fallback Resilience]
    P2 --> P3[Pillar 3: Pluggable Solvers & Scenarios]
    P3 --> P4[Pillar 4: Immutable Audit Trail]
    P4 --> P5[Pillar 5: Asynchronous Ingestion Gates]
    P5 --> P6[Pillar 6: Manuscript & Objective Mapping]
```

### Pillar 1: Dynamic Data Contracts & Zero-Hardcoding Taxonomy
* **Principle**: Never hardcode territory lists, SKUs, or province names directly inside UI code.
* **Implementation**: The UI dynamically populates dropdowns and tables from the underlying database schema (`dashboard_sales_snapshot.json` / Supabase tables).
* **Expansion Behavior**: When unserviced reference locations (e.g., Palawan, Sorsogon, Masbate) acquire active sales transactions, the UI automatically transitions them from `No Data (—)` to active performance metrics without requiring code changes.

### Pillar 2: Model Versioning & Dynamic Fallback Resilience
* **Principle**: Avoid system breakage when external API feeds or machine learning models fail.
* **Implementation**: The forecasting engine supports model fallback indicators. If DOH disease or Open-Meteo weather APIs experience downtime, the system automatically downgrades from Prophet with exogenous regressors to a historical **Naive Seasonal Baseline** and displays a visual fallback badge in the UI.

### Pillar 3: Pluggable Prescriptive Optimization Solvers
* **Principle**: Decouple operational sliders from hardcoded math calculations.
* **Implementation**: Prescriptive optimization (EOQ, ROP, Safety Stock, MCDA, and Linear Programming) uses parameterized REST API endpoints. Planners can dynamically test scenario sliders (Lead Time: 5–45 days, Holding Cost: 5–35%, Service Level: 80–99%, LP Budget Cap: ₱10M–₱100M).
* **Expiry Wastage Target**: The LP solver continuously enforces the cap constraint targeting **expiry wastage $\le 5\%$**.

### Pillar 4: Immutable Audit Trail & Role-Based Access Control (RBAC)
* **Principle**: Guarantee 100% compliance with corporate governance and audit requirements.
* **Implementation**: Every human approval, manual quantity override, or typhoon/outbreak contingency trigger is written to an immutable, append-only history table (`dss_action_logs` in Supabase) containing planner comments, user IDs, and timestamps.

### Pillar 5: Asynchronous ETL Ingestion Gates
* **Principle**: Prevent raw CSV uploads from slowing down page render times.
* **Implementation**: Sales batch uploads run asynchronously via background workers. Raw rows are validated against data quality contracts, isolating margin anomalies and flagging estimated backward-allocated service contract rows (`estimated_backward_allocation`).

### Pillar 6: Section 3.8 Manuscript & Presentation Alignment Guardrails
* **Principle**: Ensure code updates never drift from Capstone 2 academic defense requirements.
* **Implementation**: The 5 core UI walkthrough modules (Figures 3.11–3.48) and Objective-to-Solution mapping table are codified as a permanent system specification, guaranteeing that prototype demonstrations directly reflect the Capstone 1 paper.

