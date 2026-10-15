# Forecast error visibility — frontend verification

Recorded: 2026-10-10 07:49:51 UTC. Reviewer: supporting Frontend Engineer,
with BI presentation guidance. This is implementation self-review; independent QA
is recorded separately under `qa/`.

Only these source files changed:

- `frontend/services/api/forecast-validation-runtime.ts`
- `frontend/e2e/forecast-validation.spec.ts`

The historical error cards identify historical metrics and show PHP values with
₱. Other targets retain their own unit. The monthly evidence section opens by
default and includes absolute and signed errors with explicit units. Visible
wording explains positive overforecast, negative underforecast and unavailable
future errors. The lead table uses the same matched historical pairs as the
monthly table and export.

The CSV appends `absolute_error_target_units`, `signed_error_target_units` and
`error_unavailable_reason`, plus historical cohort MAE, RMSE, WAPE, mean signed
error, evaluation dates and scored count. Historical summary columns are labelled
historical even on future rows; they are retained provider metrics, not newly
measured future performance. Existing source checksum, run/release identity,
unit, publication status and formula escaping remain present.

Errors require finite historical backtest values and an exact match between the
backtest actual and the displayed actual. Zero is valid. Future, missing,
history-only, mismatched and nonfinite errors stay null and export as blank cells
with a reason. No offline file source, model fit, persistence or activation was
introduced. No project service was started.

## Executed verification

From `frontend/`:

```powershell
node node_modules/@playwright/test/cli.js test e2e/forecast-validation.spec.ts --workers=1 --output=test-results-predictive-error-output-final-20261010
```

Result: **6 passed (12.3s)**, exit code 0. The initial run before the additional
presentation assertions/screenshots also passed all six cases (15.0s). The final
run checks matched positive, negative and zero errors; unavailable/mismatched
pairs; future errors; PHP and non-PHP units; historical summary null/zero
distinctions; CSV column values, cohort context, identity and injection escaping;
existing unpublished/null-lead, failure-clearing and published-adapter fixtures;
and absence of horizontal page overflow at 390px.

From the repository root:

```powershell
git diff --check -- frontend/services/api/forecast-validation-runtime.ts frontend/e2e/forecast-validation.spec.ts
```

Result: exit code 0, no whitespace errors. TypeScript verification is owned and
recorded by root; no application build or live warehouse test was run here.

## Checked hashes and screenshots

| File | SHA-256 |
|---|---|
| `frontend/services/api/forecast-validation-runtime.ts` | `ceea1fa768a2c5e1ef019867436ed7e6ec949855a4aa65db6b49c30ef42b7344` |
| `frontend/e2e/forecast-validation.spec.ts` | `3adea70905f3602961ca334697722b9618555153650482083096c01eda503f51` |
| `frontend-desktop.png` | `131eceb5d69549770f3d4ad67a8cff6fbd61626eb22fddd1590a435ab907bb16` |
| `frontend-mobile.png` | `7ffaf4a630ee73d5bc7ce964854cc79a61d806cd74e03a4be1f6c84b8bfa4671` |

The [desktop](frontend-desktop.png) and [390px mobile](frontend-mobile.png)
screenshots contain isolated synthetic fixtures, not client forecasts or live
accuracy evidence. Root owns visual acceptance and final packet integration.

Guidance applied: `.agents/worker-operating-model.md`,
`.agents/execution-contract.md`, `.agents/frontend-engineer.md`,
`.agents/bi-specialist.md`, `.skills/frontend-standards.md`,
`.agents/rules/ux-ui-design-rules.md`, `.skills/analytics-frameworks.md`,
`.skills/coding-standards.md`, `.skills/testing-standards.md` and
`.skills/technology-stack.md`. These informed the source boundary, matched-pair
meaning, historical labels, missing/zero behavior and isolated verification.
