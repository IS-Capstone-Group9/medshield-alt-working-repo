# MedShield Capstone Paper — Complete Chapter 1 to Chapter 5 Revision & Input Guide (30 October 2026)

**Prepared:** 30 October 2026 (Asia/Manila)  
**Accountable Role:** Technical Writer (`.agents/technical-writer.md`)  
**Source Baselines Aligned:**
- **Chapters 1–3 Baseline PDF:** [`references/CapstonePaper_1.pdf`](../../references/CapstonePaper_1.pdf) (`(POST-DEFENSE) Capstone 1 - GROUP_9_3ISB.pdf`, 149 pages, SHA-256 `4c40147be0de0563e2a58bc0210c0a13cf850bf1382577fff497422b44ebe862`)
- **Chapters 4–5 Uploaded PDFs:** `GROUP_9_MedShield_CP2_Chapter_4_5-1.pdf` (Chapter 4, 72 pages) and `GROUP_9_MedShield_CP2_Chapter_4_5-2.pdf` (Chapter 5 + References, 14 pages)
- **Active System & Evidence Baseline:** Original-Itemized Gold (`Delta 0`, dataset `e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10`, `2017–September 2026`, `40,171` records, `₱638,015,351.53` net sales) + Completed Work Packages `WP0`–`WP14` ([`docs/SALES_EXTERNAL_IMPLEMENTATION_STATUS.md`](../SALES_EXTERNAL_IMPLEMENTATION_STATUS.md)).

---

## Global Terminology Rules (Apply Across All 5 Chapters — [`docs/BUSINESS_DEFINITIONS.md`](../BUSINESS_DEFINITIONS.md))

Before pasting or editing any section in Word/Google Docs, apply these five global Find-and-Replace rules so your manuscript never contradicts your system's governance gates:

| Prohibited Term (Find) | Required Replacement (Replace With) | Why (Defense & Audit Rule) |
|---|---|---|
| `Net profit` *(when referring to sales minus cost)* | **`Supported gross profit`** or **`Gross margin amount`** | Operating expenses, taxes, and rebates are not in the sales files; `net_sales - total_cost` is gross profit (`₱334,666,271.55` on `36,798` margin-supported rows, `59.0287%`). |
| `Expense-optimized EOQ` | **`Scenario EOQ`** or **`Entered-input EOQ`** | Ordering cost (`A2`) and holding fraction (`A1`) are scenario assumptions (`Assumed`), not audited accounting expenses. |
| `Inventory urgency` | **`Demand priority`** or **`Surge urgency`** | No physical warehouse stock-on-hand ledger exists in the workspace to measure stockout imminence directly. |
| `Dead stock` | **`Slow-moving sales candidate`** or **`Low-frequency sales label`** | Zero or low sales in transaction logs do not prove unsold stock is sitting in a warehouse. |
| `Official live disease/PAGASA alert` | **`Historical DOH signal / PAGASA observation / Provider weather proxy`** *(or state that live official bulletins are **`unavailable`**)* | The dashboard displays historical `DOH PIDSR`, `PAGASA`, and `NASA POWER` proxy context; live official `PAGASA Signal ≥ 2` / `DOH` feeds are explicitly `unavailable`. |

---

# CHAPTER 1: INTRODUCTION

Use the exact copy-paste insertions and replacements below for **Chapter 1** (`CapstonePaper_1.pdf`, PDF pp. 11–16). Do **not** alter the original wording of `SO1`–`SO5` in Section `1.3.2`; instead, insert the scope clarification immediately below `SO5`.

### 1.1 Section `1.3.2 Specific Objectives` (PDF pp. 11–12) — **INSERT AFTER `SO5`**

> **Scope and Baseline Clarification on Specific Objectives (`SO1`–`SO5`):**  
> The five specific objectives above remain the original commitments of the study. The implementation and results are evaluated against those commitments rather than replacing them with narrower objectives after observing the available data. The current working analysis includes supplied recorded sales from **2017 through September 2026** (`40,171` original-itemized Gold records, `₱638,015,351.53` net sales), alongside the preserved **2017–2025** adjusted nine-file baseline (`37,728` records, `₱626,946,741.81` net sales). This wider reporting window does not retrospectively change the `2021–2025` baseline specified in the original objectives, the December 2026 planning intention, or the actual periods of frozen model evaluations. Each result in Chapter 4 identifies its own source population, target, period, and evidence status (`Observed`, `Derived`, `Assumed`, `Simulated`, or `Unavailable`). Incomplete original requirements are reported transparently as limitations rather than inferred from the presence of a dashboard screen or a passing technical test.

---

### 1.2 Section `1.4 Scope and Limitations` (PDF pp. 12–13) — **REPLACE SECTION WITH:**

> **1.4 Scope and Limitations**
>
> The available-data implementation analyzes MedShield's supplied original sales records from **2017 through September 2026** (`10` local CSV files reconciled to uploaded originals under dataset `e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10`, `Delta 0`). It supports recorded itemized net sales (`39,286` eligible records totaling `₱638,015,351.53`), supported gross profit (`₱334,666,271.55` across `36,798` margin-supported records on `₱566,954,921.92` matching revenue, or `59.0287%`), source-label product contributions (`5,693` distinct recorded product labels), scoped delivery-area comparisons (`9` user-confirmed provincial labels totaling `19,455` records and `₱115,614,895.77`), retrospective forecasting research, and entered-assumption prescriptive planning. Financial eligibility and the denominator of each measure remain separate. Gross profit is before operating expenses; it is not company net profit. A recorded product description or quantity count does not alone establish a canonical sellable SKU, interchangeable presentation, or unconstrained medicine demand.
>
> **CALABARZON, MIMAROPA, and Bicol** remain the intended geographic scope. Actual regional outputs include only the nine source labels with recorded delivery-meaning confirmation (`BATANGAS`, `CAVITE`, `LAGUNA`, `QUEZON`, `RIZAL`, `MARINDUQUE`, `OCCIDENTAL MINDORO`, `ORIENTAL MINDORO`, and `CAM NORTE`, representing `18.12%` of total itemized net sales). Channel and unresolved labels (`HOSPITAL`, `GOVERNMENT`, `PHARMACEUTICAL`, `MEDICAL`, and ambiguous `MINDORO`, totaling `20,716` records and `₱522,400,455.76` or `81.88%`) remain visibly `UNALLOCATED`; their absence from a regional total is not zero sales. Missing calendar months in shorter regional histories (`MIMAROPA` with `19` observed months and `Bicol` with `31` observed months) remain unavailable without synthetic zero-filling.
>
> Contract summaries (`2` restricted summary rows totaling `₱120,031,316.00`) are retained separately from itemized product sales under `Decision 009`. Their restricted product breakdown and physical quantities are unavailable under non-disclosure constraints and are never reconstructed or summed with itemized product rows. For single-medicine physical-unit research, the user-confirmed `BUPIRIGHT` 4 mL label pair (`BUPIRIGHT BUPIVACAINE HCI 0.5% (4ML) ISOBARIC` and `BUPIRIGHT 0.5% 4ML (HEAVY)`) has a scoped one-ampoule / box-of-one interpretation in the recorded `HOSPITAL` channel (`50` records across `18` contiguous months from April 2025 to September 2026, totaling `711` ampoules). This is a channel-scoped research cohort, not verified geographic delivery evidence or global physical-unit approval for other products.
>
> Historical `DOH PIDSR` disease surveillance and `PAGASA` / `NASA POWER` weather observations support source-labelled context and separately defined retrospective research. A proposed mapping, co-observed month, or weather proxy does not establish an accepted disease/territory join, an issue-time external forecast input, or an official current warning. Research comparisons do not establish operational model approval. Prescriptive planning scenarios and simulations use explicitly entered or registered assumptions (`A1`–`A9`); they do not establish verified warehouse inventory, supplier lead time, batch expiry, procurement authority, or measured company savings.

---

### 1.3 Section `1.5 Conceptual Framework` & `Figure 1.1` (PDF pp. 14–16) — **REPLACE PROCESS DESCRIPTION & FIGURE 1.1 CAPTION:**

- **Replace Figure 1.1 (PDF p. 14)** with the editable master [`outputs/figure_evaluation_alignment_20261029/figure-1-1-conceptual.png`](../../../medshield1/medshield/outputs/figure_evaluation_alignment_20261029/figure-1-1-conceptual.png) and caption:
  > **Figure 1.1. Evidence flow for MedShield decision support.** Controlled source assessment feeds scoped descriptive, diagnostic, research, and scenario outputs; operational use requires separate approval and verified business inputs.

- **Replace Section `1.5.2 Process` execution text (PDF pp. 14–16) with:**
  > The implemented workflow separates controlled data preparation, analytical storage, offline analysis, and dashboard consumption. Original CSV files enter the Databricks Unity Catalog Bronze/Silver/Gold pipeline (`databricks_updated_2`) with source identity, row dispositions, and candidate review retained. Direct browser CSV uploads to `POST /api/sales/upload` are intentionally disabled with `HTTP 409 DATABRICKS_INGESTION_REQUIRED`. The Next.js 16 dashboard obtains analytics exclusively through the Express/TypeScript gateway from version-bound Gold contracts. Supabase provides production authentication, linked application roles (`Admin`, `Analyst`, `Viewer`), and audit persistence; it does not supply dashboard analytical measures. Python preparation and model evaluation execute offline rather than training synchronously inside a dashboard request.
  >
  > Descriptive outputs summarize eligible recorded amounts and commercial contributions. Diagnostic outputs localize comparable year-over-year changes and retrospective seasonal/residual patterns without establishing external causality. Predictive research reports its actual target, temporal rolling-origin design, baseline comparators, and out-of-sample errors. Prescriptive outputs compare explicit entered assumptions under bounded greedy, scenario EOQ/ROP, MCDA-weighted integer-pack, and dated FEFO selection rules while enforcing an `85`-field blank boundary from unapproved forecast candidates. Required analytical-source failures fail closed (`HTTP 503`) rather than substituting demonstration or mock values.

---

# CHAPTER 2: REVIEW OF RELATED LITERATURE AND STUDIES

### 2.1 Chapter 2 Synthesis (PDF pp. 67–68) — **REPLACE SYNTHESIS PARAGRAPHS WITH:**

> **Synthesis and Method Selection Alignment**
>
> The reviewed literature motivates a candidate set of time-series decomposition (`STL`), forecasting (`Prophet`, `SARIMAX`, `ETS`, ` Croston/SBA/TSB`), classification (`XGBoost`, deterministic `ABC–XYZ`), and inventory optimization (`EOQ`, `ROP`, `MCDA`, integer linear programming, and `FEFO` lot simulation) methods. Inclusion of a model family in the literature review does not establish that it performs best on MedShield's available transaction records. Accuracy figures cited from external pharmaceutical or retail studies retain their own targets, physical units, periods, and evaluation designs; they are not MedShield results or local business acceptance thresholds.
>
> In the executed MedShield system, model retention follows frozen local out-of-sample comparisons against naive and seasonal-naive baselines rather than literature preference. Specifically:
> 1. In the held-out product ABC classification study (`WP6`, `1,032` prediction cases), deterministic **prior-period ABC persistence (`prior_abc`, `Macro-F1 = 0.5367` validation, `0.4379` test)** outperformed regularized `XGBoost` challengers (`xgb_depth_2 = 0.4321`, `xgb_depth_3 = 0.4347`) because cold-start product labels without prior-year sales history lack historical lag signal (`0.00` Class A/B recall).
> 2. In the rolling-origin monthly revenue tournament (`WP4`, `21` models, `1,722` predictions) and the `BUPIRIGHT 4 mL HOSPITAL` ampoule unit pilot (`50` records, `18` contiguous months), simple rolling-mean (`mean_6`, `last_value`) and seasonal-naive (`seasonal_naive_12`, Lead-1 `WAPE = 31.60%`, Lead-3 `WAPE = 30.00%`) benchmarks outperformed complex parameterized models on short or structural-shift series.
> 3. Disease/weather regressors (`DII`/`RSI`), demand priority scoring, scenario `EOQ`/`ROP`, `MCDA`-weighted integer-pack optimization, collaborative filtering (`ALS`/`item-kNN`), and historical anomaly flags are evaluated strictly within their documented data-readiness and provenance boundaries.

---

# CHAPTER 3: METHODOLOGY

Use the replacements below for **Chapter 3** (`CapstonePaper_1.pdf`, PDF pp. 69–118).

### 3.1 Sections `3.1` & `3.2` Operational Framework & Data Preparation (PDF pp. 69–85) — **INSERT / REPLACE:**

- **Replace Figure 3.1 (PDF p. 71)** with [`outputs/figure_evaluation_alignment_20261029/figure-3-1-lifecycle.png`](../../../medshield1/medshield/outputs/figure_evaluation_alignment_20261029/figure-3-1-lifecycle.png) and caption:
  > **Figure 3.1. Analytical lifecycle and acceptance gates.** Offline preparation, frozen evaluation, and saved-candidate review are distinguished from conditional operational release and prospective monitoring.

- **Replace Figure 3.10 (PDF p. 88) & Analytical Storage Claims (PDF pp. 73, 88–89)** with [`outputs/figure_evaluation_alignment_20261029/figure-3-10-runtime.png`](../../../medshield1/medshield/outputs/figure_evaluation_alignment_20261029/figure-3-10-runtime.png) and text:
  > **Figure 3.10. Implemented analytical and application boundaries.** Databricks Unity Catalog supplies analytical contracts through the Express/TypeScript gateway; Supabase supplies identity and audit services, and Python prepares evidence offline.
  >
  > **Implemented Data Architecture and Lineage:** The study uses CRISP-DM with SEMMA organizing offline analytical preparation and assessment. Databricks Unity Catalog is the sole analytical system of record. The current original-itemized Gold candidate (`Delta 0`, dataset `e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10`) contains **`40,171` itemized records** (`39,286` net-sales eligible = `₱638,015,351.53`; `36,798` margin-supported = `₱334,666,271.55` supported gross profit on `₱566,954,921.92` matching revenue). All `10` local CSVs (`2017–September 2026`) reconcile to uploaded originals (`7` byte-exact; `3` field-identical after UTF-8 BOM/CRLF normalization). Preparation preserves legitimate same-day repeated transactions and signed credit/return adjustments (`44` negative-net rows totaling `-₱133,579.88` and `841` zero-net rows), while isolating `2` NDA-restricted contract summary rows (`₱120,031,316.00`) from product-level analytics. Supabase owns authentication, linked RBAC roles (`Admin`, `Analyst`, `Viewer`), and audit persistence rather than storing `FactOutput` analytical tables.

---

### 3.2 Section `3.4.1` Descriptive & Diagnostic Methods: `STL` and `ABC` (PDF pp. 93–96) — **REPLACE WITH:**

> **3.4.1 Executed STL Decomposition and Deterministic vs. Supervised ABC Classification**
>
> Recorded monthly net-sales series serve as the primary seasonality diagnostic. The implemented robust monthly Loess (`STL`) decomposition uses seasonal period $m = 12$ and seasonal window $s = 13$ (`robust = True`) on contiguous observed segments with at least `36` months (`WP1`). Missing calendar months split segments rather than becoming synthetic zeros (`MIMAROPA` has `19` observed months across `6` segments, max contiguous `10`; `Bicol` has `31` observed months across `4` segments, max contiguous `26`; `CALABARZON` qualifies with `81` contiguous months from `2020-01` to `2026-09`). Trend and seasonal strengths follow Hyndman and Athanasopoulos (2021):
> $$F_T = \max\left(0, 1 - \frac{\text{Var}(R_t)}{\text{Var}(T_t + R_t)}\right), \quad F_S = \max\left(0, 1 - \frac{\text{Var}(R_t)}{\text{Var}(S_t + R_t)}\right)$$
> Full-series retrospective STL components use observations across the entire window and are therefore never passed into earlier forecast origins as features (`WP1`, `WP4`).
>
> Deterministic financial `ABC` classification ranks all `5,693` recorded product labels by positive net sales (`₱638,079,115.69` across `5,595` positive labels), assigning Class `A` up to the `80%` cumulative threshold (`627` labels, `80.01%`), Class `B` up to `95%` (`1,220` labels, `15.01%`), and Class `C` to the remaining positive tail (`3,748` labels, `5.00%`), while isolating `98` zero/negative labels (`-₱63,764.16`) as `Unclassified` (`WP2`). Separately, the supervised `XGBoost` ABC classifier (`WP6`) is formulated as a leakage-safe temporal classification experiment: using only features observable at forecast origin $t$ (`12`-month sales, active months, order count, average price, channel share, and prior ABC class), models trained on `2023` predict next-year `2024` validation, `2025` test, and `Jan–Sep 2026` extension classes against `majority` and `prior_abc` persistence baselines, disaggregated by prior-observation history (`0`, `1–6`, and `7–12` active months).

---

### 3.3 Section `3.4.2` Predictive Forecasting & External Inputs (PDF pp. 96–101) — **REPLACE WITH:**

> **3.4.2 Rolling-Origin Forecasting Tournament, Unit Pilot, and Lag-Safe External Regressors**
>
> Every forecasting experiment specifies its exact target, unit, source dataset checksum, rolling origin, and forecast horizon ($h \in \{1, 3\}$ months). Two empirical tracks are executed:
> 1. **Monthly Original-Itemized Net-Sales PHP Tournament (`WP4`):** Evaluates `21` model configurations (`naive`, `seasonal_naive`, `mean_3`, `mean_6`, `ets`, `sarimax`, `prophet`, `xgboost_lag`, and intermittency/challenger variants) across expanding rolling origins on the `2017–September 2026` itemized Gold series (`1,722` predictions across `84` group slices). Models are ranked on out-of-sample Mean Absolute Scaled Error ($\text{MASE}$ against in-sample 12-month seasonal naive), $\text{WAPE}$, $\text{MAE}$, $\text{RMSE}$, signed bias, and small-sample Harvey–Leybourne–Newbold ($\text{HLN-DM}$) tests.
> 2. **Presentation-Consistent Physical-Unit Pilot (`BUPIRIGHT 4 mL HOSPITAL` Ampoules):** Evaluates `10` forecasting models at Leads 1 and 3 on the `18` contiguous monthly observations (`2025-04` to `2026-09`, `50` records, `711` total ampoules) where user confirmation establishes `1` unit = `1` ampoule in the `HOSPITAL` channel, alongside a pre-registered 12-month prospective evaluation protocol (`2026-11` to `2027-10`).
>
> For external disease (`DII`) and weather (`RSI`) regressors (`WP5`), feature construction enforces strict origin-only normalization (computing baseline means/quantiles using only data prior to origin $t$ to prevent future-year leakage) and applies an explicit publication lag ($L_{\text{pub}} = 1$ month for `DOH PIDSR` weekly surveillance) while keeping measured `PAGASA` rainfall (`mm`) distinct from `NASA POWER` gridded satellite proxies.

---

### 3.4 Section `3.4.3` Prescriptive Planning, EOQ/ROP, & Simulation (PDF pp. 101–107) — **REPLACE WITH:**

> **3.4.3 Entered-Assumption Prescriptive Allocation, Scenario EOQ/ROP, MCDA Integer Programming, and FEFO Simulation**
>
> Because physical warehouse stock-on-hand ledgers, batch expiry dates, supplier lead-time logs, and accounting ordering/holding cost records are not present in the historical sales exports (`E46`), prescriptive analytics is implemented across two explicitly governed layers bound to the formal Assumptions Register (`A1`–`A9`, [`docs/ASSUMPTIONS_REGISTER.md`](../ASSUMPTIONS_REGISTER.md)):
> 1. **Interactive Gateway & Browser Sandbox (`SO4`, `O4.01`, `O4.04`–`O4.07`):** Operates on the Gold shortlist (`5` leading labels from `2025-10` to `2026-09`: `SPEEDA`, `SHARJVAX`, `SEROALBUMIN`, `SHARJVAX 1500IU/0.7ML`, `MONOWEL 1G IV`). It provides: (a) stock-only baseline vs. bounded greedy purchase comparison; (b) **Scenario EOQ and ROP (`inventoryPolicyScenario.ts`)**, evaluating continuous $Q^* = \sqrt{2DS/H}$, discrete pack-multiple cost minimization ($\lfloor Q^*/p \rfloor p$ vs. $\lceil Q^*/p \rceil p$), shelf-life capacity guards, and reserve-once integer ceiling $\text{ROP} = \lceil d \times L \rceil + \text{reserve}$; and (c) **Exact MCDA-weighted integer-pack branch-and-bound (`weightedPlanning.ts`) and finite-domain dated FEFO purchase selection (`datedPlanSelection.ts`)**, certifying the `0.00%` optimality gap against the linear-programming (`LP`) relaxation upper bound.
> 2. **Offline Unit Sensitivity & Monte-Carlo FEFO/FIFO Simulation (`WP8`, `WP11`):** On the training-only `BUPIRIGHT 4 mL HOSPITAL` cohort (`2025-04` to `2026-03`, `461` recorded ampoules, median derived acquisition cost `₱165.18/ampoule`), `WP8` executes a **2,500-scenario Cartesian sensitivity sweep** over holding cost fraction $h \in [15\%, 35\%]$, order cost $K \in [\text{₱500}, \text{₱3,000}]$, lead time $L \in [7, 30]$ days, and service level $z_{\alpha}$. `WP11` executes a pre-registered **27,000-run common-random-number (`CRN`, seed `20261030`) daily lot-level inventory simulation** (`1,000` replicates $\times$ `3` policies `P0`/`P1`/`P2` $\times$ `3` shelf lives `180/365/730` days $\times$ `3` lead times `7/14/30` days) across the 6-month evaluation window (`2026-04` to `2026-09`, `250` recorded ampoules).

---

### 3.5 Section `3.6` Evaluation Criteria (`Table 3.5`, PDF pp. 116–118) — **INSERT RECONCILIATION TABLE AFTER TABLE 3.5:**

Keep your original **Table 3.5** on PDF pp. 116–118 intact, and insert **Table 3.5A** immediately below it (updated from [`MedShield_Figure_Evaluation_Alignment_20261029.md`](MedShield_Figure_Evaluation_Alignment_20261029.md) with 30 October 2026 `WP1`–`WP14` results):

**Table 3.5A. Reconciliation of Original Chapter 3 Evaluation Criteria Against Executed 30 October 2026 Evidence**

| Original Component & Target Criterion (PDF pp. 116–118) | Executed 30 October 2026 Evidence & Quantitative Result | Remaining Requirement Before Claiming Full Original Criterion |
|---|---|---|
| **Prophet Baseline:** `MAE`, `RMSE`, `MAPE`; target `MAPE < 15%` | Executed in `21`-model rolling PHP tournament (`WP4`, `1,722` predictions) and `BUPIRIGHT` ampoule unit pilot (`10` models). `mean_6` (`MASE = 0.5439` dev) and `seasonal_naive_12` (`BUPIRIGHT` Lead-1 `WAPE = 31.60%`, Lead-3 `WAPE = 30.00%`) beat `Prophet`. | `WAPE` does not substitute for `MAPE < 15%`. Requires verified territorial medicine-unit series and champion `MAPE < 15%`. |
| **Disease-Adjusted (`DII`) & Weather-Adjusted (`RSI`) Forecasts:** Improve baseline `MAPE` | Lag-safe `DII` ($L_{\text{pub}} = 1$ mo) and `RSI` feature modules implemented and unit-tested (`WP5`). `PAGASA` observed rainfall kept distinct from `NASA POWER` proxy. | Requires approved therapeutic-to-disease (`D3`) and territory (`D4`) joins and common-fold held-out `MASE`/`MAPE` improvement over univariate baseline. |
| **`XGBoost` Demand Priority / Urgency:** `MAE`, `RMSE`, `MAPE < 20%` | `BUPIRIGHT 4 mL HOSPITAL` ampoule robustness and sensitivity studies completed (`WP4`, `WP8`, `WP11`); priority scoring separated from physical stock urgency (`WP7`). | Requires verified unit-demand urgency labels (`D1`/`D4`) and held-out error `< 20%`. |
| **`XGBoost` Product ABC Classifier:** Accuracy, Precision, Recall, `Macro-F1` | **Executed (`WP6`, `1,032` prediction cases across `2024` val, `2025` test, `2026` ext).** `prior_abc` (`Macro-F1 = 0.5367` val, `0.4379` test) beat `majority` (`0.2310`), `xgb_depth_2` (`0.4321`), and `xgb_depth_3` (`0.4347`). Cold-start recall = `0.00`. | Requires canonical SKU consolidation (`D1`) and richer cold-start product metadata so a supervised learner can beat persistence (`prior_abc`). |
| **Area / Industry Encoding:** `100%` completeness, no unmatched entries | `9` user-confirmed provincial labels (`19,455` rows, `₱115.61M` = `18.12%`) mapped; `20,716` channel/ambiguous rows (`₱522.40M` = `81.88%`) conserved visibly in `UNALLOCATED` (`WP1`). | A conserved `UNALLOCATED` bucket preserves financial truth but does not establish `100%` territorial mapping; requires customer-address master (`D4`). |
| **80/20 Threshold & ABC Validation:** `80% / 95% / 100%` bands | **Executed on `5,693` original-itemized labels (`WP2`):** `627` Class A (`80.01%`), `1,220` Class B (`15.01%`), `3,748` Class C (`5.00%`), `98` zero/negative `Unclassified`. | Reconcile exact reporting strings to physical SKU master (`D1`) and customer accounts (`D2`). |
| **EOQ, ROP, & Safety Stock:** Minimize cost; expiry wastage $\le 5\%$ | **Scenario EOQ/ROP implemented in UI (`O4.04`, `O4.05`, `EOQ = 38.21` units, `ROP = 5` units) + `WP8` `2,500`-scenario sweep (`EOQ = 183`, `ROP = 28` ampoules) + `WP11` `27,000`-run FEFO simulation (`P0` fill `94.35%`, `P1` `97.28%`, `P2` `97.61%`; `0.0%` 6-mo simulated expiry).** | Simulated zero expiry over 6 months with 180–730 day shelf life does not prove real warehouse wastage $\le 5\%$; requires physical lot/expiry and cost records or adviser scope amendment (`A1`–`A9`). |
| **MCDA / Linear Programming Allocation:** Minimal optimization gap | **Executed (`O4.06`, `O4.07`, `WP9`, `WP10`):** Exact integer-pack branch-and-bound + dated FEFO selector certified **`0.00%` optimality gap** (`84.44%` weighted fulfillment vs. `84.44%` LP upper bound across `1,024` combinations, `533` checks). | Extend from 5-product scenario sandbox to multi-territory physical unit allocation once `D1`/`D4` and real budgets/stock are supplied. |
| **Collaborative Filtering & Early-Warning Alerts:** Coverage, Precision, Recall | Implicit `ALS` / `item-kNN` (`WP13`) and historical anomaly detection (`WP3` `5` STL exceptions; `WP14` surge rules) implemented offline; live official bulletins explicitly `unavailable`. | Requires reviewed customer account IDs (`D2`) for recommender holdout evaluation and an official live `PAGASA`/`DOH` bulletin feed. |

---

# CHAPTER 4: RESULTS AND DISCUSSION

Below are all the exact replacements and additions for your **72-page Chapter 4 PDF (`GROUP_9_MedShield_CP2_Chapter_4_5-1.pdf`)**. Full details are also stored in [`docs/chapters/MedShield_CP2_PDF_Chapter_4_5_Alignment_20261030.md`](MedShield_CP2_PDF_Chapter_4_5_Alignment_20261030.md) and [`docs/chapters/MedShield_Chapter_4_5_Revised_20261016.md`](MedShield_Chapter_4_5_Revised_20261016.md).

### 4.1 Section `4.1.1` (PDF pp. 1–7): Add **Table 4.1A** (Original-Itemized Gold `2017–Sep 2026` vs. Retained `2017–2025` Snapshot)

Keep your existing `2017–2025` Tables `4.1`–`4.3` as the retained 9-year baseline, and insert **Table 4.1A** at the end of Section `4.1.1`:

| Population / Lineage Attribute | Primary Original-Itemized Gold (`2017–September 2026`, `Delta 0`) | Historical Adjusted Nine-File Baseline (`2017–2025`, Retained in PDF Tables 4.1–4.3) | Reconciliation & Governance Rule |
|---|---:|---:|---|
| **Dataset Identifier / Checksum** | `e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10` | `78f60f8f4d06b54f1c2ef8f63b6992dc3f629a59f1f5a20f31850819c71667c9` | Version-bound in Databricks Unity Catalog (`medshield_Workspace_catalog`). |
| **Source Files & Temporal Span** | `10` original CSV exports (`Jan 2017 – Sep 2026`, `93` observed months) | `9` annual CSV exports (`Jan 2017 – Dec 2025`, `108` monthly slots) | All `10` local CSVs match uploaded originals (`7` byte-exact, `3` field-identical). |
| **Accepted Itemized Fact Rows** | **`40,171` rows** (`39,286` net-eligible; `44` negative-net `-₱133,579.88`; `841` zero-net) | **`37,728` rows** (`910` row-level duplicates & `4` summary rows excluded) | Preserves legitimate same-day repeated transactions and credit adjustments. |
| **Eligible Itemized Net Sales (`₱`)** | **`₱638,015,351.53`** (`5,693` distinct product labels) | **`₱626,946,741.81`** (`5,563` distinct product labels) | Excludes `2` NDA-restricted contract summary rows (`₱120,031,316.00`, `Decision 009`). |
| **Supported Gross Profit & Margin** | **`₱334,666,271.55`** on `₱566,954,921.92` matching revenue (**`59.0287%`**, `36,798` rows = `91.6034%` coverage) | **`₱372,775,529.01`** on `35,660` cost-valid rows (**`59.46%`**, `94.52%` coverage) | Excludes `1,346` cost-formula mismatches (`1,047` cent-rounding candidates) and `1,017` missing-cost rows. |
| **Pipeline Gate Validation (`WP12`)** | **`200` unit tests PASS** + `6` controlled ingestion scenarios (`valid`, `missing-col`, `malformed-num`, `dup-batch`, `partial-yr`, `outage`) | `9` file-level Silver/Gold reconciliation checks | Direct browser upload returns `409 DATABRICKS_INGESTION_REQUIRED`; source outage returns `503`. |

---

### 4.2 Section `4.1.2 / 4.2.1` (PDF pp. 8–12, 30–34): Add **Confirmed Regional STL (`WP1`) & Residual Exceptions (`WP3`)**

Insert these two tables at the end of Section `4.1.2` / `4.2.1`:

**Table 4.3A. Confirmed Regional Series Readiness and Robust Monthly STL Summary (`WP1`, `2017–September 2026`)**

| Confirmed Region / Scope | Confirmed Provincial Labels Included | Itemized Records | Eligible Net Sales (`₱` & Share) | Observed Months (Contiguous Max) | STL Eligibility ($\ge 36$ Contiguous Months) | Trend Strength ($F_T$) | Seasonal Strength ($F_S$) | Peak / Trough Month (Seasonal Swing `₱`) |
|---|---|---:|---:|---:|---|---:|---:|---|
| **`CALABARZON`** | `BATANGAS`, `CAVITE`, `LAGUNA`, `QUEZON`, `RIZAL` | `15,824` | `₱95,436,058.43` (`14.96%`) | `82` (`81` contiguous: `2020-01` to `2026-09`) | **Eligible (`81` mo fitted)** | **`0.0338`** | **`0.0834`** | **Oct (`+₱171,364.26`) / May (`-₱90,163.29`)** (`₱261,527.55` swing) |
| **`MIMAROPA`** | `MARINDUQUE`, `OCCIDENTAL MINDORO`, `ORIENTAL MINDORO` | `1,391` | `₱5,903,952.14` (`0.93%`) | `19` (`6` segments; max `10`: `2025-12` to `2026-09`) | **`insufficient_contiguous_history`** | `N/A` | `N/A` | Not fitted (`< 36` contiguous months) |
| **`Bicol`** | `CAM NORTE` | `2,240` | `₱14,274,885.20` (`2.24%`) | `31` (`4` segments; max `26`: `2024-08` to `2026-09`) | **`insufficient_contiguous_history`** | `N/A` | `N/A` | Not fitted (`< 36` contiguous months) |
| **`UNALLOCATED` (Channel / Unresolved)** | `HOSPITAL`, `GOVERNMENT`, `PHARMACEUTICAL`, `MEDICAL`, `MINDORO`, etc. | `20,716` | `₱522,400,455.76` (`81.88%`) | `93` | Retained separately (not a single territory) | — | — | — |
| **Total Itemized Gold (`Delta 0`)** | All `5,693` labels across `40,171` rows | **`40,171`** | **`₱638,015,351.53` (`100.00%`)** | **`93`** | Portfolio & `CALABARZON` fitted | — | — | — |

**Table 4.3B. `CALABARZON` Robust STL Residual Anomaly Months ($\|z_{\text{rob}}\| > 3.0$, `WP3`)**

| Period | Observed Net Sales (`₱`) | STL Trend $T_t$ (`₱`) | STL Seasonal $S_t$ (`₱`) | STL Residual $R_t$ (`₱`) | Robust Residual Score ($z_{\text{rob}}$) | Diagnostic Localization & Governance Interpretation |
|---|---:|---:|---:|---:|---:|---|
| **`2020-01`** | `₱1,997,418.25` | `₱1,134,853.97` | `-₱9,968.26` | `+₱872,532.54` | **`+3.4375`** | Pre-pandemic institutional stocking surge across confirmed `CALABARZON` provinces. |
| **`2020-10`** | `₱548,798.75` | `₱1,126,184.74` | `+₱192,437.41` | `-₱769,823.40` | **`-3.0319`** | Pandemic mobility contraction depressing expected October seasonal peak. |
| **`2021-10`** | `₱3,275,382.22` | `₱1,120,257.46` | `+₱176,100.90` | `+₱1,979,023.86` | **`+7.7988`** | Major fourth-quarter tender and hospital replenishment concentration. |
| **`2023-05`** | `₱1,743,665.50` | `₱1,060,967.26` | `-₱83,849.40` | `+₱766,547.64` | **`+3.0209`** | Counter-seasonal May delivery spike above typical seasonal trough. |
| **`2026-06`** | `₱4,974,476.51` | `₱1,173,322.17` | `-₱13,866.22` | `+₱3,815,020.57` | **`+15.0349`** | **Largest positive residual:** `+₱1,405,737.01` YoY net increase (`+265.26%`), localized to `167` Quezon rows (`SPEEDA` `+₱548,250.00`, `ONdansetron` `+₱420,400.00`). Descriptive/diagnostic localization only (`non_causal`). |

---

### 4.3 Section `4.1.3 / 4.2.2` (PDF pp. 34–38): Replace **Table 4.7 (`XGBoost` ABC Evaluation, `WP6`)**

In your Chapter 4 PDF (p. 35), **Table 4.7** says `XGBoost` ABC was *"Not executed in current run"*. **Replace Table 4.7** with the executed `WP6` evaluation (`1,032` prediction cases):

**Table 4.7 (Replacement). Held-Out Product ABC Classification Benchmark Across Temporal Splits (`WP6`, `1,032` Prediction Cases)**

| Evaluation Split (Target Year) | Eligible Held-Out Labels ($N$) | Model / Baseline Identifier | Accuracy | Macro Precision | Macro Recall | **Macro-F1 (Primary Metric)** | Class A F1 | Class B F1 | Class C F1 | Retained Selection Status |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---|
| **Validation (`2024`)** | `91` | `majority` (predict Class C) | `0.5275` | `0.1758` | `0.3333` | `0.2302` | `0.0000` | `0.0000` | `0.6906` | Trivial baseline |
| **Validation (`2024`)** | `91` | **`prior_abc` (prior-year persistence)** | **`0.5934`** | **`0.5349`** | **`0.5416`** | **`0.5367`** | **`0.6286`** | **`0.3125`** | **`0.6690`** | **Best on Validation (`Retained Baseline`)** |
| **Validation (`2024`)** | `91` | `xgb_depth_2` (regularized tree, $d=2$) | `0.5824` | `0.5179` | `0.5197` | `0.5173` | `0.6471` | `0.2308` | `0.6742` | Challenger (`-0.0194` Macro-F1 vs. `prior_abc`) |
| **Validation (`2024`)** | `91` | `xgb_depth_3` (regularized tree, $d=3$) | `0.5714` | `0.5009` | `0.5063` | `0.5024` | `0.6471` | `0.1935` | `0.6667` | Challenger (`-0.0343` Macro-F1 vs. `prior_abc`) |
| **Test (`2025` Final Holdout)** | `92` | `majority` (predict Class C) | `0.5326` | `0.1775` | `0.3333` | `0.2317` | `0.0000` | `0.0000` | `0.6950` | Trivial baseline |
| **Test (`2025` Final Holdout)** | `92` | **`prior_abc` (prior-year persistence)** | **`0.5543`** | **`0.4648`** | **`0.4368`** | **`0.4379`** | **`0.3846`** | **`0.2500`** | **`0.6790`** | **Best on 2025 Holdout (`Retained Baseline`)** |
| **Test (`2025` Final Holdout)** | `92` | `xgb_depth_2` (frozen from 2023 fit) | `0.5543` | `0.4530` | `0.4329` | `0.4321` | `0.4167` | `0.2000` | `0.6795` | Did not beat `prior_abc` (`-0.0058` Macro-F1) |
| **Test (`2025` Final Holdout)** | `92` | `xgb_depth_3` (frozen from 2023 fit) | `0.5543` | `0.4557` | `0.4342` | `0.4347` | `0.4000` | `0.2222` | `0.6820` | Did not beat `prior_abc` (`-0.0032` Macro-F1) |
| **Extension (`Jan–Sep 2026`)** | `75` | `majority` (predict Class C) | `0.5600` | `0.1867` | `0.3333` | `0.2393` | `0.0000` | `0.0000` | `0.7179` | Trivial baseline |
| **Extension (`Jan–Sep 2026`)** | `75` | **`prior_abc` (prior-year persistence)** | **`0.5600`** | **`0.3694`** | **`0.3712`** | **`0.3664`** | **`0.4000`** | **`0.0000`** | **`0.6992`** | **Best on 2026 Partial Year (`Retained Baseline`)** |
| **Extension (`Jan–Sep 2026`)** | `75` | `xgb_depth_2` / `xgb_depth_3` | `0.5467` | `0.3614` | `0.3633` | `0.3596` | `0.4000` | `0.0000` | `0.6789` | Did not beat `prior_abc` (`-0.0068` Macro-F1) |

*(Add one sentence below Table 4.7 noting that on cold-start product labels (`no_prior_observation`, $N = 32$ val / $31$ test), Class A/B recall was `0.0000` across all models (`Macro-F1 = 0.2560`), whereas on labels with `1–6` prior active months (`low_history_1_6_months`), `prior_abc` and `xgb_depth_2` reached `Macro-F1 = 0.5992` on validation and `0.5060` on test.)*

---

### 4.4 Section `4.1.4 / 4.2.3` (PDF pp. 17–24, 38–42): Add **21-Model Rolling PHP Tournament (`WP4`) & `BUPIRIGHT` Unit Pilot**

Insert these two tables at the end of Section `4.2.3` to complement your 2017–2025 tournament tables:

**Table 4.14A. Rolling-Origin Revenue Tournament Summary on Original-Itemized Gold (`WP4`, `2017–September 2026`, `1,722` Predictions Across `21` Models)**

| Evaluation Stage & Horizon | Retained Model / Comparator | Rolling Origins ($N$) | **MASE (Primary Metric)** | **WAPE (`%`)** | MAE (`₱`) | RMSE (`₱`) | HLN-DM vs. Seasonal Naive ($p$-value) | Governance Status |
|---|---|---:|---:|---:|---:|---:|---:|---|
| **Development (`Pre-2025`, Lead 1)** | **`mean_6` (Frozen Selection)** | `48` | **`0.5439`** | `71.80%` | `₱4,424,782.42` | `₱6,743,499.64` | $p = 0.0019$ | **Best Dev Lead-1 (`Candidate Research`)** |
| **Development (`Pre-2025`, Lead 1)** | `seasonal_naive` (12-mo lag) | `48` | `1.0000` | `132.01%` | `₱8,134,853.19` | `₱11,482,109.45` | Reference | Naive seasonal benchmark |
| **2025 Audit Holdout (Lead 1)** | `mean_6` (Frozen Dev Selection) | `12` | `0.8819` | `97.92%` | `₱7,392,814.12` | `₱9,118,442.08` | $p = 0.3412$ | Degraded under 2025 volatility |
| **2025 Audit Holdout (Lead 1)** | `last_value` (Random-walk naive) | `12` | `0.5172` | **`57.43%`** | `₱4,335,910.55` | `₱5,812,304.19` | $p = 0.0418$ | Best post-hoc 2025 comparator |
| **2026 Extension (`Jan–Sep 2026`, Lead 1)** | `mean_6` (Frozen Dev Selection) | `9` | `1.4674` | `102.41%` | `₱8,912,450.33` | `₱11,204,118.90` | $p = 0.1180$ | Exceeds `MASE = 1.0` in 2026 |
| **2026 Extension (`Jan–Sep 2026`, Lead 1)** | `last_value` (Random-walk naive) | `9` | `0.6856` | **`47.85%`** | `₱4,164,228.10` | `₱5,490,112.44` | $p = 0.0892$ | Best post-hoc 2026 comparator |

**Table 4.14B. Single-Medicine Physical-Unit Forecasting Pilot (`BUPIRIGHT 4 mL HOSPITAL` Ampoules, `50` Records, `18` Contiguous Months `2025-04` to `2026-09`)**

| Forecast Horizon (Calendar Lead) | Model Identifier | Rolling Evaluation Targets ($N$) | **MAE (Ampoules)** | **RMSE (Ampoules)** | **WAPE (`%`)** | Signed Bias (Ampoules) | LOO Omission WAPE Range (`%`) | Governance & Deployment Status |
|---|---|---:|---:|---:|---:|---:|---:|---|
| **Lead 1 (`1-Month Ahead`)** | **`seasonal_naive_12`** | **`6` (`2026-04` to `2026-09`)** | **`13.17`** | **`18.14`** | **`31.60%`** | **`+8.50`** | `24.20% – 38.07%` | **Best Lead-1 Unit Baseline (`Research Only`)** |
| **Lead 1 (`1-Month Ahead`)** | `mean_3` | `6` (`2026-04` to `2026-09`) | `17.39` | `20.12` | `41.73%` | `+10.28` | `35.11% – 46.80%` | Rolling 3-month unit mean |
| **Lead 1 (`1-Month Ahead`)** | `last_value` | `6` (`2026-04` to `2026-09`) | `22.67` | `26.85` | `54.40%` | `+0.67` | `44.80% – 62.10%` | 1-month lag unit baseline |
| **Lead 3 (`3-Month Ahead`)** | **`seasonal_naive_12`** | **`4` (`2026-06` to `2026-09`)** | **`9.75`** | **`10.97`** | **`30.00%`** | **`+4.75`** | `21.74% – 34.81%` | **Best Lead-3 Unit Baseline (`Research Only`)** |
| **Lead 3 (`3-Month Ahead`)** | `mean_3` | `4` (`2026-06` to `2026-09`) | `14.58` | `16.90` | `44.87%` | `+8.92` | `38.20% – 51.00%` | Rolling 3-month unit mean |

---

### 4.5 Section `4.1.5 / 4.2.4 / 4.3.6` (PDF pp. 25–29, 36, 42–44, 55): Replace **Table 4.8** & `Not solved` Prescriptive Planning Text (`SO4`, `WP8`–`WP11`)

In your Chapter 4 PDF, **Table 4.8** (p. 36) states `EOQ, ROP, and Safety Stock — Not implemented`, and Sections `4.2.4` (p. 43) and `4.3.6` (p. 55) state that Prescriptive Planning was `Not solved`. **Replace Table 4.8 and Sections `4.2.4 / 4.3.6`** with these two tables and narrative:

**Table 4.8 (Replacement). Executed Prescriptive Planning, Scenario EOQ/ROP, and Weighted/Dated Integer-Pack Results (`SO4`, `WP8`–`WP11`)**

| Prescriptive Method & Clause | Implementation Scope & Runtime Module | Verified Quantitative Result (`30 October 2026`) | Provenance & Operational Boundary |
|---|---|---|---|
| **1. Entered-Stock Baseline vs. Bounded Greedy Allocation (`O4.01`)** | `backend/src/planningScenario.ts` (5-product Gold shortlist: `SPEEDA`, `SHARJVAX`, `SEROALBUMIN`, `SHARJVAX 1500IU/0.7ML`, `MONOWEL 1G IV`) | **Solved (`₱24.00` spent of `₱25.00` budget; `₱1.00` remainder):** Stock-only baseline fulfillment **`23.20%` $\rightarrow$ `33.07%` with purchases (`+9.87 pp`)**. Verified across `4` solved controls, `1` infeasible control, and `872` arithmetic checks. | `Assumed` (User-entered scenario sandbox; `85` product inputs start blank on Forecast $\rightarrow$ Planning transition). |
| **2. Scenario EOQ, Discrete Pack Cost, & Ceiling ROP (`O4.04`, `O4.05`)** | `backend/src/inventoryPolicyScenario.ts` + signed-in Admin UI & CSV export (`86` columns) | For $D = 365$ units/yr, $S = \text{₱2}$, $H = \text{₱1/unit/yr}$, $L = 5$ days, pack $p = 2$: **Continuous $\text{EOQ} = 38.209946$ units, economic pack lot = `19` packs (`38` units), ceiling $\text{ROP} = 5$ units (`4` lead-time demand + `1` safety/reserve)**, inventory position = `0`. | `Assumed` (`Scenario EOQ` / `Entered-input EOQ` per `Silver et al., 2017`; not measured company expense savings). |
| **3. Exact MCDA-Weighted Integer-Pack & Dated FEFO Selection (`O4.06`, `O4.07`)** | `backend/src/weightedPlanning.ts` & `datedPlanSelection.ts` (Branch-and-bound + LP relaxation upper bound) | Across 5 products (`6` demand units, `2`-unit packs at `₱1/pack`, cap `3` packs, budget `₱10`, priority `50, 40, 30, 20, 10`): **Selected `3, 3, 3, 1, 0` packs (`₱10` spend, `84.44%` weighted fulfillment, LP bound `84.44%`, `0.00%` optimality gap, `66.67%` unweighted mean fulfillment)**. Verified across all **`1,024` combinations** (`533` checks). | `Assumed` (Exact global optimum for the entered 5-product scenario; infeasible `100%` minimum-fulfillment target properly rejected). |
| **4. `BUPIRIGHT` Unit EOQ/ROP Sensitivity Sweep (`WP8`)** | `services/analytics_service/jobs/` (`outputs/wp8_unit_policy_sensitivity_20261030/`, `461` training ampoules at `Derived ₱165.18`) | Executed **`2,500` Cartesian scenarios** ($h \in [15\%, 35\%]$, $K \in [\text{₱500}, \text{₱3,000}]$, $L \in [7, 30]$ days, $z_{\alpha}$). Base scenario (`A1=25%`, `A2=₱1,500`, `A3=14d`, `95%` service): **$\text{EOQ} = 183$ ampoules, $\text{ROP} = 28$ ampoules**, modeled annual ordering+cycle-holding cost **`₱7,557.18`**. | `Derived` demand/unit cost (`461` ampoules, `₱165.18`) + `Assumed` policy parameters (`A1`–`A6`). Historical PO frequency is `unavailable` (`T8.2`). |

**Table 4.8B (New Insert). `BUPIRIGHT 4 mL HOSPITAL` 27,000-Run Common-Random-Number FEFO/FIFO Inventory Simulation (`WP11`, Base Shelf Life = 365 Days, Lead Time = 14 Days, 1,000 Replicates per Policy)**

| Simulated Policy Identifier & Rule (`WP11`, `2026-04` to `2026-09`, `250` Eval Ampoules) | Mean Unit Fill Rate (`%`) [Median; `2.5%–97.5%` Quantiles] | Mean Annualized Turnover [Median; `2.5%–97.5%` Quantiles] | Mean Stockout Days / Year [Median; `2.5%–97.5%` Quantiles] | Simulated 6-Month Expiry Wastage (`%`) | Policy Tradeoff & Governance Interpretation |
|---|---:|---:|---:|---:|---|
| **`P0` (Historical Naive Order: Prior 30-Day Demand, FIFO)** | **`94.35%`** [`94.40%`; `88.79%–100.00%`] | **`9.70`** [`9.60`; `7.58–12.26`] | **`11.10`** [`9.97`; `0.00–21.94`] | `0.00%` [`0.00%–0.00%`] | Leanest inventory (`9.70` turnover) but highest stockout exposure (`11.10` days/yr). |
| **`P1` (Fixed Training-Year EOQ = 183 / ROP = 28, FEFO)** | **`97.28%`** [`98.40%`; `90.00%–100.00%`] | **`4.82`** [`4.81`; `4.40–5.30`] | **`4.48`** [`3.99`; `0.00–15.96`] | `0.00%` [`0.00%–0.00%`] | **`+2.93 pp` fill rate gain** and **`-6.62` fewer stockout days/yr** vs. `P0`, at lower turnover (`4.82`). |
| **`P2` (Origin-Known `mean_6` Research Forecast, Shelf-Capped EOQ/ROP, FEFO)** | **`97.61%`** [`98.80%`; `90.40%–100.00%`] | **`4.73`** [`4.72`; `4.30–5.25`] | **`4.02`** [`1.99`; `0.00–15.96`] | `0.00%` [`0.00%–0.00%`] | Highest fill (`97.61%`, **`+3.26 pp` vs. `P0`**) and lowest stockout days (`4.02`), trading off cycle inventory (`4.73` turnover). |

*(Note below Table 4.8B: Across all `9` shelf-life `[180, 365, 730]` $\times$ lead-time `[7, 14, 30]` sensitivity cells (`27,000` runs), simulated expiry remained `0.00%` because the evaluated horizon is `6` months under `180–730`-day shelf-life assumptions; this exposes a fill-rate vs. inventory-turnover tradeoff under `A1`–`A7`, not measured physical warehouse wastage reduction $\le 5\%$.)*

---

### 4.6 Section `4.4` (PDF pp. 62–72): Replace **Table 4.19 (`Summary of System Verification Results`)**

**Table 4.19 (Updated). Summary of System Implementation and Verification Results Across Layers**

| System Layer / Verification Scope | Verification Method and Command / Evidence Packet | Executed Test / Assertion Counts | Observed Outcome and Remaining Boundary |
|---|---|---|---|
| **Databricks Medallion Pipeline & Local Source Lineage (`SO1`, `SO5`, `WP12`)** | `python -X utf8 -m unittest discover -s databricks_updated_2/medshield_project/tests -p test_*.py -v` ([`outputs/databricks_updated_2_validation_20261030/`](../../../medshield1/medshield/outputs/databricks_updated_2_validation_20261030/README.md) & [`wp12_controlled_ingestion_6scenarios_20261030/`](../../outputs/wp12_controlled_ingestion_6scenarios_20261030/README.md)) | **`200` unit tests**, `7` notebook generator checks, `15` payload hashes, `55` Gold Delta-0 capture checks, `10` CSV lineage checks | **PASS.** All `10` local CSVs (`2017–Sep 2026`) match uploaded originals (`7` byte-exact; `3` field-identical after BOM/newline normalization). `40,171` itemized rows (`₱638,015,351.53` net) conserved. Remote cloud partition rollback not re-executed locally. |
| **Offline Python Analytics & Model Verifiers (`SO1`–`SO5`, `WP0`–`WP14`)** | `python -X utf8 -m unittest` across `18` test modules ([`outputs/sales_external_implementation_20261030/python-tests.txt`](../../outputs/sales_external_implementation_20261030/python-tests.txt)) + independent `verify.py` scripts in `outputs/wp1`–`wp14` | **`121` Python unit tests** + `11` independent Decimal/Fraction verifiers (`234` bound files) | **PASS.** Reconciles regional STL strengths (`T1.1–T1.3`), `5,693`-label financial ABC (`T2.0–T2.4`), `5` CALABARZON residual anomalies (`T3.2`), `1,722` rolling PHP forecast MASE/HLN-DM scores (`T4.1–T4.3`), `1,032` ABC classifier cases (`T6.1–T6.3`), `2,500` EOQ/ROP scenarios (`T8.1`), and `27,000` simulation runs (`T11.1–T11.2`). |
| **Express/TypeScript Analytical Gateway & Role/Publication Guards (`SO1`–`SO5`)** | `node --import tsx --test` across backend suites ([`outputs/sales_external_implementation_20261030/backend-tests.txt`](../../outputs/sales_external_implementation_20261030/backend-tests.txt), `source_recheck_20261030`, `originalItemizedSource.test.ts`) | **`95+` targeted backend tests** (`393` full suite) + `backend` & `tsconfig.scripts.json` TypeScript checks (`0` errors) | **PASS.** Enforces linked Supabase RBAC (`Admin`, `Analyst`, `Viewer`), `409 DATABRICKS_INGESTION_REQUIRED` on direct upload, fail-closed `503` on analytical source outage, and explicit `unavailable` live official bulletin. |
| **Next.js Frontend, Sandbox Runtime & Compiled Contract Suites (`SO1`–`SO5`)** | `tsc -p frontend/tsconfig.json --noEmit`, ESLint, and compiled E2E contracts (`regional-sales-contracts.cjs`, `unit-research-contracts.cjs`, `planning-research-boundary.cjs`, `source-recheck-contracts.cjs`) | `55` regional views, `165` regional CSVs, `33` STL views, `80` product combinations, `44` area views, `40` unit-forecast cases, `85` blank planning fields | **PASS.** Zero TypeScript or ESLint errors. Repair verified for extended-range trend CSV (`All available years`, `71` checks) and narrow-viewport forecast legend (`8` chart controls). |
| **Authenticated Browser Workflows & 6-Task Operator Walkthrough (`A1`–`A6`, `SO1`–`SO5`)** | Signed-in Admin desktop walkthroughs ([`outputs/client_acceptance_20261029/operator/`](../../../medshield1/medshield/outputs/client_acceptance_20261029/operator/README.md), [`policy_weighted_browser_20261030/`](../../../medshield1/medshield/outputs/policy_weighted_browser_20261030/README.md), [`planning_browser_review_20261030/`](../../../medshield1/medshield/outputs/planning_browser_review_20261030/README.md)) | **`30,348` CSV cell assertions** (`A1–A6` operator run), `61,730` product-export checks, `533` EOQ/ROP/weighted checks (`1,024` combinations), `151` draft checks | **PASS (Engineering Self-Review).** Verifies live Overview, Diagnostics, Product/Area queues, BUPIRIGHT unit forecast, solved/weighted/dated Prescriptive Planning, draft recovery, and `Recheck source`. Actual external client task sign-off remains `not_run`. |

---

# CHAPTER 5: CONCLUSION AND RECOMMENDATION (+ REFERENCES)

In your **14-page Chapter 5 PDF (`GROUP_9_MedShield_CP2_Chapter_4_5-2.pdf`)**, replace **Table 5.1** (pp. 2–3) and **Table 5.2** (p. 5) with the complete tables below, and append the four methodological references to your Reference list (pp. 6–14):

### 5.1 Replacement for **Table 5.1** (Chapter 5 PDF, pp. 2–3)

**Table 5.1 (Updated). Summary of Conclusions Mapped to Specific Objectives (`SO1`–`SO5`, Reassessed 30 October 2026)**

| Specific Objective | Provisional Original-Clause Coverage | Key Verified Empirical and Engineering Conclusions (`2017–September 2026` Scope) | Remaining Original-Scope Acceptance Gates |
|---|---:|---|---|
| **SO1:** Analyze historical sales performance and seasonal patterns across CALABARZON, MIMAROPA, and Bicol (`O1.01`–`O1.05`) | **`3.0 / 5` (`60.0%`)** | The original-itemized Gold candidate (`Delta 0`, `e87cae21…`) reconciles **`40,171` itemized records** (`39,286` net-eligible = **`₱638,015,351.53`**; `36,798` margin-supported = **`₱334,666,271.55` supported gross profit** on `₱566,954,921.92` matching revenue, **`59.0287%` weighted margin**; historical 2017–2025 adjusted baseline = `37,728` records, `₱626,946,741.81`). Nine user-confirmed provincial delivery labels allocate `19,455` records (`₱115,614,895.77` or `18.12%`), while `20,716` channel/ambiguous rows (`₱522,400,455.76`) remain visibly `UNALLOCATED`. Robust monthly STL (`81` contiguous `CALABARZON` months, `2020-01` to `2026-09`) yields $F_T = 0.0338$, $F_S = 0.0834$, October peak, May trough, and `5` robust residual exceptions ($\|z_{\text{rob}}\| > 3$), including June 2026 (`+₱1,405,737.01` YoY net change localized to `167` Quezon delivery rows). | Complete transaction-linked territorial attribution (`81.88%` of net sales remains in unallocated channels), qualifying $\ge 36$-month continuous histories for `MIMAROPA` (`19` mo) and `Bicol` (`31` mo), and origin-safe forecast linkage. |
| **SO2:** Identify priority products, accounts, and geographic areas using classification and ranking methods (`O2.01`–`O2.07`) | **`3.0 / 7` (`42.9%`)** | Deterministic positive-net ABC across `5,693` product labels identifies **`627` Class A (`₱510.46M`, `80.01%`), `1,220` Class B (`₱95.74M`, `15.01%`), and `3,748` Class C (`₱31.88M`, `5.00%`)** labels, paired with transparent commercial review queues (top contributors, `72` comparable 2026 Medical declines, negative profit cases `ELCILLIN`/`CLONISUR`, and unsupported-margin gaps such as `CLINTOP`). Across confirmed delivery areas, `QUEZON`, `BATANGAS`, `LAGUNA`, `MARINDUQUE`, and `CAM NORTE` represent `86.14%` of confirmed-area net sales. In the frozen held-out `XGBoost` ABC evaluation (`1,032` prediction cases), **`prior_abc` (`Macro-F1 = 0.5367` val, `0.4379` 2025 test, `0.3664` 2026 ext)** outperformed `xgb_depth_2` (`0.4321`) and `xgb_depth_3` (`0.4347`), as cold-start labels lacking prior-year history had `0.00` A/B recall. | Verified canonical SKU/pack identities (`D1`), transaction-linked customer account IDs (`D2`, required for account Pareto and `XYZ` unit-volatility matrices), physical warehouse stock records to distinguish stocked slow movers from low recorded sales, and stronger cold-start classifier features. |
| **SO3:** Forecast pharmaceutical demand across territories using time-series and machine-learning models with disease and weather indicators (`O3.01`–`O3.08`) | **`2.0 / 8` (`25.0%`)** | Two bounded forecasting tracks are established: (1) **21-model original-itemized PHP rolling tournament (`1,722` predictions at leads 1 & 3, `WP4`)**, where frozen `mean_6` achieved development Lead-1 `MASE = 0.5439` (`WAPE = 71.80%`) but degraded to `MASE = 0.8819` in 2025 and `1.4674` in Jan–Sep 2026 (`last_value` had `2025 WAPE = 57.43%`, `2026 WAPE = 47.85%`); and (2) **user-confirmed `BUPIRIGHT 4 mL HOSPITAL` ampoule unit pilot (`50` records, `18` contiguous months `2025-04` to `2026-09`)**, where `seasonal_naive_12` achieved Lead-1 `MAE = 13.17` ampoules (`WAPE = 31.60%`) and Lead-3 `MAE = 9.75` ampoules (`WAPE = 30.00%`), alongside the preserved `TRIVASC 35MG MR–Quezon` historical pilot (`mean_3 MAE = 27.93` boxes, `WAPE = 42.75%`). A prospective 12-month protocol (`2026-11` to `2027-10`) and publication-lagged `DII`/`RSI` external-index modules (`WP5`) are prepared. | Verified territorial medicine-unit series (`HOSPITAL` is a channel, not a geographic province), issue-time external `DOH`/`PAGASA` publication vintages, executed common-fold `DII`/`RSI` ablation and surge urgency classification (`D3`/`D4`), and prospective out-of-sample issuance once post-September 2026 data arrives. |
| **SO4:** Optimize procurement and inventory allocation using EOQ, ROP, safety stock, and bounded/weighted optimization (`O4.01`–`O4.08`) | **`3.0 / 8` (`37.5%`)** *(+1.0 from `O4.04` EOQ & `O4.05` ROP)* | Prescriptive Planning now delivers verified entered-assumption scenario methods: (1) **Solved 5-product baseline scenario** (`₱24` spent of `₱25` budget, lifting mean fulfillment from **`23.20%` stock-only baseline to `33.07%`, `+9.87 pp`**); (2) **Scenario EOQ & ROP (`O4.04`, `O4.05`)** with discrete pack-cost comparison, reserve-once ceiling ROP, and shelf-life guard (`EOQ = 38.21` units, `19` packs/`38` units, `ROP = 5` units) + **`WP8` `2,500`-scenario sweep (`EOQ = 183`, `ROP = 28` ampoules)**; (3) **Exact MCDA-weighted integer-pack allocation (`O4.06`) and FEFO dated purchase selection (`O4.07`)** (`3, 3, 3, 1, 0` packs, `₱10` spend, **`84.44%` weighted fulfillment, `0.00%` optimality gap** verified across all `1,024` combinations and `533` browser checks); and (4) **`WP11` `27,000`-run FEFO/FIFO simulation (`P0` fill `94.35%`, `P1` `97.28%`, `P2` `97.61%`)**. | Verified physical warehouse stock/lot-expiry balances, supplier lead-time logs, and holding/ordering cost records (confirmed unavailable in the current sales-ledger workspace), plus measured operational turnover improvement and $\le 5\%$ physical expiry-wastage outcomes (or recorded adviser scope amendment). |
| **SO5:** Integrate descriptive, diagnostic, predictive, and prescriptive analytics into a role-governed web-based DSS (`O5.01`–`O5.05`) | **`1.5 / 5` (`30.0%`)** | The Next.js + Express/TypeScript + Databricks Unity Catalog + Supabase RBAC architecture enforces fail-closed analytical serving (`503` on source outage, zero mock/local fallbacks), disabled direct browser CSV uploads (`409`), accessible `Recheck source` reload, governed planning draft save/load/rejection/recovery, and an explicit `85`-field blank boundary between research forecasts and planning inputs. Verification comprises **`200` pipeline tests (`WP12`), `95+` backend tests, `121` Python tests, and the 6-task operator walkthrough (`A1–A6`, `30,348` CSV assertions)**. Offline `ALS`/`item-kNN` collaborative filtering (`WP13`) and historical early-warning evaluation (`WP14`) are implemented while live official bulletins remain explicitly `unavailable`. | End-to-end remote cloud partition rollback/retry demonstration (`WP12`), live official `PAGASA` Signal $\ge 2$ / `DOH` bulletin connector (`O5.04`), reviewed-account holdout evaluation for collaborative filtering (`O5.05`), and attributable client walkthrough sign-off (`A1–A10` + SUS). |
| **Aggregate Original-Requirement Coverage** | **`12.5 / 33` (`37.9%`)** | **All five specific objectives have verified software, pipeline, and analytical method implementations (`Descriptive = 50.0%`, `Diagnostic = 50.0%`, `Predictive = 27.8%`, `Prescriptive = 37.5%`).** | **All five objectives remain `Partial` under the strict original-clause rubric pending external operating records, source identity mappings (`D1–D4`), and formal client/adviser acceptance.** |

---

### 5.2 Replacement for **Table 5.2** (Chapter 5 PDF, p. 5)

**Table 5.2 (Updated). Summary of Actionable Recommendations, Priority Levels, Owners, and Target Scope**

| Priority | Recommendation Domain | Concrete Action and Governance Rule | Accountable Owner(s) | Target Objective & Work Package |
|---|---|---|---|---|
| **Priority 1 (Immediate — Data & Finance Governance)** | **Preserve Dual Population Lineage & Resolve Margin-Support Exceptions** | Retain the `2017–September 2026` original-itemized Gold candidate (`Delta 0`, `40,171` records, `₱638,015,351.53` net sales) as the active analytical baseline while preserving the `2017–2025` (`37,728`-row) and `25 October` (`40,160`-row) snapshots as dated historical evidence. Do not rerun Bronze/Silver/Gold on byte-equivalent CSVs and never sum contract summaries with itemized product rows (`Decision 009`). Use the commercial exception queues to review the `1,346` cost-formula mismatches (`1,047` conditional rounding candidates) and `1,017` missing-cost rows before altering margin-eligibility flags. | Finance Reviewer, Source Data Owner, & Data Engineer | `SO1`, `SO2` (`O1.01`, `O1.02`, `O2.01`, `WP1`, `WP2`) |
| **Priority 2 (High — Master Identity & Territory Mapping)** | **Complete Reviewed Derivations (`D1`–`D4`) for SKUs, Accounts, and Unallocated Channels** | Retain the `9` user-confirmed provincial delivery labels (`₱115.61M`) and keep `HOSPITAL`/`GOVERNMENT` and ambiguous `MINDORO` rows in the `UNALLOCATED` bucket (`₱522.40M`) until invoice-linked delivery addresses (`D4`), canonical SKU/pack conversions (`D1`), and customer account aliases (`D2`) are certified by source owners. Once `D1`/`D2` are approved, execute the implemented `ABC–XYZ` unit-volatility matrix (`WP2`), paired-unit Price–Volume–Mix decomposition (`WP3`), and reviewed-account `ALS`/`item-kNN` holdout study (`WP13`). | Catalog / Sales Lead & Data Analyst | `SO1`, `SO2`, `SO5` (`O1.03`, `O2.01`–`O2.05`, `O5.05`, `WP2`, `WP3`, `WP13`) |
| **Priority 3 (High — Forecasting & External Surveillance)** | **Execute Registered Prospective Unit Evaluation & Lag-Safe `DII`/`RSI` Ablation** | Keep `prior_abc` (`WP6`), `mean_6`/`last_value` PHP models (`WP4`), and `BUPIRIGHT 4 mL HOSPITAL` ampoule baselines (`seasonal_naive_12`) labeled as candidate research (`forecast_approval = false`). When post-September 2026 source exports arrive, execute the registered 12-month prospective unit protocol (`2026-11` to `2027-10`) using the tested offline writer and Gold adapter (`E39`). Bind `D3`/`D4` therapeutic-territory cohorts to run the lag-safe `DII`/`RSI` ablation (`WP5`) and historical early-warning evaluation (`WP14`) while keeping live official `PAGASA`/`DOH` bulletins `unavailable` until an authenticated feed exists. | Model Owner, Data Analyst, & Backend Engineer | `SO3`, `SO5` (`O3.01`–`O3.08`, `O5.04`, `WP4`–`WP7`, `WP14`) |
| **Priority 4 (Medium — Inventory & Prescriptive Operations)** | **Record Adviser Scope Decision on `A1`–`A9` Scenario Evaluation vs. Physical Warehouse Pilot** | Because current physical stock, batch-expiry, supplier lead-time, and EOQ cost records are confirmed unavailable in the sales-ledger workspace (`E46`), submit the prepared [`ADVISER_AMENDMENT_MEMO_20261030.md`](../ADVISER_AMENDMENT_MEMO_20261030.md) and [`ASSUMPTIONS_REGISTER.md`](../ASSUMPTIONS_REGISTER.md) (`A1–A9`) for adviser review to authorize evaluating `O4.02`–`O4.05` via the implemented scenario EOQ/ROP (`WP8`), exact integer-pack MILP (`WP9`), AHP sensitivity (`WP10`), and 1,000-run FEFO Monte-Carlo simulation (`WP11`) on presentation-consistent cohorts. For live procurement deployment, collect verified dated stock/lots and supplier terms for one pilot medicine SKU first. | Capstone Researcher, Adviser/Panel, & Operations Lead | `SO4` (`O4.01`–`O4.08`, `WP0`, `WP8`–`WP11`) |
| **Priority 5 (Medium — Client Acceptance & Final Thesis Assembly)** | **Conduct Attributable Client Walkthrough (`A1`–`A10` + SUS) & Regenerate Formatted Word/PDF** | Use the completed 6-task engineering operator walkthrough (`outputs/client_acceptance_20261029/operator/README.md`, `30,348` assertions) as the technical readiness baseline, and schedule an attributable MedShield stakeholder session to record unaided task outcomes (`A1–A10`) and System Usability Scale (`SUS`) scores in `review-record.json`. Integrate the verified `WP1`–`WP14` paper inserts, replace unverified WHO/FDA secondary rationales with primary citations (`Silver, Pyke, & Thomas, 2017`), and export the final institutional manuscript. | Capstone Researcher, Client Reviewer, & Technical Writer | `SO5` & Manuscript (`O5.01`–`O5.05`, `WP12`, Phase 5 & Phase 6) |

---

### 5.3 Methodological References to Append to Chapter 5 References (PDF pp. 6–14)

- **Harvey, D., Leybourne, S., & Newbold, P. (1997).** Testing the equality of prediction mean squared errors. *International Journal of Forecasting*, 13(2), 281–291.
- **Hu, Y., Koren, Y., & Volinsky, C. (2008).** Collaborative filtering for implicit feedback datasets. *Proceedings of the 8th IEEE International Conference on Data Mining (ICDM)*, 263–272.
- **Saaty, T. L. (1980).** *The Analytic Hierarchy Process: Planning, Priority Setting, Resource Allocation.* McGraw-Hill.
- **Silver, E. A., Pyke, D. F., & Thomas, D. J. (2017).** *Inventory and Production Management in Supply Chains* (4th ed.). CRC Press.
