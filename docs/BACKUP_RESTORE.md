# Backup and restore runbook

Reviewed17 October2026. Owners: release operator and database administrator;
source/model owner for Databricks recovery. This runbook separates a disposable
rehearsal from acceptance of a managed-platform recovery.

## Current evidence and boundary

See the [dated rehearsal packet](../outputs/backup_restore_20261017/README.md)
for actual execution, hashes, failures, engine version and remaining requirements.
The existing [live-rollout snapshot](../outputs/supabase_live_migration_20261017/README.md)
is metadata-only; it cannot restore account/business data. PostgreSQL logical
archives are database-scoped; global roles and platform services need separate
handling. Follow the official [pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html)
and [pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html) contracts.

The rehearsal uses synthetic data, a simplified Auth table and native PostgreSQL16.
The live server was previously verified as PostgreSQL17.6. Use compatible current
tooling for that target; this16 test is not a managed17 restore certification.
Do not use the fixture account/Auth data, grants or trust configuration in production.

## Recovery inventory

| Boundary | Material to preserve | Restore verification |
|---|---|---|
| Supabase application database | Account/Auth linkage and real Auth data, roles/ownership/ACLs/RLS, schema/functions/triggers/indexes, audit records and checkpoint, migration ledger, required extensions | Counts/content fingerprints, FK links, own-profile/role denials, actual login/reset, audit hashes and next append/replay, approved role access |
| Supabase platform | Auth/provider and application settings, managed-service prerequisites, secure key/configuration recovery and any stored file objects | Reconfigured destination tested with intended settings and approved credentials; no credentials embedded in evidence |
| Databricks | Original sales/source files, ingestion provenance, migration/notebook/jobs/configuration, exact governed table/dataset/policy and model/input/artifact identities | Independent source/Gold reconciliation, gateway source identity, candidate/publication gates, graph/export parity |
| Application | Source revision plus dirty changes needed for the release, lockfiles, build/deployment configuration and secure environment recovery | Clean supported install/build, allowed/denied sessions, no analytical fallback, unavailable/recovery behavior |
| Audit-only local fallback | Durable local audit file if used, with its chain/provenance | Independent hashes/links and discovery alongside remote records; never supplies analytical values |

Supabase database backups do not include Storage API file objects. The official
[backup guide](https://supabase.com/docs/guides/platform/backups) recommends regular
exports and off-site storage for free-tier projects. The previously observed plan
is dated evidence, not a fresh billing inspection. Choose retention and recovery
capability against agreed requirements; this work purchases no plan or add-on.

## Before a managed-platform restore

1. Name source and **separate disposable destination** project/host IDs. Verify
   destination identity before executing restore commands. Keep production intact
   for the rehearsal; have the current recovery material available before cutover.
2. Agree maximum acceptable data loss (RPO) and recovery duration (RTO), backup
   frequency/retention, owner and access/escalation. They are presently unapproved;
   a tiny local restore time is not an achievable production service commitment.
3. Use the approved database backup connection and version-compatible tools, or
   the managed backup workflow. API service keys alone are not a PostgreSQL dump
   connection. Keep secrets in protected environment/credential storage and out
   of shell history, source, logs, screenshots, evidence and Obsidian notes.
4. Inventory the complete source and selected backup's scope before export:
   application and managed schemas, migration history, custom Auth/storage changes,
   global roles and platform configuration. A schema-only export or data-only
   archive is insufficient for the whole inventory above.
5. Store real backups encrypted in approved restricted storage independent of the
   source host, with digest/manifest, exact timestamps, scope and retention. This
   repository's synthetic archives are test evidence, not the production location.
6. Prepare the destination's platform-managed prerequisites. Follow current
   [Supabase CLI restore guidance](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
   for roles/schema/data, ledger and managed-schema customizations. Review key
   recovery where encrypted material is involved. Do not blindly run the old
   migration chain over a restored database or recreate a missing audit checkpoint
   from zero; resolve source/backup consistency first.

## Isolated restore and exit checks

1. Check archive digest against its sealed manifest before use. Inspect its table
   of contents; the archive must contain the expected data as well as definitions.
   Verify extension/role prerequisites and version compatibility.
2. Restore to the verified empty destination with stop-on-error and transactional
   restore where supported. Capture exit status and diagnostics without secrets.
   Treat any failed required object/data restore as incomplete, not a warning to skip.
3. Compare source-at-backup counts and stable content fingerprints with the
   destination. Check owners, effective grants, RLS/default privileges, FK/index/
   routine/view/trigger definitions and sequence continuation. Equivalent default
   ACL encodings may differ textually; effective privileges and denial tests must agree.
4. Reconcile every audit-chain row and checkpoint. Append a clearly marked
   rehearsal event only in the destination, verify continuation/idempotence, and
   retain it as test evidence. A consistent chain is not tamper-proof history.
5. Exercise actual destination Auth/PostgREST and all required application roles,
   API/chart/export source identity and candidate limitations. A simplified native
   Auth fixture cannot establish these managed-service behaviors.
6. Verify Databricks restoration independently; a Supabase backup does not recover
   the analytical warehouse. Keep forecasts unavailable unless applicable source,
   artifact and publication contracts pass. Do not activate research candidates
   or execute procurement as a recovery shortcut.
7. Record elapsed stages and data-loss window against the agreed RPO/RTO. Obtain
   release-owner disposition before cutover, with rollback source retained. Leave
   live cutover/real downtime outside a synthetic rehearsal's completion claim.

## Repeating the native synthetic rehearsal

From repository root, using the existing isolated native binaries:

```powershell
python -X utf8 supabase/tests/test_backup_restore.py --bin outputs/database_remediation_20261016/environment-runtime/pgsql/bin --output outputs/backup_restore_20261017
```

It creates a uniquely named local cluster, applies repository migrations only
there, creates synthetic fixtures, exports a custom archive, drops only its new
source database, restores to a new target, verifies integrity/access/continuation,
then stops its own cluster. It never uses a remote connection or `.env` secret.
Each attempt has its own receipt. Windows server startup uses dedicated log files
to avoid inherited pipe handles. Cluster roles are already present in the fixture
cluster; global role/password restoration is explicitly outside this test.

See [Deployment](DEPLOYMENT.md), [Database](DATABASE.md), [Testing](TESTING.md)
and [Current State](CURRENT_STATE.md) for source boundaries and acceptance status.
