# Chapter 4. Results

## 4.1 Data and evaluation design

The analysis uses MedShield's original itemized sales records from January 2017 to September 2026 (39,286 eligible
lines; ₱638,015,351.53 net), excluding contract summaries, which carry no product breakdown. Forecast experiments use the
contiguous window January 2020 to September 2026 (81 months). Accuracy is reported as the weighted absolute percentage
error (WAPE), the total absolute miss divided by total actual sales, together with normalized bias (negative values mean
under-forecasting).

Every confirmatory test was pre-registered: the method, parameters, evaluation months and pass rule were fixed and
hashed before any result was computed. The standard rule required a 90% block-bootstrap interval of the paired error
difference wholly below zero, absolute bias of 5% or less, and the improvement present in both halves of the evaluation
period. Because all months had been inspected by earlier studies, results are retrospective; the exploratory search in
Section 4.7 selected methods at each forecast date using only errors known at that date.

## 4.2 Sales structure (SO1)

Eight descriptive views were computed directly from the itemized records, January 2017 to September 2026 (2026 covers
January to September); each is a count or ratio with no estimation.

| View | Finding |
|---|---|
| Order size | The median delivery document rose from ₱3,150 (2017) to ₱15,260 (2026). Documents of ₱500,000 or more grew from 0% of sales (2017) to 49% (2025) and 60% (January–September 2026) |
| Buyer channel mix | Government and Hospital labels carry most sales since 2019, but the split swings, for example Government 69% in 2023 and 19% in 2024 |
| Category mix and margin | Medicine is 64–85% of sales each year; its recorded gross margin fell from 73.4% (2019) to 51.5% (2025) |
| Portfolio change | 23–55% of each year's sales comes from product families with no sales the year before |
| Concentration | Top-10 family share ranges from 22% (2023) to 42% (2026); every year is unconcentrated (HHI below 1,500) |
| Returns and adjustments | At most 2.2% of sales (2020), near zero since |
| Discounts | Fell from 1.7% of gross sales (2018) to 0.2% (2026) |
| Within-month timing | By day 20, the median month has delivered 59–74% of its sales, except 2025 (36%) |

The order-size shift is the descriptive counterpart of the forecasting result in Section 4.4: MedShield moved from many
small orders to fewer, larger institutional ones, which makes monthly totals harder to predict. Channel labels follow
source-workbook conventions that changed between years, and margin uses only rows whose cost and sales pass quality
checks, before operating expenses.

### 4.2.1 Why margin fell and where growth came from (diagnostic)

Two accounting breakdowns explain the changes above (`outputs/diagnostic_breakdowns_20261115/`). Both are exact
identities on recorded figures: the parts add up to the total change, and no model or estimate is involved.

**Margin.** Gross margin on margin-eligible rows fell from 70.7% (2019) to 49.4% (2025), a drop of 21.3 points. Each
change splits into a mix effect (selling different things) and a rate effect (lower margin on the same things):

| Breakdown by | Mix effect | Rate effect |
|---|---|---|
| Product category | −2.1 pts | −19.2 pts |
| Channel label | −3.4 pts | −17.9 pts |
| Product family | −17.1 pts | −4.2 pts |

At category level the fall looks like a rate drop. At family level, the finest grouping, it is mostly mix: high-margin
families shrank or stopped (SPEEDA 9.2% → 2.6% of eligible sales, EVAPROST 6.4% → 1.0%, EUROXONE 2.9% → 0.0%, LACTAMOX
3.2% → 0.1%), and newer families carry lower margins. A few same-family margins also fell sharply (SPEEDA 86% → 33%,
ZINACARE 92% → 48%), which points to price or cost changes the records cannot separate. Cost coverage limits this result:
65.9% of 2019 sales had usable cost data against 90.3% in 2025, so if the 2019 rows without cost had lower margins, the
true decline is smaller.

**Sales change.** Each year's change was split into large orders (documents of ₱500,000 or more) and routine sales from
continuing, new and lost families, comparing only months recorded in both years:

| Years (matched months) | Change | Large orders | Continuing | New families | Lost families |
|---|---|---|---|---|---|
| 2023→2024 (12) | −₱33.8M | −₱16.3M | −₱5.2M | +₱5.5M | −₱17.9M |
| 2024→2025 (12) | +₱60.1M | +₱36.7M | +₱7.3M | +₱21.1M | −₱5.1M |
| 2025→2026 (Jan–Sep) | +₱75.7M | +₱51.0M | +₱0.7M | +₱36.2M | −₱12.2M |

Recent growth came from large orders and new families. Continuing routine families grew by only ₱0.7M in
January–September 2026. Across 2019–2026, new families add ₱5–36M a year and lost families remove ₱5–18M.

Both breakdowns describe the same structural shift seen in Section 4.2 and confirmed by the forecast results in
Section 4.4: from steady sales of established, high-margin products to tender-driven institutional business. This
supports SO1 (explain what drives sales) and is the reason the system treats large orders as a readiness question rather
than a forecasting one.

### 4.2.2 Unusual months

Each recorded month was compared with the median of the 12 recorded months before it and flagged when it lay at least 3
robust standard deviations (1.4826 × MAD) away (`outputs/unusual_months_20261115/`; rule fixed before running). Each
flagged month's gap was split into large orders and routine sales by family. Of 101 scorable months, 16 were flagged in
total sales. One was a data gap: December 2017 holds only ₱3,900 against a usual ₱2.4M and should be treated as missing.
Of the 15 unusually high months, 11 were explained mainly by large orders, and 5 fell in 2025. In routine sales,
13 months were flagged. The spikes were usually driven by newly introduced products (for example pandemic supplies in
July–August 2021, and CUROXIM, MONOWEL, GENVAC B and EPOGEN in 2025). The two unusually low months, October and November
2024, were spread across many products, consistent with the 2024 losses in Section 4.2.1. The flags are retrospective
descriptions, not alerts.

### 4.2.3 Product survival

New product families (first sold 2020–2025, with no sales in any earlier recorded month) were followed from their first
month (`outputs/product_survival_20261115/`; rules fixed before running). Of the 1,526 families whose second year is
known, 23% still sold in year 2 and 16% in year 3. 53% sold in a single month only. As a group they kept 27% of their
first-year sales in year 2. The 2021 cohort kept only 8%, consistent with pandemic supplies that were not reordered.
A simple early signal separated lasting products: families that sold in at least 3 of their first 6 months survived to
year 2 at 52% against 19% for the rest, and the direction held in all five cohorts. Families introduced mainly through
large orders kept only 9% of their first-year value in year 2, against 49% for routine starts, although whether they
kept selling at all did not differ consistently. The 2023 cohort (626 families, about twice the usual) likely includes
label variants not merged by the candidate family mapping, which would make products look newer and shorter-lived.
Together with Sections 4.2.1 and 4.4.1, this shows that growth depends on a steady inflow of new products and large
orders rather than on a stable, growing product range.

## 4.3 Baseline: simple averages are hard to beat

Across a tournament of fifteen methods (simple averages, seasonal naive, ETS, SARIMA, Ridge regression and gradient
boosting), no method met the pre-registered rule against the six-month mean (mean_6). Company-level WAPE ranged from
61.1% (ETS) to 85.2% (Ridge) on pooled 1-, 3- and 6-month forecasts. Machine-learning models had the highest error
(77–85%), consistent with the short series. On the wider rolling study (57 months, one month ahead), mean_6 scored 49.7%
WAPE with −10.8% bias. Accuracy is much higher in the CALABARZON regional series (24.9–31.7% WAPE), where sales are less
dominated by single large orders.

## 4.4 The source of error: large institutional orders

A decomposition of monthly variance showed that document size, not document count, explains 77% of the variation in
log monthly sales. The 231 delivery documents of ₱500,000 or more (2.6% of documents) carry 44.6% of net sales. Removing
them leaves a routine series with a coefficient of variation of 0.60 against 0.84 for the total, and a one-month-ahead
WAPE of 36.7–38.4% against 49.7%. Large orders on their own were not predictable (68–89% WAPE across all methods), and
rebuilding the total from routine forecasts plus a large-order allowance did not beat mean_6 (50.8–58.0%). A
frequency analysis showed large orders arrived in 71% of recent months for Government and Hospital buyers, but timing was
only weakly predictable (Brier score 5.8–9.5% better than the long-run rate) and amounts were not (84–95% WAPE).

### 4.4.1 Large-order profile: planning for readiness

Since large orders cannot be forecast, a separate pre-registered analysis described how they behave
(`outputs/large_order_profile_20261115/`; all 267 documents of ₱500,000 or more, 2017 to September 2026).

- **Frequency.** Large orders were occasional until 2024 (3 of 12 months) and became a monthly event afterwards: 20 of
  the 21 months from January 2025 had at least one, and January–September 2026 has 74 large documents, more than any full
  year. Their share of sales rose from 16% (2018) to 60% (2026).
- **Size.** A typical document is ₱846k (90th percentile ₱1.56M, maximum ₱4.89M). A month with large orders typically
  has 3 documents totalling ₱3.0M, with 80% of such months between ₱0.8M and ₱9.0M.
- **Timing.** Calendar-month differences were not reliable (within-year permutation test, p = 0.134 against a 0.05 rule).
- **Content.** Large orders spanned 1,001 product families; the top 10 carry only 28.5% of their value, and only 29–48%
  of each year's large-order value was in families seen in earlier large orders. Pre-stocking specific products is
  therefore not supported.

Two history-based readiness estimates were forward-tested from January 2021, each using only earlier months. The chance
of at least one large order next month (long-run share, selected on 2021–2023) scored a Brier score of 0.216 on 2024 to
September 2026 against 0.25 for a coin flip, predicting 61% against 70% observed. The range of next month's large-order
total (10th to 90th percentile of the previous 24 months) contained the actual value in 83% (2021–2023) and 73% (2024–2026)
of months, inside the pre-registered 70–90% band. Both pass narrowly and both run low: all 15 range misses were above
the range, and the unselected last-12-months share would have scored better on the holdout (0.161), which we report
without switching. These estimates are kept as benchmarks that give a floor for readiness. Readiness is framed as
working capital, supplier access and delivery capacity sized to the large-order range, not as stock of specific products.

### 4.4.2 Readiness sizing

A follow-up pre-registered test asked how much large-order value to be ready for each month
(`outputs/readiness_sizing_20261115/`). Eight options set the reserve to a percentile (50th, 75th, 90th or maximum) of
the previous 12 or 24 monthly large-order totals. The cheapest option covering at least 80% of months on 2021–2023 was
the 90th percentile of the last 12 months (81%). On January 2024 to September 2026 it covered 23 of 33 months (69.7%),
narrowly failing the 70% rule, so no default reserve is claimed. Every option lost coverage in the holdout as large
orders grew; the only options above 75% held the highest past month, leaving ₱4.5–6.4M unused in an average month. The
system therefore presents readiness as a trade-off table for the user to choose a risk level (for October 2026,
₱7.8–15.2M of large-order value, or about ₱3.9–7.7M of cash at the 2025 cost share), not as a recommendation. The result
reinforces that advance notice of large orders, which only the client can provide, would add more than any
history-based rule.

## 4.5 Data quality outweighed model choice

Product-level analysis was initially limited by label churn: 35–61% of top-value product labels each year were new. A
rule-based product-family mapping grouped 5,623 labels into 3,508 families. At family level, the share of top steady
products' value retained the next year rose from 52% to 82%. A pre-registered null test confirmed this was not an effect
of group size alone: 200 random groupings of identical sizes averaged 60%, and only 3.5% reached 82%. An AI-assisted
review of a 50-family sample found 46 of 48 classifiable families correct (95.8%), rising to 48 of 48 after two
formulation splits. The same change reduced the over-forecasting of the TSB intermittent-demand method from +77% to +18%,
although TSB still did not beat mean_6.

The 2025 family ABC–XYZ classification shows why total sales resist forecasting: 91 high-value families with erratic
monthly sales carry 72.8% of net sales, while only 8 steady high-value families (3.4%) suit automatic reorder rules.

## 4.6 The largest accuracy gain: day-level data

Delivery dates allow an estimate of the current month before it closes. A blend of month-to-date sales, scaled by the
usual share delivered by that day, and the six-month mean, with the blend weight fixed on 2022–2023 data, was evaluated on
33 months (January 2024 to September 2026). By day 20, the estimate reached 28.8% WAPE with −2.3% bias, against 41.8%
WAPE and −24.2% bias for the forecast available before the month (a 31% reduction). It met the pre-registered rule. The
day-15 estimate was similarly accurate (27.8%) but missed the bias limit (−5.4%); its single registered retry worsened
bias to −9.6%, and it was retired.

### 4.6.1 Disease and therapeutic categories

Earlier tests of the disease link used brands and product families. To give the hypothesis its strongest fair test,
the top 200 product families (68.7% of sales) were mapped to therapeutic categories from their label names, strengths
and forms (174 with high or medium confidence; candidate, not verified against FDA registrations). The mapping shows
that programme and hospital products (vaccines and immune sera 10.3%, obstetric 4.4%, critical care, anaesthetics,
anticoagulants) carry 27.8% of sales, infection-related categories 20.7% (antibacterials 17.1%), and chronic-disease
categories only 4.6%. Nine DOH diseases were matched in advance to plausible categories (ILI and SARI to respiratory and
antibacterial medicines; COVID-19 to PPE, critical care and anticoagulants; dengue and chikungunya to fever and pain
medicines; typhoid, diarrhoeal disease and leptospirosis to antibacterials; rabies to vaccines and immune sera). Each pair
was tested on month-to-month changes in routine sales, 2021–2025, in MedShield's regions and nationally, at the same
month and one month later (`outputs/category_disease_test_20261115/`; rules fixed before running).

None of the 64 tests was supported after Holm correction. The strongest pairs were medically plausible (COVID-19 to
enoxaparin one month later, ρ = 0.34, raw p = 0.005; typhoid to antibacterials, ρ = 0.26; dengue to fever medicines,
ρ = 0.25), but none survived correction. No category's routine sales were seasonal (0 of 18, smallest raw p = 0.12). The
disease link has therefore been tested at brand, family and category level with the same result. This contrasts with
retail studies, where over-the-counter sales track disease within weeks, and is consistent with institutional buyers
purchasing in batches for stock and programmes.

A sensitivity rerun with a corrected mapping (v0.1) gave the same result. Three families changed: JUBI-R was classified
as remdesivir, CORBAL as a probable hydrocortisone injection, and DROXISUR was corrected from an antibiotic to
hydrocortisone after a registry lookup. With the same rules and pairs, 0 of 64 tests were supported and 0 of 19
categories were seasonal; five correlations moved by 0.02 or more, all involving critical care. Antiviral sales
(remdesivir and aciclovir, ₱6.2M) occurred in only four months of 2021–2022, during the pandemic, which is too few
months to test. With the corrected mapping, programme and hospital products are 28.4% of sales, infection-related
categories 21.3% and chronic-disease categories 4.6%; 24 of the top 200 families (4.4% of sales) remain unclassified.

**Table 4.x. Expectations from the literature (Table 2.x) against MedShield's records**

| Expectation from the literature | Observed in MedShield |
|---|---|
| Most medicine sales go through drugstores (87.2% nationally) | Government and Hospital labels carry most sales since 2019; large orders are 60% of January–September 2026 sales |
| Chronic-disease medicines form a large, steady base | Chronic-disease categories are 4.6% of sales |
| Infection medicines rise in the rainy season | No category is seasonal (0 of 18; 0 of 19 in the sensitivity rerun) |
| Disease activity moves medicine sales within weeks | 0 of 64 disease–category tests supported |
| Steady, high-value items suit automatic reordering | 8 steady high-value families carry 3.4% of 2025 sales; 91 erratic ones carry 72.8% |

MedShield therefore sits in the smaller institutional channel of the Philippine market, and the retail-based
expectations do not describe it.

## 4.7 Exploratory search for well-fitting models

Fourteen methods and four selection or blending schemes were compared with no-hindsight selection on 2022–2026 targets.
Gains over mean_6 were modest:

| Use | Best-fitting method | WAPE | Bias | mean_6 WAPE |
|---|---|---|---|---|
| Routine sales, 1 month ahead | Blend of 3- and 6-month means, 6-month median and growth-adjusted mean | 37.3% | −6.9% | 37.8% |
| Routine sales, 3 / 6 months | 3-month mean | 38.2% / 46.9% | about −10% | 40.9% / 48.3% |
| Total sales, 1 month ahead | Same blend | 48.4% | −11.2% | 49.4% |
| Budgeting (bias focus) | Growth-adjusted 6-month mean | 51.2% | +0.4% | 49.4% (−11.9% bias) |

ETS, Theta, trend extrapolation and automatic method selection added little or increased bias. These figures are
exploratory; the blend and the growth-adjusted mean are queued for confirmation on new months.

## 4.8 Model selection

Models were selected through a four-gate funnel with criteria fixed before testing: (1) valid data exists for the
model's target; (2) the model beats the six-month mean under the pre-registered win rule; (3) absolute bias is at most 5%
and the gain holds in both halves of the evaluation period; (4) the model answers a specific objective and the system can
serve it with provenance. Models were eliminated by these rules, never by choosing the best score on inspected months.

Of 52 models and methods assessed, 30 are reliable, defensible and meaningful in the role they are used for, and 20 of
these are part of the integrated system or its evaluation; the other 10 are validated offline and await dashboard panels. The selected model per job is: financial summaries and
matched-period year-over-year (SO1); STL as a seasonality diagnostic (SO1); Pareto/ABC and family ABC–XYZ (SO2); the
six-month mean as the monthly forecast, the day-20 estimate for the current month, and large-order frequency for readiness
(SO3); per-family safety stock and the EOQ, reorder-point, allocation and FEFO scenarios (SO4); and the integrated
dashboard (SO5).

Models that failed as forecasters but were evaluated on identical cases serve as comparison benchmarks, each supporting
one claim: seasonal naive (68.6% WAPE) shows seasonality is too weak to forecast from; nearby simple rules show the
reference was not cherry-picked; SARIMA (63.3–76.9%) and machine-learning models (77.3–85.2%) show that added complexity
does not help on 81 monthly observations. Three models have no remaining role and are retired: the split total forecast,
the day-15 estimate, and disease or rainfall indices as forecast inputs. A test of disease intensity against units of
disease-linked medicines was not feasible, because medicines are recorded by brand and most such sales lack a delivery
location. Five candidates are registered for one confirmatory test once twelve months beyond September 2026 exist.

## 4.9 Demand profile by product group

The results above were brought together in one table per therapeutic category (`outputs/demand_profile_20261115/`;
rules and check fixed before running). For October 2024 to September 2026, each category was given a class from fixed
rules: mostly large orders (50% or more of its sales from documents of ₱500,000 or more), or, by the steadiness of its
regular monthly sales, steady (coefficient of variation up to 0.5), uneven (up to 1.0) or erratic. Each class carries a
planning approach: plan for readiness, reorder from the six-month mean, reorder with a larger buffer, or order on demand.

| Class | Share of recent sales | Categories |
|---|---|---|
| Mostly large orders | 50.0% | Antibacterials, vaccines and immune sera, critical care, blood thinners, respiratory medicines, non-medical goods, epilepsy medicines |
| Uneven | 39.2% | Unclassified products, childbirth medicines, heart medicines |
| Erratic | 8.5% | Stomach acid and cramps, anaesthetics, medical supplies, kidney and anaemia products, metronidazole |
| Steady | 2.3% | Vitamins and minerals; pain and fever medicines |

The classes were then checked as a planning guide by assigning them on October 2022 to September 2024 and judging them
on the following 24 months. Forecast error for regular sales rose across classes as expected (median one-month-ahead
error 54.3% for uneven and 93.2% for erratic categories; 26.4% for the single steady one), so the first check passed.
The second did not: only 7 of 13 categories (53.8%) kept their class, against a rule of 60%. Four of the six changes
were categories moving into the large-order class. The profile is therefore reported as a description of recent
behaviour, not as a validated planning rule.

The profile gives the study's answer to the design assumption in Chapter 2 (Table 2.x). MedShield's product groups do
not divide into steady chronic-disease medicines and seasonal infection medicines: no category is seasonal, none moved
with disease cases, steady categories carry 2.3% of recent sales, and half of sales sit in categories driven by large
orders. Planning for this distributor is mainly a question of readiness for large orders, with reorder rules applying
to a small routine base.

# Chapter 5. Limitations

1. **Retrospective evidence only.** Every evaluated month had been inspected by earlier work. Pre-registration and
   no-hindsight selection limit, but cannot remove, this bias. A forward test was implemented and registered, but no
   sales after September 2026 were available, so prospective accuracy is unmeasured.
2. **Accuracy target not reached.** No forecast reached the 10–15% error target. The ceiling is structural: erratic
   institutional orders dominate revenue, and the client could not share its order and tender pipeline because it is
   commercially sensitive.
3. **Pesos, not medicine units.** Recorded quantities exist but their pack and unit meaning is unverified; unit forecasts
   were 18% less accurate than peso forecasts. Results are not purchase quantities.
4. **Incomplete coverage.** Contract sales (₱118.3M) lack product detail and are excluded, and only 18.1% of net sales
   carries a confirmed delivery territory, which limits regional and disease-signal analysis.
5. **External signals.** Disease incidence (DII) and rainfall severity (RSI) showed no significant association with
   detrended monthly sales; DOH territory mappings remain pending approval.
6. **Family mapping not expert-validated.** The mapping passed a statistical null test and an AI-assisted review, but
   confirmation by the client's catalog owner and generic-name linkage remain outstanding.
7. **Operational dependency.** The day-20 estimate requires sales to be entered within days of delivery, which the
   current batch upload process does not provide.

None of the results authorizes procurement or replaces business judgment.
