# GitHub Actions Workflows

## `ci.yml`

Runs on pull requests, pushes to `main`, and manual dispatch.

Checks:

- backend TypeScript build in `backend/`,
- frontend Next.js production build in `frontend/`,
- Python service unit tests,
- medical-demand split job,
- model computation smoke test,
- Docker image builds for backend, frontend, and Python services.

The analytics job uploads a small evidence artifact with the model computation summary, forecast evaluation, and medical-demand cleaning report.

## `sonarqube.yml`

Runs a SonarQube scan only when these repository secrets are configured:

- `SONAR_HOST_URL`
- `SONAR_TOKEN`

If either secret is missing, the workflow exits cleanly after reporting that the scan was skipped.

## Deployment

No production deployment is configured yet. Add a separate deployment workflow only after the target host, environment variables, rollback method, and secret ownership are approved.
