# Gemini Notebook Source Guide

## Recommended upload order

Upload these Markdown files as one evidence pack:

1. `README.md`
2. `00_MASTER_SOURCE_MANIFEST.md`
3. `01_SALES_PROCESSED_DATA_MANIFEST.md`
4. `02_EXTERNAL_PROCESSED_DATA_MANIFEST.md`
5. `03_TRANSFORMATION_AND_MAPPING_MANIFEST.md`
6. `04_ANALYTICAL_READINESS_MANIFEST.md`

If Gemini Notebook accepts more sources, add the matching evidence JSON files separately. Do not upload raw client-level sales data unless your team has REC approval, a lawful purpose, and an approved de-identification procedure.

## Short drafting instruction

Use only the uploaded manifests as evidence. Draft Chapter 4 in essay form, following sections 4.1–4.4. For every finding, state the result, supporting evidence, business implication, and limitation. Preserve all dataset IDs, versions, dates, row counts, financial definitions, and status labels exactly. Distinguish observed outcomes, simulated outcomes, and targets. Never invent missing predictive, prescriptive, user-acceptance, or approval results. Treat the ≤5% expiry-wastage value as a target unless evidence explicitly proves achievement.

## Questions Gemini should answer before writing

1. Which evidence file and dataset version supports each number?
2. Is the result observed, simulated, proposed, or approved?
3. Does the evidence show an association or justify a causal claim?
4. Are coverage gaps, partial years, pending mappings, and missing files disclosed?
5. Are `net_cost`, `net_income`, product labels, and source units described using their documented meanings?
6. Is any result being copied from a superseded population?
7. Which required Chapter 4 sections still lack current evidence?

## Prohibited drafting behavior

- Do not combine version-15 counts with unsupported version-16 claims.
- Do not call source product labels verified SKUs.
- Do not call `net_income` company net income.
- Do not treat the ten missing sales months as zero demand.
- Do not treat NASA POWER as official PAGASA RSI or a typhoon warning.
- Do not claim that disease or rainfall caused demand changes.
- Do not present empty analytical output families as completed models.
- Do not state that the candidate dataset is publication-approved.

