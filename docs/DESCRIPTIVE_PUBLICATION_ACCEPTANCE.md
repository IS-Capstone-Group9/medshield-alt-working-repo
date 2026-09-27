# Descriptive Sales Publication Acceptance

Date: 27 September 2026  
Decision owner: MedShield client CEO, as identified by the user.  
Decision status: **Partial CEO decisions reported by the user on 27 September 2026; final dataset release remains pending.**

## CEO decisions reported on 27 September 2026

Attribution: the user explicitly confirmed that the decisions below were
directly confirmed by the CEO. This records that relayed confirmation; it does
not claim an independently witnessed signature, a CEO name, or final approval
of a remediated publication. Existing audit receipts retain their original
point-in-time approval status.

| Item | Reported decision | Operational interpretation and remaining evidence |
|---|---|---|
| 1. Financial definitions | Approved | Net CP is net sales revenue, Total TP is acquisition cost, and supported transaction gross profit is not company net income. This approval does not itself validate the dataset totals. |
| 2. Coverage | Assume no missing sales or broken data; described as linear | Record a business assumption of complete submitted coverage, not an independently verified finding. A continuous calendar does not require a linear sales trend. Preserve observed gaps and quality findings; do not interpolate sales or relabel unknown months as observed zero sales. Any future zero-filled scenario must identify its business assumption separately. |
| 3. Cleaning | Everything should be cleaned and standardized without unresolved specific cases | Treat this as the target acceptance condition, not an assertion that it has been achieved. Apply deterministic corrections, preserve original values and lineage, and block affected publication scope where unresolved records materially affect results. Do not delete warnings or silently exclude records to obtain a clean status. |
| 4. Contract-related estimates | Accepted subject to annual sales totals matching the original yearly sales data | Conditional acceptance of contract/product replacement processing, with original-versus-adjusted annual reconciliation required. Keep estimated product provenance. Reconcile source totals separately from eligibility-filtered dashboard totals and explain every exclusion. Equal annual totals do not establish actual SKU quantities, product mix, or medicine-demand validity. |
| 5. Product mapping | Technical decision delegated | Adopt conservative identity rules: source code/verified aliases plus ingredient where evidenced, strength, form, pack size, and source unit. Exact verified matches may share a SKU. Ambiguous identity, category, unit, or conversion remains pending; no product approval is fabricated. Source-label financial reporting stays distinct from approved medicine-demand reporting. |

The interpretations above constrain implementation; they are not additional
CEO statements. Geographic mappings, buyer grouping, permitted output scope,
and final dataset release have not been decided in this exchange. A later
release decision must reference the corrected dataset and new passing evidence.

## Subsequent technical preparation

The user selected positive-sales contribution with separate returns for preparation
for CEO review. This is **not** an additional CEO approval. The implementation uses
candidate labels and preserves signed net revenue. The client export supplies only
a document/DR number; no stable line-item identifier is available. Do not fabricate
line keys or authorize automatic merge from that fact.

The canonical notebook package is `databricks/medshield_project`. The operator
has now run 01–06. Gold v6 / fact version 16 has passing technical evidence;
prior failed receipts remain historical evidence, not the current verdict.

## Purpose and objective alignment

### Proposed refinement of decisions 3 and 4

Requested by the user after the initial CEO decisions. The following operational
policy is proposed for implementation and review; it does not claim that a new
CEO decision or future-year ingestion workflow has already been deployed.

**Decision 3 — clean automatically, isolate uncertainty, stop only the affected
scope.** Apply deterministic formatting, type conversion, and verified alias
rules while preserving raw values. Valid records may proceed within an explicitly
disclosed partial reporting scope. Put unresolved records or attributes in a
review queue and show their counts and financial effect where amounts are known;
show unknown amounts as unknown. An unidentified product need not block a valid,
nonduplicated financial transaction, but it blocks approved SKU analysis for that
record. Unreadable amounts, unclear currency/financial definitions, unresolved
parent-child overlap, or failed reconciliation block the affected metric/scope.
Whole-batch failure remains appropriate when reliable boundaries cannot be
established. Never silently drop records, mark partial results complete, or call
unresolved data clean. Publishing a partial scope still requires its applicable
approval; the last approved dataset remains active until that decision.

**Decision 4 — retain contract revenue without inventing medicine sales.** For
future submissions, inspect structured document/line types and identifiers,
source product codes, approved aliases, and reviewed label rules. A keyword or
`#` alone cannot prove a contract label, because product pack descriptions can
contain those characters. Unseen or ambiguous labels enter review. Preserve a
verified contract-level amount in the applicable financial reporting scope,
with a visible “contract — product breakdown unavailable” category. Do not treat
the contract label as a canonical medicine or infer its units.

If an itemized breakdown exists, link its rows to the parent contract and
reconcile the child amounts to the parent using the approved financial basis
and tolerance. Count the revenue once: either the valid parent representation
or its reconciled children. Hold ambiguous overlap for review. If no breakdown
exists, retain the unresolved product detail. Any estimated allocation requires
an explicitly accepted method and scope, source/parent references, preserved
totals, and estimated provenance. It must not automatically become observed
SKU-level demand or forecast training data. Verify contract, period, and annual
reconciliation; annual equality alone can conceal offsetting errors.

This proposes one governed Databricks evidence base with metric-specific
eligibility, not competing financial and product datasets. The current
checksum-bound historical restart is not a general next-year upload engine;
the batch workflow and reviewed rules must be implemented and tested before
claiming automated support for future contracts.

Approve a specific, reproducible historical dataset for descriptive pharmaceutical-distribution sales analysis. The objectives are to explain sales trends, product contribution, and territory performance while preserving source evidence and the distinction between observed, mapped, and estimated values.

Databricks Unity Catalog remains the single analytical system of record. The backend queries it; the browser does not substitute repository files, prepared JSON, or Supabase analytical data. Files under `outputs/publication_readiness` are audit receipts, not alternative runtime datasets.

This record does not approve disease surveillance, medical treatment recommendations, predictive models, or automated procurement. Those are outside descriptive acceptance and retain their separate gates.

## Current evidence

Current post-deployment review: [passing publication receipt](../outputs/publication_readiness/2026-09-27T06-49-46-520Z/README.md):
**70 PASS, 0 FAIL, 0 UNVERIFIED**. Fact version **16**, Gold v6 reviewed provenance.
Receipt SHA-256: `181516182e62f9081c2acfa4ef01e6b7209dc1f0b320be6ee010936e5a929ad2`.
The [calculation/STL receipt](../outputs/descriptive_validation/2026-09-27T06-41-37-034Z/evidence.json)
reconciles dashboard revenue and all 72 STL observed inputs to the same fact version.
The earlier adjusted-source labeling defect is resolved. Estimated product identity,
coverage assumptions and scoped business decisions remain distinct from arithmetic
validation. These receipts do not mark anything business-approved.

Run the read-only collector from `backend/`:

```powershell
node --import tsx scripts/publication-readiness.ts
```

Each execution creates a separate timestamped directory under `outputs/publication_readiness`, containing an evidence JSON file, SHA-256 receipt, and readable check report. It captures SQL, results, source manifest, mapping/code hashes, dataset identity, table versions, warnings, and aggregate reconciliations. It also compares table versions before and after collection; an intervening write invalidates affected evidence.

An execution failure or incomplete query must remain FAIL or UNVERIFIED. A technical PASS never changes approval status. Freeze the selected receipt before requesting a decision; approval must refer to its exact hash and scope. A later dataset or mapping revision requires a new acceptance assessment.

### Mapping update status

The live Gold fact and publication audit already record area mapping SHA-256:

`a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949`

This matches the repaired repository master. The live publication audit was timestamped `2026-09-26T16:48:19.606Z`. Therefore the prior QA instruction to apply the repaired master is stale for this observed publication. The collector verifies the observed dimension values and output counts before treating that application as technically reconciled. No redundant upload or notebook overwrite is necessary solely to match that checksum.

The current product master is header-only. No approved medicine SKUs are supplied. Existing geographic approvals carry `LEGACY_APPROVAL_NOT_REVALIDATED`; they are not evidence of a new CEO decision. Proposed or unresolved mappings must remain pending.

## Decisions for the CEO

The CEO may approve or reject individual scopes. Approval of financial history does not automatically approve product identity or geographic inference.

| Decision | Evidence to review | Required decision |
|---|---|---|
| Financial definitions | Already confirmed by the CEO as recorded above | No repeat approval requested; review only changes to scope/exclusions |
| Source coverage | Source files, reported dates, missing observations, dispositions, and yearly completeness labels | Confirm the intended reporting population; do not infer a complete year merely from transaction presence |
| Warning treatment | Counts and reasons; effect on revenue, quantities, and margins | Accept specific treatment with limitations or require remediation |
| Estimated allocations | 2020/2024 label-substitution evidence and 2025 replacement provenance, with financial reconciliation | After provenance correction, accept the estimation methods and permitted uses, or require original product detail/rework |
| Product reporting | Source product labels versus canonical medicine SKU identity | Approve source-label commercial reporting scope, or supply reviewed SKU mappings for medicine-level analysis |
| Territory mapping | Every observed raw area, proposed geography, evidence, and legacy status | Confirm/correct mappings at the recorded geographic level; leave ambiguous labels unresolved |
| Buyer grouping | Derived Government/Private/Internal rules and source account evidence | Approve the intended business segmentation; do not describe derived labels as observed ownership |

Source-label revenue reporting may be considered separately from approved medicine-demand reporting. No category membership, unit conversion, or interchangeability is implied by a source label. Quantity totals across mixed packs are not standardized pharmaceutical demand.

The repository's business definitions include earlier working approvals. Those entries must not be interpreted as a new CEO approval of this dataset, its mapping changes, or its exclusions.

## Required acceptance fields

Complete this record only after the CEO reviews the evidence. Leave unknown fields blank rather than infer them.

| Field | Value |
|---|---|
| CEO name | Pending |
| Role | Client CEO |
| Decision date and time, including timezone | Pending |
| Evidence directory | Current failed baseline: `outputs/publication_readiness/2026-09-26T17-08-24-151Z`; replace after remediation |
| Evidence JSON SHA-256 | `f7ad41c55f76bea870bcf5c0695650cf500c92116e79402f4a62a6dad2078714` (failed baseline) |
| Dataset ID | `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4` |
| Area and product master hashes | Recorded under `local_files` and live `fact_identity` in the bound evidence |
| Transformation and gateway code hashes | Recorded under `local_files`; local corrected notebook hashes are not proof of deployed code |
| Approved scope(s) | Financial definitions approved by CEO as relayed by user; contract-related estimates conditionally accepted subject to original annual-total reconciliation. Final dataset release not approved. |
| Rejected/deferred scope(s) | Pending decision |
| Accepted limitations and warning treatment | Complete coverage is a business assumption; clean/standardized data is a target requiring verification. No waiver of observed defects recorded. |
| Required corrections | Pending decision |
| Supporting approval record | User confirmed on 27 September that items 1–5 came directly from CEO; CEO name and final version-bound release decision remain pending. |

An attributable written decision should state the reviewed dataset/evidence identity, approved use, exclusions, conditions, CEO identity, and date. A project member's statement that the CEO is the reviewer is not the CEO's decision.

## Technical publication checklist

| Gate | Requirement |
|---|---|
| Dataset consistency | Source manifest, Silver survivors, Gold outputs, and audit refer to one dataset |
| Mapping consistency | Deployed master hashes and observed dimensions match the reviewed mapping |
| Reconciliation | Source dispositions, survivor keys, source values, aggregates, bridge, and gateway reconcile |
| Eligibility | Metric-specific populations and missing values are explicit |
| Stability | No relevant source/table/code revision during evidence collection |
| Business acceptance | CEO decision is attributable and bound to the reviewed evidence and scope |
| Approved publication contract | Versioned approved objects and manifest preserve accepted evidence and prior version |
| Consumer verification | Backend and UI use the approved contract consistently and retain limitations |
| Recovery | Prior accepted version remains recoverable |

Only after all applicable gates pass should an approved publication be activated. Do not rename mutable candidates to imply approval, remove candidate labels prematurely, or change isolated API flags while leaving other consumers on a different version.

## Promotion procedure after approval

1. Recheck the approved evidence hashes and current table versions. If they changed, stop and assess/review the new evidence.
2. Preserve the accepted source manifest, mapping masters, transformation revision, SQL view definitions, and analytical outputs under a versioned publication identity in Databricks. Use documented schema changes and validate permissions before execution.
3. Record the CEO decision and approved scope against that publication identity. Retain excluded and pending populations as audit evidence.
4. Build and verify the stable approved views against the frozen outputs. Change no current dashboard contract until reconciliation succeeds.
5. Switch backend consumers together to the approved contract, include publication identity in metadata/cache behavior, and verify every affected descriptive summary.
6. Update candidate labels only for the approved scope. Preserve pending medicine mappings, derived geography/buyer disclosures, estimated-allocation labels, and predictive/prescriptive gates.
7. Record deployment verification and rollback instructions. Keep the prior version available.

This procedure is a publication plan, not a claim that an approved manifest, approved views, or automatic promotion mechanism already exists.

## Access and execution limits

The available credential successfully queried Databricks SQL. Workspace listing and Jobs listing returned HTTP 403 for missing `workspace` and `jobs` token scopes. Those restrictions were not bypassed. The current matching mapping needs no redundant rerun; a future notebook update needs an appropriately authorized operator or scoped credential configured server-side. Never paste credentials into the acceptance record or chat.

No cloud write or candidate-to-approved promotion was performed while preparing
this record. Partial business decisions were subsequently recorded above from
the user's explicit relay of CEO confirmation; final publication remains pending.

## Known decision-relevant limitations

- The reviewed live candidate contains 37,728 fact transactions. Eligible net
  sales total ₱626,946,741.81 and eligible transaction gross margin totals
  ₱288,487,498.72. These use different eligibility populations: 36,848 revenue
  records and 34,105 margin records. Do not treat the totals as evidence that
  every transaction supports every metric.
- 32,749 fact rows carry one or more warnings. Quality-rule totals in the audit
  cover the assessed source population and overlap; they must not be summed or
  equated with the warning count in accepted facts.
- Observed months number 7 in 2017, 10 in 2018, and 9 in 2019. The other years
  have 12 observed months, but all yearly outputs state that transaction
  presence does not establish source completeness.
- The 22 observed geographic labels comprise 5 inherited approved labels,
  14 proposed labels, and 3 unresolved labels. Inherited approvals have not
  been revalidated by the CEO. The file contains additional labels beyond the
  current fact population.
- The product master has zero approved entries. The live fact has 36,988 rows
  with product-master-pending status, 618 requiring nonmedical reference review,
  and 122 requiring hashtag-label review. Commercial source-label totals are
  not approved SKU-level medicine demand.
- The current evidence confirms file hashes and internal reconciliation, not
  the independent correctness of the estimated product assignments or the
  source accounting system's completeness.

## References

- [Project objectives](PROJECT.md)
- [Current state and approval gates](CURRENT_STATE.md)
- [Analytical architecture](ARCHITECTURE.md)
- [Business definitions](BUSINESS_DEFINITIONS.md)
- [Sales restart contract](../databricks/sales_restart/README.md)
- [Read-only evidence collector](../backend/scripts/publication-readiness.ts)
- [Area mapping master](../datasources/templates/area_classification_mapping.csv)
- [Product master](../databricks/sales_restart/references/product_master_review.csv)

## Verification of the prepared correction

- 29 sales-restart unit tests passed, including recognition of adjusted versus
  original files, rejection of unknown revisions, notebook compilation, and
  copyable README/source agreement.
- Four publication-checker tests passed, covering CSV contracts, pending mapping
  identity, missing evidence, and mislabeled estimated sources.
- Targeted TypeScript checking of the collector/helpers/tests passed.
- The existing live dashboard validator passed financial/population checks;
  this does not clear the provenance failures in the expanded collector.
- Documentation links and diff whitespace checks passed. No frontend build
  was run while the development server was active.
- Cloud deployment, post-correction live validation, and CEO sign-off remain
  unverified/pending. These results are self-review, not independent review.

## Version-16 review and release checklist

- [x] Operator ran corrected Bronze/Silver/Gold and bridges; Gold v6 provenance verified.
- [x] Technical publication receipt passes all 70 checks, with source/mapping identities.
- [x] Financial and STL components reconcile to fact version 16; no gap imputation.
- [x] Local gateway explicitly pinned to version 16; candidate notice retained.
- [ ] CEO records final permitted reporting scope against the exact receipt and version.
- [ ] Record remaining ABC/buyer/geography decisions without inferring SKU approval.
- [ ] For production activation, deploy the reviewed application revision and configure
      its gateway pin; verify authenticated API/UI/exports in that environment.
- [ ] Record rollback to a retained reviewed fact version and matching STL availability.

Do not require reapproval of already recorded financial definitions. Do not change
candidate labels to approved or infer production activation from a local test pass.

## Descriptive objective alignment at version 16

| Requirement | Implemented evidence | Remaining boundary |
|---|---|---|
| Revenue/profit/margin | Financial receipt; shared eligible margin denominator; API and CSV reconciliation | Completeness remains a business assumption |
| Bounded daily/monthly and annual history | Exact-date detail, calendar gaps, yearly source-unit and margin aggregation; browser regression | Source quantities are not standardized medicine demand |
| YoY | Only common observed months; nominal change and rate; no invented zero baseline | Missing coverage is disclosed per comparison |
| STL | Warehouse 72-month 2020–2025 components; reconstruction and observed revenue checks; table/chart/CSV | Excludes insufficient contiguous segments; no disease causality |
| Pareto/ABC | Positive contribution, separate returns, 80/95 thresholds, cohort keeps full denominator | CEO policy acceptance remains pending |
| Product attribution | Source labels and adjusted-source provenance retained in table/export | No approved medical master entries |
| Territory/customer type | Warehouse mapping evidence; proposed buyer groups and confidence disclosed | Applicable mapping/scope approval remains pending |
| One analytical source | Databricks fact version 16; version notices and versioned exports | Production approved activation workflow and future ingestion remain separate |


## Catalog implementation prepared — 27 September 2026

[Product catalog contract](PRODUCT_CATALOG.md) defines independent category,
sellable identity, item kind and transaction evidence. Local deterministic rules,
Gold enrichment, stable-ID API/UI grouping, category filters and provenance-aware
quantity/export handling are implemented. The complete version-16 review includes
37,728 records and 4,561 labels; all remain unresolved because no approved master
entries were supplied. Category approval cannot approve SKU, quantity conversion,
forecasting or observed medical demand. Adjusted provenance remains file-level.

The [operator runbook](CATALOG_DEPLOYMENT.md) specifies catalog-only 03 → 04 → 05 →
06 → publication-readiness → descriptive/catalog validation, version-bound activation
and rollback. This is local preparation: no Databricks writes, release activation
or additional CEO decisions occurred. Databricks remains the sole analytical source.
