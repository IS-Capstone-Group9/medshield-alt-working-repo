# Full databricks_updated audit — 26 October 2026

Accountable Database Engineer; local self-review, no delegation. The entire folder
was audited. It mixes current upload files, historical exports and local-only tools.
Use [UPLOAD_FILES.md](UPLOAD_FILES.md) and **upload_ready/** for the 17 individual
current files. Do not upload the entire development/export folder as one pipeline.
No ZIP was created or modified.

## Results

- All 165 files in the final tree are inventoried, fingerprinted and assigned an upload role; the initial tree had 140.
- Python AST, JSON/notebook/manifest structure, strict CSV parsing, XLSX archive/XML checks and static SQL target/guard review pass. Local bytecode is fingerprinted/excluded, never executed.
- All 10 original sales CSVs parse together: **62,065 physical lines**, each retained with a disposition and source identity; no raw-line loss or unresolved PENDING disposition.
- **40,523 analysis candidates** comprise **40,171 itemized candidates** and **352 contract candidates**. Contract candidate recorded net sales remain **PHP118,330,249.95**; their physical quantity is unavailable.
- Contract summaries are excluded from named-product profiles. All **5,693** distinct original itemized labels exactly match the **5,694**-alias classification candidate; one candidate alias has no current original itemized activity. No fuzzy merge, unit conversion or approval was invented.
- Existing independent original-year controls for 2020/2024/2025 reconcile exact amounts and contract counts. Source identity, raw keys, disposition counts and month/unknown handling pass.
- Forty-two protected original-source/reference/submission/release/archive files are byte-identical to the before-audit inventory. Both 13-file classification release manifests still match; the existing ZIP is unchanged and excluded from upload.
- The 17 upload copies exactly match their reviewed source files and the upload manifest.

[Per-file evidence](../outputs/databricks_full_audit_20261026/file_report.json),
[summary and changed-file list](../outputs/databricks_full_audit_20261026/audit_summary.json),
[CSV assessment](../outputs/databricks_full_audit_20261026/csv_assessment.json),
[before inventory](../outputs/databricks_full_audit_20261026/inventory_before.json).
No raw business rows or confidential contract identifiers are copied into this report.

## Fixed findings

| Finding | Fix and verification |
| --- | --- |
| Original 2025 rejected as an unreviewed replacement | Corrected the shared pure provenance registries in Bronze/Gold to distinguish original and adjusted 2025. Actual-original and unknown-hash tests pass; future years remain unreviewed. Historical runtime guards stay in place. |
| Contract summaries appeared as product labels in the generic audit | Separated contract and itemized candidates, preserved contract net values and unavailable physical units, and kept contracts out of product profiles. Prefix rules align the original-evidence treatment while SKU size markers remain valid products. |
| Runtime helpers tried to read UI-imported notebooks as .py files | Generated ordinary `sales_csv_assessment.py` with the reviewed pure declarations. Updated the helper and optional original intake dependencies. A full integration test runs from only the two ordinary helper files, without notebook-source .py files. |
| Default source path/code-hash paths were local-only | Resolved the CSV folder from the sibling project directory; code hashes now refer to ordinary helper files rather than notebook files. |
| Malformed exported maintenance SQL prefix | Replaced the erroneous M-prefix with a SQL comment. Semantic comparison confirms all other notebook metadata/output/source is preserved. It remains historical maintenance, not a current run step. |
| Generated copyable README differed after parser fixes | Regenerated it from GUIDE and exact notebook cells. Both generators' consistency checks pass; copyable 01–03 content is explicitly historical. |
| Upload guidance relied on a ZIP and mixed workflows | Replaced the handoff with individual files and a clean 17-file upload view. Source originals and immutable classification files remain untouched. |

Before-change exported/runtime bytes and the baseline failing test outcome are
retained under `outputs/databricks_full_audit_20261026/`; no history was silently
relabeled as a completed current deployment. The optional source-verifier notebook
is not required in the operator workflow, as Adrian requested.

## Tests actually run

- Initial suite: 123 tests discovered/run, one setup error because original 2025 was rejected; six numerical STL tests skipped in the bundled runtime. This exposed the provenance defect.
- Final bundled-runtime suite: **137 tests; 131 passed, six numerical STL tests skipped** because that runtime lacks the numerical dependencies.
- The six skipped STL checks were then run using the existing documented `.venv-predictive` environment: **6 passed, no skips**. Across the two final runs, all 137 distinct checks passed.
- Added failure cases cover missing ordinary dependencies, execution without notebook .py files, exact generated parser declarations, contract exclusion from product profiles, original/future provenance and unchanged source/approval state.
- Parser generator and README generator consistency checks pass.

[Test log](../outputs/databricks_full_audit_20261026/tests_final.txt) and
[numerical STL log](../outputs/databricks_full_audit_20261026/tests_stl.txt).
These are local checks; they are not Spark/SQL warehouse execution or independent review.

## Scope that remains separate

The old 01–03 runtime source descriptors, 04/05 bridges, 06/07/08 model/STL assets,
maintenance SQL, external restart assets and old catalog publication receipts
remain historical or separate workflows. Their source guards must not be removed
to force restored originals into an adjusted batch. External source folders and
current cloud permissions were not inspected.

The new all-file assessment and the old per-file original-evidence intake use
different scope/reconciliation contexts. The already stored raw original evidence
remains preserved; its old candidate counts are not a publication oracle for the
new full-source assessment. Likewise current corrected Gold has 40,160 itemized
rows, a different population from 40,171 original itemized candidates. Do not delete
rows, rewrite history or add candidate financial sums until original-versus-serving
row dispositions and the permitted financial population are reconciled.

The parser's technical financial total **PHP756,345,601.48** is not an approved new
company total or an automatic dashboard increment. Technical net-value checks do
not establish revenue recognition, contract/document overlap clearance, complete
coverage, medical identity or units. Product-category activation and full-original/
contract-inclusive financial Gold, gateway/dashboard/export checks and actual
acceptance remain separate. Classification validation is read-only against its
captured 40,160-row Gold snapshot; it does not publish the newly uploaded originals.

No CSV/reference/Excel edits, source repairs, cloud upload, Spark notebook run,
SQL write, serving-pointer change, model fit, publication approval or new ZIP
creation occurred during this audit.
