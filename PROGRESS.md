# Project progress

Last updated: **2026-09-12**  
Repo: `e:\fiver\project_english`  
Client spec: `e:\fiver\Project English Learn\r.txt`

Use this file when switching editors. Read it first, then update the date and remaining list after any real change.

---

## Status

**App is locally complete and running. Production deploy and a post-feature test pass are still open.**

| Area | State |
|---|---|
| Teacher + student app | Done |
| 4 activities + FSRS + events | Done |
| Play links `/play/[token]` | Done |
| Taxonomy (~1,420 categories) | Done on current DB |
| Import/export CSV/JSON/XLSX | Done |
| Live teacher mirror | Done |
| Docs + backup script | Done |
| Full Wiktextract / 1.7M load | **Not done (intentional)** |
| Scheduled backups | Script only, not scheduled |
| Production HTTPS deploy | **Not done** |
| E2E after new features | Last full gate **118/118** was *before* play tokens / taxonomy / XLSX / password change |

---

## How to run (local)

```powershell
docker compose up -d
cd apps/api; npm run start:dev    # :3000  /api/v1  swagger /api/docs
cd apps/web; npm run dev          # :3001
```

- Web: http://localhost:3001
- API: http://localhost:3000/api/v1
- Teacher login: `/teacher/login`
- Students: `/s/[token]` or `/student/[token]`
- Activity links: `/play/[token]`

Postgres Docker: `vocabulary-postgres` · `vocab` / `vocab` / `vocabulary`

Do **not** run `prisma migrate reset`, do **not** delete `/data` or the database, do **not** run the 24GB Wiktextract pipeline unless the client explicitly asks.

---

## Done (do not rebuild)

Working systems. Extend them; do not rewrite.

- Stack: Next.js 16 (`apps/web` :3001) + NestJS 11 (`apps/api` `/api/v1` :3000) + PostgreSQL 16 + Prisma
- Teacher auth (JWT cookie `vocab_auth`), logout, **change password**
- Students without passwords; hashed private URLs; regenerate / revoke
- Vocabulary search (EN / PL / definition), CEFR, POS, category, Polish, frequency
- Categories page lists taxonomy and opens `/teacher/vocabulary?category=`
- Vocabulary sets, assignments, activities
- Activity create sources: manual, assignment, set, assigned, due, difficult, catalog (+ CEFR/category)
- Flashcards EN→PL, PL→EN, both
- Memory, Quiz, Fill-in-the-Blank
- Shared `student_vocabulary_states` + FSRS (`ts-fsrs`) + review history
- Standardized activity events
- `/play/[token]` permanent / expiring / single-use
- Live monitor + `liveState` (flashcard / memory / quiz)
- Student profile: vocab, due, assignments, **distribution** (CEFR + categories)
- Teacher learning controls: known/unknown, force learning/review, unassign, force due
- Reports + export CSV/JSON/XLSX; import CSV/JSON/XLSX (non-destructive)
- Taxonomy seed: `npm run seed:taxonomy` in `apps/api` → **1,420 categories**, ~45,863 sense assignments
- Current DB catalog: ~**16,760 entries / 60,657 senses** (20k sample). Keep `data/archive/baseline-20k`
- Backup script: `pwsh -File scripts/backup-postgres.ps1` (or `npm run backup` in `apps/api`)
- Docs: `README.md`, `docs/architecture.md`, `docs/deployment-production.md`, `docs/operations.md`
- Cookie: set `COOKIE_SECURE=true` only behind HTTPS

Verified in browser on 2026-09-12: login, students, categories, settings, activity create filters, `/play` fill-blank start, distribution, import/export UI.

---

## Remaining

### Must do before calling it production-delivered

1. **Production deploy**
   - TLS reverse proxy (Caddy/nginx/Traefik)
   - Single origin so the auth cookie works
   - `COOKIE_SECURE=true` in `apps/api/.env`
   - Process manager (pm2/systemd)
   - Health check: `GET /api/v1/health`

2. **Re-run API e2e after the new features**
   ```powershell
   cd apps/api
   npm test -- --runInBand
   ```
   Last green gate: 118/118, 9 suites (before play tokens / taxonomy / XLSX / password). Add tests if anything fails:
   - play-access tokens (permanent / expiring / single-use)
   - change-password
   - XLSX import
   - activity selection filters
   - taxonomy / category filter

3. **Schedule backups**
   - Script exists; Windows Task Scheduler (or cron) is not set up
   - Restore was documented, not re-tested in a scratch DB this session

4. **Client handoff pack**
   - Production `pg_dump` of the current DB
   - Env examples already in `apps/api/.env.example` and `apps/web/.env.example`
   - Confirm teacher seed credentials with the client (do not commit real passwords)

### Optional / only if the client asks

5. **Full vocabulary load** (~1.7M processed senses on disk, unused). Would change golden sense IDs (`bank` noun = `4593`). Do not run unless requested. Do not run raw Wiktextract (23 GB).

6. **Taxonomy names** — seed has some generic labels (`actions 1`, `basics 1`). Functional, but not editorial-quality.

7. **Dashboard vs student list** — reports dashboard counts only students “owned” via activities/assignments (`created_by_teacher_id` / `teacher_id`). The students list is single-tenant (all students). Can look like “0 students” on the dashboard while the list shows people.

8. **Fill-in-the-Blank live board** — flashcards / memory / quiz send `liveState`. Fill-blank is events + progress only.

9. **Docs polish** — installation/API/FSRS are covered; Swagger is the live API reference. Extra maintenance runbook only if the client wants it.

### Explicitly out of scope

- Audio / pronunciation
- 2FA
- AI, listening, speaking
- Multiple teachers / classrooms
- New backend or stack change

---

## Hard rules (every session)

- Do **not** rewrite working auth / FSRS / activities / WebSockets
- Do **not** invent a second backend
- Do **not** `prisma migrate reset` or delete `/data` or the DB
- Do **not** run the 24GB Wiktextract pipeline
- Python is ETL only (`scripts/vocabulary`)
- No new AI or audio features

---

## Useful paths

| What | Where |
|---|---|
| Web app | `apps/web` |
| API | `apps/api` |
| Prisma schema | `apps/api/prisma/schema.prisma` |
| SQL migrations | `database/migrations/` (incl. `006_activity_access_tokens.sql`) |
| Taxonomy seed | `apps/api/src/scripts/seed-taxonomy.ts` |
| Backup | `scripts/backup-postgres.ps1` |
| Architecture | `docs/architecture.md` |
| Deploy | `docs/deployment-production.md` |
| Ops / restore | `docs/operations.md` |
| Client spec | `e:\fiver\Project English Learn\r.txt` |

---

## Next session checklist

1. Read this file.
2. Confirm Docker Postgres is healthy and API/web start.
3. Pick the next remaining item (usually: e2e re-run, then deploy, then scheduled backup).
4. Update **Last updated**, move finished items into **Done**, and keep **Remaining** honest.
