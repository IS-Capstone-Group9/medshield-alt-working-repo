# Docker and SonarQube Runbook

## Purpose

This runbook explains how to run the MedShield system with Docker and how to scan the workspace with local SonarQube. It supports the capstone requirement that the system can be built, checked, and demonstrated in a repeatable way.

## Required Tools

| Tool | Purpose |
|---|---|
| Docker Desktop | Runs the local containers for frontend, backend, Python services, PostgreSQL, and SonarQube. |
| Git | Pulls the shared `feature/flow` branch and records changes. |
| Node.js | Optional for local non-Docker frontend/backend development. |
| Python | Optional for local non-Docker analytics service and data pipeline work. |

## Application Containers

The main application stack is defined in `docker-compose.yml`.

| Service | Port | Purpose |
|---|---|---|
| `frontend` | `3000` | Next.js dashboard UI |
| `backend` | `5000` | TypeScript API gateway |
| `analytics-service` | `5101` | Python analytics microservice |
| `product-service` | `5102` | Python product microservice |

Start the application stack:

```powershell
docker compose build
docker compose up
```

Open these URLs after the services are healthy:

| URL | Expected result |
|---|---|
| `http://localhost:3000` | Dashboard UI |
| `http://localhost:5000/api/health` | Backend health response |
| `http://localhost:5101/health` | Analytics service health response |
| `http://localhost:5102/health` | Product service health response |

Stop the application stack:

```powershell
docker compose down
```

## Environment Variables

Copy `.env.example` to `.env` for local values. Do not commit `.env`.

| Variable | Docker default | Notes |
|---|---|---|
| `USE_SUPABASE` | `false` | Uses local fallback data unless real Supabase keys are provided. |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:5000` | Frontend API base URL. |
| `SESSION_SECRET` | local Docker fallback | Replace for shared or deployed environments. |
| `SUPABASE_URL` | empty | Required only when using Supabase. |
| `SUPABASE_ANON_KEY` | empty | Required only when using Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | empty | Server-only secret. Never expose in frontend variables. |

## Local SonarQube

SonarQube is defined in `docker-compose.sonar.yml`.

Start SonarQube:

```powershell
docker compose -f docker-compose.sonar.yml up -d sonarqube-db sonarqube
```

Open `http://localhost:9000`.

Default first login:

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin` |

Change the password when SonarQube asks. Then create a token in SonarQube and set it in the current terminal:

```powershell
$env:SONAR_HOST_URL = "http://localhost:9000"
$env:SONAR_TOKEN = "paste-token-here"
```

Run the scanner:

```powershell
docker compose -f docker-compose.sonar.yml --profile scan run --rm sonar-scanner
```

Stop SonarQube:

```powershell
docker compose -f docker-compose.sonar.yml down
```

Remove SonarQube volumes only when you intentionally want to reset the local SonarQube database:

```powershell
docker compose -f docker-compose.sonar.yml down -v
```

## Quality Gate Scope

`sonar-project.properties` scans implementation code in:

| Path | Purpose |
|---|---|
| `backend/src` | API gateway |
| `frontend/app`, `frontend/components`, `frontend/lib`, `frontend/src` | Dashboard UI |
| `services` | Python services and shared pipeline logic |
| `tools` | Data preparation scripts |

It excludes raw data, generated outputs, documents, dependencies, and build folders so the quality gate focuses on maintainable source code.

## Validation Checklist

Run these checks before pushing shared capstone work:

```powershell
python -m unittest discover -s services\tests -p "test_*.py" -v
cd backend
npm run build
cd ..\frontend
npm run build
cd ..
docker compose config
docker compose -f docker-compose.sonar.yml config
```

If Docker Desktop is not running, the Docker commands may fail. In that case, start Docker Desktop and rerun the checks.

## AWS Note

Your professor mentioned AWS. Treat AWS as a later deployment target unless the professor gives exact services. The current Docker setup is still useful because it packages the frontend, backend, and Python services in a way that can later be adapted to AWS services such as ECS, Lightsail, EC2, or App Runner.
