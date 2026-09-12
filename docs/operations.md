# Operations

## Daily backup

```powershell
pwsh -File scripts/backup-postgres.ps1
```

Writes `backups/vocab-YYYYMMDD-HHmmss.dump` (PostgreSQL custom format). Schedule it with Windows Task Scheduler or a cron equivalent.

## Restore

Test in a scratch database first. Do not restore over a live database unless you intend to replace it.

```powershell
docker exec -i vocabulary-postgres pg_restore --clean --if-exists -U vocab -d vocabulary < backups/vocab-YYYYMMDD-HHmmss.dump
```

The dump includes vocabulary, students, assignments, learning states, FSRS, reviews, sessions, and events.

## Production cookies

Set `COOKIE_SECURE=true` in `apps/api/.env` when the site is served over HTTPS. Leave it `false` on local HTTP.

## Seeds (existing database only)

```powershell
cd apps/api
npm run seed:teacher
npm run seed:taxonomy
```

Do not run `prisma migrate reset` or delete `/data`.

## Health

- API: `GET http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/api/docs`
- Web: `http://localhost:3001`
