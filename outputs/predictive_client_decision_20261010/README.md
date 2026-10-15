# Predictive client decision preparation — 10 October 2026

The user accepted the recommendation to report both MAE/PHP and WAPE/% while
retaining predictive research status. The client preference for both was relayed
by the user; no numerical limit or named external signature was supplied.

Accountable role: Business Analyst. Root owns the canonical
[client decision brief](../../docs/PREDICTIVE_CLIENT_DECISION_BRIEF.md), its
additive [objective/evidence record](../../docs/OBJECTIVE_EVIDENCE_REGISTER.md#predictive-client-decision-brief--10-october-2026),
and preparation records in this directory. Separate QA owns only `qa/` here.

## Plan and acceptance

1. Bind the existing error policy, frozen input, six-trial run/report and original
   benchmark/model/annual evidence. Preserve their bytes and historical findings.
2. Prepare a client-facing review aid with both metrics, the same 2025 cohort,
   mixed development/audit results and appropriate candidate labels.
3. Record user endorsement separately from unknown client numerical/operational
   acceptance. Leave limits, actual decision-maker/date and operational use unknown.
4. Give the next client/analyst/model-owner actions, including annual-release
   constraints, real issue dates and untouched later validation.
5. Independently verify facts, calculations, attribution, local links and bounded
   claims. No model fitting, gateway changes or application build is required.

Expected example: selecting both error measures still leaves both numerical
limits null. A 1.059462% relative MAE reduction is different from a 0.400091 WAPE
percentage-point reduction. Neither represents verified financial savings.
An absent limit must never yield an acceptance pass; elapsed 2026 targets cannot
be relabelled as prospective forecasts issued at the December 2025 cutoff.

The business impact is a concrete review aid and clear handoff. Architecture,
database schema, security controls, services and analytical runtime are unaffected.
Running Next.js/gateway processes were observed at intake and left alone.
Existing extensive working-tree changes are preserved. Neither cloud persistence
nor messaging the client is part of this preparation.

## Deliverables and evidence

- [Canonical client brief](../../docs/PREDICTIVE_CLIENT_DECISION_BRIEF.md).
- [Structured research decision](decision.json), with explicit unknown limits.
- [Source identities](source-identities.json), preserving existing evidence.
- [Independent review](qa/REPORT.md) and its reproducible checks.
- [Delivery verification](delivery.json), binding the final preparation files.

Preparation used the existing offline Python environment:

```powershell
.\.venv-predictive\Scripts\python.exe -X utf8 outputs/predictive_client_decision_20261010/prepare.py
```

The helper reads retained results and preserves original selection and null
client limits; it neither imports a forecaster nor evaluates a new model.
It refuses to overwrite its two prepared JSON records. Reproduction uses a
new sibling output directory with the same repository-relative source paths.
The final document/JSON/source checks are recorded in the independent review
and delivery receipt. A documentation pass does not fill the acceptance fields.

Applied current guidance: `.agents/worker-operating-model.md` and
`.agents/execution-contract.md` for scoped ownership and checked handoff;
`.agents/business-analyst.md` / `.skills/business-analysis-frameworks.md` for
decision scope, attribution and observable acceptance;
`.skills/analytics-frameworks.md` for same-cohort error interpretation and
research/operational distinctions; `.skills/documentation-standards.md` for
canonical recording. Root applies `.skills/coding-standards.md` and
`.skills/technology-stack.md` to the small offline preparation helper, and
`.skills/testing-standards.md` to proportional verification. No new dependency
or runtime path was introduced. QA records its own applied conditional guidance.

This packet prepares the recommendation for review. It does not approve an
operational model, supply new forecasts, change model selection, fill unknown
client limits, amend original O3 or establish measured inventory benefit.
Historical checks are inherited only while their bound data/code/artifact scope
remains current; the new review verifies the preparation deliverable separately.
