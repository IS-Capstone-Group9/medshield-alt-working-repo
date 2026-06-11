# Technology Stack Standards

## Description
This file defines the canonical stack for the MedShield capstone. Use it to keep implementation choices aligned across frontend, backend, database, deployment, and observability work. The stack should support the paper’s business narrative: a dashboard for pharmaceutical sales analysis, territory performance, product prioritization, and inventory decision support. When there is a choice between a new tool and the documented stack, default to the documented stack unless the change solves a real problem that the current stack cannot address.

## Canonical Stack

### Frontend
- Next.js
- React
- TypeScript
- CSS variables and responsive layout

### Backend
- TypeScript API gateway in `backend/`
- Python Flask microservices for domain-specific analytics logic

### Database
- Supabase PostgreSQL
- Warehouse tables, views, and seed data

### Authentication
- Supabase Auth where the product flow requires auth

### Storage
- Supabase Storage for uploaded assets or files

### Validation
- Zod or equivalent typed validation at the boundary

### Forms
- React Hook Form where form state is needed

### State Management
- Keep state local first; introduce a shared store only when justified

### Charts
- Recharts or another charting library already used in the codebase

### Deployment
- Vercel for the frontend when applicable
- Environment-specific deployment scripts for backend services

### Monitoring
- Sentry or the repository's documented monitoring tool

### Analytics
- PostHog or the repository's documented analytics tool

### Service Split
- Keep the HTTP gateway in TypeScript
- Keep analytics and reporting services in Python
- Keep the boundary explicit so the frontend talks to one API layer and the analytical workloads stay isolated

### CI/CD
- GitHub Actions

## Workflow
1. Check the project docs before introducing a new library or pattern.
2. Prefer the stack already documented in `docs/SETUP.md` and `docs/IMPLEMENTATION.md`.
3. Reuse existing packages and services before adding new dependencies.
4. Confirm that any new stack choice supports both the demo workflow and the capstone documentation.
5. Update the docs when the stack or delivery model changes.

## Rules
- Do not introduce a new foundational framework without a documented reason.
- Keep frontend, backend, and data responsibilities separated.
- Prefer the simplest stack that satisfies the project requirement.
- Do not let a convenience choice in one layer leak into other layers.
- Treat the docs as canonical when they conflict with a default assumption.
- Default to the stack already proven in this repository unless the change genuinely requires something else.
