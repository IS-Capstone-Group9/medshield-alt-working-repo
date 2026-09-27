# Data Stores

Predictive continuation: the complete 15-configuration experiment is persisted
in candidate run/point/evaluation tables under an artifact-hash experiment ID.
Readback reconciled all 1,092 prediction/backtest rows and 15 evaluations. This
experiment namespace is distinct from a reviewed selected-model release. No
release pointer was changed. See the final run's `candidate-warehouse-receipt.json`
under `outputs/predictive_validation/2026-09-27T14-30-12-921Z/model-run/`.

Predictive warehouse preparation: `07_predictive_contracts.sql` defines the frozen
monthly mart, immutable run/point/evaluation candidates, append-only model reviews,
release manifest, single active pointer and stable dashboard views. The associated
`08_predictive_frozen_input.py` loader checks input hash and stored content.
The nine additive DDL statements and 108 frozen candidate input rows were deployed
and reconciled by the TypeScript deployment script; the alternate Python notebook
remains unverified in Databricks. The model release pointer is empty. Publication
requires exact artifact-bound data/model review and verified readback before the
pointer changes. See [PREDICTIVE_OPERATIONS.md](PREDICTIVE_OPERATIONS.md).

## Responsibility split

| Store | Current responsibility | Excluded responsibility |
|---|---|---|
| Databricks Unity Catalog | Bronze source evidence, Silver assessed data, Gold candidate analytics, bridge views, NASA POWER history | Authentication and browser sessions |
| Supabase PostgreSQL/Auth | User identity, application-account linkage, roles, password lifecycle, and audit persistence | Runtime dashboard measures |
| Repository files | Raw/preparation inputs, mapping templates, offline QA, generated evidence | Live dashboard fallback |

## Databricks schemas

| Schema | Purpose |
|---|---|
| `workspace.medshield_bronze` | Immutable source manifests and raw rows |
| `workspace.medshield_silver` | Parsed, typed, assessed, and accepted candidate rows |
| `workspace.medshield_audit` | Dispositions, mapping reviews, replacement validation, quality and publication evidence |
| `workspace.medshield_gold` | Candidate fact, aggregate, external-context, weather, and application bridge views |

Current sales and external objects retain `_candidate` until the applicable business, mapping, and model gates are approved. Use [CURRENT_STATE.md](CURRENT_STATE.md) for the current population and pipeline versions.

## Supabase schemas and migrations

The files under `supabase/migrations/` document the identity, audit, and earlier analytical schema evolution. Apply them only in order and only to a compatible Supabase project. `supabase/schema.md` is a contextual schema dump, not an executable migration.

Some migrations and seed files contain earlier Supabase analytical models. Those tables remain useful for historical context and offline work, but the live dashboard no longer reads them for KPIs or charts. The administrator yearly synchronization route may maintain a protected candidate cache; that cache does not replace the live Databricks contract.

## Data integrity rules

- Bronze source data is append-only evidence; corrections create new versions.
- Silver records explicit acceptance, warning, and rejection reasons.
- Gold metrics use eligibility flags and preserve dataset/policy identifiers.
- Estimated contract allocations must reconcile to their parent totals and remain labeled.
- Missing months or unavailable measures remain missing unless a documented calendar rule explicitly represents zero activity.
- Provider identity is preserved for PAGASA, NASA POWER, and DOH.

See [../databricks/sales_restart/README.md](../databricks/sales_restart/README.md) and [../databricks/external_restart/GUIDE.md](../databricks/external_restart/GUIDE.md).
