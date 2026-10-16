# Deployment setup

The application uses an authenticated account for every resume. Resume records
created before account ownership was added have no owner and are intentionally
not visible through the authenticated API.

## Backend environment

Set these variables in the backend hosting provider:

- `MONGO_URI`: MongoDB connection string.
- `UPSTASH_REDIS_URL`: Redis TLS connection string.
- `GROQ_API_KEY`: Groq API key.
- `GROQ_MODEL`: optional; defaults to `openai/gpt-oss-120b`.
- `AUTH_SECRET`: output of `openssl rand -hex 32` (keep private; do not commit).
- `FRONTEND_URL`: the exact public frontend origin, e.g. `https://your-app.vercel.app`.
- `AI_ENGINE_URL`: the AI service's internal URL, e.g. `http://ai-engine:7860`.

The backend sets an HTTP-only, secure authentication cookie. The frontend's
Vercel rewrite proxies `/api/*` to the backend, keeping browser requests and
cookies same-origin. `FRONTEND_URL` must match the frontend's public origin
exactly for CORS and cross-site request protection.

## AI Engine environment

Set `GROQ_API_KEY` in the AI Engine hosting provider. `GROQ_MODEL` is optional.

## Frontend environment

Leave `VITE_API_URL` unset so the Vercel rewrite proxies API requests to the
backend. If the backend URL changes, update `frontend/vercel.json` and redeploy.

## Local development

Copy `backend/.env.example` to `backend/.env` and
`ai-engine/.env.example` to `ai-engine/.env`, then enter the service credentials.
For the Vite development server, set `FRONTEND_URL=http://localhost:5173`.
Generate a local `AUTH_SECRET` with `openssl rand -hex 32`.
When using Docker Compose instead of Vite, set `FRONTEND_URL=http://localhost:8080`.
Resume uploads are limited to 10 MB.
