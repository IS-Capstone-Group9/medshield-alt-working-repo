# Latest local descriptive candidate

9 October 2026, Asia/Manila. Accountable role: Backend Engineer, with Frontend
Engineer and Technical Writer support. The user requested the latest update and
completion of descriptive analytics. Local candidate activation is authorized;
business release approval is a separate recorded decision.

## Delivered

- Saved local backend fact pin 19 → 20; local gateway 5000 and frontend 3000 now run
  the validated candidate. Credentials were preserved and are excluded from evidence.
- Preserve null raw ledger amounts, eligible summary sums/averages, year/area/product
  measures and no-observation totals. Null stays unavailable; recorded zero stays zero.
- Accept legitimate nullable core responses while rejecting malformed measures.
- Preserve apostrophes/backslashes/Unicode in SQL filters using the existing UTF-8
  literal helper. Exact source-label search succeeds with 90 matching records.
- Set the Capstone preset to 2021–2025. Extended retains broader multi-year history.
- Disable product CSV export until its observed cohort is ready; block stale/empty
  direct exports. Keep observed-zero exports valid.
- Require an explicit Compose fact pin; example settings and setup instructions
  describe the validated candidate. Remote hosting settings were not changed.
- Retire legacy offline descriptive report instructions from Chapter 4 use; retain
  its code as historical context. Prepare the source-bound financial/category packet.

No Gold notebook/data was republished in this update. The backup folder is untouched.
Candidate, adjusted-source, unresolved identity, geography and forecast limits remain.

## Source and reporting scope

Fact `workspace.medshield_gold.sales_restart_fact_candidate`, Delta 20.
Dataset `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`.
Policy `sales_restart_gold_v7_independent_catalog`.
Product master `2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29`.

All Time net sales remain ₱626,946,741.81 and matched-population margin 60.262177%.
The study packet selects 2021–2025: ₱438,980,304.07 net sales, ₱196,703,155.65
supported gross margin, ₱343,154,299.03 matching margin basis and 57.322072% margin.
It contains 20,143 source records, 60 months with activity and 3,307 source-label
groups. Activity does not certify reporting completeness. The company STL remains
72 months, January 2020–December 2025, and is a separate full-history scope.

## Verification

| Criterion | Result | Evidence |
|---|---|---|
| Gateway regressions, including missing/zero and SQL filters | 98 passed |[Backend delivery log](backend-delivery.log)|
| Core/ledger/diagnostic/export browser fixtures | 45 passed |[Final fixture receipt](frontend-descriptive-fixtures-delivery-playwright.json)|
| Authenticated financial/product/STL flows, invalid/future filters and six source identities | 3 passed |[Live receipt](live-descriptive.json)|
| Actual Capstone filter, study totals, category CSV partition and apostrophe ledger UI/API | 1 passed |[Study delivery receipt](study-delivery.json)|
| Overview, Sales panels, Products and Areas chart fit at 1440/926/375px |1 passed; no page errors|[Layout receipt](live-layout-tests.json), [measurements](live-layout/live-layout.json)|
| Gateway/backend TypeScript |Passed|[Compiler log](backend-delivery-typecheck.log)|
| Frontend TypeScript after final changes |Passed|[Compiler log](frontend-delivery-typecheck.log)|
| Consequential descriptive/catalog/readiness validators TypeScript |Passed|[Compiler log](validator-typecheck-final.log)|
| Current financial/monthly/STL reconciliation |Passed|[Fresh calculation receipt](../descriptive_validation/2026-10-09T07-40-39-615Z/evidence.json)|
| Independent Decimal study/category/ABC recomputation |Passed|[Recomputation](study-recomputation.log), [findings](STUDY_FINDINGS.md)|
| Compose explicit-pin configuration |Passed `docker compose config --quiet`|Container runtime not exercised|

The earlier 76-check warehouse readiness and exact 4,561-category/137-field receipts
are inherited unchanged data evidence; they are not new cloud publication or
client acceptance in this update. They are linked from the Chapter 4 checklist.
The live study check was rerun after the final scope/export changes. The earlier
three-flow/layout checks predate only those final narrowly tested changes.

## Retained failures and recovery

The first backend suite had two stale assertions expecting quoted SQL text;
updating them to the UTF-8 expressions retained sector isolation and outage checks.
The final 98-check suite passes. Script compilation exposed an inferred STL row type
without its period field; explicit period projection resolves that compile error.

The new study test initially read the wrong release nesting, demanded precision
beyond Spark's six-decimal rate, and used a label missing a source space. Corrected
criteria retain cent financial reconciliation and a 0.000001 percentage-point rate
tolerance. [Read-only diagnosis](search-diagnosis.json) proves the correct source
label `BUPIRIGHT 1'S VIALS` has 90 matches; the typo has 0.

A later attempt exported before deferred product data loaded. The final test waits
for source readiness, and the product UI now disables/guards that export. The final
actual-preset study check passes. Historical failed attempts are retained separately
as `study-acceptance*.json`, `live-final.json` and their logs/artifacts.

Frontend fixture failures came from omitted current dependencies, stale inspection
controls and missing production CSS. Actual dependencies/control flow/CSS are now
loaded, without weakening ID/category/overflow assertions. All 45 selected fixtures
pass in one coherent final run. Earlier artifacts are retained.

## What remains

Use [Study findings](STUDY_FINDINGS.md), [financial CSV](study_financial_summary.csv),
[study screenshots/exports](study-delivery-artifacts/descriptive-acceptance-liv-03583-s-API-dashboard-and-exports-chromium)
and [Chapter 4 checklist](CHAPTER4_CHECKLIST.md) to finish interpretation and the
version-bound client/adviser review. Do not rerun 01–06 merely to activate this
unchanged candidate. A later ingestion needs a newly bound pipeline contract and
fresh acceptance checks.

Final business release approval, multi-table recovery rehearsal and applicable
production hosting/security acceptance remain open. The dated whole-system QA's
broader migration/auth/dependency/offline-model findings were outside this bounded
activation repair. No new production build/container deployment/load test or full
accessibility certification was performed. Source-label categories are accepted;
Unclassified and unverified units/SKU identities remain explicit. Forecasts,
external disease/weather joins and procurement are separate milestones.

Source hashes and sanitized configuration identity are recorded in
[activation receipt](activation-receipt.json). Existing unrelated working-tree
changes were preserved. Root reviewed the final changes; an additional separate
final review did not complete, so no independent final-review pass is claimed.

Skills applied: backend, frontend, database, analytics, security, coding, testing,
documentation and technology-stack standards; UI guidance for unavailable/zero,
export readiness and study controls. Spreadsheet guidance informed the study CSV
authoring by the supporting writer. Live results and isolated fixtures are distinct.
