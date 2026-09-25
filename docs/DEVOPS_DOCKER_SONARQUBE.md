# Docker and SonarQube Runbook

## Application containers

The checked-in `docker-compose.yml` contains:

| Service | Port | Health/use |
|---|---:|---|
| `frontend` | 3000 | Next.js dashboard |
| `backend` | 5000 | `GET /api/health` |

```powershell
docker compose config
docker compose build
docker compose up
```

The dashboard still requires valid backend-only Databricks settings and an available SQL warehouse. `USE_SUPABASE=false` changes local authentication only; it never enables local analytical data.

Stop the stack with:

```powershell
docker compose down
```

## Environment boundary

Pass the browser only `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and the Supabase publishable key. Keep Databricks and Supabase server secrets in the backend environment.

## SonarQube

```powershell
docker compose -f docker-compose.sonar.yml up -d sonarqube-db sonarqube
$env:SONAR_HOST_URL = "http://localhost:9000"
$env:SONAR_TOKEN = "paste-token-here"
docker compose -f docker-compose.sonar.yml --profile scan run --rm sonar-scanner
```

Open `http://localhost:9000`. Change the initial administrator password before shared use.

Stop SonarQube without deleting its data:

```powershell
docker compose -f docker-compose.sonar.yml down
```

Use `down -v` only when intentionally resetting the SonarQube database.

## Validation before shared work

```powershell
python -m unittest discover -s services\tests -p "test_*.py" -v

cd backend
npm run build

cd ..\frontend
npx tsc --noEmit
npm run build

cd ..
docker compose config
docker compose -f docker-compose.sonar.yml config
```

Stop `next dev` before building the same frontend checkout.

## Hosting note

The current two-container boundary can be adapted to AWS, another container host, or a VM. Hosting selection is a later operational decision and does not change Databricks as the analytical source of truth.
