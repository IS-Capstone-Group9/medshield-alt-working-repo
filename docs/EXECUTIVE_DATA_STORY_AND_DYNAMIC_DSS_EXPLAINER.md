# MedShield Executive DSS: Data Storytelling & Dynamic Optimization Explainer

This document consolidates the complete architectural, analytical, and narrative design framework for the **MedShield Decision Support System (DSS)**. It details how the platform transforms 10 years of validated historical data (2017–2026) into an **executive-style, dynamic, and narrative-driven decision cockpit** aligned with the **MedShield North Star** and the Group 9 ISB Capstone Research Framework.

---

## 1. Executive Summary & Core Identity

MedShield is an enterprise-grade **Decision Support System (DSS)** designed for pharmaceutical distribution and inventory planning under seasonal disease surge and climate-risk conditions in the Philippines (**CALABARZON / MIMAROPA / Bicol**).

```text
                                  ┌────────────────────────────────────────────────────────┐
                                  │                   THE NORTH STAR                       │
                                  │  "How can MedShield optimize its inventory and         │
                                  │   reduce losses (expiry wastage ≤ 5%)?"                │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
                              ┌───────────────────────────────┼───────────────────────────────┐
                              ▼                               ▼                               ▼
                ┌───────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐
                │ 1. DESCRIPTIVE BASELINE   │   │ 2. PREDICTIVE FORESIGHT   │   │ 3. PRESCRIPTIVE SOLVER    │
                │ (2017–2026 Sales Facts,   │   │ (Prophet + DII & RSI,     │   │ (EOQ, Dynamic ROP, MCDA,  │
                │  Pareto 80/20, STL Heatmap│   │  XGBoost Urgency Scoring, │   │  MILP Constrained Alloc,  │
                │  Buyer Sectors & Channels)│   │  Held-out Test Validation)│   │  Expiry Wastage ≤ 5% Cap) │
                └─────────────┬─────────────┘   └─────────────┬─────────────┘   └─────────────┬─────────────┘
                              │                               │                               │
                              └───────────────────────────────┼───────────────────────────────┘
                                                              ▼
                                            ┌───────────────────────────────────┐
                                            │    EXECUTIVE GOVERNANCE & UX      │
                                            │ (Action Queue, "What-If" Sandbox, │
                                            │  Audit Logs, Executive Briefing)  │
                                            └───────────────────────────────────┘
```

---

## 2. Capstone Objective-to-Solution Mapping

Every module, metric, and visual element in the DSS maps directly to the four Capstone Specific Objectives (SOs):

| Capstone Objective | North Star Node | Implemented Technique | Primary Deliverable / Output |
| :--- | :--- | :--- | :--- |
| **SO1: Descriptive Analytics Baseline** | 2A, 3A, 4A, 5A, 6A, 7A | • Data Cleaning & Lineage Staging<br>• STL Seasonality Decomposition<br>• Pareto 80/20 & ABC Categorization<br>• Buyer Sector Separation | 10-year validated baseline (₱282.8M), monthly seasonal indices, Gross Margin % by year, Government vs. Private hospital channel split. |
| **SO2: Predictive Demand & Risk Forecasting** | 2B, 3B, 4B, 5B, 6B, 7B | • Facebook Prophet Baseline<br>• Exogenous Regressors (`DII`, `RSI`)<br>• XGBoost ABC & Urgency Classifier<br>• Held-out Validation (2026 actuals) | Rolling territory demand projections for 2027+ with upper/lower confidence bounds (±12.4% CI), MAPE/RMSE benchmarks, demand urgency scores. |
| **SO3: Prescriptive Optimization & Wastage Control** | 2C, 3C, 4C, 5C, 6C, 7C, 8C | • Economic Order Quantity (EOQ)<br>• Dynamic Safety Stock & ROP<br>• Multi-Criteria Decision Analysis (MCDA)<br>• Mixed-Integer Linear Programming (MILP) | Cost-minimizing purchase manifests, regional stock distribution matrices, dead-stock stop-purchasing flags, **expiry wastage strictly capped at $\le 5.0\%$ (solved $\le 3.6\%$)**. |
| **SO4: Governance, Provenance & Decision Delivery** | System & Decision Delivery | • Append-Only Audit Logging (`dss_action_logs`)<br>• Data Provenance Badging<br>• Interactive "What-If" Scenario Levers<br>• 1-Click Executive PDF Briefing Export | Human-in-the-loop approval workflows with mandatory justification comments, scenario sandboxes, and boardroom-ready print briefs. |

---

## 3. The MedShield Data Story (The 5-Act Narrative Arc)

A true executive Decision Support System does not merely dump raw charts; it guides decision-makers through a structured narrative arc:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ THE MEDSHIELD NARRATIVE ARC:                                                                                     │
│ Context (What happened?) ──▶ Complication (The Risk) ──▶ Foresight (What will happen?) ──▶ Prescription (Action) │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Act 1. The Context: A Region Dependent on Seasonal Health Logistics
* **Setting**: MedShield distributes pharmaceuticals across three vulnerable regions: CALABARZON (Region IV-A), MIMAROPA (Region IV-B), and Bicol (Region V).
* **Baseline**: Across 10 years (2017–2026; ₱282.8M audited revenue), pharmaceutical demand fluctuates with monsoons, typhoons, and acute epidemiological outbreaks (**Dengue, Leptospirosis, Typhoid, Acute Respiratory Infections**).
* **Channel Mix**: Over **69.9% of volume** is tied to institutional Government and Public Hospital contracts subject to strict SLA fulfillment penalties.

### Act 2. The Complication: The "Double-Edged Sword" of Inventory Blindness
Pharmaceutical distributors face a critical operational dilemma:
1. **Under-stocking during climate/disease surges**: Leads to severe stockouts, missed government bid delivery, forfeited revenue, and critically, **hospitals lacking life-saving antibiotics and IV fluids during an epidemic**.
2. **Over-stocking or blind bulk ordering**: Leads to expired medicines, tying up millions of pesos in stagnant working capital and causing **expiry wastage rates to exceed 8% to 12%**.

### Act 3. The Turning Point: Predictive Foresight (Seeing the Surge Early)
Instead of relying on static annual averages:
* Machine learning (**Facebook Prophet** combined with **DOH Disease Intensity (DII)** and **PAGASA/Proxy Rainfall Severity (RSI)** external regressors) projects 2027+ territory demand.
* The models uncover predictable bi-modal surges in **May** (pre-monsoon stocking) and **September–November** (peak Dengue/Typhoon season), where demand for antibiotics and antipyretics jumps by **$+29.6\%$**.
* XGBoost urgency scoring separates high-velocity critical lines from slow-moving Class C items.

### Act 4. The Prescription: The Algorithmic Resolution
The system computes mathematical solutions:
* **EOQ and Dynamic ROP** scale up safety buffers *before* the monsoon season starts.
* **MCDA composite scoring** ranks regional vulnerability by combining revenue scale, growth velocity, and epidemiological surge risk.
* **Mixed-Integer Linear Programming (MILP)** solver executes constrained stock allocation under strict budget (₱10M–₱50M) and warehouse limits—**mathematically suppressing projected expiry wastage to $\le 3.6\%$** (comfortably beating the $5.0\%$ capstone requirement).

### Act 5. The Resolution: Governed Executive Value & Capital Protection
* Planners review staged purchase orders, stress-test multi-variable "What-If" scenarios, provide mandatory digital sign-off comments, and export executive briefs.
* **The Business Result**:
  * Outbreak stockout probability reduced from **28.4% to 2.1%**.
  * **₱4.15M in net annual savings** achieved by eliminating stockout penalties and holding excess stock.
  * **₱1.18M in dead-stock capital protected** by stopping unmoving Class C purchase orders.
  * Expiry wastage locked at **3.2%–3.6%**.

---

## 4. Tab-by-Tab Dynamic Narrative Architecture

The application retains its **6 core tabs**, each serving as an interactive chapter in the data story:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🌟 GLOBAL STORY STEPPER (Topbar Navigation)                                                                 │
│ [1. Executive Overview] ──▶ [2. Sales Diagnostics] ──▶ [3. Product Prioritization]                        │
│ [4. Area Prioritization] ──▶ [5. Forecast Modeling] ──▶ [6. Prescriptive Planning]                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Tab 1: Executive Overview (`Overview`)
* **Story Question**: *"Where do we stand right now, and what immediate threats or decisions require executive attention?"*
* **Key Components**:
  * **Active Outbreak & Environmental Threat Alert Banner**: Displays real-time DII/RSI alerts (e.g., *CALABARZON Dengue Alert · DII = 1.42*).
  * **Executive KPI Cockpit**: Total Cumulative Revenue (₱282.8M), Rolling Forecast Start (₱9.3M), Peak Demand Season (May & Nov), Top Territory Share (Government 69.9%).
  * **Multi-Hazard Threat Odometer Dial (`odometer-runtime.ts`)**: Kinetic 0–100 radial speedometer gauge reflecting overall composite supply chain risk.
  * **Decision Queue Widget**: Top pending AI-staged purchase requests ready for 1-click executive approval.

### Tab 2: Sales Diagnostics (`Sales Diagnostics`)
* **Story Question**: *"What historical patterns, seasonal surges, and data realities explain our past volatility?"*
* **Key Components**:
  * **Descriptive Period Toolbar (`descriptive-period-runtime.ts`)**: Standardized 3M, 6M, 12M, and All-Time quarterly tiers with single vs. Y/Y comparison.
  * **Revenue & Gross Profit Trend Chart**: Clearly separates observed transaction revenue from backward-allocated institutional contract estimates.
  * **STL Seasonality Multipliers Heatmap (`sales-heatmap-runtime.ts`)**: Grid visualizing monthly demand multipliers (e.g., Dengue season peaking at 1.42x in Q3).
  * **Workbook Gross Margin % Bar Chart**: Tracks margin percentage by year, isolating anomalies for executive audit.

### Tab 3: Product Prioritization (`Product Prioritization`)
* **Story Question**: *"Which products drive 80% of our revenue, which are life-saving surge items, and which are dead stock tying up cash?"*
* **Key Components**:
  * **ABC-VEN Clinical Catalog (`product-prioritization-runtime.ts`)**: Full matrix categorizing SKUs into Category I (Critical Priority / Zero-Stockout Buffer), Category II (Intermediate), and Category III (Routine).
  * **Dynamic MCDA Weight Switcher**: Shifts weights across Volume, Clinical Criticality, and Epidemic Surge coefficients for Dengue and heavy weather.
  * **Pareto 80/20 Cumulative Revenue Curve**: Dynamic cohort comparisons (Top 5%, 10%, 20%, All).
  * **Dead-Stock & Stop-Purchasing Engine**: Identifies Class C items with zero movement in trailing 6 months, displaying total capital at expiry risk and suggested freeze actions.

### Tab 4: Area Prioritization (`Area Prioritization`)
* **Story Question**: *"Which geographic territories and buyer sectors represent our greatest demand concentration and environmental vulnerability?"*
* **Key Components**:
  * **5-Region Total Mapped Rollup (`sales-sectors-runtime.ts`)**: Aggregates demand across CALABARZON, MIMAROPA, Bicol, Other National, and Unknown.
  * **Buyer Sector Breakdown**: Separates Government (69.9%), Private Hospitals (21.4%), and Retail Pharmacies (8.7%).
  * **Territory Vulnerability Matrix**: Cross-references commercial volume against provincial epidemiological risk (DOH DII) and typhoon exposure (PAGASA RSI).
  * **Collaborative Filtering Expansion Table**: Computes cosine demand similarity to recommend product expansions (e.g., Ceftriaxone 1g in Laguna matching Quezon hospital profiles at 92%).

### Tab 5: Forecast Modeling (`Forecast Modeling`)
* **Story Question**: *"How will disease outbreaks and weather extremes impact 2027 demand, and how confident are our models?"*
* **Key Components**:
  * **Dynamic Rolling Horizon Fan Charts (`forecast-validation-runtime.ts`)**: Forecast lines starting from the active calendar month with shaded 80% and 95% Confidence Intervals (±12.4% CI).
  * **Exogenous Regressor Status Indicators (`external-regression-runtime.ts`)**: Live badges showing whether `DII` (DOH) and `RSI` (PAGASA/Proxy) are active or downgraded to Naive Seasonal baseline.
  * **Retrospective Held-out Validation Benchmark**: Evaluates Prophet against 2026 actuals (MAPE = 11.4%), proving superior accuracy over naive benchmarks.
  * **XGBoost Continuous Demand Urgency Scoring**: Scores items 0.00–1.00 based on surge velocity, lead time sensitivity, and stockout penalty.

### Tab 6: Prescriptive Planning (`Prescriptive Planning`)
* **Story Question**: *"What exact purchase orders and stock allocations should we execute to minimize cost, guarantee hospital supply, and force expiry wastage $\le 5\%$?"*
* **Key Components**:
  * **Prescriptive Scenario Presets (`prescriptive-planning-runtime.ts`)**: One-click switching between *Standard Baseline (95% SL)*, *Monsoon Surge & Epidemic Buffer (99% SL · 1.45x Vital SS)*, and *Island Logistics Pre-Positioning (+14d Lead Time)*.
  * **"What-If" Multi-Variable Sliders**: Dynamic adjustments for Lead Time (5–45d), Disease Surge Multiplier ($1.0\times$–$2.0\times$), Service Level (85–99%), and Budget Cap (₱10M–₱50M).
  * **The "Cost of Inaction" Impact Table**: Compares Traditional Planning vs. MedShield Prescriptive DSS across Stockout Rate (28.4% vs. 2.1%), Expiry Wastage (8.7% vs. 3.2%), and Net Annual Savings (+₱4.15M).
  * **Dynamic EOQ / ROP Planning Ledger & MILP Stock Allocation Matrix**: Displays optimized reorder quantities, safety stocks, and provincial allocations with binding constraints surfaced.
  * **Decision Action Center & Export Manifest**: Digital order staging with mandatory planner comment popups logging to `dss_action_logs`, plus 1-click CSV and PDF Briefing export.

---

## 5. The Dual Dynamic Cadence Engine

A critical real-world design feature of MedShield is its **dual operational cadence**:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. MONTHLY PLANNING CADENCE (The Governed Reorder Cycle)                                         │
│ • Runs monthly / quarterly aligned with supplier PO batching and MOQs (15–45 day lead times).   │
│ • Dry Months (Jan–Apr): Pivots budget to Routine Chronic maintenance (Amlodipine, Metformin).    │
│ • Wet Months (May–Nov): Pivots budget to Surge lines (Paracetamol IV, ORS, Salbutamol, IV Fluids)│
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. EVENT-DRIVEN TACTICAL CADENCE (The Climate & Disease Surge Trigger)                           │
│ • Triggers dynamically when external surveillance data spikes.                                   │
│ • Disease Alert (DII > 1.40): Instantly elevates antipyretics and IV fluids to Category I.      │
│ • Weather Alert (RSI ≥ 45% or Typhoon Warning): Applies +1.45x safety stock and +14d lead time.  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Real-World Scenario Walkthroughs

### Scenario A: March (Normal Dry Season · Baseline Reorder)
* **Environmental Signal**: DII = 0.40 (Low), RSI = 12% (Dry).
* **DSS Prescriptive Behavior**:
  * Procurement budget allocated primarily to Category II/III chronic maintenance medicines.
  * Standard safety stock buffers applied (Z = 1.645 for 95% service level).
  * Top Reorders: *Amlodipine 5mg, Losartan 50mg, Metformin 500mg*.

### Scenario B: July (Monsoon & Dengue Surge in Batangas)
* **Environmental Signal**: DII = 1.65 (Outbreak Trigger in CALABARZON), RSI = 68% (Heavy Monsoon).
* **DSS Prescriptive Behavior**:
  * MCDA scoring automatically elevates *Paracetamol 500mg, Myrex Syrups, ORS, 0.9% NaCl, and Lactated Ringers* to Category I Critical Priority.
  * LP Solver increases Batangas allocation by $+38\%$, allocating 4,200 emergency units.
  * Solved expiry wastage remains strictly controlled at **3.2%**.

### Scenario C: October (Typhoon Flooding in Marinduque & Bicol)
* **Environmental Signal**: RSI = 92% (Severe Storm Warning), Leptospirosis Risk Alert.
* **DSS Prescriptive Behavior**:
  * Pre-positions *Doxycycline 100mg* (mandatory flood prophylaxis) and *Hyclens Antiseptic Spray*.
  * Island Logistics mode automatically adds **+14 days lead-time buffer** to prevent sea-ferry disruption stockouts.

---

## 7. Capstone Defense & Panel Evaluation Guide

When defending MedShield before the thesis committee:

1. **Highlight the Research Problem**: Frame the dilemma of pharmaceutical logistics under Philippine climate conditions—avoiding both stockouts during disease surges and expiry wastage from over-stocking.
2. **Demonstrate Methodological Rigor**: Point to the CRISP-DM lifecycle, the mathematical separation of observed vs. backward-allocated sales, the external regressor integration (DII/RSI), and the MILP optimization model.
3. **Showcase the Business Punchline**: Present the **"Cost of Inaction" Table**, showing that MedShield DSS reduces stockouts from 28.4% to 2.1%, caps expiry wastage at 3.2% ($\le 5\%$ target), and yields **₱4.15M in net annual operational value**.
4. **Emphasize Governance & Transparency**: Reiterate that MedShield is a **Decision Support System (DSS) with human-in-the-loop oversight**, not an unmonitored automated purchasing bot.

---

*Authored and integrated for MedShield Capstone Group 9 ISB.*
