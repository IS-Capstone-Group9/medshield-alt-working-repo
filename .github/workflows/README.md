# GitHub Actions Workflows

Use the [team and CI guide](../../docs/DEPLOYMENT_AND_CICD_GUIDE.md) for feature branches, PRs into `main`, conflict recovery, and recommended branch protection. `main` is the current shared application baseline; create each new feature branch from its latest revision.

## `ci.yml`

Runs on PRs to any branch, all branch pushes, merge queues, and manual dispatch.

- Backend: install from the lockfile, build TypeScript, and run deterministic gateway tests.
- Frontend: install from the lockfile, lint, and build Next.js.
- Python: run service, Databricks transformation, and STL tests.
- Docker: validate Compose and build the frontend and gateway images used by the application.
- **`CI required`**: aggregate all required jobs; it fails if any dependency failed or was skipped.

Baseline CI uses no repository secrets, does not call live Supabase/Databricks services, and does not deploy or publish images. Live browser and warehouse acceptance remain separate; see [TESTING.md](../../docs/TESTING.md). The YAML is authoritative for exact commands and triggers.

Install Python CI dependencies from `.github/requirements-ci.txt`, including the
scikit-learn, XGBoost, PuLP, highspy and threadpoolctl adapters exercised by the
offline tests. NumPy, SciPy, scikit-learn and XGBoost match the exact frozen ABC
registration versions; changing those pins requires reviewing that contract.
Run discovery from the repository root; tests import through the
`services.analytics_service` package without a custom `PYTHONPATH`. Full
model-generation jobs and Prophet remain outside baseline CI.
The Python job also installs the backend Node dependencies: its bounded solver
parity test invokes the actual TypeScript gateway through `node --import tsx`.
Jobs have separate filesystems, so the backend job's install cannot supply it.

The frontend bundles Inter and League Spartan with `next/font/local`;
production and Docker builds do not fetch fonts from Google. Font sources,
checksums and license notices live in [`frontend/app/fonts`](../../frontend/app/fonts/README.md).

## `codeql.yml`

Supplementary JavaScript/TypeScript and Python security analysis on `main` pushes, PRs targeting `main`, and the configured weekly schedule. Public repositories run it automatically. Private repositories must enable GitHub Code Security support before setting the repository Actions variable `CODEQL_ENABLED` to `true`.

The job skips for the current private repository because code scanning is unavailable under its current configuration (GitHub returned HTTP 403: Advanced Security must be enabled). Keep the opt-in unset until support is enabled. Mandatory `CI required` checks run independently.

## `sonarqube.yml`

Optional SonarQube scan on `main` pushes, PRs targeting `main`, and manual dispatch. Configure both `SONAR_HOST_URL` and `SONAR_TOKEN` as repository secrets to enable the scan. With either missing, the workflow reports the skip and exits successfully. It is not a baseline required check.

## Deployment

Hosting is deferred. Add a separate deployment workflow after choosing the target host, environment configuration, secret ownership, and rollback procedure.
