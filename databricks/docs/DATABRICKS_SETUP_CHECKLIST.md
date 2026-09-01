# Databricks Setup Checklist

Use this checklist to finish the workspace shown in the uploaded screenshot.

## Immediate Setup

- [ ] Verify your Databricks identity if the **Verify identity** option is available.
- [ ] Use `Repos/medshield_project` as the Git-backed source of truth.
- [ ] Pull the repository until the top-level `databricks/` directory appears.
- [ ] Stop editing the separate blank `BRONZE LAYER`, `SILVER LAYER`, and `GOLD LAYER` notebooks after this workflow is available.
- [ ] Run `databricks/notebooks/00_setup.py` once using serverless compute.
- [ ] Confirm these schemas exist in Catalog:
  - `workspace.medshield_bronze`
  - `workspace.medshield_silver`
  - `workspace.medshield_audit`
  - `workspace.medshield_gold`
- [ ] Confirm the `workspace.medshield_bronze.raw_files` volume exists.
- [ ] Create the `sales` directory in that volume.
- [ ] Upload exactly one source file for every year from 2017 through 2025.
- [ ] Keep the original filenames unchanged.

## First Pipeline Run

- [ ] Run `01_bronze.py` with a descriptive batch ID such as `initial_2017_2025_v1`.
- [ ] Confirm Bronze contains nine distinct source files.
- [ ] Run `02_stage.py` and confirm every file has one detected header row.
- [ ] Run `03_clean_quality.py` and review quality status and rule counts.
- [ ] Review every rejected-date group, particularly the known 2017 and 2019 anomalies.
- [ ] Review `#REF!`, missing-product, source-year mismatch, and duplicate groups.
- [ ] Run `04_gold.py` only after the Silver counts reconcile; treat its outputs as candidates until Finance definitions are approved.
- [ ] Run `05_validate.py` and retain the batch result from `pipeline_runs`.

## Governance Before Dashboard Publication

- [ ] Approve the governed 14-field business schema.
- [ ] Approve the 14 lineage and quality fields.
- [ ] Approve financial field meanings and the ₱0.02 tolerance.
- [ ] Approve the 2018 rows found in both the 2018 and 2019 source files.
- [ ] Approve product/SKU aliases and area aliases.
- [ ] Decide whether warning rows can enter the dashboard.
- [ ] Keep estimated backward-allocation rows distinguishable from observed transactions.
- [ ] Keep quarantine and audit schemas inaccessible to public application users.

## Automation After Validation

- [ ] Deploy the bundle-defined job.
- [ ] Keep all five tasks sequential in Free Edition.
- [ ] Run manually until at least two batches complete and reconcile.
- [ ] Add a schedule only when new source files arrive on a predictable cadence.
- [ ] Configure failure notification if the workspace/account supports it.
- [ ] Never put Databricks tokens, Supabase keys, or other credentials in Git or notebook cells.
- [ ] Keep a Git/local backup of all code and documentation.

## Recommended Notebook Naming

Use ordered, space-free names:

```text
00_setup
01_bronze
02_stage
03_clean_quality
04_gold
05_validate
```

This makes execution order obvious and prevents the notebook labels from becoming the only documentation of pipeline behavior.
