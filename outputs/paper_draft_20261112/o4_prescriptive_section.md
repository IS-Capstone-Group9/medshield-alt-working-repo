# 4.9 Objective 4: Data-driven prescriptive planning

## 4.9.1 Design

The Prescriptive Planning module originally computed economic order quantities (EOQ) and reorder points from values
entered by the user, including demand and safety stock. To make the prescription evidence-based, its inputs were
connected to the models that passed their tests in Objectives 2 and 3. For each high-value (A-class) product family of
the prior year:

- expected monthly demand is the six-month mean, the reference forecast that no challenger beat;
- the service target follows the family's ABC–XYZ class: 95% for steady (X) and variable (Y) families and 90% for
  erratic (Z) families, a stated policy choice;
- safety stock is the 95th or 90th percentile of the family's last 24 known forecast errors over the protection period;
- the order-up-to level is S = (1 + L/30) × demand + safety stock, under monthly review with supplier lead time L;
- order frequency follows the EOQ in pesos at cost.

Supplier lead time, holding cost and ordering cost were not available from the company. They were set to the researcher
assumptions in the assumptions register (lead time 7, 14 or 30 days; holding cost 15%, 25% or 35% a year; ordering cost
₱500, ₱1,500 or ₱5,000), and results are reported across these ranges.

The policy was backtested on 6,896 family-months (December 2021 to July 2026), using only data known at each review
date. Pass rules were fixed before the analysis. Because the months had been inspected by earlier studies, the results
are exploratory.

## 4.9.2 Results

**Calibration.** At a 14-day lead time the policy achieved 94.4% cycle service against a pooled target of 91.1%. It
achieved 93.0% for families with a 95% target and 94.8% for families with a 90% target, and 94.2–94.6% across lead times
of 7 to 30 days. All results fell within the 5-point tolerance, so the test passed.

**Value over a rule of thumb.** A uniform "keep k months of stock" rule needed about six months of stock (5.9–6.6) to
reach the same service. The differentiated policy held 34.1% less stock overall and 34–39% less in each half of the
period. The pre-set rule nonetheless failed: in the first half, the uniform rule could not reach the policy's service
within the six-month search limit. A widened search, added after the first run, confirmed the saving. The result
therefore favours the policy but requires confirmation on new months.

**Where stock cannot help.** Peso fill rates were 97.2% for steady families and 90.5% for variable families but only
64.1% for erratic families. For erratic families the buffer covered most months but not the large institutional orders
that dominate their sales (Section 4.4). For these families the prescribed response is readiness for large orders,
supported by the large-order frequency signal and advance notice from buyers, rather than larger buffers.

**Sensitivity.** Total stock rose 22% when the lead time increased from 7 to 14 days and 68% when it increased to 30 days.
The order-frequency recommendation held in at least six of nine cost combinations for only 55% of families, against a
70% requirement. Order frequency therefore cannot be prescribed until actual holding and ordering costs are supplied.

## 4.9.3 Current prescription

As of September 2026, at a 14-day lead time, the policy covers 65 A-class families (7 steady, 13 variable, 45 erratic)
with expected demand of ₱6.35 million a month. It recommends safety stock of ₱7.84 million and order-up-to levels
totalling ₱17.15 million at sales value, about ₱7.03 million at cost, or about 2.7 months of demand. One family accounts
for half of this demand.

The Prescriptive Planning module computes these levels live from the pinned Gold data, with a lead-time selector and a
CSV export, so planners can see how the recommendation changes with the lead time. The saving over the uniform rule
was 40% at a 7-day lead time and 27% at 30 days. The policy is registered for one confirmatory test once twelve new
months are available.

## 4.9.4 Scenario planning from entered assumptions

The family-level policy above uses only tested sales evidence. Product-level purchase scenarios need facts the sales
data do not hold (stock on hand, pack size, unit cost, expiry dates), so the module keeps a second task, *Build a
scenario*, where the planner enters them. Three methods run on those entries:

- **EOQ and reorder point.** The classical EOQ, √(2 × annual demand × order cost ÷ annual unit holding cost), is
  rounded to the cheaper adjacent whole-pack lot. The reorder point is the ceiling of lead-time demand plus the entered
  safety reserve, and it is compared with the entered position (usable stock + inbound − backorders).
- **Weighted integer-pack allocation.** A shared budget is allocated in whole packs and exact cents across the
  shortlisted products, maximizing priority-weighted demand coverage. The shortlist checksum binds the dataset, source,
  scope and window, and the solver rejects a request built on a stale shortlist.
- **Dated supply feasibility.** Entered supply lots, demand and expiry dates are simulated first-expiry-first-out,
  reporting unmet quantity and projected expiry. Optimality is claimed only within the declared domain (one slot per
  product, 0–20 packs).

Thirteen backend cases verify the allocation's arithmetic and stale-request rejection. A signed-in browser run on
labelled synthetic inputs returned a proved optimum (3, 3, 3, 1 and 0 packs; ₱10 of a ₱10 budget; 84.44% weighted
fulfillment). It correctly rejected an infeasible 100%-fulfillment request, which needed at least ₱15, and it cleared
results whenever an input changed. These checks show the methods compute correctly. They are not evidence of savings,
because every input is an assumption.

These are recommendations for review in pesos at the family level. They are not purchase quantities, because stock on
hand and verified pack units were unavailable, and they do not authorize procurement.

---

*Addition to Chapter 5 (Limitations), replacing Limitation 8 in Section 4.8:*

8. **Prescriptive outputs rest on assumed costs and lead times.** Stock levels are derived from tested forecasts and
   error distributions, but supplier lead time, holding cost and ordering cost are researcher assumptions. Order
   frequency was not robust to these assumptions, and lead time changed the recommended stock by up to 68%. Purchase
   quantities require stock-on-hand records and verified pack units.
