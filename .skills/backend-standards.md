# Backend Standards

## Description
Defines backend expectations for the MedShield TypeScript API gateway and supporting services. Use these rules for request handling, validation, logging, service boundaries, and performance-sensitive changes. The backend should stay predictable: receive input, validate it, process it in the correct layer, and return a response that is consistent enough for the frontend and service consumers to rely on. In the capstone, the backend is also part of the evidence chain that the dashboard is built on a sound technical foundation.

## Workflow
1. Confirm the API contract and data source before changing backend code.
2. Implement the smallest service-level change that satisfies the requirement.
3. Add validation, error handling, and logging at the boundary.
4. Verify the request path against security and performance requirements.
5. Update tests and docs for any contract or behavior change.
6. Confirm the response supports both the dashboard and the analytical narrative.

## Rules
- Keep route handlers thin and move business logic into services where possible.
- Return consistent JSON structures and meaningful HTTP status codes.
- Validate all external input.
- Log enough detail to diagnose issues without exposing sensitive data.
- Use timeouts and defensive handling for downstream dependencies.
- Keep service interfaces stable unless the change is documented and intentional.
- Prefer explicit control flow over clever abstractions that make debugging harder.
- Keep backend behavior aligned with the warehouse schema and dashboard metrics.

## Project Conventions
- Align with the TypeScript API gateway described in `docs/SETUP.md`.
- Prefer explicit, readable control flow over clever abstractions.
- Keep dependency boundaries clear between gateway, services, and data access.
