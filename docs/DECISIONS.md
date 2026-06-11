# Architectural Decisions

## 001. Use a TypeScript API Gateway

Context:
- The dashboard needs a stable HTTP layer for auth, orchestration, and fallback behavior.
- The analytics workloads are already modeled as Python services.

Decision:
- Keep the backend gateway in TypeScript under `backend/`.
- Keep analytics and product services in Python under `services/`.

Consequences:
- The frontend talks to one API layer with consistent JSON contracts.
- Analytics logic stays isolated in Python where it belongs.
- The stack is easier to explain in the capstone because each layer has a single responsibility.
