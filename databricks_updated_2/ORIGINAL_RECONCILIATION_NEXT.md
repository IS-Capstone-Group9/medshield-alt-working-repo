# Next: reconcile originals against corrected serving — 26 October 2026

Classification acceptance and its candidate creation/readback are complete as
reported by Adrian. No repetition of those steps is required.

Import ONE new Python notebook:
medshield_project/maintenance/20261026_reconcile_original_vs_serving.py
into /Workspace/medshield/medshield_project/maintenance/.
Select Python Serverless and Run all. No parameters or helper uploads are needed.
Keep all original CSVs in the existing medshield_project_csv folder.

This self-contained notebook reads current original CSVs and the pinned corrected
fact plus accepted-category candidate at Delta0. It verifies source keys, source
identity, 40,160 records and PHP637,922,399.53 eligible signed net. It compares
exact typed fields within the same source workbook/year as a multiset, retaining
legitimate repeated observations. It first matches current original itemized
candidates, then identifies serving records found only among noncandidate original
rows. Remaining original/serving differences are counted separately. Original
physical-line dispositions, technical financial totals and anonymous aggregate
contract totals remain explicit. Displayed margin-ratio precision alone is omitted
from matching; source amounts, quantities, dates and documents are compared.

Expected final message:
PASS_RECONCILIATION_REPORT. No files or tables changed; differences remain review-only.

Send the complete JSON report and final message, or exact error. Differences do
not imply the notebook failed and must not be removed to make counts equal.
The report does not authorize extra revenue or guess contract quantities/products.
The technical finance difference is not approved incremental company sales.
No physical medicine-demand, category or model approval is created.

No table/file writes or live switches occur. This is disposition reconciliation,
not the declined separate original-CSV verification notebook, not a rerun of the
old adjusted 01–03, and not the Bronze/Silver/Gold rebuild itself. It supplies the
row/financial differences needed to specify that controlled original-source flow.

Local verification: nine tests passed, including full ten-source parsing,
duplicate/multiset constraints, null versus zero, cross-year isolation, explicit
noncandidate matches, eligibility differences, decimal equivalence and contract
separation. Generated-source, read-only AST and upload-copy checks pass.
The full-original fixture uses an explicitly empty serving list; its unmatched
counts are not live warehouse evidence. The Spark compare is unrun until Adrian
runs this notebook. No app build was needed for offline preparation.
