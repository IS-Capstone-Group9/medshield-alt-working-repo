# Forward test: December 2026 issue runbook

Protocol: `outputs/company_php_forward_20261031/protocol.json` (registered; do not edit or re-register). Scope: original
itemized net sales in PHP, contracts excluded. Model owner and operator: Adrian.

## Missed issue (recorded, not backdated)

**November 2026 window (1–3 Nov, history through October): missed.** No controlled, operator-verified October 2026
extraction existed. Readiness check on 11 Nov 2026 15:31 Manila: `issue_window_open: false`,
`required_history_end: 2026-10`, `controlled_snapshot_checked: false`, `issue_created: false`. The 12-issue gate is not
relaxed; the November cohort stays missing.

## December window: 1–3 December 2026 (Manila time)

Needs sales history through **November 2026**. Forecast targets: calendar leads 1/3/6, i.e. January, March and June 2027.

### Before 1 December (operator)

1. Get the client's November 2026 sales export (and October, if not yet loaded).
2. Load it through the Databricks intake (CSV → Bronze → Silver → Gold, `docs/CONTROLLED_SALES_INTAKE.md`). Never use
   `POST /api/sales/upload`.
3. Check the new dataset reconciles: earlier months (Jan 2020 to Sep 2026) must be unchanged, or the tool rejects it.

### On 1, 2 or 3 December (operator)

4. Build the controlled snapshot JSON from Gold (fields listed in `company_php_forward_20261031/README.md`: schema_version 1,
   scope, evidence_kind `controlled_source`, contracts_excluded true, verification_status `OPERATOR_VERIFIED`,
   timezone-aware `extracted_at` and `verified_at` in December, source_identity, monthly).
5. Run, in PowerShell from the repository root:

```
$env:PYTHONPATH='services'
python -X utf8 -m analytics_service.company_php_forward readiness --design outputs/company_php_forward_20261031/protocol.json
python -X utf8 -m analytics_service.company_php_forward issue --design outputs/company_php_forward_20261031/protocol.json --snapshot <snapshot.json> --out outputs/forward_test_december_2026/issue
python -X utf8 -m analytics_service.company_php_forward validate --design outputs/company_php_forward_20261031/protocol.json --issues <issue-file.json>
```

6. Commit the issue file unchanged. It is never overwritten.

### Later

Score each target month after it closes and is loaded (January 2027 first, scorable from early February). If December is
missed too, record it here the same way.

## If the November data cannot arrive in time

Record the December issue as missed. The forward test then starts with the first month that has a verified snapshot.
State this in the paper: no prospective accuracy has been measured yet.
