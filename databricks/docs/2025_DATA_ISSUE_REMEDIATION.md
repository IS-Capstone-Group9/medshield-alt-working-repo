# 2025 Data Issue Remediation Plan

## Current Finding

The current processed sales dataset has incomplete accepted coverage for 2025. A profile of `data/medshield/processed/sales_transactions.json.gz` found accepted dated rows only in these months:

| Month | Row count |
|---|---:|
| 2025-02 | 24 |
| 2025-05 | 1 |
| 2025-06 | 68 |
| 2025-08 | 4 |
| 2025-09 | 94 |
| 2025-11 | 184 |
| 2025-12 | 707 |

The accepted dated data is missing January, March, April, July, and October 2025. The processed status file also reports 1,041 accepted 2025 rows after cleaning.

## Rejection Context

The processed file contains 20,418 rows total with these quality statuses:

| Status | Row count |
|---|---:|
| Valid | 16,621 |
| Warning | 65 |
| Rejected | 3,732 |

Top rejection and warning causes:

| Issue | Count |
|---|---:|
| Invalid or missing delivery date | 2,982 |
| Missing product | 669 |
| Invalid or missing delivery date; missing product | 66 |
| Exact duplicate transaction | 35 |
| Margin percentage outside expected range | 30 |
| Invalid or missing delivery date; margin percentage outside expected range | 7 |

## Business Impact

2025 should not be treated as a complete holdout year until the missing months are resolved. If the team trains on 2021-2024 and tests on 2025 now, evaluation metrics will be biased by missing or rejected 2025 transactions.

## Remediation Workflow

1. Re-open the raw 2025 source file and confirm whether the missing months are absent or rejected during parsing.
2. Export rejected 2025 rows with raw date, product, area, DR number, and rejection reason.
3. Recover dates where the raw workbook has a parseable date in another format.
4. If date recovery is impossible, classify each row as missing source data rather than zero demand.
5. Reconcile accepted + rejected 2025 financial totals against the raw 2025 source.
6. Decide whether to rebuild the processed history from the repaired 2025 file.
7. Re-run monthly completeness checks after repair.

Run this utility whenever the processed sales file changes:

```bash
node tools/profile_data_readiness.mjs
```

It writes `outputs/data_readiness_profile/2025_month_coverage.csv` and `outputs/data_readiness_profile/sales_data_readiness_summary.json`.

## Holdout Policy

Until remediation is complete:

- Use 2021-2024 for primary training and rolling validation.
- Treat available 2025 records as partial secondary validation only.
- Do not compare 2025 monthly forecasts against months with missing or unrecovered source data.
- Do not impute missing 2025 months as zero demand.

After remediation:

- Use January 2021 through December 2024 for training.
- Use complete January 2025 through December 2025 data for holdout testing only if all months pass completeness checks.
- Store completeness status with model evaluation records.

## Acceptance Criteria

2025 is ready for holdout evaluation when:

1. All 12 calendar months have an explicit completeness status.
2. Raw totals reconcile to processed totals or differences are explained.
3. Rejected row counts are broken down by month and reason.
4. Missing dates are recovered or classified as unrecoverable.
5. The group approves whether 2025 is complete enough for publication.
