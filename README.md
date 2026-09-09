# Rail-Sway — AI-Assisted Railway Block Planning

Different departments file maintenance requests, the railway provides the
timetable, Rail-Sway analyses both together: compatible work is grouped, train
conflicts are checked, impact is simulated, the best window is recommended, and
a human controller approves it. Every step lands in the audit trail.

Workflow: Dashboard → Maintenance Requests → Timetable Management →
Block Planner → Impact Analysis → Decision History.

## Architecture

- **backend/** — FastAPI + SQLAlchemy (Postgres, SQLite for local) + Redis +
  Celery. AI engine (`RailSwayAI`) does compatibility clustering,
  sliding-window search with cascade-delay simulation, ML impact scoring
  (RandomForest), and LLM-polished recommendations (Gemini/OpenAI optional,
  heuristic fallback).
- **frontend/** — Next.js 15 + Poppins + Tailwind (indigo/slate/amber) +
  Leaflet live corridor map + Recharts + custom SVG overlap timeline.
  Degrades to clearly-labelled demo data if the API is down.
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
docker compose up --build
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

Backend (Python 3.12–3.14; pins are minimum-versions so wheels are used):

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# no Postgres? set in .env: DATABASE_URL=sqlite:///./railsway.db
python -m uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev   # Windows shells with blocked .ps1: use npm.cmd run dev
```

## Demo script (fresh install, ~3 minutes)

1. **Dashboard** — corridor overview + 4 workflow status cards.
2. **Maintenance Requests** — 7 seeded requests (ENG/TRD/SNT/MECH, incl. an
   ENG↔SNT conflict). Click **Submit Maintenance Request**, file e.g.
   `MT-ENG-099` welding — it persists via `POST /api/v1/maintenance`.
3. **Timetable Management** — 16 seeded trains. Click **Sample CSV**
   (generated for the selected date), then **Upload CSV / XLSX** with that
   file: re-upload shows `duplicates skipped`; a malformed file shows
   per-row errors. Uploaded rows are badged `uploaded`, seeds `seed demo`.
4. **Block Planner** — two input cards (requests + timetable), select tasks,
   **Run AI Block Analysis** → stepper (compat → timetable check → simulation
   → ranking) → compatibility summary → overlap timeline (train dots vs
   candidate bands vs grouped work) → candidates → **AI-Optimized Block Plan**.
5. **Approve** on the plan card (or open **Impact Analysis** for the why:
   metrics, grouped requests, trains inside the window, sibling comparison,
   persisted backend explanation). Try **Reject** on another candidate.
6. **Decision History** — `pending` (analysis), `approved` and `rejected`
   rows with window, section, impact score and timestamps.

## API overview

| Method | Path | Description |
|---|---|---|
| POST | /api/v1/auth/register, /login, /me, /seed-admin | JWT auth |
| GET/POST/PATCH/DELETE | /api/v1/maintenance (+`/seed`) | Request register (now with `requested_date`) |
| POST | /api/v1/maintenance/import | CSV/XLSX request import (validated, duplicates skipped) |
| GET | /api/v1/maintenance/columns | Documents the request file format |
| GET/POST | /api/v1/trains (+`/seed`, `/live`) | Train register + live/IR fallback |
| GET | /api/v1/trains/columns | Documents the accepted file format |
| GET | /api/v1/trains/sample?day=&section= | Generates a same-date sample CSV |
| POST | /api/v1/trains/import | CSV/XLSX upload → `{imported, skipped_duplicates, rejected, errors[]}` |
| POST | /api/v1/ai/compatibility | Group requests into block clubs |
| POST | /api/v1/ai/windows | All evaluated windows, ranked (persisted with `affected_train_ids`) |
| POST | /api/v1/ai/recommend | Pick best window |
| POST | /api/v1/ai/full-plan | compat + windows + recommendation + log; persists explanation on best block |
| | | Also returns `baseline` + `savings` (see below) |
| GET/POST | /api/v1/blocks, /blocks/{id}/decision | Approve/reject (409 on duplicates, optional auth, writes audit log) |
| GET | /api/v1/decisions | Audit trail (incl. stored baseline/savings comparison) |
| GET | /api/v1/system/status | Non-secret status: feed/AI flags, dialect, table counts |

## Estimated operational saving (baseline vs AI)

**Baseline definition:** the same grouped maintenance work placed in the
earliest morning slot (08:00) without any optimization, simulated with the
identical impact logic as the candidates. Deterministic — same inputs always
give the same baseline.

- `estimated_minutes_saved` = baseline `estimated_delay` − AI `estimated_delay`
  (both genuine minutes from the cascade simulation).
- `estimated_impact_reduction_percent` = baseline-vs-AI `impact_score`
  reduction (the score is unitless — never presented as minutes; omitted when
  the baseline score is zero, so no division by zero).
- Before/after affected-train and priority-train counts included.
- `occupation`: separate (Σ grouped durations) vs coordinated (recommended span)
  corridor hours, with signed hours saved + percent.
- Each window also reports `immediate_delay` (in-block trains) and
  `downstream_delay` (cascade tail); they sum to `estimated_delay`.
- The comparison is stored on the analysis `DecisionLog` row and carried onto
  the approve/reject row, so history shows per-decision savings.

## Timetable file format

`train_number*`, `train_name*`, `scheduled_time*` (ISO, e.g.
`2026-09-12T08:15:00`), `train_type`, `priority` (1–5), `section`, `origin`,
`destination`, `status`, `delay_minutes`, `latitude`, `longitude`.
Direction is derived as origin → destination. Duplicates
(`train_number` + `scheduled_time`) are skipped and reported, never silently
dropped; invalid rows are rejected with row numbers and reasons.

## Environment variables

| Var | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres URL (docker) or `sqlite:///./railsway.db` (local) |
| `REDIS_URL` | docker/celery | Redis for Celery worker |
| `SECRET_KEY` | yes | JWT signing — generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `ALLOWED_ORIGINS` | deploy | JSON list, e.g. `["https://app.vercel.app"]` |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | no | LLM-polished recommendation text (heuristic fallback otherwise) |
| `IR_API_BASE_URL` / `IR_API_KEY` | no | Live timetable feed (mock corridor schedule otherwise) |
| `NEXT_PUBLIC_API_URL` | frontend | e.g. `http://localhost:8000/api/v1` |

## Production notes

- Never commit `.env` / `.env.local` / `*.db` (all gitignored).
- `Base.metadata.create_all` covers first boot; two post-v1 columns
  (`maintenance_requests.requested_date`, `trains.source`) are added to older
  databases automatically by `ensure_extra_columns()` on startup.
- Put the stack behind TLS + WAF; restrict CORS `ALLOWED_ORIGINS`.
