# MedShield Project Setup

## 1. Project Overview

MedShield Business Analytics is a capstone system for analyzing pharmaceutical sales, territory performance, product prioritization, and inventory decision support.

## 2. Project Goal

Build a modern business analytics dashboard with a Next.js frontend, Python microservices, and Supabase-backed data persistence.

## 3. Selected Tech Stack

| Layer | Stack | Purpose |
|---|---|---|
| Frontend | Next.js + TypeScript | Dashboard UI and page routing |
| UI Styling | CSS variables + responsive layout | Clean and maintainable interface |
| API Layer | Python Flask microservices | Business logic and analytics endpoints |
| Data Layer | Supabase PostgreSQL | Managed database and row-level security |
| Data Access | Supabase REST API + Python requests | Fetch analytics snapshots and services |
| Fallback Mode | Local JSON snapshot | Keeps demo usable when services are offline |

## 4. Workspace Structure

| Folder | Role |
|---|---|
| `frontend/` | Next.js application |
| `backend/` | API gateway |
| `services/analytics_service/` | Analytics microservice |
| `services/product_service/` | Product microservice |
| `supabase/` | SQL migrations and seed data |
| `docs/` | Capstone and setup documentation |
| `references/` | Source papers and cloned reference project |

## 5. Environment Variables

| Variable | Example | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:5000` | Next.js client-side API base URL |
| `SUPABASE_PROJECT_ID` | `tiffnqydvkskgvyzmzdw` | Project identifier for the capstone workspace |
| `SUPABASE_URL` | `https://tiffnqydvkskgvyzmzdw.supabase.co` | Supabase project URL |
| `SUPABASE_ANON_KEY` | provided JWT | Public Supabase key |
| `ANALYTICS_SERVICE_URL` | `http://localhost:5101` | Analytics microservice URL |
| `PRODUCT_SERVICE_URL` | `http://localhost:5102` | Product microservice URL |
| `USE_SUPABASE` | `true` | Enables Supabase before local fallback |

## 6. Installation

| Area | Command |
|---|---|
| Backend gateway | `cd backend` then `pip install -r requirements.txt` |
| Analytics service | `cd services/analytics_service` then `pip install -r requirements.txt` |
| Product service | `cd services/product_service` then `pip install -r requirements.txt` |
| Frontend | `cd frontend` then `npm install` |

## 7. Run Commands

| Service | Command |
|---|---|
| API gateway | `cd backend` then `python app.py` |
| Analytics service | `python -m services.analytics_service.app` |
| Product service | `python -m services.product_service.app` |
| Frontend | `cd frontend` then `npm run dev` |

## 8. Database Setup

| File | Purpose |
|---|---|
| `supabase/migrations/001_init.sql` | Creates analytics tables and public read policies |
| `supabase/seed.sql` | Inserts the current analytics snapshot |

| Step | Action |
|---|---|
| 1 | Run `supabase/migrations/001_init.sql` in Supabase SQL editor |
| 2 | Run `supabase/seed.sql` |
| 3 | Verify the gateway and frontend can read the snapshot |

## 9. Setup Flow

| Step | Description |
|---|---|
| 1 | Copy `.env.example` to `.env` and fill in the Supabase values |
| 2 | Install backend, microservice, and frontend dependencies |
| 3 | Apply the Supabase migration and seed |
| 4 | Start the gateway and both microservices |
| 5 | Start the Next.js frontend |

## 10. Notes

| Topic | Guidance |
|---|---|
| Reference project | `external/medshield_frontend` is a guide only |
| Setup docs | This file is the single canonical setup document |
| Tech direction | Use Next.js + TypeScript for the frontend and Python for the service layer |
