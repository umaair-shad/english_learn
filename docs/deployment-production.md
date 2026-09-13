# Production & Deployment Guide

This document covers how to run the Vocabulary Platform application in a
production-like environment: the API (NestJS + Prisma + PostgreSQL), the web
app (Next.js), schema handling, testing, and backup/restore.

> The full Wiktionary/Wiktextract vocabulary pipeline (24 GB of records) is NOT
> required to run the application. If you have a `pg_dump` of the production
> vocabulary database, restore it (see [Backup & restore](#backup--restore)) and
> skip the pipeline entirely. The app reads/writes the same PostgreSQL schema
> that the pipeline loads.

## Architecture

```
Browser ──► Next.js (port 3001, /api/* rewritten to backend)
                │                                   ▲
                ▼                                   │
        API (NestJS, port 3000, /api/v1/*) ── REST+WebSocket + JWT cookie auth
                │
                ▼
        PostgreSQL 16 (vocabulary DB, Prisma schema)
```

- Web app: `apps/web` (Next.js 16, Turbopack). All `/api/*` paths are rewritten
  to the API backend so the browser only talks to one origin (this keeps the
  httpOnly `vocab_auth` cookie working).
- API: `apps/api` (NestJS). Base path `api/v1`. Global `JwtAuthGuard` protects
  every route unless it is marked `@Public()`. Global throttling is enabled.
  Swagger UI is served at `/api/docs`.
- WebSocket gateway (live monitoring) is also mounted behind the API.

## Prerequisites

- Node.js 20+
- PostgreSQL 16 (locally via `docker compose up -d`, or any host)
- (Optional) Python 3.10+ only if you intend to run the data pipeline
  (`scripts/vocabulary`) rather than restoring a dump

## Environment variables

### API — `apps/api/.env`

| Variable          | Required | Default   | Notes                                                        |
| ----------------- | -------- | --------- | ------------------------------------------------------------ |
| `DATABASE_URL`    | yes      | –         | e.g. `postgresql://vocab:vocab@localhost:5432/vocabulary`    |
| `JWT_SECRET`      | yes      | –         | min 16 characters; must be stable across restarts            |
| `PORT`            | no       | `3000`    | 1–65535                                                      |
| `ACCESS_TOKEN_TTL`| no       | `15m`     | JWT lifetime (e.g. `1d`)                                     |
| `COOKIE_SECURE`   | no       | `false`   | Set `true` behind HTTPS so the auth cookie is Secure         |

The config is validated at boot (`src/config/app-config.schema.ts`); a missing
`DATABASE_URL` or a too-short `JWT_SECRET` aborts startup with a clear error.

### Web — `apps/web/.env.local`

| Variable           | Required | Default               | Notes                                        |
| ------------------ | -------- | --------------------- | -------------------------------------------- |
| `API_BACKEND_URL`  | no       | `http://localhost:3000`| Base URL of the API used by Next rewrites    |

If the API is on another host, set `API_BACKEND_URL` accordingly before build.

## Database schema

The Prisma schema (`apps/api/prisma/schema.prisma`) is the application
authority; the pipeline DDL in `database/migrations` mirrors it. There are no
Prisma migration files in the repo — schema drift is applied as follows:

**On an existing (loaded) database** (recommended for production):
- Do NOT create tables with Prisma over an existing loaded vocabulary DB unless
  you intend to drop data. The Prisma client normally works against the schema
  as-is.
- For net-new tables (e.g. imports/provenance) use the idempotent SQL in
  `database/migrations` that the API/load pipeline expects.

**On a fresh database** with the schema only:
```powershell
cd apps/api
npx prisma generate
npx prisma db push          # creates tables matching schema.prisma
npm run seed:teacher        # creates the default teacher (see seed script)
```

## Build & run

### API

```powershell
cd apps/api
npm ci
npx prisma generate
npm run build                    # outputs dist/
npm run lint                     # eslint (0 errors expected)
npm start:prod                   # node dist/main  -> :3000
```

Health check: `GET /api/v1/health` (no auth). Verify with
`Invoke-RestMethod http://localhost:3000/api/v1/health`.

### Web

```powershell
cd apps/web
npm ci
npm run lint                     # eslint (0 errors expected)
npx tsc --noEmit                 # typecheck
npm run build                    # next build
npm start                        # next start -p 3001
```

The web app proxy points `/api/*` at `API_BACKEND_URL` (default
`http://localhost:3000`).

## Tests

API end-to-end tests spin up the real app against a test database.

```powershell
cd apps/api
npm test -- --runInBand          # full e2e suite (expects DATABASE_URL in .env)
```

The suite creates its own users/students/widgets and cleans them up; the full
gate is green (118/118 tests, 9 suites after the reports/exports/imports
milestone). Security cases covered: 401 on unauthenticated calls, teacher
ownership scoping on exports and reports, no secrets/credentials in exported
files, student token isolation.

## AWS production (EC2 + Caddy HTTPS)

One Ubuntu EC2 box can run the whole stack. Open ports **22, 80, 443**. Point the
domain A-record at the instance public IP.

1. Copy `deploy/prod.env.example` → `deploy/prod.env` and set `DOMAIN`,
   `JWT_SECRET`, DB password, and teacher seed.
2. On the instance:
   ```bash
   bash deploy/aws-ec2.sh
   ```
   That builds `docker-compose.prod.yml`: Caddy → web `:3001` + api `:3000`.
   Use `--profile local-db` (already in the script) for Postgres on the same box,
   or drop the profile and set `DATABASE_URL` to **RDS**.
3. Set `COOKIE_SECURE=true` (already set in the compose file).
4. Seed the teacher:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file deploy/prod.env exec api \
     node -e "console.log('use npm run seed:teacher from a one-off container with the env file')"
   ```
   From the repo, with the same env: `cd apps/api && npm run seed:teacher`.
5. Load vocabulary (do **not** re-run the 24 GB Wiktextract extract):
   ```powershell
   python -m vocabulary_pipeline.cli extract-topics
   python -m vocabulary_pipeline.cli apply-topics
   python -m vocabulary_pipeline.cli load-postgres --force
   python -m vocabulary_pipeline.cli apply-topics
   ```
   First `apply-topics` attaches topics and removes `actions 1` placeholders on
   the current DB. `load-postgres --force` merges the full processed catalog
   (`~1.4M` entries / `~1.7M` senses) with `ON CONFLICT DO NOTHING`. Run
   `apply-topics` again after the full load so new senses get topic tags.
6. Health: `https://YOUR_DOMAIN/api/v1/health`

Caddy terminates TLS and proxies `/api/*` and `/socket.io*` to the API so the
login cookie and live monitor stay on one origin.

## Reverse proxy & TLS (manual)

Put a TLS-terminating proxy (nginx/Caddy/traefik) in front of the Next.js app
and forward `/api/*` and WebSocket upgrades to the API. Keep a single origin so
the auth cookie works:

- `/<everything>` -> Next.js (`:3001`)
- `/api/*` -> API (`:3000`) (or rely on next rewrites and proxy only :3001)

## Backup & restore

The vocabulary DB is large; use PostgreSQL-native tooling.

Scheduled / scripted backup:
```powershell
pwsh -File scripts/backup-postgres.ps1
```

Manual backup (plain or custom):
```powershell
pg_dump "postgresql://vocab:vocab@localhost:5432/vocabulary" -Fc -f vocab.dump
```

Restore:
```powershell
pg_restore --clean --if-exists -d vocabulary vocab.dump
```

Restores are idempotent-friendly with `--clean`. Test restores in a scratch
database first.

## Operations notes

- The API validates every request with `ValidationPipe` (whitelist, transform).
- Exports are streams with `Cache-Control: no-store`; CSVs carry a UTF-8 BOM so
  Excel opens them correctly.
- Vocabulary imports (`POST /api/v1/imports/vocabulary`) are teacher-only AND
  non-destructive: existing senses are skipped, imported senses are tagged
  `teacher-import`, and a dry-run flag is available for preview.
- Student access uses signed tokens under `/api/v1/students/:id/access`; the
  student-private dashboard is token-scoped, never account-shared.
- Monitor logs: API logs to stdout; run both apps under a process manager
  (`pm2`, systemd, or a service script) with restart on failure.