# System architecture

English–Polish personalized learning platform.

```
Browser ──► Next.js (:3001)
               │  /api/* rewrite
               ▼
        NestJS API (:3000, /api/v1)
               │  REST + Socket.IO
               ▼
        PostgreSQL 16
```

Python (`scripts/vocabulary`) is used only for vocabulary ETL. It is not an application backend.

## Core vs activities

The core owns vocabulary senses, student learning states, FSRS (`ts-fsrs` via `FsrsService`), review history, assignments, sessions, and events.

Activities (Flashcards, Memory, Quiz, Fill-in-the-Blank) are delivery modules. They emit standardized events. They do not implement their own SRS.

Learning states: `ASSIGNED → ENCOUNTERED → LEARNING → REVIEWING → MASTERED`.

## Events

Persisted on `activity_events`. Lifecycle (`ACTIVITY_STARTED`, `PAUSED`, `RESUMED`, `FINISHED`) is written only by dedicated session endpoints. Gameplay may post `CARD_SHOWN`, answer/match events, and `QUESTION_COMPLETED`.

## FSRS

`ActivityLearningService` forwards ratings (`AGAIN|HARD|GOOD|EASY`) to `LearningService.review()`. All activities share `student_vocabulary_states` per student+sense.

## Realtime

Live Teacher Mirror is application-state sync, not screen sharing.

`Student browser → Socket.IO → NestJS → Teacher browser`

Teachers may only watch students they own via an activity or assignment. Mirror payloads include progress plus optional `liveState` (flashcard, memory board, quiz).

## Access

- Teachers: email/password, bcrypt, JWT cookie `vocab_auth` (set `COOKIE_SECURE=true` in production HTTPS).
- Students: hashed private token URLs `/student/[token]` or `/s/[token]`.
- Activities: optional `/play/[token]` links (permanent, expiring, or single-use).

## Backups

`scripts/backup-postgres.ps1` writes a custom-format dump under `backups/`. Restore with `pg_restore --clean --if-exists`. Test restores in a scratch database first.

## API docs

Swagger UI: `http://localhost:3000/api/docs`.
