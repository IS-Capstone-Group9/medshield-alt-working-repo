# Deployment

Deployment steps, environments, quality gates, and rollback plans.

## Current Deployment Position

The current capstone workspace is prepared for local Docker-based demonstration and future cloud deployment. The system remains a historical decision-support application, so deployment should prioritize repeatable dashboard access, stable API/service behavior, and clear evidence generation.

## Local Container Deployment

Use `docker-compose.yml` to run the frontend, TypeScript API gateway, analytics service, and product service together:

```powershell
docker compose build
docker compose up
```

Main URLs:

| Service | URL |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend health | `http://localhost:5000/api/health` |
| Analytics health | `http://localhost:5101/health` |
| Product health | `http://localhost:5102/health` |

See `docs/DEVOPS_DOCKER_SONARQUBE.md` for the full runbook.

## SonarQube / Static Analysis

Use `docker-compose.sonar.yml` and `sonar-project.properties` for local SonarQube checks.

```powershell
docker compose -f docker-compose.sonar.yml up -d sonarqube-db sonarqube
$env:SONAR_HOST_URL = "http://localhost:9000"
$env:SONAR_TOKEN = "paste-token-here"
docker compose -f docker-compose.sonar.yml --profile scan run --rm sonar-scanner
```

Secrets to configure outside source control:

| Secret | Purpose |
|---|---|
| `SONAR_TOKEN` | Authentication token for SonarQube or SonarCloud |
| `SONAR_HOST_URL` | SonarQube server URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase ingestion and publication key |

## Future AWS Deployment

If AWS is required, confirm the professor's exact target service before implementation. See the comprehensive [AWS Integration Plan](file:///c:/Users/Ethan/medshield-alt-working-repo/docs/AWS_INTEGRATION_PLAN.md) for architecture maps, IAM policies, and VPC topologies. 

Reasonable AWS options are:

| AWS option | Fit |
|---|---|
| AWS App Runner | Simple container deployment for the backend and services |
| Amazon ECS on Fargate | More complete container orchestration for all services |
| Amazon Lightsail or EC2 | Simpler VM-style demo hosting |
| Amazon RDS or Supabase hosted PostgreSQL | Managed database layer |
| Amazon S3 | Storage for exported evidence files or uploaded source data |

The Docker files added to this workspace are the preparation step for AWS because they make each runtime boundary explicit.

## Rollback

For local demos, rollback means returning to the last known working Git commit and restarting containers:

```powershell
git log --oneline -5
docker compose down
docker compose build
docker compose up
```

For cloud deployment, keep the previous container image tag until the new deployment is verified.
