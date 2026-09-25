# MedShield Checklist Index

This file is retained for compatibility with older links. Last reviewed: 2026-09-25.

Use these maintained checklists:

- [MedShield DSS master checklist](docs/MEDSHIELD_DSS_MASTER_CHECKLIST.md) for the current project gates.
- [Model computation start checklist](MODEL_COMPUTATION_START_CHECKLIST.md) for descriptive, predictive, and prescriptive readiness.
- [Current state](docs/CURRENT_STATE.md) for the implemented architecture, data coverage, and open approvals.
- [Remaining work](docs/REMAINING_WORK_DETAILED_CHECKLIST.md) for the execution queue.

Current analytical rules:

- Databricks Gold is the dashboard source of truth.
- Sales actuals cover 2017-2025 in the current 37,728-row candidate snapshot.
- DOH covers 2018-2026 with 2026 partial.
- PAGASA covers 2017-2024; 2025 is absent.
- NASA POWER is a separately labeled provider-derived proxy.
- External regression remains blocked until mapping and validation gates pass.
- Inventory optimization remains a review-only scenario until governed operational inputs exist.
- Local files, Python outputs, Supabase analytical tables, and mock data are not dashboard fallbacks.
