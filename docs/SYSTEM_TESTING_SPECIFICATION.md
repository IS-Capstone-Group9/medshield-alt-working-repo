# MedShield System Testing Specification & QA Verification Guide

**Document Status:** Test-case reference; historical numeric examples are explicitly scoped below
**Version:** 1.1 (29 October 2026; execution-scope clarification)
**Standard Reference:** ISTQB System Testing (Test Level 3: Complete Integrated Black-Box System Verification)  
**Target Audience:** QA Engineers, System Evaluators, Capstone Defense Panel, Software Engineers

---

## Current execution guide — 29 October 2026

Use the [SO1–SO5 client walkthrough](CLIENT_ACCEPTANCE_WALKTHROUGH.md) for the
current original-source itemized Delta0 dashboard. Its linked evidence, local
panel controls, source identity and expected results supersede the older values
and labels below. [Current State](CURRENT_STATE.md) owns changing source/release
status. The walkthrough is prepared; client results remain not_run until an
actual review is recorded. Technical PASS is not client or operational approval.

Sections 3–5 retain the 20 October case examples/commands for traceability. Their
v20 totals, observation counts, forecast errors and older button labels must not
be used as current Delta0 assertions. Their general boundary requirements remain
useful, but each execution needs the matching source and actual controls. The
current task map is A1→ST-ANA-001/002, A2/A3→ST-ANA-003 (different product/area
bases), A4→ST-PRED-001, A5→ST-PLAN-001/002, A6→draft/review recovery and the
ST-ING-001 ingestion boundary. This mapping does not claim unexecuted tests pass.

## 1. Executive Summary & Purpose

This document formally specifies the **System Testing** suite for the MedShield Decision Support System (DSS). In software engineering and ISTQB standards, **System Testing** evaluates an integrated system (UI, application gateway, analytical store, database, and network interfaces) against specified functional, analytical, and non-functional requirements.

MedShield is an enterprise DSS for pharmaceutical distribution and inventory planning under seasonal disease conditions in the Philippines (CALABARZON, MIMAROPA, and Bicol). System Testing verifies that:
1. End-to-end user workflows function cohesively across the Next.js frontend, Express gateway, and Databricks analytical engine.
2. Analytical metrics and calculations strictly follow approved data contracts, matching-population baselines, and temporal isolation rules.
3. The system enforces strict fault-tolerance: when data sources fail or joins are unapproved, explicit unavailable states are shown rather than falling back to unverified mock/seed numbers.
4. Security and identity boundaries isolate secrets, preserving server-only privileges.

---

## 2. System Test Architecture & Preconditions

### 2.1 Environmental Boundary
* **Frontend:** Next.js 16 Client & Design Engine (`frontend/`)
* **Gateway:** Express / TypeScript Analytical API Gateway (`backend/`)
* **Analytical Store of Record:** Databricks Unity Catalog (`medshield_gold`)
* **Authentication & Audit:** Supabase (Auth, Role Claims, Access Logs)
* **Offline Analytics & Processing:** Python 3.13 (`services/`)

```
[ Next.js 16 Frontend ] 
       │ (HTTP/JSON + Auth Token)
       ▼
[ Express Gateway (configured port; see SETUP.md) ]
       ├── (SQL Execution / Contracts) ──► [ Databricks Unity Catalog (current pinned source contract) ]
       ├── (Identity & Audit Verification) ──► [ Supabase Auth ]
       └── (Offline Analytical Precomputations) ◄── [ Python services/ ]
```

### 2.2 Current execution preconditions

Use an existing authorized session, the source identity and exact independent
panel scope in the [client walkthrough](CLIENT_ACCEPTANCE_WALKTHROUGH.md).
Current technical browser evidence is scoped to Admin; it is not the full role
matrix. Preserve missing periods and candidate/publication labels. No new source
upload, pipeline run, release decision or purchase is required to review the
existing available-data screens. Current local setup is in [SETUP.md](SETUP.md).

### 2.3 Historical 20 October baseline — not current-source expectations
* **Study Scope:** 2017–2025 (`98/108` observed months, `2017–2019` partial coverage disclosed).
* **Time-Series / Decomposition Window:** 2020–2025 (`72` contiguous company months).
* **Analytical Candidate Dataset:** `Fact Delta v20` (`37,728` accepted facts, Net Sales `₱626,946,741.81`, Gross Profit `₱288,487,498.72`).
* **Active User Role:** Authenticated as an authorized decision-maker (`Analyst` or `Executive`).

---

## 3. Retained 20 October System Test Cases (historical value/label examples)

### Suite 1: Ingestion & Data Governance Boundaries (ST-ING)

#### Test Case ST-ING-001: Enforce Controlled Databricks Ingestion Gate
* **Test ID:** `ST-ING-001`
* **Test Level:** System Testing (Boundary / Security)
* **Objective:** Ensure direct file uploads are rejected by the API gateway to protect Databricks Unity Catalog data governance.
* **Preconditions:** User is logged in to the MedShield dashboard.
* **Test Procedure:**
  1. Open browser developer console or API client.
  2. Send a `POST` request to `/api/sales/upload` with a sample CSV payload.
* **Expected Result:**
  - Gateway responds with HTTP `409 Conflict`.
  - Error envelope contains code: `DATABRICKS_INGESTION_REQUIRED`.
  - The UI presents a governed message indicating that sales transactions must enter through the governed Databricks Delta pipeline. No database writes occur.
* **Automated Reference:** [`frontend/e2e/api-client-errors.spec.ts`](../frontend/e2e/api-client-errors.spec.ts)

---

### Suite 2: Descriptive & Diagnostic Analytics (ST-ANA)

#### Test Case ST-ANA-001: Dynamic Multi-Year Scope Filtering (2017–2025)
* **Test ID:** `ST-ANA-001`
* **Test Level:** System Testing (Functional / Data Integrity)
* **Objective:** Validate that the dashboard topbar filters dynamically evaluate all study years from 2017 through 2025 without arbitrary cutoffs or zero-filling missing periods.
* **Preconditions:** Executive Overview module is active.
* **Test Procedure:**
  1. Inspect the Year selector dropdown (`#topbarYearSelect`).
  2. Select `2017` (historical early year with 7 observed months).
  3. Select `All Time` (full 2017–2025 study scope).
* **Expected Result:**
  - When `2017` is selected: Net Sales displays exactly `₱10,211,167.35` across `7` observed months. Missing months (May–August, October 2017) are rendered as unknown/missing, **not as ₱0.00**.
  - When `All Time` is selected: Company Net Sales displays exactly `₱626,946,741.81` across `98` observed months.
* **Automated Reference:** [`outputs/study_scope_2017_2025_20261020/live.spec.ts`](../outputs/study_scope_2017_2025_20261020/live.spec.ts)

#### Test Case ST-ANA-002: Matching-Basis Gross Margin Denominator Isolation
* **Test ID:** `ST-ANA-002`
* **Test Level:** System Testing (Analytical Calculation / Business Logic)
* **Objective:** Verify that Gross Margin rates use only the matching revenue basis where costs are verified, preventing distorted margins across unverified transactions.
* **Preconditions:** Navigate to Sales Diagnostics, Year: `2025`.
* **Test Procedure:**
  1. Select sector `Government`.
  2. Inspect Total Net Sales, Gross Profit, Matching Margin Revenue Basis, and Gross Margin %.
* **Expected Result:**
  - Net Sales is `₱119,900,480.14`.
  - Supported Gross Profit is `₱27,386,419.83`.
  - Margin Revenue Basis is `₱47,918,964.09` (`39.97%` coverage of total net sales).
  - Gross Margin is computed as `₱27,386,419.83 / ₱47,918,964.09 = 57.15%`.
  - An explicit disclosure note explains that this rate applies only to the verified basis, preventing misinterpretation as whole-sector profitability.
* **Automated Reference:** [`backend/tests/sector-trend.test.ts`](../backend/tests/sector-trend.test.ts)

#### Test Case ST-ANA-003: Pareto ABC Commercial Concentration
* **Test ID:** `ST-ANA-003`
* **Test Level:** System Testing (Functional / Ranking Logic)
* **Objective:** Validate that Product Prioritization applies crossing-inclusive 80%/95% ABC classification on positive sales while isolating negative financial adjustments.
* **Preconditions:** Navigate to Product Prioritization module.
* **Test Procedure:**
  1. Inspect the ABC summary breakdown and distribution table.
* **Expected Result:**
  - Evaluated positive sales population is `₱628,569,441.39` (`−₱1,622,699.58` negative returns isolated).
  - Class A: Exactly `442` source-label groups representing `80.02%` of positive sales.
  - Class B: Exactly `932` groups representing `14.99%`.
  - Class C: Exactly `3,097` groups representing `4.99%`.
  - ABC Unclassified: `20` groups (`0.00%`).
* **Automated Reference:** [`frontend/e2e/descriptive-product-contract.spec.ts`](../frontend/e2e/descriptive-product-contract.spec.ts)

---

### Suite 3: Predictive Analytics & Research Sandbox (ST-PRED)

#### Test Case ST-PRED-001: Historical Backtest Error Verification & Paired Metrics
* **Test ID:** `ST-PRED-001`
* **Test Level:** System Testing (Analytical Accuracy & Integrity)
* **Objective:** Ensure the forecast validation interface reports paired error metrics (MAE and WAPE) with signed bias, preventing underprediction from being concealed.
* **Preconditions:** Navigate to Forecast Modeling $\to$ Forecast Validation.
* **Test Procedure:**
  1. Select Horizon: `12 Months` (Holdout Year: `2025`, Origin: `2024-12`).
  2. Compare benchmark models `seasonal_naive` and `last_value`.
* **Expected Result:**
  - `seasonal_naive` outputs:
    - MAE: `₱11,261,458.43`
    - WAPE: `72.89%` (exact: `72.8909484%`)
    - Mean Signed Bias: `−₱11,261,458.43` (identifying real underprediction of the 2025 surge).
  - `last_value` outputs:
    - MAE: `₱5,834,383.00`
    - WAPE: `37.76%`
  - The UI disclaims model activation and displays candidate research status.
* **Automated Reference:** [`outputs/forecast_use_review_20261020/live.spec.ts`](../outputs/forecast_use_review_20261020/live.spec.ts)

#### Test Case ST-PRED-002: External Context Gating & Unapproved Join Blocking
* **Test ID:** `ST-PRED-002`
* **Test Level:** System Testing (Fault Tolerance / Analytical Gate)
* **Objective:** Verify that external weather/disease regression remains blocked when unapproved geographic joins exist, avoiding false causal claims.
* **Preconditions:** Navigate to Forecast Modeling $\to$ External Regression.
* **Test Procedure:**
  1. Select Territory: `Quezon`, Disease: `Dengue`, Weather Provider: `PAGASA`.
* **Expected Result:**
  - System displays historical co-observation charts (`94` sales months, `79` co-observed months).
  - Regression Model status is explicitly set to `BLOCKED`.
  - Descriptive notice states: *"Databricks has no approved external territory joins. Regression remains unavailable until the mapping review is published."*
  - No synthetic regression weights are displayed.
* **Automated Reference:** [`frontend/e2e/external-regression-contract.spec.ts`](../frontend/e2e/external-regression-contract.spec.ts)

---

### Suite 4: Prescriptive Planning Scenarios (ST-PLAN)

#### Test Case ST-PLAN-001: Bounded Restocking Allocation Execution
* **Test ID:** `ST-PLAN-001`
* **Test Level:** System Testing (End-to-End Functional / Optimization)
* **Objective:** Verify greedy allocation under user-entered supply, pack size, and reserve constraints.
* **Preconditions:** Navigate to Prescriptive Planning module.
* **Test Procedure:**
  1. Select preset: `Dengue Surge (Quezon)`.
  2. Input available restock budget and warehouse inventory constraints.
  3. Click **Compute Allocation Plan**.
* **Expected Result:**
  - Allocation is calculated using bounded greedy logic (prioritizing lowest fulfillment ratio first).
  - Allocated quantities strictly adhere to integer pack multiples and safety reserves.
  - The interface clearly labels results as an *assumption-based scenario*, not a verified operational EOQ/ROP procurement order.
  - **Export Planning CSV** downloads matching rows without data loss.
* **Automated Reference:** [`frontend/e2e/prescriptive-planning-contract.spec.ts`](../frontend/e2e/prescriptive-planning-contract.spec.ts)

#### Test Case ST-PLAN-002: Infeasible Restock Scenario Graceful Flagging
* **Test ID:** `ST-PLAN-002`
* **Test Level:** System Testing (Negative / Error Handling)
* **Objective:** Ensure the scenario engine detects mathematically infeasible constraints without system crash or partial allocations.
* **Test Procedure:**
  1. In Prescriptive Planning, set Minimum Fulfillment Requirement to `100%`.
  2. Set Total Available Stock to `5%` of aggregate demand.
  3. Click **Compute Allocation Plan**.
* **Expected Result:**
  - System returns status `INFEASIBLE` / `NOT_SOLVED`.
  - Informative banner indicates that supply caps violate minimum required fulfillment constraints.
  - No corrupted or zero-divided numbers are rendered.

---

### Suite 5: Resilience, Fault Tolerance & Security (ST-SEC-RES)

#### Test Case ST-SEC-RES-001: Analytical Warehouse Outage Handling (No Fallback)
* **Test ID:** `ST-SEC-RES-001`
* **Test Level:** System Testing (Resilience / Non-Functional)
* **Objective:** Ensure that when Databricks is unreachable, the system shows an explicit unavailable state and does **not** fall back to local mock data or Supabase tables.
* **Test Procedure:**
  1. Intercept gateway API traffic or disconnect Databricks connectivity (HTTP `503`).
  2. Navigate through the Executive Overview and Sales Diagnostics.
* **Expected Result:**
  - UI cleanly displays a `503 Service Unavailable` or `Source Unavailable` error card.
  - No legacy demonstration payloads or mock seed data render on screen.
  - Chart canvases clear cleanly without throwing unhandled JavaScript runtime errors.
* **Automated Reference:** [`frontend/e2e/auth-unavailable-live.spec.ts`](../frontend/e2e/auth-unavailable-live.spec.ts)

#### Test Case ST-SEC-RES-002: Client-Side Security & Secret Containment
* **Test ID:** `ST-SEC-RES-002`
* **Test Level:** System Testing (Security / ISTQB Non-Functional)
* **Objective:** Confirm zero exposure of analytical or database credentials in client code bundles.
* **Test Procedure:**
  1. Open DevTools in browser $\to$ Sources and Network inspection.
  2. Search client bundles for environment variables and secrets.
* **Expected Result:**
  - Only allowed public configuration variables are present (`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
  - `DATABRICKS_TOKEN`, `DATABRICKS_HOST`, and `SUPABASE_SERVICE_ROLE_KEY` are strictly absent.

---

## 4. Test Execution Matrix & Traceability

| Test Case ID | Test Category | Target Component | Method | Verification Evidence / Path |
|---|---|---|---|---|
| `ST-ING-001` | Ingestion Boundary | Gateway / Databricks | Automated / E2E | [`frontend/e2e/api-client-errors.spec.ts`](../frontend/e2e/api-client-errors.spec.ts) |
| `ST-ANA-001` | Multi-Year Scope | Overview / Filters | Automated / E2E | [`outputs/study_scope_2017_2025_20261020/live.spec.ts`](../outputs/study_scope_2017_2025_20261020/live.spec.ts) |
| `ST-ANA-002` | Gross Margin Basis | Diagnostics / Gateway | Integration / Unit | [`backend/tests/sector-trend.test.ts`](../backend/tests/sector-trend.test.ts) |
| `ST-ANA-003` | ABC Pareto Sorting | Products / Catalog | Automated / E2E | [`frontend/e2e/descriptive-product-contract.spec.ts`](../frontend/e2e/descriptive-product-contract.spec.ts) |
| `ST-PRED-001`| Forecast Backtest | Forecast / Python | Automated / E2E | [`outputs/forecast_use_review_20261020/live.spec.ts`](../outputs/forecast_use_review_20261020/live.spec.ts) |
| `ST-PRED-002`| External Gating | Forecast / Regression | Automated / E2E | [`frontend/e2e/external-regression-contract.spec.ts`](../frontend/e2e/external-regression-contract.spec.ts) |
| `ST-PLAN-001`| Restock Optimization | Planning / Scenario | Automated / E2E | [`frontend/e2e/prescriptive-planning-contract.spec.ts`](../frontend/e2e/prescriptive-planning-contract.spec.ts) |
| `ST-PLAN-002`| Infeasible Handling | Planning / Solver | Integration / Unit | [`outputs/business_analytics_review_20261007/planning_final_qa.md`](../outputs/business_analytics_review_20261007/planning_final_qa.md) |
| `ST-SEC-RES-001`| Resilience / No Mock | Gateway / UI Sandbox | Automated / Live | [`frontend/e2e/auth-unavailable-live.spec.ts`](../frontend/e2e/auth-unavailable-live.spec.ts) |
| `ST-SEC-RES-002`| Secret Isolation | Frontend Bundles | Static Scan | [`outputs/analytical_qa_20261020/run_qa_checks.py`](../outputs/analytical_qa_20261020/run_qa_checks.py) |

---

## 5. Historical automated run commands — source-matched rerun required

From the project root:

1. **Backend Integration & Gateway Contract Suite (192 tests):**
   ```powershell
   cd backend
   npm test
   ```

2. **Python Offline Analytics & Weather Suite (206 tests):**
   ```powershell
   .\.venv-predictive\Scripts\python.exe -X utf8 -m unittest discover -s services/tests -v
   ```

3. **Databricks Notebook & Table Quality Suite (90 tests):**
   ```powershell
   .\.venv-predictive\Scripts\python.exe -X utf8 -m unittest discover -s databricks/medshield_project/tests -v
   ```

4. **Live System Playwright E2E Tests (with services running):**
   ```powershell
   cd frontend
   node node_modules/@playwright/test/cli.js test --config=../outputs/study_scope_2017_2025_20261020/live.config.cjs
   node node_modules/@playwright/test/cli.js test --config=../outputs/forecast_use_review_20261020/live.config.cjs
   ```
