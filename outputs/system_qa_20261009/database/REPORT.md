# Database and persistence QA — 9 October 2026

The completed review found one reproducible migration bootstrap defect and one conditional legacy-view access defect. Current connected Supabase anonymous reads of named private tables were denied. Durable remote audit deployment and catalog recovery/publication remain open acceptance gates; they are not counted as new implementation defects.

Accountable supporting role: Database Engineer, with QA Engineer duties. Allowed writes were confined to this evidence directory. No product, migration, cloud table, activation pointer, notebook, job, or application configuration was changed. The existing dirty working tree was preserved.

Checked HEAD: `cc03b4c05398880b18987eca5ca9c1e140bf9dcb`; actual hashes of 54 checked files, runtime versions, and timestamp are retained in [code-identity.json](code-identity.json). HEAD alone is not the dirty-tree identity. Scope covers Supabase migrations 001–016, linked accounts/RLS, audit persistence, and Databricks source preservation, publication, grains/keys, retained snapshots, and recovery contracts. Root QA owns numerical/model reconciliation; backend QA owns authentication/service behavior.

Reproduce the SQL fixture from the repository root with `npm ci --prefix outputs/system_qa_20261009/database --no-audit --no-fund`, then `node outputs/system_qa_20261009/database/probe_supabase.mjs`. The pinned package/lockfile are retained. The database is in memory and uses synthetic records only. Live probes use the existing ignored server environment without logging its values.

## Verification and evidence

| Acceptance criterion | Result | Execution and evidence |
|---|---|---|
| Ordered clean Supabase migrations establish the documented store | **FAIL** | `node outputs/system_qa_20261009/database/probe_supabase.mjs`; 001–010 execute, 011 fails on missing namespaced legacy function. [SQL probe](supabase-probe.json), [log](supabase-probe.log). |
| Linked users read only their own profile and cannot change roles | **PASS, isolated fixture** | Authenticated user sees one of two synthetic linked profiles; role update and anonymous account read return SQLSTATE 42501. |
| Protected yearly candidate cache and audit objects reject browser roles | **PASS, isolated fixture** | Anonymous candidate cache read and anonymous/authenticated audit reads denied. |
| Audit RPC executes unchanged SQL, binds UTF-8 bytes, and is idempotent | **PASS, isolated fixture** | Migration 016 executes; `₱` SHA-256 matches independently computed Node digest. Duplicate event/payload yields sequence 1 and one stored record; changed payload using same UUID raises 22023. |
| Audit writes/read permissions are least privilege | **PASS, isolated fixture** | Service role invokes append; anon/authenticated invoke denied; service-role direct insert denied. |
| Legacy analytical views remain private after ordered migration | **FAIL under declared older/custom public default grants** | Anonymous `public.vw_sales_transactions` returns the one synthetic row and sales 123.45; anonymous forecast view query also succeeds. This grants configuration is explicitly created by the fixture; no current cloud exposure was demonstrated. |
| Connected Supabase anonymous endpoints deny analytical/account access | **PASS for sampled private targets** | `node outputs/system_qa_20261009/database/probe_live_supabase.mjs`; sales transactions/year summary/cache, forecast, accounts all return HTTP 401. Four old public view endpoints return 404. [Fresh receipt](supabase-live-head.json). |
| Connected remote audit contract is present | **NOT VERIFIED / deployment gate open** | Service-role HEAD + empty result error probe: both audit tables return 404/PGRST205; PostgREST cannot find them in its schema cache. Accounts linkage columns are present. No audit write was attempted. |
| Captured Databricks predecessor dependencies remain readable | **PASS, sampled retained-version read** | `node --import ./backend/node_modules/tsx/dist/loader.mjs outputs/system_qa_20261009/database/probe_delta_metadata.ts`; all 29 captured versions readable; older fact 16,17,18 readable. [Receipt](delta-retention-readability.json), [log](delta-retention-readability.log). |
| Recovery is durable and the whole publication group is restorable | **NOT VERIFIED** | 28/29 dependencies have no explicit retention overrides; fact has 30-day deleted-file/log retention. Reads do not rehearse RESTORE, reconstruct every file, or prove retention survival. |
| Category-only publication cannot change source, financial, quantity, or demand evidence | **Static contract review; unit coverage owned by root** | Gold and descriptor preserve all 137 immutable predecessor fields, seven mutable fields only; source equality, unique keys, receipt/hash binding and before-write dependency guards are present. Local accepted categories versus old serving categories are an acknowledged unpublished change. |

The isolated PostgreSQL probe has **15 consequential permission/behavior checks: 13 meet expectations, 2 legacy-view checks fail under the stated grants fixture**, plus two ACL/policy inventories and four independent value assertions. Native Docker/PostgreSQL was unavailable; Docker client exists but daemon connection failed. PGlite 0.5.8 embeds PostgreSQL and supports pgcrypto; it does not validate distributed locking, a native Supabase migration, or PostgREST behavior. [PGlite extension documentation](https://pglite.dev/extensions/).

To continue past the exact 011 failure, the fixture explicitly creates missing namespaced legacy function stubs and logs that accommodation. The completed downstream execution must not be represented as an unchanged full migration-chain pass. A platform `public.rls_auto_enable` helper and Supabase auth functions/default privileges are also declared fixtures.

## Reproducible findings

### DB-01 — P2: clean ordered migration fails before identity retirement

Location: `supabase/migrations/011_supabase_auth_account_bridge.sql:95–99`; setup expectation in `docs/SETUP.md:81`.

Trigger: create a compatible fresh PostgreSQL/Supabase schema and apply repository migrations in numeric order. Migrations 003 and 007 create only `public.verify_login` / `public.create_account`; none creates the namespaced equivalents.

Expected: 011 can retire any optional legacy surface and establish the linked-account contract after 010.

Observed: `REVOKE ... ON FUNCTION medshield_identity.verify_login(text,text)` raises SQLSTATE **42883**, “function ... does not exist”. This stops ordered bootstrap before 012–016. The first failed attempt is retained. Adding fixture-only stubs allows the unchanged later migrations to execute, confirming the missing-object dependency.

Remediation: Database Engineer should guard optional function revocations with `to_regprocedure(...)`/catalog existence checks, including the optional event helper; retain revocations when those objects exist. Add fresh-chain and optional-preexisting-legacy-object cases using disposable Supabase-compatible PostgreSQL. Do not add dummy production functions to hide the failure.

Next owner: Database Engineer, supported by DevOps/QA for a native disposable-instance migration run.

### DB-02 — P2 conditional deployment defect: old public views inherit readable owner privileges

Location: `supabase/migrations/007_namespaced_schema_alignment.sql:460–485` recreates `public.vw_sales_transactions` without `security_invoker=true` and does not revoke its browser grants; public analytical views from 001/004 also remain. Migration 010 allows `anon` in the sales SELECT policy at lines 22–23 and preserves other public read policies. Migration 015 narrows only its new approved views.

Trigger: apply this migration chain to an older/custom Supabase project retaining automatic anon/authenticated grants on new public relations. Those exact grants are explicit in the fixture. Table moves keep prior grants; a public view running as its owning `postgres` role bypasses private-table RLS and schema-usage restrictions.

Expected: Supabase analytical context stays backend-only in accordance with the current store/security boundaries.

Observed: after all migrations (with the DB-01 fixture accommodation), anonymous SELECT through `public.vw_sales_transactions` reads the synthetic transaction and sales amount. Current connected deployment returns 404 for sampled old public views and 401 for sampled private tables, so **this is not a demonstrated current data breach**. Newer Supabase project defaults no longer auto-grant tables; that configuration also limits the trigger. [Supabase 2026 default-grant change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically), [Supabase view/RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security), [PostgreSQL view permissions](https://www.postgresql.org/docs/current/sql-createview.html).

Remediation: add a reviewed migration explicitly revoking anon/authenticated SELECT on obsolete public analytical views and underlying historical analytical tables, or drop obsolete views after consumer review. Remove anonymous policies from protected sales/model tables. Where a retained API view is necessary, use security-invoker semantics and explicit service-role grants. Test deny behavior both with old automatic grants and newer restrictive defaults rather than relying on platform defaults.

Next owner: Database Engineer with Security Engineer review; DevOps verifies live exposed schemas and effective grants before production provisioning/upgrades.

## Known gates and limitations

- **Catalog acceptance is prepared locally, not active in the serving warehouse.** The local master contains 4,561 accepted reporting category dispositions and hash `2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29`; serving fact 19 uses predecessor hash `1361f7629d4dab4f1f6414db32a19e9eea9ab20acb99319d168aecc9fef48088`. Root's fresh review confirms serving rows remain unclassified/review-pending. This explains the publication-readiness master-hash failure and does not authorize activation. Descriptor/runbook explicitly mark recovery rehearsal false.
- **Audit remote deployment is missing from the exposed schema cache.** Local audit fallback is the documented current continuity path. SQL fixture success does not prove cloud migration, distributed process serialization, or native PostgREST RPC readback. Read-only probes cannot distinguish a missing table from a stale/hidden cache without SQL administration access.
- **Retention is bounded.** Fresh sampled reads prove historical snapshots currently resolve. The 29 dependency histories, source archives, code/reference bytes, bridge definitions, publication audit and STL still require durable recovery artifacts and an isolated whole-group rehearsal before catalog writes. No ALTER, RESTORE, VACUUM, job execution or publication was attempted.
- **Publication group is not atomic.** Gold writes each Delta table separately and detects changed dependencies before writing; its runbook correctly requires stopped concurrent jobs and recovery after partial failure. Manual maintenance is part of the documented contract. Model publisher also explicitly requires serialized jobs and verifies immutable staged payload/readback before its single pointer update.
- **New ingestion is a separate delivery gap.** Bronze/Silver keep complete raw line evidence, source-version hashes and dispositions; the historical restart includes fixed reviewed replacement guards. The documented turnover/client-upload engine is not delivered by this category-only package.
- **External joins remain candidates.** DOH/PAGASA provider identities, null observations, reviewed station keys and unapproved join/forecast flags are retained. Numerical reconcilations and model quality belong to the root analytics report, not this metadata review.

## Applied skills and handoff

Read and applied: `.skills/database-standards.md` for store separation, migration safety, grains/keys/source preservation and retention; `.skills/testing-standards.md` for isolated allow/deny checks and honest fixture/live separation; `.skills/security-standards.md` for least privilege and credential-safe metadata probes; `.skills/analytics-frameworks.md` for preserving candidate/observed evidence and keeping numerical ownership explicit; `.skills/architecture-patterns.md` for gateway/warehouse/identity boundaries; `.skills/coding-standards.md` and `.skills/technology-stack.md` for scoped readable verification scripts and avoiding product dependencies/configuration changes. Canonical database/security/setup/architecture/decisions/catalog and predictive operations guidance informed the expected outcomes.

Plan executed: inspect instructions/dirty tree and contracts → review migrations/publication paths → isolate SQL bootstrap and role behaviors → perform read-only live metadata/count probes → record defects separately from known gates. Review mode: supporting specialist self-review; root performs integration review. QA evidence delivery is complete; the database is **not certified production-ready** while DB-01, conditional ACL hardening and deployment/recovery gates remain open.

Cleanup limitation: the temporary `outputs/system_qa_20261009/database/node_modules` runtime is 25,437,664 bytes. Its resolved absolute directory was checked and is not a symlink. Automatic command approval review rejected both scoped native PowerShell recursive deletion and a literal-path retry, with reason “blocked by policy”. It remains in the evidence directory; no alternative deletion bypass was attempted. Package/lockfile and all logs/fixtures remain preserved.
