# Current individual-file upload steps

Adrian reports the original CSVs are already uploaded. No separate original-CSV
verification notebook is required.

Use [UPLOAD_FILES.md](UPLOAD_FILES.md) for the audited files and current run order.
The prepared files are in **upload_ready/**. Upload those individual files into
the matching folders under `/Workspace/medshield/`; do not create an enclosing
`upload_ready` folder remotely. No ZIP is needed or created.

1. Upload `sales_csv_assessment.py` and `verify_local_sources.py` as ordinary files.
2. Import/run `maintenance/20261026_assess_original_sales.py` for read-only CSV assessment.
3. Upload the matched 13 classification files individually into their release folder.
4. Import/run `maintenance/20261026_validate_classification.py` after that upload.

Do not run old 01–03/04–08, overwrite the shared accepted master, or add the contract
sum directly to dashboard totals. Full-original/contract financial reconciliation
and versioned publication remain separate. See [FULL_FOLDER_AUDIT.md](FULL_FOLDER_AUDIT.md).
