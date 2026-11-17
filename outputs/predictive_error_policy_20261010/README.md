# Step 2 — forecast error policy and client review

The user requested implementation of **both peso and percentage error reporting**
and an approach that minimizes error without deliberately overestimating or
underestimating sales. This packet formalizes that research reporting approach
and derives the saved model results. It changes no fitted model, prediction,
selection, source or publication state.

## Selected approach

| Measure or policy | Use |
|---|---|
| **MAE (PHP)** | Average absolute peso miss per scored monthly forecast |
| **WAPE (%)** | Total absolute error divided by total absolute actual sales, across the same scored cases |
| RMSE (PHP) | Diagnostic that gives larger misses more weight |
| Signed normalized bias (%) | Diagnostic for net over/underforecasting; positive means overforecasting |
| Direction counts and amounts | Separate overforecasts and underforecasts, preserving their absolute magnitude |
| Equal absolute-error weights | **1 for each peso over / 1 for each peso under**, as a provisional research comparison; real client costs remain unknown |
| Business acceptance | Both valid, scoped MAE and WAPE limits must be met; with either limit absent, the result is **not assessed** |

MAE and WAPE provide different interpretations of the **same absolute-error
numerator**. On identical common pairs with a shared nonzero denominator, they
give the same model ordering. They are not independent votes. A low signed bias
also cannot establish accuracy: two errors of +₱100 and −₱100 cancel to zero
mean signed bias while MAE remains ₱100.

## Current inherited evidence

The target is **company monthly eligible recorded net sales in pesos**. The
inherited selection remains `last_value`; no challenger qualified under the
frozen experimental criteria. These historical results are not new scores or
client-approved tolerances.

| Measure | Development | 2025 retrospective audit |
|---|---:|---:|
| Scored cases | 60 overlapping origin/target pairs | 12 monthly targets |
| Distinct target months | 24 | 12 |
| MAE (PHP) | ₱3,090,470.93 | ₱5,834,383.00 |
| WAPE (%) | 83.199360% | 37.763644% |
| RMSE (PHP) | ₱4,300,604.37 | ₱6,956,031.72 |
| Normalized signed bias (%) | +1.259230% | +8.383545% |
| Overforecast cases / magnitude | 36 / ₱94,117,365.03 | 7 / ₱42,777,710.55 |
| Underforecast cases / magnitude | 24 / ₱91,310,891.06 | 5 / ₱27,234,885.47 |

The audit was already inspected and remains retrospective. Development pairs
overlap; 60 forecast cases are not 60 independent months. Direction magnitudes
sum to total absolute error and differ by total signed error. They measure
revenue misses, not lost sales, purchased units, stockouts or expiry losses.
Every model is presented on the same keys. See the
[complete 21-recipe errors](MODEL_ERRORS.md) and
[exact derived values](model-error-review.json).

## Client review card

The numerical acceptance limits remain intentionally unset in
[policy.json](policy.json). Fill this card with the client using the intended
decision and evaluation scope; preserve the actual attribution and review date.

| Decision field | Current value |
|---|---|
| Maximum acceptable **cohort MAE** | Not supplied — ₱_____ |
| Maximum acceptable **cohort WAPE** | Not supplied — _____% |
| Intended use | To be specified by the client |
| Evaluation period and actual forecast leads | To be specified and matched to the accepted source/model contract |
| Over/underforecast consequences | Not measured; provisional research weights are 1:1 |
| Decision-maker and decision date | Not supplied for these numerical limits |
| Current business error assessment | **Not assessed — thresholds missing** |

Both limits apply to the same agreed cohort. MAE is an average and WAPE is an
aggregate ratio; neither is a maximum error allowed in every month. A monthly
cap would be a separately defined requirement. Current errors must not become
limits merely to make the candidate pass. A zero absolute-actual denominator
makes WAPE unavailable; no scored pairs makes both unavailable.

The 2026 projections have no accepted actuals here and receive **no 2026 error
or tolerance score**. Once records are released, retain the original generation
date and distinguish elapsed targets from targets future at generation.
Any changed asymmetric cost policy needs a new scoped registration before its
assessment. Existing experimental criteria and model selection remain unchanged.

## Step status and evidence

**Step 2's reporting and provisional policy setup is complete when the delivery
checks pass. Full business error acceptance remains pending** the client's two
numerical limits, scope and error consequences. The user's "DO THAT THEN"
endorses preparation and the research approach; it supplies no numerical limit,
verified cost, external approver identity or model-publication approval.

- [Derivation receipt](derivation-receipt.json), [error policy](policy.json),
  [numerical QA](qa/REPORT.md) and [delivery seal](delivery.json).
- [Canonical decision record](../../docs/OBJECTIVE_EVIDENCE_REGISTER.md#predictive-error-policy--10-october-2026),
  [method explanation](../../docs/logic/PREDICTIVE_ANALYTICS_EXPLAINER.md#joint-error-review-and-direction-policy)
  and [operations](../../docs/PREDICTIVE_OPERATIONS.md#review-error-policy-before-business-acceptance).
- [Original model comparison](../predictive_completion_20261009/README.md),
  [earlier scorecard](../predictive_explanation_20261010/SCORECARD.md) and
  [2026 projection packet](../predictive_annual_release_20261010/README.md).

Reproduce with the existing predictive Python environment. Copy
`build_error_policy.py` into a **new sibling directory directly under `outputs/`**
and run that copy with `.venv-predictive/Scripts/python.exe -X utf8`; the script
writes beside itself and rejects existing derivative files. It has no output-path
CLI option. Its actual command and source hashes are retained in the receipt.
Independent QA supplies its executed checks and reproducible command. No
dashboard/runtime build or cloud write is involved.

Accountable role: Business Analyst. Supporting roles: Data Analyst,
QA Engineer and Technical Writer, with separate numerical and reader review.
Applied/reused repository worker/execution contracts, business-analysis and
analytics frameworks, database lineage, coding, testing, technology stack and
documentation guidance. Existing source/model evidence and unrelated working-tree
changes were preserved. The original medicine-unit/territory objective and model
publication gates remain separate.
