# Retained offline regression fixtures

This package makes the existing backend/Python regression suites reproducible
without a local evidence vault, warehouse connection or original workspace.
`manifest.json` lists all 73 required files, exact byte sizes and SHA-256 hashes;
`fixtures.tar.gz` stores those exact retained bytes (5.0 MB compressed).

From the repository root, run:

```powershell
python scripts/restore_test_fixtures.py
python scripts/restore_test_fixtures.py --check
```

CI runs the restore in the backend and Python jobs before tests. No credentials,
network calls, model fitting, approval or data publication are part of restoring.
The files are retained company/research evidence, not synthetic replacements or
newly observed records. Keep this package within the project's authorized access.
It is not an application source or dashboard fallback. Databricks Gold remains
the runtime analytical system of record; Python/model requests never read this
package through the application.

The archive covers company/regional source controls, financial/research artifacts,
frozen protocols and checksum sidecars, reviewed product-unit evidence and
retained model comparison inputs used by the suites. Some tests use synthetic
models/entered values on these retained sources; a passing test does not imply
new company model execution, operational eligibility or human acceptance.

The restore first verifies archive hash, membership, safe paths, individual hashes,
size controls and ALL existing destination files. It preserves identical files,
creates only missing files and refuses conflicting evidence. It never extracts
links, overwrites an existing file or rewrites a checksum to match changed data.
`--check` refuses missing fixtures and performs no restoration. A failed preflight
performs no fixture writes; ordinary filesystem interruption during creation can
be retried, preserving and rechecking already-created files.

Only add reviewed test inputs with a named test dependency. Update the manifest
and archive together from exact retained bytes; do not sweep entire output trees,
raw workbooks, credentials, account details or unrelated evidence into the package.
Byte-sensitive entries must retain their line endings and encoding. Archive
members use sorted POSIX paths, ordinary files, mode0644, zero timestamps/owner
metadata and gzip mtime0. To review a change, compare manifest membership/size/hash
and run the restore boundary tests plus clean-workspace suites. No remote upload,
publication or approval follows from updating this local fixture package.

The frozen rolling-protocol test separates code-drift rejection from its mocked
forecast scheduling/cache test. Its bounded identity mock is test-only; production
protocol/source/code rejection remains unchanged. Historical code registrations
are not reissued or labeled as current model execution.

See [testing guidance](../../../docs/TESTING.md) and
[packaging evidence](../../../outputs/ci_fixture_packaging_20261031/README.md).

The 5 November update adds nine exact inputs required by delivery-area coverage/STL
and frozen ABC comparator tests: the two `live-source.json` snapshots, retained `stl-analysis.json`, and the
comparator declaration, predictions, preprocessing, results and two refit models.
These retain their recorded scope and do not establish new model acceptance.

The 6 November update adds six exact inputs required by `databricks_updated_2` tests,
now run in CI: three pre-regeneration notebook layouts, two retained user-output
records and the adjusted 2025 archive CSV. That CSV is byte-identical to the
`outputs/2025_databricks_final` copy already in this package, so no new records
are added. See the [change record](../../../outputs/outdated_files_fix_20261106/README.md).
