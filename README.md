# Rail-Sway — AI-Assisted Railway Block Planning

Plans concurrent maintenance blocks on the Bhadrak–Jajpur–Keonjhar Road corridor
with minimum train disruption.

## Architecture

- **backend/** — FastAPI + SQLAlchemy (Postgres) + Redis + Celery. AI engine
  (`RailSwayAI`) does compatibility clustering, sliding-window search with
  cascade-delay simulation, ML impact scoring (RandomForest), and LLM-polished
  recommendations (Gemini/OpenAI optional, heuristic fallback).
- **frontend/** — Next.js 15 + Tailwind + Leaflet live corridor map + Recharts
  impact comparison. Works offline with mock fallback if the API is down.
- **docker-compose.yml** — Postgres, Redis, backend, celery worker, frontend.

-              USER
               │
               ▼
       Select maintenance
          requirements
               │
               ▼
        FastAPI backend
               │
               ▼
     Compatibility engine
               │
               ▼
     Group compatible work
               │
               ▼
       Search time windows
               │
               ▼
     Simulate train impacts
               │
               ▼
       ML impact scoring
               │
               ▼
        Rank candidates
               │
               ▼
       LLM explanation
               │
               ▼
       ┌───────────────┐
       │ Recommendation│
       └───────┬───────┘
               │
          Human decision
           ↙         ↘
       APPROVE      REJECT
           │
           ▼
       Audit trail




## Quick start

```bash
docker-compose up --build
# frontend → http://localhost:3000
# api docs → http://localhost:8000/docs
# health   → http://localhost:8000/health
```

Seed demo users (first run):

```bash
curl -X POST http://localhost:8000/api/v1/auth/seed-admin
# admin/admin123, controller/controller123
```

### Local dev (without docker)

Backend:
```bash
cd backend
python -m venv .venv && .venv/Scripts/activate  # or source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit DATABASE_URL if needed
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## API overview

| Method | Path | Description |
|---|---|---|
| POST | /api/v1/auth/register, /login, /me | JWT auth |
| GET/POST | /api/v1/maintenance | CRUD + `/seed` |
| GET | /api/v1/trains, /trains/live | DB list + live/IR fallback |
| POST | /api/v1/ai/compatibility | Group requests into block clubs |
| POST | /api/v1/ai/windows | Top-3 windows (persisted as candidates) |
| POST | /api/v1/ai/recommend | Pick best window |
| POST | /api/v1/ai/full-plan | compat + windows + recommendation + log |
| GET/POST | /api/v1/blocks, /blocks/{id}/decision | Approve/reject |
| GET | /api/v1/decisions | Audit trail |

## Testing the AI

1. Open **Block Planner**, select e.g. MT-ENG-041 + MT-TRD-007.
2. Click **Find Common Block Window** → 3 candidates + AI recommendation.
3. Click **View impact analysis →** to compare, then **Approve Block**.
4. Check **Decision History** for the audit entry.

## Production notes

- Set `SECRET_KEY`, `DATABASE_URL`, `REDIS_URL` via environment/secrets manager.
- Set `GEMINI_API_KEY` or `OPENAI_API_KEY` for LLM-polished reasons (optional).
- Set `IR_API_BASE_URL` + `IR_API_KEY` to replace mock train data with live feeds.
- Run migrations (Alembic) once `alembic.ini` is initialised; `Base.metadata.create_all` covers first boot.
- Put the stack behind TLS + WAF; restrict CORS `ALLOWED_ORIGINS`.
