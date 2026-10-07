# Enterprise Architecture

## Capability alignment

| Business capability | Application responsibility | Data responsibility |
|---|---|---|
| Historical sales analysis | Next.js dashboard and TypeScript gateway | Databricks Gold sales facts and aggregates |
| Product and territory prioritization | Dashboard ranking and scenario controls | Gold facts plus controlled product/client mappings |
| Weather and disease context | Weather validation and external-evidence views | PAGASA/DOH candidate views and NASA POWER proxy history in Databricks |
| Forecast evaluation | Sales-only baseline comparison UI/API | Gold historical sales; approved model views when available |
| Planning scenarios | User-reviewed solver and assumption capture | Databricks historical shortlist plus user-entered scenario inputs |
| Identity and audit | Supabase Auth and gateway authorization | Supabase identity/account and audit records |

## Architecture principle

Databricks is the runtime analytical system of record. Supabase owns identity and audit concerns. The TypeScript gateway is the only application layer allowed to query Databricks. The frontend never receives warehouse credentials or reads local analytical files.

## Transition priorities

1. Complete Gold candidate acceptance and named owner approvals.
2. Promote stable analytical views without breaking the gateway contract.
3. Publish validated predictive outputs to Databricks.
4. Add operational inventory/procurement inputs only with governance and clear ownership.
5. Keep AWS or another hosting platform optional until deployment requirements justify it.

See [ARCHITECTURE.md](ARCHITECTURE.md) and [CURRENT_STATE.md](CURRENT_STATE.md).
