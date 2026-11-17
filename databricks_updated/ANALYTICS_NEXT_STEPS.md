# After 01–03: descriptive and predictive analytics

**26 October current scope:** the 24 October adjusted-batch guidance below is
historical. Use [the full audit](FULL_FOLDER_AUDIT.md), [individual upload steps](UPLOAD_FILES.md)
and [Current State](../docs/CURRENT_STATE.md). Restored originals are assessed with
the new read-only helpers; do not rerun old 01–03/04–08. Contract-inclusive serving
and source-bound model activation remain separate; historical research availability
statements below do not override the later correction and withholding decisions.

## Current status — 24 October 2026

01 Bronze, 02 Silver and 03 Gold are complete for this batch. The local system
already reads the isolated 2026 Gold source. No further CSV upload or repeat
01–03 run is needed for the supplied files.

| Part | Completed work | Remaining work |
|---|---|---|
| Descriptive | Current source connected; filters/charts/exports and source-bound report checked; new monthly financial STL persisted and read back from the isolated source. | Review product/territory identities. Original paper's daily territorial medicine-unit requirement remains partial. |
| Predictive research | Research-only source decision recorded; 15 configurations actually evaluated; 2025 audit, nine-month 2026 extension and future candidate retained. | Review substantial errors and permitted use before any new model publication. |
| System model activation | Original stored research remains available and unchanged. | The new offline run has not replaced the system model. A separately reviewed source-compatible staging/publication step is still required. |

## What you should do next

1. Read [the descriptive results](../outputs/analytics_completion_20261024/DESCRIPTIVE_RESULTS.md)
   and check the current system at `http://localhost:3000`. Use January–September
   when comparing 2026 with 2025; 2026 is a partial year.
2. Read [the predictive research results](../outputs/analytics_completion_20261024/PREDICTIVE_RESULTS.md).
   The frozen selection retained the last-value benchmark, with substantial
   measured error. It is not an approved medicine-demand forecast.
3. Review whether that research candidate is useful to display alongside the
   existing research. Any model staging/release must bind the new source, input,
   evaluated artifacts, review and supported calendar leads. Training permission
   does not change `publication_approved: false`.

Do not run the exported 04–08 simply to complete these steps. 04/05 are legacy
bridges; the current dashboard reads the pinned fact directly. 06 is optional
diagnostic STL on an older contract. 07 creates storage and 08 saves frozen
inputs; neither performs model training. A new-source STL or model publication
needs its own compatible contracts and persisted verification.

The added `medshield_project/06_sales_stl_2026.py` supplies the source-compatible
monthly diagnostic. Its isolated candidate was already prepared, persisted and
verified through the controlled publisher in
[the paper/analytics repair](../outputs/paper_analytics_closure_20261024/README.md).
You do not need to run either 06 again for this completed fact-0 candidate.
Do not use this monthly financial output to claim the original daily territory
medicine-unit model. See [the direct paper checklist](../outputs/paper_analytics_closure_20261024/PAPER_REQUIREMENTS.md)
before calling descriptive/predictive scope complete or supplying procurement
quantities. Local servers were not started during this check; the updated gateway
reader loads on your normal next backend startup.

## Reproduction for engineering

From `backend/`, `node --import tsx scripts/validate-descriptive.ts` now validates
the configured release and exact dashboard population. Use `--require-stl` only
when intentionally requiring a matching decomposition; the default records an
unavailable optional STL without substituting old results.

`node --import tsx scripts/extract-predictive-input.ts EVIDENCE.json COVERAGE.json`
verifies the evidence sidecar hash, active source/pin/predicate and reconciled
amounts before freezing an input. Missing coverage stays unknown and blocks
training. Historical full-fact receipts need explicit `--legacy-receipt`; that
option cannot disguise a new isolated receipt as the original source.

From the repository root, the new offline runner is:

```powershell
.\.venv-predictive\Scripts\python.exe -m services.analytics_service.predictive.extension --input INPUT.json --plan PLAN.json --output NEW_DIRECTORY
```

The checked input and plan both require `.sha256` sidecars. Use a new output
directory and a plan bound to the exact accepted input before fitting. The
[actual completed run and reproduction evidence](../outputs/analytics_completion_20261024/README.md)
own the current paths, checks and limits. Offline artifacts never supply a
dashboard analytical fallback. No new model or warehouse object was published.
