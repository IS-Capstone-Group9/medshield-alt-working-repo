# Deployment

## Current position

MedShield supports local Node.js and Docker demonstrations. No production host is approved or configured. AWS is optional and should not delay data acceptance or analytics completion.

## Local Docker deployment

`docker-compose.yml` starts two application containers:

| Service | Port | Purpose |
|---|---:|---|
| `frontend` | 3000 | Next.js dashboard |
| `backend` | 5000 | TypeScript gateway |

Python analytics and product services are not part of the runtime compose stack.

```powershell
docker compose build
docker compose up
```

Open `http://localhost:3000`; check the gateway at `http://localhost:5000/api/health`. Valid Supabase/Databricks configuration and a running SQL warehouse are still required for production-style authenticated analytics.

## Release gates

Before deployment:

1. Gold data acceptance and named approvals are complete.
2. Backend/frontend builds and required tests pass.
3. The live Databricks contract and fail-closed behavior pass.
4. Secrets and owners are configured in the target environment.
5. HTTPS, allowed origins, monitoring, backup, rollback, and cost ownership are defined.
6. Candidate/model/scenario limitations remain visible.

## Cloud options

Choose a host only after requirements are clear. A managed frontend plus container backend, a container platform, or a VM can all run the current two-service application. Databricks and Supabase remain managed external dependencies.

## Rollback

Retain the prior application image/commit and do not mutate Bronze evidence during an application rollback. If a data release fails, point stable views back to the last accepted publication or leave the dashboard unavailable until the candidate is corrected.

See [SETUP.md](SETUP.md), [SERVICE_MANAGEMENT.md](SERVICE_MANAGEMENT.md), and [DEPLOYMENT_AND_CICD_GUIDE.md](DEPLOYMENT_AND_CICD_GUIDE.md).
