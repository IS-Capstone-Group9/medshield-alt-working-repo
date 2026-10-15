# Step 2: reproducible descriptive candidate

Verified 3 October 2026, Asia/Manila (receipt timestamps use UTC, 2 October).
Accountable role: Orchestrator, with sequential backend, operations and QA passes.

**Ready for candidate review. Production publication remains pending.**
The local backend now pins fact Delta **17** instead of 16. No Databricks tables,
data, notebooks, approvals or production configurations were changed in this task.
Existing working-tree changes were preserved. Both local development servers are
running: frontend `http://localhost:3000`, backend `http://localhost:5000`.

## Bound identity and evidence

- Dataset: `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`.
- Policy: `sales_restart_gold_v7_independent_catalog`.
- Product master: `1361f7629d4dab4f1f6414db32a19e9eea9ab20acb99319d168aecc9fef48088`.
- Release receipt: [sealed manifest](2026-10-02T20-01-48-528Z/manifest.json),
  [checksum](2026-10-02T20-01-48-528Z/manifest.sha256).
- Recovery preparation: [candidate package](2026-10-02T20-01-48-528Z/candidate-package.zip),
  [checksum](2026-10-02T20-01-48-528Z/candidate-package.sha256).

The manifest binds 28 dependent table versions, current publication/STL histories,
monthly and yearly bridge SQL, mapping/helper hashes, nine source-file identities,
Git revision plus dirty working-tree file hashes, and the receipts below. Dependent
table versions are rechecked against the publication receipt during capture. The
package preserves the exact source, application, notebook, reference and evidence
bytes locally; ZIP entries are independently checked against their recorded hashes.
It excludes credentials and dependency installations. These are audit/preparation
artifacts; the application continues reading Databricks exclusively.

| Acceptance check | Actual result | Evidence |
|---|---|---|
| Publication source/provenance/mapping/aggregate/stability checks | 72 PASS, 0 FAIL, 0 UNVERIFIED after final backend fix | [Publication receipt](../publication_readiness/2026-10-02T19-59-33-282Z/evidence.json) |
| Financial calculations, missing periods and STL reconstruction | PASS; revenue ₱626,946,741.81, margin 60.262177%, 72 STL months | [Descriptive receipt](../descriptive_validation/2026-10-02T19-51-21-688Z/evidence.json) |
| Catalog migration and financial/eligibility conservation | PASS; 37,728 records, 4,561 unresolved groups | [Catalog receipt](../catalog_validation/2026-10-02T19-51-54-445Z/evidence.json) |
| Authenticated API/UI/exports and filter boundaries | 3 passed, 0 skipped; six endpoints identify 17/v7 | [Browser report](browser-results-api-fixed.json) |
| Backend TypeScript | PASS, `node node_modules/typescript/bin/tsc --noEmit` | Executed from backend after metadata fix |
| Complete prior version-16 production rollback | NOT VERIFIED | Manifest rollback entry |
| Exact workspace notebook bytes and operator run IDs | NOT VERIFIED | Manifest deployed-notebook entry |

The six checked routes are `/api/dashboard_status`, `/api/sales/status`,
`/api/sales/sectors`, `/api/sales/heatmap`, `/api/seasonality/stl`, and `/api/products`.
The browser also checks the STL panel/export, product CSV version and reconciled
revenue/returns, nine yearly margin points, original-source quantities, rejection
of malformed filters and a genuinely empty future year. The API identity attachment
is embedded in the browser report without authentication tokens.

## Changes and repeatable checks

`backend/.env` selects 17 locally. `getDatabricksSalesStatus()` now includes the
same release metadata as its underlying pinned reads. The live browser test takes
an explicit expected version/policy rather than assuming 16/v6. Its outdated
heatmap caption expectation was updated after checking original-source filtering;
the failing earlier runs remain recorded, and calculations were not relaxed.
`docs/CURRENT_STATE.md`, `docs/API.md` and `docs/TESTING.md` describe this checkpoint.

From `backend/`, run the existing publication, descriptive and catalog validators.
From `frontend/`, with both servers available:

```powershell
$env:MEDSHIELD_E2E_FACT_VERSION = '17'
$env:MEDSHIELD_E2E_POLICY_VERSION = 'sales_restart_gold_v7_independent_catalog'
npx playwright test e2e/descriptive-live.spec.ts --workers=1
```

Do not rerun 01–06 to fix an application pin. Any new warehouse revision needs
fresh validation and a new receipt. Tests here do not validate upload, forecasting,
inventory optimization, external-source features or the full paper objectives.

## Release and rollback boundary

The CEO remains the sole business approver. Existing confirmed financial and
conditional allocation decisions are preserved. No dataset-release decision was
recorded. Ten missing historical months remain unknown; estimates remain estimates;
unresolved labels are not medical SKU/unit verification.

Restoring only `DATABRICKS_DESCRIPTIVE_FACT_VERSION=16` would mismatch current STL.
Before production deployment, the operator must confirm the complete predecessor
table versions, bridge definitions, deployed notebook/job revisions and application
artifact, including matching STL. Do not VACUUM retained Delta versions. The saved
current-candidate package provides recovery inputs but is not proof that historical
version 16 can be safely restored. Step 2's candidate checkpoint is verified;
its complete predecessor rollback criterion remains open for the operator.
