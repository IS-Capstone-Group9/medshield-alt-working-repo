# Original-source Bronze → Silver → Gold candidate runbook



Prepared 26 October 2026. Database Engineer accountable; self-review.



These are the updated original-source notebooks. The previous 01_sales_bronze,

02_sales_silver and 03_sales_gold stay as historical adjusted-source references.

Do not replace their guards or use them for the restored originals.



## Upload three notebooks, then run in order

The three refreshed files contain 24 cells each: 12 markdown headings and 12
code cells. If you imported the earlier one-cell versions, interrupt any waiting
run and re-import the refreshed .py files as notebooks into the same Workspace
folder, replacing those three notebook copies. Import the files rather than
pasting their full text into one existing cell. Use all three refreshed files
together and restart from Bronze; generated provenance identity changes the new
isolated batch name while preserving existing tables. Data-processing functions
are unchanged. Actual remote cell layout remains subject to the operator import.



Local folder: medshield_project/original_source_20261026/

Remote destination chosen by Adrian: /Workspace/medshield/medshield_project/.
Notebook placement does not affect the fixed source/package/table paths.

Import each .py file there as a Python notebook:



1. 01_original_sales_bronze_20261026.py

2. 02_original_sales_silver_20261026.py

3. 03_original_sales_gold_20261026.py



All three are self-contained. No helper, ZIP or pip upload is needed. They read

original CSVs already in /Workspace/medshield/medshield_project_csv/. Gold also

reads the four-file category_b160d6aad4376d64 package already uploaded under

/Workspace/medshield/category_releases/. Keep that package unchanged.



Select Python Serverless. Run Bronze first. Continue to Silver only after Bronze

passes; continue to Gold only after Silver passes. Stop on any error and retain

the complete output. No widgets or path edits are required. If a namespace-create

permission fails, retain the exact message; do not edit destination guards.



Success messages:

- PASS_ORIGINAL_BRONZE_CANDIDATE. Exact readback verified; live serving unchanged.

- PASS_ORIGINAL_SILVER_CANDIDATE. Exact readback verified; live serving unchanged.

- PASS_ORIGINAL_GOLD_CANDIDATE. Exact readback verified; live serving unchanged.



Send the final JSON and message for each layer. There is no extra classification

or original-versus-serving report rerun required for these unchanged inputs.



## What is retained and reconciled



For the supplied current sources:



| Layer/output | Expected control |

|---|---:|

| Bronze source files | 10 |

| Bronze physical lines | 62,065 |

| Silver assessed physical lines | 62,065, each with a disposition |

| Silver analysis candidates | 40,523 |

| Gold itemized candidates | 40,171 |

| Gold contract candidates | 352 |

| Gold financial candidates | 40,523; technical eligibility remains per row |

| Technically net-eligible financial candidates | 39,638 |

| Itemized technical signed net | PHP638,015,351.53 |

| Separate contract technical signed net | PHP118,330,249.95 |

| Combined technical signed net | PHP756,345,601.48 |



The 11 extra original 2025 itemized candidates/PHP92,952 are retained in this

original-source population. Candidates with net-formula or other quality issues

are not silently deleted: Silver retains all evidence and Gold exposes technical

metric flags. Combined technical net is not an approved company-sales total.



Bronze stores both exact uploaded bytes and normalized physical-line evidence.

Silver assesses all years together and retains every keep/review/exclude reason.

Evidence payloads are compressed/base64 encoded with SHA256 so the standard-library

reader can reproduce the exact canonical JSON. Encoding is transport/storage,

not encryption. Existing Unity Catalog permissions govern these raw records; no

grants or permission changes are issued. Outputs print aggregate controls only.

Gold produces typed itemized, anonymous-contract and financial-candidate tables.

Contract product/area/document breakdown and physical quantities remain unavailable.

Itemized quantities remain recorded source counts with unapproved units; no

physical-unit or forecast approval is inferred. Net, gross, cost and margin have

separate technical flags; margin eligibility requires its matching net/cost scope.



## Isolation, identity, retry and remaining gates



New schemas only:

- workspace.medshield_original_bronze_20261026

- workspace.medshield_original_silver_20261026

- workspace.medshield_original_gold_20261026



Table prefixes derive from actual CSV hashes, parser/core/generator identities and

the pinned category receipt. Printed dataset/batch IDs can differ from the local

preflight when uploaded BOM/newline representations differ. Reviewed 2017, 2021

and 2026 representations are bound to retained source evidence; actual bytes and

hashes are always kept. Unknown changes to reconciled source files fail rather

than inherit provenance. Additional future-year files are supported but retain

unreviewed source status; unsupported new labels require category review.



Each table is created with V2 create, read at Delta0 and compared exactly. Identical

retry verifies and writes nothing; a different existing table, modified version,

missing preceding layer, changed source or mismatched category package fails.

Partial successful creation can resume by verifying the identical completed parts.

No overwrite, append, replace, drop, live view change or model training exists.

The standard library and Spark functions are used; no package installation.



These new Gold schemas are explicit candidate contracts. They are not drop-in

replacements for the current gateway's 144-field corrected fact. No backend,

dashboard, STL, forecast or export pointer switches automatically. Before serving:

resolve financial parent/child overlap/date/value meaning and the permitted full-

original/contract financial scope; validate candidate readback and retries;

prepare coherent versioned consumer contracts and reconcile API/chart/export

measures with availability states. The prior financial/source/model receipts

remain attached to their own source identities. Classification acceptance does

not confer any other business, model, procurement or academic approval.



## Verification scope



The retained local verification covers real ten-file parsing, all physical-line

and candidate/technical finance controls, exact Silver evidence roundtrip into

Gold, accepted categories, unchanged source values, contract privacy/quantity

boundaries, changed-input rejection, future-year support, generated-code identity

and identical/different existing-table guards. See the dated current-state entry

and outputs/original_layers_20261026/verification.json for actual results.

Databricks/Spark execution and permissions remain unverified until the operator

runs the three notebooks. Preparation is not a cloud-success receipt.

