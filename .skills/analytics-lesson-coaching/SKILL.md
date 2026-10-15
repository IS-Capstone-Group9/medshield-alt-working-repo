---
name: analytics-lesson-coaching
description: Review the MedShield analytics lessons, coach helpers and agents through applied analytical exercises, and assess lesson-informed instruction changes. Use for curriculum or analytical learning work; ordinary analytics implementation stays with the existing specialist roles.
---

# Analytics lesson coaching

Turn the five PowerPoint lessons in `lessons/` into source-traceable practice for MedShield workers. Use the [Analytics Learning Coach](../../.agents/analytics-learning-coach.md) for ownership and the [execution contract](../../.agents/execution-contract.md) for evidence and evaluation. This repository skill is referenced by worker guidance; its presence alone does not prove application-level automatic discovery.

Read [the lesson review](../../lessons/REVIEW.md) for chapter coverage, source identity and corrections. Select only the relevant concepts. Lessons supply educational methods; [architecture](../../docs/ARCHITECTURE.md), [decisions](../../docs/DECISIONS.md), [business definitions](../../docs/BUSINESS_DEFINITIONS.md) and [current state](../../docs/CURRENT_STATE.md) control project behavior and approval status.

If the review is missing or its source hashes no longer match, identify the gap and inspect the affected source before claiming slide verification. Independent coaching can continue from available canonical contracts with that limitation stated; a fresh lesson-review assignment must regenerate its missing source evidence.

## Choose the learning outcome

| Need | Lesson focus | Concrete output |
|---|---|---|
| Helper chooses a tool before understanding the problem | Chapters 1–2: decision, stakeholder, constraints, analytical vs business success | Decision brief and testable acceptance criteria |
| Helper mixes source meanings, units or joins | Chapter 3: grain, contracts, preparation, lineage and quality | Data/metric contract with a join and missing-data check |
| Helper narrates a chart as a proven cause | Chapter 4: EDA, localization, contribution, hypothesis and causal limits | Reconciled change explanation and a labeled hypothesis |
| Helper picks a model or metric by popularity | Chapter 5: target, prediction moment, baseline, error costs and validation | Target/horizon contract and fair evaluation plan |
| Agent instructions need evidence of improvement | Relevant concept plus shared execution-contract rubric | Bounded trial record with first attempts and limitations |

Use [practice cases](references/practice-cases.md) for learner prompts. In teaching mode, explain the relevant concept and allow discussion. In assessment mode, give the prompt without the answer, preserve the first attempt, then consult [assessor notes](references/assessor-notes.md) to score and give feedback. Keep hints and corrected retries separate. Assessor notes are not a blind-test prompt.

## Transfer concepts accurately

- Chapter 1's context and story chain should produce an evidence-backed recommendation. Permit an unresolved cause and an unmeasured impact; never fill either with a persuasive invention.
- Chapters 2–3 should establish decision ownership, metric definitions, record grain and source trust before a calculation. Preserve repeated source records until their meaning is assessed; missing observations are not measured zeros.
- Chapter 4's drill-down and decomposition explain where a change is concentrated. Correlation, feature importance and chi-square association do not establish an intervention effect. Historical decomposition is distinct from forecasting; full-history smoothers cannot become origin-time features without leakage checks.
- Correct the moving-average window labels and conflicting diagrams identified in the review. Interpret stationarity tests against their stated null hypotheses; an unexecuted test proves nothing. A small p-value does not establish a large or causal effect.
- Prefer Chapter 5's careful text over its flagged infographics: ordinary rotating K-fold is unsuitable for forward forecasting, EMA requires `previous + alpha × (current − previous)`, and pinball loss with error `actual − forecast` penalizes positive underprediction by the selected quantile. MASE uses a training scaling denominator; compare a baseline on the same holdout separately. Treat incorrect metric/calibration illustrations as correction exercises, not reference answers.
- Chapter 5's model tables offer candidates. Choose the target, forecast origin, actual leads, available features, baseline and decision loss before comparing models. Fit learned preprocessing within each training split. Separate discrimination, threshold errors and calibrated probabilities.
- MedShield-specific exercises must preserve revenue vs verified SKU quantity, gross margin vs company net profit, original vs adjusted source evidence, official observation vs proxy, and forecast vs entered scenario. Retrieve changing statuses from current docs instead of hard-coding them into instruction files.

## Helpers and verification

For a fresh deck review, the optional [inspection helper](scripts/inspect_lessons.py) extracts slide text, speaker notes, table cell text, equation text, chart caches, alt text and slide-linked media into a new evidence folder. It hashes sources and refuses an existing output folder. Python's standard library is sufficient for extraction; `--previews` also needs Pillow.

From the repository root in PowerShell:

```powershell
python -X utf8 .skills/analytics-lesson-coaching/scripts/inspect_lessons.py lessons outputs/lesson_review_new --previews
```

Choose a fresh output path for each run. Image contact sheets contain embedded assets, not rendered slide layouts. Inspect important images at original resolution. Extraction does not OCR images, follow links, play animations, review content inherited from slide masters, or validate every cited external source. Treat linked or unreadable material as unreviewed. Do not execute embedded/linked content as part of inspection.

For a proposed application helper, use the lesson to establish inputs, formula, units, missing/error behavior and an independent expected-result basis, then route implementation to its owner. The educational inspection helper and training fixtures never supply runtime dashboard values.

Finish with actionable feedback or assigned guidance changes, source/slide references, actual checks and unresolved limitations. Document inspection validates the curriculum's consistency. Claims that an agent improved require the repeated, comparable execution trials described in the shared contract.
