# Quality Inspection Tracker

A mobile-first web app for shop-floor supervisors to log, track and resolve fabric quality defects, replacing paper registers.

**Stack:** React + TypeScript (Vite) · Node.js + Express + TypeScript · PostgreSQL 16 · Docker Compose

**Features:** log an inspection · sortable/filterable list (severity, status, date range) · resolve with a mandatory note · Open/Resolved summary by severity · bonus: mock SAP webhook.

```
quality-tracker/
├── docker-compose.yml        db + backend + frontend (nginx)
├── .env.example
├── backend/
│   ├── migrations/           plain .sql files, applied automatically on start
│   └── src/
│       ├── index.ts          boot: migrate, then listen
│       ├── app.ts            express wiring
│       ├── config.ts         env vars in one place
│       ├── db.ts / migrate.ts
│       ├── validation.ts     zod schemas (single source of truth for input rules)
│       ├── errors.ts         AppError + consistent error responses
│       └── routes/           inspections, summary, sapWebhook
└── frontend/
    └── src/
        ├── api.ts            typed fetch wrapper
        ├── types.ts
        └── components/       InspectionForm, InspectionList, FilterBar, ResolveSheet, SummaryView
```

---

## 1. Run locally with Docker (recommended, about 3 minutes)

Prerequisite: Docker Desktop (or Docker Engine + the compose plugin).

1. **Get the code**
   ```bash
   git clone <your-repo-url> quality-tracker && cd quality-tracker
   ```
2. **(Optional) set a database password.** Defaults work for local use.
   ```bash
   cp .env.example .env      # then edit POSTGRES_PASSWORD
   ```
3. **Build and start everything**
   ```bash
   docker compose up --build
   ```
   This starts Postgres, waits until it is healthy, starts the API (which creates the tables itself), then the web app.
4. **Open the app:** <http://localhost:8080>
5. **Check the API:** `curl http://localhost:4000/api/health` should return `{"data":{"status":"ok"}}`.
6. **Test on a real phone:** put the phone on the same Wi-Fi and open `http://<your-computer-LAN-IP>:8080`. Or use Chrome DevTools device mode at 390px width.

Stop with `Ctrl+C`; `docker compose down` removes containers but keeps data; `docker compose down -v` also deletes the database volume.

## 2. Run locally without Docker (for development)

Prerequisites: Node.js 20+, PostgreSQL 14+.

1. **Create a database.**
   ```bash
   createdb quality
   # or, with Docker only for the DB:
   docker run -d --name qt-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=quality -p 5432:5432 postgres:16-alpine
   ```
2. **Start the API** (terminal 1)
   ```bash
   cd backend
   npm install
   export DATABASE_URL=postgres://postgres:postgres@localhost:5432/quality   # Windows PowerShell: $env:DATABASE_URL="..."
   npm run dev          # http://localhost:4000, migrations run on boot
   ```
3. **Start the web app** (terminal 2)
   ```bash
   cd frontend
   npm install
   npm run dev          # http://localhost:5173, proxies /api to :4000
   ```
4. Open <http://localhost:5173>. Vite binds to all interfaces, so the same LAN-IP trick works for phone testing.

Useful scripts: `npm run typecheck` and `npm run build` in each folder.

---

## 3. Deploying

### Option A: any Linux VPS with Docker (simplest, one box)

Works on AWS Lightsail/EC2, DigitalOcean, Azure VM, Hetzner, or an on-prem server inside the plant network.

1. Install Docker and the compose plugin, then clone the repo.
2. `cp .env.example .env` and set a strong `POSTGRES_PASSWORD` (and `SAP_API_KEY` if you use the webhook).
3. In `docker-compose.yml`, delete the `4000:4000` port mapping from `backend`. nginx in the `frontend` container already proxies `/api`, so the API does not need to be public.
4. `docker compose up -d --build`
5. Add HTTPS in front of port 8080. The easiest way is Caddy, which gets certificates automatically. Point a DNS A record at the server, then use this Caddyfile:
   ```
   tracker.example.com {
       reverse_proxy localhost:8080
   }
   ```
6. Back up the database, for example nightly from cron:
   ```bash
   docker compose exec -T db pg_dump -U postgres quality | gzip > backup-$(date +%F).sql.gz
   ```
7. Update later with `git pull && docker compose up -d --build`. Migrations apply on start.

### Option B: managed platform (example: Render; Railway and Fly.io are similar)

Create three things, in this order:

1. **PostgreSQL** instance. Copy its *internal* connection URL. If you must use the external URL, append `?sslmode=require`.
2. **Web Service** for the API: connect the repo, runtime *Docker*, root directory `backend`. Environment variables:
   - `DATABASE_URL` = the URL from step 1
   - `CORS_ORIGIN` = the frontend URL from step 3 (for example `https://quality-web.onrender.com`)
   - `SAP_API_KEY` = a random string
   - Health check path: `/api/health`
3. **Static Site** for the frontend: root directory `frontend`, build command `npm ci && npm run build`, publish directory `dist`. Environment variable `VITE_API_URL` = the API's public URL (no trailing slash). Because Vite bakes this in at build time, redeploy the site after changing it.

Free tiers sleep when idle, so the first request can take 30 to 60 seconds. Use a paid instance for real shop-floor use.

### Production checklist (any option)
- HTTPS only, strong DB password, `SAP_API_KEY` set, `CORS_ORIGIN` set to the real frontend origin (not `*`).
- Daily database backups, tested at least once.
- **Add authentication before real use.** See "What I cut" below.

---

## API reference

Success responses are `{ "data": ..., "meta"?: ... }`. Errors are always `{ "error": { "code", "message", "details"? } }`.

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/inspections` | Body: `inspection_date` (YYYY-MM-DD), `machine_id`, `defect_type`, `severity`, `remarks?`. Returns **201**. |
| `GET` | `/api/inspections` | Query: `severity`, `status`, `from`, `to`, `sort` (`inspection_date` \| `created_at` \| `severity` \| `status`), `order` (`asc`\|`desc`), `limit` (max 200), `offset`. Returns `meta.total`. |
| `GET` | `/api/inspections/:id` | **404** if missing. |
| `POST` | `/api/inspections/:id/resolve` | Body: `resolution_note` (required, at least 3 chars). **409** if already resolved, **404** if missing. |
| `GET` | `/api/summary` | `{ by_severity: { Critical: {open, resolved}, Major: ..., Minor: ... }, totals: {open, resolved} }` |
| `POST` | `/api/sap-webhook` | See below. |
| `GET` | `/api/health` | Also checks the DB connection. |

Status codes used: 200, 201, 400 (`VALIDATION_ERROR`, `INVALID_ID`, `INVALID_JSON`), 401, 404, 409, 500.

### Mock SAP webhook

`POST /api/sap-webhook` with header `x-api-key: <SAP_API_KEY>` (only enforced when `SAP_API_KEY` is set):

```json
{
  "notification_id": "QN-100234",
  "work_center": "Loom-12",
  "defect_type": "Weave Defect",
  "severity": "Major",
  "inspection_date": "2026-10-21",
  "description": "Broken pick, 3 m from selvedge"
}
```

`notification_id`, `work_center` and `severity` are required. `defect_type` defaults to `Other`, `inspection_date` defaults to today. The call is **idempotent on `notification_id`**: the first call returns `201`, a retry returns `200` with `meta.duplicate: true` and the existing record, so SAP re-deliveries never create duplicates. Records created this way have `source: "sap"`.

```bash
curl -X POST localhost:4000/api/sap-webhook -H 'Content-Type: application/json' \
  -d '{"notification_id":"QN-1","work_center":"Loom-12","severity":"Critical"}'
```

---

## Architecture decisions

- **Plain SQL migrations run on boot instead of an ORM.** The schema is one table, so an ORM and its tooling would add more than they save. Migrations are numbered `.sql` files tracked in a `schema_migrations` table, so `docker compose up` produces a working database with no manual step.
- **Business rules live in the database as well as the API.** `CHECK` constraints enforce the allowed defect types, severities and statuses, and a constraint guarantees a Resolved row always has a note and timestamp. zod validates at the API edge for friendly 400s, but bad data cannot get in even through a future script or a second service.
- **Resolve is a single atomic `UPDATE ... WHERE status = 'Open'`.** Two supervisors resolving the same item cannot both succeed, and the loser gets a clear 409 instead of silently overwriting the first note.
- **Resolve is `POST /:id/resolve` rather than a generic `PATCH`.** It is a state transition with its own rule (note required, one-way), and a dedicated endpoint keeps that rule in one place and out of general update logic.
- **zod schemas are the single source of truth for validation**, and sort columns go through a whitelist map, so user input never reaches SQL text. Filters and values are always parameterised.
- **One tiny error contract.** All failures flow through `AppError` and one handler, so the frontend only has to read `error.message`.
- **No router, state library or UI kit on the frontend.** Three tabs and four components do not justify one. That keeps the bundle small and load fast on plant Wi-Fi.
- **Mobile choices:** bottom tab bar within thumb reach, 48px tap targets, 16px inputs (stops iOS zoom on focus), severity as big colour buttons instead of a dropdown, resolve as a bottom sheet, and the Log form keeps date and machine after saving because supervisors often log several defects on one line. The list defaults to Open items.
- **`inspection_date` is a Postgres `DATE`, returned as a string.** This avoids the classic timezone shift where an Indian date turns into the previous day after a trip through UTC. The form uses the device's local date for the same reason.
- **nginx serves the built frontend and proxies `/api`**, so the browser sees one origin: no CORS config and no hard-coded API URLs for the Docker setup. `VITE_API_URL` covers split hosting.

## What I cut, and why

- **Offline sync (bonus).** Not done. Shop floors often have poor connectivity, so this is the most valuable next feature, but doing it correctly (queueing in IndexedDB, retries, de-duplication) is bigger than a half-working version is worth. Right now a failed save shows an error and keeps the form filled in.
- **Authentication (bonus).** Not done, so the app is open to anyone who can reach it. Run it behind the plant network/VPN until this is added. The first step would be per-supervisor login so each inspection records who logged and who resolved it.
- **Automated tests.** None written yet. I did not get to run a full install/build/smoke test in the environment I wrote this in (package downloads were blocked), so **run `npm run build` in both folders and `docker compose up --build` once and tell me about any error you see.**
- **Pagination UI.** The API supports `limit`/`offset`, but the UI loads the first 100 matches. Fine for a plant's open items, not for years of history.
- **Edit/delete of an inspection, photo attachments, and a machine master list** (the machine ID is free text, as specified, so typos like `Loom-12` vs `loom 12` will fragment reports).

## What I would do differently with more time

1. Offline-first logging with a service worker plus an IndexedDB outbox, using a client-generated UUID so retries are idempotent.
2. Authentication and roles (supervisor / quality manager), with `logged_by` and `resolved_by` on every record.
3. Tests: API integration tests against a throwaway Postgres (resolve race, filters, SAP idempotency) and a few component tests.
4. Photo capture of the defect (phones make this natural) stored in object storage.
5. A machine/line master table with autocomplete, shift and plant fields, and a trend view (defects per machine per week) on top of the summary.
6. Structured logging, request IDs and a CI pipeline (typecheck, tests, image build).
