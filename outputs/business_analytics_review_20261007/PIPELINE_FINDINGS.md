# Pipeline and publication assessment — 7 October 2026

Supporting owner: Database Engineer. Read-only assessment of local code and saved
warehouse receipts. No cloud writes, application changes or notebook execution.

## Current outcome

The current descriptive candidate remains fact **19**, with **72** STL observations
bound to 19. The local backend configuration is already pinned to 19; root process
inspection reports no active MedShield Node process. Do not change the pin or
restart a service solely because the local review file was populated.

Saved 7 October publication/calculation/catalog checks describe the then-deployed
header-only master. They remain valid historical evidence for that version. The
local master now contains **4,561 unapproved drafts**, SHA-256
`507fe990defc28f41c13eba4526463bbc960783dd5ad82ef209bb5babf509775`. Published 19 still identifies
`1361f7629d4dab4f1f6414db32a19e9eea9ab20acb99319d168aecc9fef48088`. This is an intentional unpublished
preparation boundary. A current readiness checksum failure would mean the local
preparation differs from the cloud release, not that its recorded sales became
wrong. Proposed categories do not become classified dashboard categories.

## Findings and exact next implementation

**P01 — Next-publication predecessor/package is stale.** Gold 03 line 450 and
validate-catalog.ts line 22 bind 16. package_catalog.py binds 16 and a 27 September
receipt while shipping current source bytes. Prepare a single required publication
descriptor for captured 19, proposed/master/helper/evidence hashes and a fresh source
conservation receipt. Both Gold and validators must consume that exact descriptor;
package generation must reject stale or mismatched receipt/input bytes. Use a new
dated package folder and retain prior packages unchanged. The existing packaging
glob excludes JSON, so explicitly include the descriptor and its bound receipts,
and include the new product-master review guide in the operator package.

**P02 — Readiness can reconcile equal finances without verifying gateway release
identity.** publication-readiness.ts uses latest warehouse tables but compares its
configured gateway summary only by financial sums/counts. A later catalog-only
release could keep those totals while changing categories or reference hashes.
Assert captured fact version, dataset/policy and mapping identities against the
actual gateway release. The separate descriptive validator currently checks
fact/gateway/STL versions and must remain required. Add a fixture where equal totals
with a different version/hash fail. This is a static assurance gap, not an observed
current 19 API mismatch.

**P03 — Rollback needs the complete dependency bundle.** Capture all 22 Gold/audit
output versions, publication/replacement/source versions, bridge definitions,
matching STL 3, deployed notebook/helper/reference bytes and application artifact.
Gold's individual writes are atomic; the group is not. Restoring an old fact pin
alone cannot restore overwritten STL/views/marts. Preserve recovery snapshots and
prove restoration before production activation. This is currently unverified.

**P04 — Selected-field comparison is not an exhaustive source proof.** Existing
Gold and catalog validator comparisons protect source IDs, dates, quantity and
core financial values/flags, but omit some other immutable raw/Silver fields,
including CP/TP unit prices, discount, DR/area, raw source lineage and quality
rules. Keep every existing guard and add an explicit complete immutable source
contract against 19 when preparing the next publication. Only declared catalog
metadata may change. Current receipts do not demonstrate corruption; they prove
the selected fields they actually compare. Test price-only, lineage-only and
quality-only mutations, added/deleted keys, changed eligibility and mismatched
master hashes; these are meaningful release safeguards.

**P05 — Review file has limited size headroom.** The master is
**4,710,026 bytes** against Gold's 5,000,000-byte limit, leaving
**289,974 bytes**. Its current 4,561 rows/schema/copies pass.
Keep extended diagnostics in dated review artifacts and concise references in the
master; do not silently drop data or remove the fail-closed size bound.

## Retention and execution sequence

The saved fact 19 history records both deleted-file and log retention as
**interval 30 days** and confirms V1 overwrite preserved those settings. This is
finite recovery retention, not a permanent baseline archive. See
[Databricks retention guidance](https://docs.databricks.com/aws/en/tables/history). The previous 7-day
retention error was real; longer retention does not recover physically deleted
files. Other dependent tables' retention has not been confirmed by this assessment.
Check/capture retention before writes and before STL; metadata property changes
create versions. Use the final observed fact version for STL and its consumers.

After the local package is complete and verified, the controlled catalog-only
sequence is 03 → 04 → 05 → 06, followed by read-only publication/descriptive/catalog checks
against actual new V and authenticated API/UI/export verification. Keep app 19 while
preparing; change its selected release only when serving a separately validated
new candidate. No 01/02 rerun is needed for a mapping-only publication.

The complete current 19 label receipt is sufficient to populate review coverage; it
is not a fresh full-row/raw-column snapshot. Preserve its original version 17
research provenance. Product identity/category/unit/forecast approvals and external
joins remain separate business/data gates. Their pending status does not invalidate
financial descriptive reconciliation.

## Verification and limitations

Executed: targeted non-secret configuration inspection; helper validation of all
local drafts; schema/copy/checksum/current 19 alias coverage; confirmation of zero
activated SKU/category/unit/forecast decisions; saved receipt and static code review.

Suggested focused commands and the bound descriptor values are in
[pipeline_assessment.json](pipeline_assessment.json). No code implementation,
package generation, cloud execution, complete rollback rehearsal or authenticated
browser check was performed. Parent owns the fresh live warehouse audit.
