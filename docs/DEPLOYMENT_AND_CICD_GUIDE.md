# MedShield Deployment & CI/CD Security Guide

This document explains how to securely configure GitHub CI/CD pipelines, set up repository security, and deploy MedShield on any computer or cloud host.

---

## 1. Quick Start: Running MedShield on Any Computer

MedShield is fully containerized and includes fallback local datasets. Any computer with Docker installed can run the entire system with one command.

### System Requirements
- **Docker Desktop** (Windows/macOS) or **Docker Engine & Docker Compose** (Linux)
- **RAM:** Minimum 4 GB free RAM
- **Disk:** 3 GB available disk space

### Commands

```bash
# 1. Clone the repository
git clone https://github.com/IS-Capstone-Group9/medshield.git
cd medshield

# 2. Copy the sample environment file
cp .env.example .env

# 3. Start all services using Docker Compose
docker compose up --build
```

Access the system in your browser:
- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Express API Gateway:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Analytics Microservice:** [http://localhost:5101/health](http://localhost:5101/health)
- **Product Microservice:** [http://localhost:5102/health](http://localhost:5102/health)

---

## 2. GitHub Security Setup & Best Practices

### Required Repository Secrets
In GitHub, navigate to **Settings > Secrets and variables > Actions** and add the following repository secrets:

| Secret Name | Purpose | Example / Notes |
|---|---|---|
| `SONAR_TOKEN` | SonarQube / SonarCloud Code Analysis Token | Generated in SonarCloud dashboard |
| `SONAR_HOST_URL` | SonarQube Server URL | e.g. `https://sonarcloud.io` |
| `SUPABASE_URL` | Production Supabase Project URL | e.g. `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Anonymous Client API Key | Found in Supabase API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (Backend Only) | Keep strictly private; never expose to frontend |

### Automated Workflows Included

1. **`ci.yml` (Continuous Integration Pipeline):**
   - Triggers on every Push or Pull Request to `main`.
   - Builds & typechecks `/backend` and `/frontend`.
   - Runs Python unit tests and executes the 17-model computation suite (`scripts/compute_all_models.py`).
   - Validates `docker compose config` syntax and builds Docker images.

2. **`codeql.yml` (Automated SAST Security Scanning):**
   - Scans JavaScript/TypeScript and Python code for security vulnerabilities, SQL injection risks, and bad patterns.
   - Runs on PRs and weekly every Monday.

3. **`dependabot.yml` (Automated Vulnerability Management):**
   - Scans `npm` and `pip` dependencies weekly.
   - Automatically files Pull Requests for vulnerable dependencies.

4. **`sonarqube.yml` (Code Quality & Coverage):**
   - Conducts static code analysis if `SONAR_TOKEN` is configured.

---

## 3. Branch Protection & Security Policy

To enforce secure deployment on GitHub:

1. Go to **Settings > Branches** in your GitHub repository.
2. Click **Add branch protection rule** for `main`.
3. Enable the following settings:
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging**:
     - `Backend TypeScript Build & Typecheck`
     - `Frontend Next.js Build`
     - `Python Services & Model Master Execution Test`
     - `Docker Container & Compose Validation`
   - ✅ **Require linear history**
   - ✅ **Do not allow bypassing the above settings**

---

## 4. Cloud Deployment Options

### Option A: Vercel (Frontend) + Render / Railway (Backend & Services)

1. **Frontend (Next.js):** Connect GitHub repo to Vercel. Set build directory to `frontend`. Add environment variable `NEXT_PUBLIC_API_BASE_URL` pointing to your backend URL.
2. **Backend Gateway (Express):** Deploy `backend/Dockerfile` to Railway or Render.
3. **Python Services:** Deploy `services/Dockerfile` to Railway or Render.

### Option B: Single VPS (Docker Compose Deployment)
Provision an Ubuntu VPS (DigitalOcean, AWS EC2, Hetzner), install Docker, pull the repository, and run `docker compose up -d`.
