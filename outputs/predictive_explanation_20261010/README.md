# Predictive explanation delivery — 10 October 2026

The predictive continuation completes a client-readable and paper-ready explanation
of the existing model comparison, with independently recomputed presentation
numbers. It does not retrain models or approve operational forecasting.

## Read the result

- [Canonical predictive explanation](../../docs/logic/PREDICTIVE_ANALYTICS_EXPLAINER.md): target, five model families, overlapping time-ordered evaluation, metric formulas, client interpretation, limits and suggested paper wording.
- [Scorecard](SCORECARD.md): all 21 configurations ranked on development, family representatives chosen only on development, twelve actual/predicted audit months, direction amounts and lead-specific errors.
- [Full-precision scorecard](scorecard.json), [derivation receipt](derivation-receipt.json), [verification receipt](qa/verification.json) and [QA review](qa/REVIEW.md): reproducible numbers and checked identities.

The [delivery seal](delivery.json) checks the final task files, new documentation
links, retained verification/code hashes and unchanged source/model evidence.

The selected last-value benchmark remains unpublished. Its audit WAPE is 37.763644%
and monthly MAE is ₱5,834,383.00. Seven overforecast months total ₱42,777,710.55;
five underforecast months total ₱27,234,885.47. These are financial prediction
errors, not excess stock purchased or unmet unit demand. No fitted challenger
qualifies under the original experimental rules, and no operational benefit is
established. WAPE must not be translated into an accuracy percentage.

## Assignment and acceptance

Accountable role: Data Analyst. Scope: this output directory and predictive-specific
sections of the canonical explainer, methodology/evidence guides, analytics,
operations, documentation index and current state. Supporting Data Analyst derived
the scorecard; Technical Writer completed reader/figure review; QA Engineer
completed documentary assessment and authored a separate verifier. Root repaired
that verifier's receipt/table schema assertions and completed execution/self-review
after the QA agent's verification turn stopped. Numerical method independence is
distinct from a completed independent reviewer sign-off.

Plan: inspect the current frozen source and model contracts; correct stale
predictive guidance; derive presentation outputs from saved predictions without
fitting; verify numbers with a separate calculation; integrate canonical pointers
and document the remaining operational requirements.

| Acceptance criterion | Result | Evidence |
|---|---|---|
| Preserve source/run/selection and candidate status | PASS | Ten artifact hashes and raw input checksum; no new fit, source or publication |
| Derive all rankings, monthly audit and signed-error decomposition | PASS | Builder reconciles 441 metric groups and 2,205 numerical values |
| Recompute using a separate implementation | PASS | Root-executed QA: 1,126 checks, 0 failures; 399 metric groups using Decimal precision 80 |
| Correct target, temporal, metric and client-use claims | PASS | Canonical explanation, reader review, formula and local-link checks |
| Approve operational medicine forecasting | NOT VERIFIED / outside this bounded deliverable | Source recency, SKU/unit/territory contracts, error policy, untouched accepted actuals, intervals and scoped model review remain open |

The first verifier execution recorded 1,116 passes and 10 failures: retained Decimal
configuration and selection values were compared to their intentionally serialized
string representation. All numerical groups agreed. Root corrected those identity
comparisons without changing scorecard values, then reran the check successfully.
The [first receipt](qa/verification-first.json) and first verifier snapshot remain
available. Receipt/table schema checks were also corrected by inspection before
the first execution. No source/model artifact was repaired or overwritten.

Commands executed from the repository root:

```powershell
.\.venv-predictive\Scripts\python.exe -X utf8 outputs/predictive_explanation_20261010/derive-scorecard.py
.\.venv-predictive\Scripts\python.exe -X utf8 outputs/predictive_explanation_20261010/qa/verify_scorecard.py
```

The builder preserves existing derivation outputs and will reject a repeat run in
this directory; a new derivation needs its own copied script/output directory.
The QA command refreshes its local verification receipt. Neither command imports
model/evaluator code, calls SQL or creates a forecast release. Existing model,
browser and warehouse tests are inherited evidence; no application tests or builds
were rerun for this presentation/documentation change. Process inspection found no
matching running project Node/Python task, and no service action was needed.

## Evidence identity and next work

Source: Gold fact 20 and frozen input SHA-256
`04be4f529101f2117a5045d686158708e2b39d55957a3b119b22a30aa72c63ba`.
Run: `eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a`.
The receipts preserve dataset/policy, code and artifact hashes, execution commands,
UTC times and environment. The output date uses Asia/Manila.

The next model revision requires accepted newer actuals or documented origin-known
features and later untouched accepted observations for assessment. The client/data
owner needs to resolve [specific source timing and lineage questions](../predictive_readiness_20261010/SOURCE_OWNER_REVIEW.md)
and agree on acceptable peso error for required leads. A revenue model does not
supply SKU units, disease causality or procurement inputs. [Predictive operations](../../docs/PREDICTIVE_OPERATIONS.md)
owns reproduction/review/publication; [current state](../../docs/CURRENT_STATE.md)
owns the current acceptance verdict.

Skills applied: `.skills/analytics-frameworks.md` for target/temporal validity,
same-population error formulas and bounded interpretation; reused
`.skills/database-standards.md` for frozen lineage and candidate identity;
`.skills/documentation-standards.md` for canonical ownership and historical
checkpoints; `.skills/testing-standards.md` for separate expected-result calculations,
isolated failure probes and proportionate checks; `.skills/coding-standards.md`
and `.skills/technology-stack.md` for offline stdlib derivation and unchanged runtime.
Worker/execution guidance and the Data Analyst, QA Engineer and Technical Writer
roles informed their respective assignments. Application architecture, database,
authentication, external providers and deployment are unchanged. Unrelated working
tree changes were preserved.
