## Status: technical review completed — 26 October 2026

Adrian supplied PASS and matching controls. Do not rerun this notebook for the
unchanged batch. Next is [source-owner clarification](../outputs/original_layers_20261026/FINANCIAL_RELEASE_REVIEW.md)
about contract additivity/possible inclusion, not another technical check. The
run instructions below are retained reproduction guidance.

# Next: read-only original financial scope review — 26 October 2026

The original Bronze → Silver → Gold batch has reported passing exact readback.
Do not rerun those notebooks or historical04–08 for this check.

Import ONE new Python notebook:
medshield_project/maintenance/20261026_review_original_financial_scope.py
into /Workspace/medshield/medshield_project/ directly (Adrian's chosen placement).
Open it, select Serverless and Run all. It has separated markdown/code cells.
No helper, package, source CSV or widget changes are required.

It reads only the staged original_fd95b9e3abab028c8e41 Gold tables, original Silver
ledger and Gold receipt at immutable Delta0. It checks the stored receipt against
the supplied execution identity, exact itemized/contract/financial key and value
partitions, per-row net/margin eligibility, same-population margin arithmetic,
positive sales versus signed returns and delivery-year controls. Missing/zero
and source-unit distinctions stay explicit; no records are deduplicated.

For contracts, recorded source-file/date/area/DR fields produce candidate document
groups only. DR is not a verified customer or stable transaction/parent-child ID.
A missing match does not clear overlap, and a shared key is not proof of double
counting. The notebook emits aggregate screening counts and anonymous source-row
references for shared-key cases, without counterparties, raw labels or restricted
product breakdown. Do not request unavailable NDA itemization to complete this
technical screen.

Expected final message:
PASS_FINANCIAL_SCOPE_REVIEW. No tables changed; unresolved financial scope remains explicit.

Send the complete JSON and final message, or exact error. publication_ready=false
is expected: a technical screen cannot grant financial approval. The source-owner
financial disposition and coherent gateway/dashboard/export/STL/model publication
still follow this review. Preserve the existing COO authority and scoped approvals;
any new business question concerns the changed financial scope/overlap, not repeated
approval of established definitions or source-completeness attestations.

Local verification: nine tests pass, including full-source preflight, signed/positive
populations, zero denominators, exact partitions, repeated observations, margin
population checks and approval boundaries. Generator, cell compilation and no-write
checks pass. Offline current CSVs find one shared candidate document key with
amounts differing and351 without such a match; zero exact repeated itemized groups
under the defined fields. Those are local checks, not independent live Gold results
or an overlap clearance. The three original layer notebooks are unchanged.

Evidence: outputs/original_layers_20261026/financial-scope-review-preparation.json
and financial-scope-local-preflight.json. New audit Spark execution is not yet run.
