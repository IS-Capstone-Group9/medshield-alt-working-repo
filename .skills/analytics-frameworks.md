# Analytics Frameworks

## Description
Provides the analytics framing used for MedShield reporting and decision support. Use these categories to choose the right analysis level for a question before building a dashboard or metric. Good analytics work should not stop at a chart; it should explain what the number means for the business and how much confidence the viewer should place in it. For the capstone, the framework should help the analysis move from raw sales data to useful business insight.

## Workflow
1. Start with the business question and the decision it supports.
2. Choose the smallest analytics category that answers the question.
3. Establish the data and method contract below, then validate quality and expected results before interpretation.
4. Present reconciled findings with the correct evidence status, comparison and limitation.
5. Give a supported next action or bounded recommendation; state unresolved causes or unmeasured impact explicitly.
6. Ensure the final interpretation can be described clearly in the paper.

## Rules
- Descriptive analytics should answer what happened.
- Diagnostic analytics should localize changes and investigate plausible explanations. A causal claim requires stronger evidence than an association or contribution analysis.
- Predictive analytics should be used only when the data supports a forecast.
- Prescriptive analytics should connect the result to a decision or next action.
- Do not present speculation as fact.
- Call out assumptions, gaps, and data limitations explicitly.
- Keep the level of sophistication matched to the quality of the data.
- Keep the method understandable enough that the capstone can defend it.

## MedShield Usage
- Use descriptive analytics for dashboard summaries and trend views.
- Use diagnostic analytics for variance and exception analysis.
- Use predictive analytics only when the source data and method are defensible.
- Use prescriptive analytics for prioritization and decision-support recommendations.

## Applied analytical contracts

These requirements put the useful concepts from Chapters 2–5 into ordinary analytical work. Use [business definitions](../docs/BUSINESS_DEFINITIONS.md) for formulas and [current state](../docs/CURRENT_STATE.md) for changing readiness/approval status; the lessons do not redefine either.

| Task | Required contract and expected-result basis |
|---|---|
| Metric/report | Decision, source identity, grain/unit, period/cohort/coverage, formula and shared numerator/denominator eligibility, missing/zero behavior, rounding and approval status. Reconcile with an independent calculation or trusted equivalent source population. |
| Diagnostic investigation | Define comparable before/after populations, localize changes and reconcile signed contributions to the total. Separate observations, plausible hypotheses and alternative explanations. End the investigation at the supported claim; correlation or feature importance alone does not establish a cause. |
| Categorical association | Use actual counts with suitable observational independence and expected cells; identify sparse/clustering limitations. Distinguish expected frequencies, overall association, cell residual localization and effect size. Exploratory cell significance needs appropriate multiplicity handling. |
| Forecast | Target/unit, accepted origin, actual calendar leads, feature availability at issue time, origin-local learned preprocessing, comparable time-ordered validation and transparent baselines. Freeze model/threshold/policy choices on development evidence before untouched final assessment. |
| Classifier/ranking | Reviewed target labels and population, held-out design, class coverage, baseline, error consequences and review capacity. Distinguish threshold errors, ranking/discrimination and probability calibration; select the operating policy before final testing. |
| Planning scenario | State entered assumptions, objectives/constraints, feasibility and missing operational inputs. Scenario completion is separate from measured benefit, forecast/model acceptance and procurement approval. |

For forecasts, report decision-relevant errors and bias by required lead. MASE uses a training naive/seasonal-naive scale; `MASE < 1` does not replace comparison against the same baseline on the same holdout. State bias sign and handle zero/near-zero percentage or scaling denominators explicitly. Historical centered/full-series smoothing cannot become a forecast-time feature without rebuilding it using only origin-available history.

For charts and narratives, distinguish a level from growth, relative percentage from percentage-point change, unknown from observed zero, and unequal coverage from a comparable period. Keep API, table, chart and export populations consistent. A truthful data story can disclose an unresolved cause or impact requiring follow-up measurement.

For MedShield, retain gross-margin terminology, original/adjusted evidence, candidate labels and provider provenance. PHP revenue is not verified SKU quantity or unconstrained demand. Use [database standards](database-standards.md) for affected joins; explicit source unavailability cannot be replaced with educational fixtures or local analytical data.

## Lesson-based learning

For helper/agent coaching or applied analytics practice, use the [Analytics Learning Coach](../.agents/analytics-learning-coach.md) and [analytics lesson coaching skill](analytics-lesson-coaching/SKILL.md). The [lesson review](../lessons/REVIEW.md) maps the five chapters to repository work and identifies examples that require correction. Canonical project definitions and acceptance gates control production use.
