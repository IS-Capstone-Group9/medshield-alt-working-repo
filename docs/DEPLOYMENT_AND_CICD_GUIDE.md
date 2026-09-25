# Deployment and CI/CD Guide

Last reviewed: 2026-09-25

## Local start

```powershell
Copy-Item .env.example .env
docker compose up --build
```

The compose file starts the Next.js frontend and TypeScript gateway. It does not start Python microservices, Databricks, or Supabase.

## Required secrets

| Secret | Scope |
|---|---|
| `DATABRICKS_HOST` | Backend only |
| `DATABRICKS_TOKEN` | Backend only |
| `DATABRICKS_SQL_WAREHOUSE_ID` | Backend only |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Gateway authentication |
| `SUPABASE_SECRET_KEY` or legacy service-role key | Backend account/audit operations only |
| `NEXT_PUBLIC_SUPABASE_URL` / publishable key | Browser-safe authentication values |
| `SONAR_HOST_URL` / `SONAR_TOKEN` | CI quality scan |

Never put a Databricks token, warehouse ID, or Supabase server secret in a `NEXT_PUBLIC_*` variable.

## Repository workflows

- `.github/workflows/ci.yml`: backend build, frontend build, Python checks/model smoke work, and Docker validation on `main`/pull requests.
- `.github/workflows/quality_gate.yml`: TypeScript, Python, and diagnostic checks on configured branches.
- `.github/workflows/codeql.yml`: JavaScript/TypeScript and Python CodeQL analysis.
- `.github/workflows/sonarqube.yml`: conditional SonarQube scan when secrets exist.
- `.github/workflows/sonarqube-and-deploy.yml`: contains a placeholder artifact/deploy job. It is not a production deployment and must be replaced or disabled before relying on it.

Treat the workflow files themselves as authoritative for triggers and commands.

## Branch protection

Require pull-request review and the checks actually enabled in the repository. Do not document a status-check name as required until it exists and has completed on the protected branch.

## Production readiness

No production deployment is currently configured. Before adding one, decide the host, environment ownership, domain/HTTPS, secret store, allowed origins, Databricks warehouse policy, Supabase redirect URLs, monitoring, rollback, and cost owner.

AWS is one optional host. It is not required to finish Databricks data acceptance, descriptive analysis, predictive evaluation, or prescriptive scenarios.
