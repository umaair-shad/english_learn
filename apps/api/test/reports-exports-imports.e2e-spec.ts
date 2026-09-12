import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/database/prisma.service';
import {
  createTestApp,
  removeStudentsWithPrefix,
  seedTeacher,
  TEST_TEACHER,
} from './helpers';

const PREFIX = 'E2E RptImp ';
const CLEANUP_LEMMA_PREFIX = 'E2E RptImp ';

const SENSE_FINANCIAL = 4593;

jest.setTimeout(20_000);

describe('Reports / Exports / Imports (e2e, real PostgreSQL)', () => {
  let app: INestApplication<App>;
  let agent: ReturnType<typeof request.agent>;
  let prisma: PrismaService;
  let studentA: number;
  let studentB: number;
  let assignmentId: number;
  let sessionId: number;

  beforeAll(async () => {
    app = await createTestApp();
    await seedTeacher(app);
    prisma = app.get(PrismaService);
    agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/login').send({
      email: TEST_TEACHER.email,
      password: TEST_TEACHER.password,
    });

    // Seed teacher-owned students.
    const resA = await agent
      .post('/api/v1/students')
      .send({ firstName: `${PREFIX}A`, displayName: `${PREFIX}A` })
      .expect(201);
    studentA = resA.body.id as number;

    const resB = await agent
      .post('/api/v1/students')
      .send({ firstName: `${PREFIX}B`, displayName: `${PREFIX}B` })
      .expect(201);
    studentB = resB.body.id as number;

    // Assignment (owned by teacher).
    const asg = await agent
      .post('/api/v1/assignments')
      .send({
        studentId: studentA,
        title: `${PREFIX}Asg`,
        senseIds: [SENSE_FINANCIAL],
      })
      .expect(201);
    assignmentId = asg.body.id as number;

    // Assignments for B so both students are teacher-owned.
    await agent
      .post('/api/v1/assignments')
      .send({
        studentId: studentB,
        title: `${PREFIX}AsgB`,
        senseIds: [SENSE_FINANCIAL],
      })
      .expect(201);

    // Activity + session with one ANSWER event (teacher-owned).
    const act = await agent
      .post('/api/v1/activities')
      .send({
        studentId: studentA,
        title: `${PREFIX}Act`,
        activityType: 'FLASHCARDS',
        senseIds: [SENSE_FINANCIAL],
      })
      .expect(201);

    const tokenRes = await agent
      .post(`/api/v1/students/${studentA}/access-token`)
      .send({})
      .expect(201);
    const token: string = tokenRes.body.rawToken;

    const startRes = await agent
      .post(`/api/v1/student-access/${token}/activities/${act.body.id}/start`)
      .expect(201);
    sessionId = startRes.body.session.id as number;

    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({
        eventType: 'ANSWER_CORRECT',
        vocabularySenseId: SENSE_FINANCIAL,
        isCorrect: true,
        responseTimeMs: 900,
        rating: 'GOOD',
      })
      .expect(201);
  });

  afterAll(async () => {
    await removeStudentsWithPrefix(app, PREFIX);
    await removeImportedSenses();
    await app.close();
  });

  async function removeImportedSenses(): Promise<void> {
    const rows = await prisma.vocabulary_senses.findMany({
      where: { lemma: { startsWith: CLEANUP_LEMMA_PREFIX } },
      select: { id: true, vocabulary_entry_id: true },
    });
    if (rows.length === 0) return;
    const senseIds = rows.map((r) => r.id);
    await prisma.translations.deleteMany({
      where: { vocabulary_sense_id: { in: senseIds } },
    });
    await prisma.example_sentences.deleteMany({
      where: { vocabulary_sense_id: { in: senseIds } },
    });
    await prisma.vocabulary_senses.deleteMany({
      where: { id: { in: senseIds } },
    });
    const entryIds = [...new Set(rows.map((r) => r.vocabulary_entry_id))];
    const orphans = await prisma.vocabulary_entries.findMany({
      where: { id: { in: entryIds }, vocabulary_senses: { none: {} } },
      select: { id: true },
    });
    if (orphans.length > 0) {
      await prisma.vocabulary_entries.deleteMany({
        where: { id: { in: orphans.map((o) => o.id) } },
      });
    }
  }

  // --------------------------------------------------------------- Reports

  it('GET /reports/dashboard returns structured dashboard summary', async () => {
    const res = await agent.get('/api/v1/reports/dashboard').expect(200);
    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty('students');
    expect(body).toHaveProperty('assignments');
    expect(body).toHaveProperty('activities');
    expect(body).toHaveProperty('vocabulary');
    expect(body).toHaveProperty('learning');
    expect(body).toHaveProperty('reviewTrend');
    expect(body).toHaveProperty('recentSessions');
    expect(
      (body.vocabulary as Record<string, number>).catalogSenses,
    ).toBeGreaterThan(0);
    expect(
      (body.students as Record<string, number>).total,
    ).toBeGreaterThanOrEqual(2);
  });

  it('GET /reports/dashboard rejects unauthenticated request', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/reports/dashboard')
      .expect(401);
  });

  it('GET /reports/students returns teacher-owned students with status breakdown', async () => {
    const res = await agent.get('/api/v1/reports/students').expect(200);
    const body = res.body as Array<Record<string, unknown>>;
    expect(Array.isArray(body)).toBe(true);
    const found = body.filter(
      (r) => r.displayName === `${PREFIX}A` || r.displayName === `${PREFIX}B`,
    );
    expect(found.length).toBe(2);
    for (const r of found) {
      expect(typeof r.assigned).toBe('number');
      expect(typeof r.encountered).toBe('number');
      expect(typeof r.learning).toBe('number');
      expect(typeof r.mastered).toBe('number');
      expect(typeof r.due).toBe('number');
      expect(typeof r.reviewsDone).toBe('number');
      expect(typeof r.sessionCount).toBe('number');
    }
  });

  it('GET /reports/students?search filters by student name', async () => {
    const res = await agent
      .get('/api/v1/reports/students')
      .query({ search: `${PREFIX}B` })
      .expect(200);
    const body = res.body as Array<Record<string, unknown>>;
    expect(body.length).toBe(1);
    expect(body[0].displayName).toBe(`${PREFIX}B`);
  });

  it('GET /reports/activities returns owned activities', async () => {
    const res = await agent.get('/api/v1/reports/activities').expect(200);
    const body = res.body as Array<Record<string, unknown>>;
    expect(Array.isArray(body)).toBe(true);
    const found = body.filter((r) => r.activityTitle === `${PREFIX}Act`);
    expect(found.length).toBe(1);
    expect(found[0].sessionCount).toBeGreaterThanOrEqual(1);
    expect(Number(found[0].totalCorrect)).toBeGreaterThanOrEqual(1);
  });

  it('GET /reports/review-trend returns array with numeric counts', async () => {
    const res = await agent.get('/api/v1/reports/review-trend').expect(200);
    const body = res.body as Array<Record<string, unknown>>;
    expect(Array.isArray(body)).toBe(true);
    for (const point of body) {
      expect(typeof point.date).toBe('string');
      expect(typeof point.reviews).toBe('number');
      expect(typeof point.correct).toBe('number');
    }
  });

  it('GET /reports/recent-activity returns recent events', async () => {
    const res = await agent.get('/api/v1/reports/recent-activity').expect(200);
    const body = res.body as Array<Record<string, unknown>>;
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      expect(body[0]).toHaveProperty('eventType');
      expect(body[0]).toHaveProperty('studentDisplayName');
    }
  });

  // --------------------------------------------------------------- Exports

  it('GET /exports/students returns CSV with BOM and header', async () => {
    const res = await agent.get('/api/v1/exports/students').expect(200);
    const text = res.text;
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const lines = text.split('\r\n').filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    const headers = lines[0].split(',');
    expect(headers).toContain('displayName');
  });

  it('GET /exports/students?format=json returns JSON array', async () => {
    const res = await agent
      .get('/api/v1/exports/students')
      .query({ format: 'json' })
      .expect(200);
    const body = res.body;
    expect(Array.isArray(body)).toBe(true);
    const found = (body as Array<Record<string, unknown>>).filter(
      (r) => r.displayName === `${PREFIX}A` || r.displayName === `${PREFIX}B`,
    );
    expect(found.length).toBe(2);
  });

  it('GET /exports/vocabulary returns CSV with BOM', async () => {
    const res = await agent
      .get('/api/v1/exports/vocabulary')
      .query({ partOfSpeech: 'noun' })
      .expect(200);
    const text = res.text;
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(res.headers['content-type']).toContain('text/csv');
  });

  it('GET /exports/vocabulary excludes tokens/hashes/passwords', async () => {
    const res = await agent
      .get('/api/v1/exports/vocabulary')
      .query({ format: 'json' })
      .expect(200);
    const text = JSON.stringify(res.body);
    expect(text.toLowerCase()).not.toContain('password_hash');
    expect(text.toLowerCase()).not.toContain('raw_token');
    expect(text.toLowerCase()).not.toContain('access_token');
  });

  it('GET /exports/learning returns scoped CSV rows', async () => {
    const res = await agent
      .get('/api/v1/exports/learning')
      .query({ format: 'csv' })
      .expect(200);
    const text = res.text;
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const lines = text.split('\r\n').filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /exports/learning with studentId filters to single student', async () => {
    const res = await agent
      .get('/api/v1/exports/learning')
      .query({ format: 'json', studentId: studentA })
      .expect(200);
    const body = res.body as Array<Record<string, unknown>>;
    expect(Array.isArray(body)).toBe(true);
    for (const row of body) {
      expect(row.studentId).toBe(studentA);
    }
  });

  it('GET /exports/sessions returns CSV with numeric progress', async () => {
    const res = await agent
      .get('/api/v1/exports/sessions')
      .query({ format: 'csv' })
      .expect(200);
    const text = res.text;
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toContain('progress');
  });

  it('GET /exports/sessions excludes non-owned data (studentB no sessions)', async () => {
    const res = await agent
      .get('/api/v1/exports/sessions')
      .query({ format: 'json', studentId: studentB })
      .expect(200);
    const body = res.body as Array<Record<string, unknown>>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  it('GET /exports/assignments returns created assignment rows', async () => {
    const res = await agent
      .get('/api/v1/exports/assignments')
      .query({ format: 'json' })
      .expect(200);
    const body = res.body as Array<Record<string, unknown>>;
    const found = body.filter((r) => r.assignmentId === assignmentId);
    expect(found.length).toBe(1);
    expect(found[0].title).toBe(`${PREFIX}Asg`);
    expect(found[0].student).toBe(`${PREFIX}A`);
    expect(typeof found[0].itemCount).toBe('number');
  });

  it('GET /exports/students rejects unauthenticated request', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/exports/students')
      .expect(401);
  });

  // --------------------------------------------------------------- Imports

  it('POST /imports/vocabulary with dryRun does not create rows', async () => {
    const res = await agent
      .post('/api/v1/imports/vocabulary')
      .send({
        format: 'json',
        dryRun: true,
        rows: [
          {
            lemma: `${PREFIX}testword`,
            partOfSpeech: 'noun',
            definition: 'a test word used in dry run',
            translations: ['testowe slowo'],
          },
        ],
      })
      .expect(201);
    const body = res.body as Record<string, unknown>;
    expect(body.dryRun).toBe(true);
    expect(body.validated).toBe(1);
    expect(body.errors).toEqual([]);
    expect(body.created).toBe(1);

    // Confirm nothing persisted
    const list = await agent
      .get('/api/v1/vocabulary')
      .query({ search: `${PREFIX}testword`, limit: 10 })
      .expect(200);
    expect((list.body as Record<string, unknown>).meta.total).toBe(0);
  });

  it('POST /imports/vocabulary creates sense with provenance tags', async () => {
    const res = await agent
      .post('/api/v1/imports/vocabulary')
      .send({
        format: 'json',
        rows: [
          {
            lemma: `${PREFIX}realimport`,
            partOfSpeech: 'verb',
            definition: 'to import a word for real',
            translations: ['importowac'],
            tags: ['extra-tag'],
          },
        ],
      })
      .expect(201);
    const body = res.body as Record<string, unknown>;
    expect(body.created).toBe(1);
    expect(body.skippedExisting).toBe(0);
    expect(body.errors).toEqual([]);
    const senseId = (body.rows as Array<Record<string, unknown>>)[0].senseId;
    expect(senseId).toBeGreaterThan(0);
  });

  it('POST /imports/vocabulary skips duplicates (created=false)', async () => {
    const res = await agent
      .post('/api/v1/imports/vocabulary')
      .send({
        format: 'json',
        rows: [
          {
            lemma: `${PREFIX}realimport`,
            partOfSpeech: 'verb',
            definition: 'to import a word for real',
            translations: ['importowac'],
          },
        ],
      })
      .expect(201);
    const body = res.body as Record<string, unknown>;
    expect(body.created).toBe(0);
    expect(body.skippedExisting).toBe(1);
  });

  it('POST /imports/vocabulary returns errors for invalid rows and does not abort', async () => {
    const res = await agent
      .post('/api/v1/imports/vocabulary')
      .send({
        format: 'json',
        rows: [
          { lemma: '', partOfSpeech: 'noun', definition: 'missing lemma' },
          {
            lemma: `${PREFIX}valid`,
            partOfSpeech: 'adjective',
            definition: 'valid row',
          },
        ],
      })
      .expect(201);
    const body = res.body as Record<string, unknown>;
    expect(body.validated).toBe(1);
    expect(body.created).toBe(1);
    const errors = body.errors as Array<Record<string, unknown>>;
    expect(errors.length).toBe(1);
    expect(errors[0].row).toBe(1);
  });

  it('POST /imports/vocabulary accepts CSV format and parses headers', async () => {
    const csvContent = [
      `lemma,partOfSpeech,definition,translations`,
      `${PREFIX}csv,adjective,a csv imported adjective,polski adj`,
    ].join('\r\n');
    const res = await agent
      .post('/api/v1/imports/vocabulary')
      .send({
        format: 'csv',
        content: csvContent,
      })
      .expect(201);
    const body = res.body as Record<string, unknown>;
    expect(body.created).toBe(1);
    expect(body.validated).toBe(1);
  });

  it('POST /imports/vocabulary rejects unauthenticated request', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/imports/vocabulary')
      .send({ format: 'json', rows: [] })
      .expect(401);
  });
});
