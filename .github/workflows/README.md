# GitHub Actions Workflows

Use the [team and CI guide](../../docs/DEPLOYMENT_AND_CICD_GUIDE.md) for feature branches, PRs into `main`, conflict recovery, and recommended branch protection. The initial application baseline must reach legacy `main` before the normal team flow applies.

## `ci.yml`

Runs on PRs to any branch, all branch pushes, merge queues, and manual dispatch.

- Backend: install from the lockfile, build TypeScript, and run deterministic gateway tests.
- Frontend: install from the lockfile, lint, and build Next.js.
- Python: run service, Databricks transformation, and STL tests.
- Docker: validate Compose and build the frontend and gateway images used by the application.
- **`CI required`**: aggregate all required jobs; it fails if any dependency failed or was skipped.

Baseline CI uses no repository secrets, does not call live Supabase/Databricks services, and does not deploy or publish images. Live browser and warehouse acceptance remain separate; see [TESTING.md](../../docs/TESTING.md). The YAML is authoritative for exact commands and triggers.

## `codeql.yml`

Supplementary JavaScript/TypeScript and Python security analysis on `main` pushes, PRs targeting `main`, and the configured weekly schedule. Availability depends on repository visibility and GitHub security entitlements.

## `sonarqube.yml`

Optional SonarQube scan on `main` pushes, PRs targeting `main`, and manual dispatch. Configure both `SONAR_HOST_URL` and `SONAR_TOKEN` as repository secrets to enable the scan. With either missing, the workflow reports the skip and exits successfully. It is not a baseline required check.

## Deployment

Hosting is deferred. Add a separate deployment workflow after choosing the target host, environment configuration, secret ownership, and rollback procedure.
