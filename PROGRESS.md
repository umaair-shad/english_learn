# Project progress

Last updated: **2026-09-13** (client status doc; e2e 118/118)  
Repo: `e:\fiver\project_english`  
Client spec: `e:\fiver\Project English Learn\r.txt`

Use this file when switching editors. Read it first, then update the date and remaining list after any real change.

---

## Status

**Product features are locally complete. UI refresh, shared pagination, and client-confirmed collections/find-words landed 2026-09-13. API e2e is green (118/118). Production deploy is still open.**

| Area | State |
|---|---|
| Teacher + student app | Done |
| 4 activities + FSRS + events | Done |
| Play links `/play/[token]` | Done |
| Find words + global collections | Done (replaces fixed 1,000-category product path) |
| Shared pagination (10 / 20 / 50 / 100 + localStorage) | Done |
| Import/export CSV/JSON/XLSX | Done |
| Live teacher mirror | Done (single-teacher roster) |
| Docs + backup script | Done |
| Full Wiktextract / 1.7M load | **Not done — client wants it, do not start unless they confirm again** |
| Scheduled backups | Script only, not scheduled |
| Production HTTPS deploy | **Not done** |
| E2E after new features | **118/118** (2026-09-13). Tests updated for last-answer-wins + single-teacher live + golden `bank` search |

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

Postgres Docker: `vocabulary-postgres` · `vocab` / `vocab` / `vocabulary` · host port **5434** (5432 is used by another local app)

Do **not** run `prisma migrate reset`, do **not** delete `/data` or the database, do **not** run the 24GB Wiktextract pipeline unless the client explicitly asks.

---

## Done (do not rebuild)

Working systems. Extend them; do not rewrite.

- Stack: Next.js 16 (`apps/web` :3001) + NestJS 11 (`apps/api` `/api/v1` :3000) + PostgreSQL 16 + Prisma
- Teacher auth (JWT cookie `vocab_auth`), logout, **change password**
- Students without passwords; hashed private URLs; regenerate / revoke
- Vocabulary search (EN / PL / definition / category name), CEFR, POS, Polish, frequency
- `lexicalOnly` hides numeric / symbol / leetspeak lemmas (`0#0`, `86`, `2S`, …) — those rows are real Wiktionary data, not a broken catalog
- **Find words** (`/teacher/categories`): topic + CEFR → preview → save a global collection
- **Collections** (`/teacher/vocabulary-sets`): teacher-global reusable lists, not per student
- Shared list pagination: default **10**, limits **10 / 20 / 50 / 100** stored in `localStorage` (`page-limit:*`), prev/next + jump-to-page, backend `hasNext` / `hasPrev` / `totalPages`
- Teacher shell is viewport-locked: sidebar stays on screen; only the main pane scrolls. Vocabulary table also scrolls inside the card at 20/50/100 rows.
- Vocabulary sets, assignments, activities
- Activity create sources: manual, assignment, set, assigned, due, difficult, catalog (+ CEFR/category)
- Flashcards EN→PL, PL→EN, both
- Memory, Quiz, Fill-in-the-Blank
- Shared `student_vocabulary_states` + FSRS (`ts-fsrs`) + review history
- Standardized activity events
- Student activity list progress uses latest-session **session IDs** (was looking up activity IDs, so every card showed 0%). Finish scores use last-answer-wins per word, not every attempt.
- `/play/[token]` permanent / expiring / single-use
- Live monitor + `liveState` (flashcard / memory / quiz)
- Student profile: vocab, due, assignments, **distribution** (CEFR + categories)
- Teacher learning controls: known/unknown, force learning/review, unassign, force due
- Reports + export CSV/JSON/XLSX; import CSV/JSON/XLSX (non-destructive)
- Taxonomy seed still exists (`npm run seed:taxonomy`) and search can match category names, but the client rejected a fixed ~1,000-category browser
- Current DB catalog: ~**16,760 entries / 60,657 senses** (20k sample). Keep `data/archive/baseline-20k`
- Backup script: `pwsh -File scripts/backup-postgres.ps1` (or `npm run backup` in `apps/api`)
- Docs: `docs/client-status.md` (send to client), `README.md`, `docs/architecture.md`, `docs/deployment-production.md`, `docs/operations.md`
- Cookie: set `COOKIE_SECURE=true` only behind HTTPS

### Client decisions (Fiverr, 2026-09-12)

1. **One teacher only.** No multi-teacher isolation.
2. **Full vocabulary database** is wanted (~1.4M entries / 1.7M senses). Not loaded yet.
3. **No predefined ~1,000 categories.** Serve words on the fly (example: B2 cooking).
4. Teacher saves matching words into **global reusable collections**, not per student.

Verified in browser on 2026-09-12: login, students, categories, settings, activity create filters, `/play` fill-blank start, distribution, import/export UI.

UI refresh 2026-09-13: teal/cream theme (not grayscale), mobile teacher drawer, student/play learner shell, colorful dashboard and student stats.

---

## Remaining

### Must do before calling it production-delivered

1. **Production deploy**
   - TLS reverse proxy (Caddy/nginx/Traefik)
   - Single origin so the auth cookie works
   - `COOKIE_SECURE=true` in `apps/api/.env`
   - Process manager (pm2/systemd)
   - Health check: `GET /api/v1/health`

2. **API e2e** — **118/118** on 2026-09-13. Product tests now match last-answer-wins (`MATCH_FAILED` is graded, FSRS still only on rated answers), single-teacher live snapshot/watch, and `GET /vocabulary/search?q=bank` for the golden bank detail. Re-run after the next product change:
   ```powershell
   cd apps/api
   npm run test:e2e -- --runInBand
   ```

3. **Schedule backups**
   - Script exists; Windows Task Scheduler (or cron) is not set up
   - Restore was documented, not re-tested in a scratch DB this session

4. **Client confirmation**
   - Send `docs/client-status.md`
   - Wait for Yes/No on full DB load, real topics, leftover categories, deploy

### Optional / only if the client asks

5. **Full vocabulary load** — client said they want the full database. Still not run. Would change golden sense IDs (`bank` noun = `4593`). Confirm again before starting. Do not run raw Wiktextract (23 GB).

6. **Topics / leftover categories** — wait for client answers in `docs/client-status.md`. Do not seed a hand-made tree.

7. **Dashboard vs student list** — reports dashboard counts only students “owned” via activities/assignments (`created_by_teacher_id` / `teacher_id`). The students list is single-tenant (all students). Can look like “0 students” on the dashboard while the list shows people.

8. **Fill-in-the-Blank live board** — flashcards / memory / quiz send `liveState`. Fill-blank is events + progress only.

9. **Docs polish** — installation/API/FSRS are covered; Swagger is the live API reference. Extra maintenance runbook only if the client wants it.

### Explicitly out of scope

- Audio / pronunciation
- 2FA
- AI, listening, speaking
- Multiple teachers / classrooms (client confirmed one teacher)
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
| Client status | `docs/client-status.md` |
| Architecture | `docs/architecture.md` |
| Deploy | `docs/deployment-production.md` |
| Ops / restore | `docs/operations.md` |
| Client spec | `e:\fiver\Project English Learn\r.txt` |

---

## Next session checklist

1. Read this file.
2. Confirm Docker Postgres is healthy and API/web start.
3. If the client has not answered `docs/client-status.md`, do not load the full catalog and do not build a hand-made taxonomy. Otherwise pick deploy or the confirmed data step.
4. Update **Last updated**, move finished items into **Done**, and keep **Remaining** honest.
