# Defense guide: models and results

For the MedShield team presenting to the capstone panel. Every figure here is in the model register and the evidence
packets; quote them as written.

## The core message (memorize this)

> We built a decision-support system that tells MedShield what its sales data can and cannot support. We tested 52 models
> and methods against rules we fixed before testing. Simple methods won, data quality mattered more than model choice, and
> the system only shows results that passed.

## 60-second summary

1. **The problem:** MedShield needs to plan inventory under seasonal disease surges, using ten years of sales records.
2. **What we found:** from 2020 to 2026, 231 large institutional orders, 2.6% of documents, carry 44.6% of sales. They make monthly totals
   irregular, so no model reaches the 10–15% error target. The best forecast before the month is about 49% error.
3. **What works:** separating routine sales (37% error) from large orders; a day-20 estimate that cuts error from 41.8% to
   28.8%; grouping product names into families, which raised classification stability from 52% to 82%.
4. **How we kept it honest:** every pass/fail rule was set before testing; failed models were retired, not retuned; the
   dashboard shows an explicit "unavailable" state instead of substitute data.
5. **What it delivers:** an integrated dashboard covering all five objectives, with 643 automated tests and CI passing.

## Likely questions and answers

**"Why didn't you use more advanced models like machine learning?"**
We did. Ridge regression and gradient boosting had the highest error, 77–85%, against 49.7% for a 6-month average. With 81
monthly data points, ML has too little history. We keep them as benchmarks because they prove complexity doesn't help here.

**"Your accuracy is low. Is the system useful?"**
The error comes from the data, not the method: erratic high-value product families carry 73% of sales. The system is useful
because it separates what can be planned (routine sales, 37% error; the current month by day 20, 29%) from what can't
(large orders, which need readiness, not forecasts). Showing the limit honestly is part of decision support.

**"How did you choose your models? Isn't picking the best one cherry-picking?"**
We used a four-gate funnel with rules fixed in advance: valid data, beat the benchmark, bias within 5% and stable in both
halves, and answers an objective. Models were eliminated by those rules, never by choosing the top score. The rules were
saved with a fingerprint before each test ran.

**"Why call failed models 'benchmarks'? Isn't that spin?"**
Each benchmark supports one stated claim only. Seasonal naive at 68.6% error shows seasonality is weak. We never claim it
forecasts our sales. Using comparison models this way is standard practice in forecast evaluation.

**"Your data starts in 2017, so why do forecasts start in 2020?"**
The descriptive analysis uses all of 2017–2026. All ten missing months fall before 2020, and forecast methods need
consecutive months. We don't fill gaps with zeros, because that would invent sales that didn't happen.

**"These results are on months you'd already seen. How do you know they'll hold?"**
We don't claim they will. All forecast results are labelled retrospective. A forward test on unseen months is built and
registered, but no sales after September 2026 have arrived. Five candidates are queued to be tested once 12 new months exist.

**"Did you use the weather and disease data?"**
Yes. Rainfall severity is shown as territory context. Disease and rainfall showed no link to monthly peso sales. A
targeted test against units of disease-linked medicines wasn't feasible: medicines are recorded by brand, and most of those
sales go to Government and Hospital buyers with no delivery location. We report that as a limitation with a clear fix.

**"How do you know the product-family grouping is right?"**
Two checks. A random-grouping test: the families scored 82% against 60% for random groups of the same sizes. And a review
of 50 sampled families: 95.8% correct, 100% after two fixes. It is not yet confirmed by the client's catalog owner, which we
state as a limitation.

**"Are the EOQ and reorder-point results real stock policy?"**
No. They are correct calculations on inputs the user enters. MedShield has no inventory data in the system, so they are
planning scenarios. We don't claim reduced stockouts or expiry.

**"Why did the margin fall? Is the business getting worse?"**
We split the change exactly. From 2019 to 2025 margin fell from 70.7% to 49.4%. By product family, 17.1 of the 21.3 points
come from mix: high-margin products like SPEEDA and EVAPROST now sell much less, and newer products earn less. Only 4.2
points come from lower margins on the same products. One caution: 2019 had cost data for only 66% of sales, so the real
drop may be smaller. We describe the change; we don't judge the business.

**"Where is the growth coming from?"**
Large orders and new products. In January–September 2026, sales rose ₱75.7M: large orders +₱51.0M, new product families
+₱36.2M, and the same routine products only +₱0.7M. That is why we plan for big orders instead of forecasting them.

**"If you can't forecast large orders, what good is the system for them?"**
We describe them so MedShield can be ready. Since 2025 there has been a large order almost every month (20 of 21). A month
with large orders is typically ₱3M, and 1 in 10 goes above ₱9M. The products change too much to pre-stock, so readiness
means cash, supplier access and delivery capacity. Our history-based estimates passed their tests narrowly but run low,
so we present them as a floor, not a prediction.

**"So how much should MedShield keep ready for large orders?"**
We tested eight rules based on past months. The one our rule picked covered 23 of 33 recent months (69.7%), just
under our 70% bar, so we don't claim a recommended amount. Instead we show the trade-off: for example, being ready for
the biggest month of the past year covered 79% of months but left ₱4.5M unused on average. The client chooses the risk
level. Advance notice of big orders would beat any of these rules.

**"Is there a season for large orders?"**
We tested it. June, February and September look higher, but the test gives p = 0.134, so we don't claim a season.

**"How do you spot an unusual month?"**
Each month is compared with the 12 months before it. Of 15 unusually high months, 11 were mainly large orders, and routine
spikes were usually new products. It also found a data gap: December 2017 is nearly empty.

**"You collected disease data. Did you really test it properly?"**
Yes, at three levels. Brands, product families, and finally therapeutic categories: we grouped the top 200 products
into antibacterials, fever medicines, respiratory, vaccines and so on, and matched them to nine DOH diseases, in our
regions and nationally. None of 64 tests held up after correcting for multiple tests. The best pairs made medical sense
(COVID-19 and enoxaparin, typhoid and antibacterials, dengue and fever medicines), so there may be a weak link, but our
five years of data can't confirm it. The literature finds the link in retail pharmacy sales, and 87% of Philippine
medicine sales go through drugstores. MedShield is in the other channel: it sells to hospitals and government offices
that buy in batches and under programmes, which is the likely reason. Only 4.6% of its sales are chronic-disease
medicines.

**"So how should MedShield plan each product group?"**
We profiled each group over the last 24 months. Half of sales are in groups driven by large orders, like antibacterials
and vaccines, where the answer is readiness, not a forecast. Only 2.3% are in steady groups that suit a simple reorder
rule. We checked whether these classes hold up as a planning guide: forecast error did rise from steady to erratic
groups, but only 7 of 13 groups kept their class over two years, under our 60% bar. So we present it as a description
of how groups behave now, not a rule.

**"Do new products last?"**
Mostly not. Of new product lines since 2020, about 1 in 4 still sells in its second year, and half sell in one month
only. But there is an early sign: a product that sells in at least 3 of its first 6 months survives at 52% against 19%,
and that held in every yearly group. Products that arrive through a large order rarely repeat their value (9%).

**"What would you do with more time or data?"**
Three things, in order: generic names for product brands; delivery locations for Government and Hospital orders; and new
monthly sales to run the queued forward tests. Each one unlocks a specific retired or waiting model.

## Things to avoid saying

- "Our model predicts sales with X% accuracy." Say "error" and "retrospective".
- "The model recommends buying..." Nothing in the system authorizes procurement.
- "Seasonal naive is one of our models." Say it is a benchmark.
- "Disease drives our sales." The data doesn't show that.
- "We improved accuracy by 42%." The correct figure is 31% (41.8% to 28.8% on the same months).

## Numbers to have ready

| Figure | Value |
|---|---|
| Net sales analysed | ₱638,015,351.53, 39,286 lines, Jan 2017 – Sep 2026 |
| Months recorded | 107 of 117; forecast window 81 consecutive months from Jan 2020 |
| Large orders | 2020–2026: 231 documents ≥ ₱500,000 = 2.6% of documents, 44.6% of sales. Full history 2017–2026 (dashboard): 267 documents, 40.0% of sales |
| Monthly forecast error | 49.7% total; 36.7% routine sales |
| Day-20 estimate | 28.8% vs 41.8%, bias −2.3% |
| Family ABC–XYZ stability | 82% vs 52% labels, 60% random |
| Erratic high-value families | 91 families, 72.8% of 2025 sales |
| Margin 2019 → 2025 | 70.7% → 49.4%; by family mix −17.1 pts, rate −4.2 pts; cost coverage 65.9% vs 90.3% |
| 2026 growth (Jan–Sep vs 2025) | +₱75.7M: large orders +₱51.0M, new families +₱36.2M, continuing +₱0.7M, lost −₱12.2M |
| Large-order profile | 20 of 21 months since Jan 2025 had one; typical month ₱3.0M (80% range ₱0.8–9.0M); no calendar pattern (p = 0.134) |
| Readiness estimates | Chance: Brier 0.216 vs 0.25 coin flip; range coverage 83% / 73%, misses all on the high side |
| Readiness reserve | Selected rule (p90, last 12 months) 69.7% coverage vs 70% bar: failed; trade-off table only |
| Unusual months | 16 of 101 flagged; 11 of 15 high months mainly large orders; Dec 2017 data gap |
| Category disease test | 9 DOH diseases × categories, 64 tests: 0 supported after Holm; best COVID-19 → enoxaparin ρ 0.34; 0 of 18 categories seasonal |
| Market channel | Philippines 2016: 87.2% of medicine sales via drugstores, 12.8% via hospitals (Reyes & Tabuga, 2020). MedShield: programme and hospital products 28.4%, infection 21.3%, chronic 4.6% (mapping v0.1) |
| Demand profile | Recent sales by class: large-order groups 50.0%, uneven 39.2%, erratic 8.5%, steady 2.3%; 7 of 13 groups kept class (rule 60%): description only |
| Product survival | 1,526 new families: 23% sell in year 2, 16% in year 3, 53% one month only; 3-in-6 rule 52% vs 19% |
| Models assessed | 52; 30 reliable in their role; 20 integrated; 10 validated offline awaiting panels |
| Tests | 643 gateway tests; CI 12/12 |
