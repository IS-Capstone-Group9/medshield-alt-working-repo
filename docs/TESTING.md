# Testing

## Backend Checks

- Build the TypeScript gateway with `cd backend && npm run build`
- Start the gateway with `cd backend && npm run dev`
- Verify `GET /api/health`
- Verify auth with Supabase Auth from the frontend login route when Supabase public variables are configured.
- Verify local fallback auth with `POST /api/auth/login` when `USE_SUPABASE=false`.
- Verify protected gateway routes reject missing or invalid bearer tokens with `401`.

## Analytics Checks

- Start the Python analytics services
- Verify the dashboard endpoints still return warehouse-backed or reference-export data
