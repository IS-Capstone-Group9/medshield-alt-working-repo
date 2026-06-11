# API Gateway

The canonical API gateway is implemented in TypeScript under `backend/`.

## Responsibilities

- Proxy dashboard data requests to the Python analytics services.
- Handle auth requests and fallback behavior.
- Return consistent JSON responses to the frontend.

## Auth Contract

- `POST /api/auth/login`
- `POST /api/auth/signup`

## Dashboard Contract

- `GET /api/summary`
- `GET /api/monthly`
- `GET /api/by_area`
- `GET /api/products`
- `GET /api/year_summary`
- `GET /api/seasonality`
