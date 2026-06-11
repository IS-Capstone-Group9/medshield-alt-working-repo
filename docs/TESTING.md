# Testing

## Backend Checks

- Build the TypeScript gateway with `cd backend && npm run build`
- Start the gateway with `cd backend && npm run dev`
- Verify `GET /api/health`
- Verify auth with `POST /api/auth/signup` and `POST /api/auth/login`

## Analytics Checks

- Start the Python analytics services
- Verify the dashboard endpoints still return warehouse-backed or reference-export data
