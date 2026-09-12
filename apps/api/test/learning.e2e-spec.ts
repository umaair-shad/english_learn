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

const PREFIX = 'E2E Learn ';

// Real bank words from the vocabulary database used as stable fixtures.
// 4593: financial institution ("An institution where one can place and borrow
//       money and make investments from ...")
// 4603: river edge ("An edge of river, lake, or other watercourse, where one
//       normally goes to stand to get into an inflatable boat ...")
const SENSE_FINANCIAL = 4593;
const SENSE_RIVER = 4603;

describe('Student vocabulary learning state + FSRS (e2e, real PostgreSQL)', () => {
  let app: INestApplication<App>;
  let agent: ReturnType<typeof request.agent>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    await seedTeacher(app);
    prisma = app.get(PrismaService);
    agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/login').send({
      email: TEST_TEACHER.email,
      password: TEST_TEACHER.password,
    });
  });

  afterAll(async () => {
    await removeStudentsWithPrefix(app, PREFIX);
    await app.close();
  });

  async function createStudent(displayName: string): Promise<number> {
    const res = await agent
      .post('/api/v1/students')
      .send({ firstName: displayName, displayName })
      .expect(201);
    return res.body.id as number;
  }

  async function tokenFor(studentId: number): Promise<string> {
    const res = await agent
      .post(`/api/v1/students/${studentId}/access-token`)
      .send({})
      .expect(201);
    return res.body.rawToken as string;
  }

  async function stateCount(studentId: number): Promise<number> {
    const r = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*) AS n FROM student_vocabulary_states
      WHERE student_id = ${studentId}`;
    return Number(r[0]?.n ?? 0);
  }

  function reviewBody(rating: string, extra: Record<string, unknown> = {}) {
    return { rating, responseTimeMs: 1500, ...extra };
  }

  it('rejects unauthorized access to student vocabulary (401)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/students/1/vocabulary')
      .expect(401);
  });

  it('assigns a sense creating an ASSIGNED state', async () => {
    const studentId = await createStudent(`${PREFIX}Assign`);
    const res = await agent
      .post(
        `/api/v1/students/${studentId}/vocabulary/${SENSE_FINANCIAL}/assign`,
      )
      .send({})
      .expect(200);
    expect(res.body.state).toBeUndefined();
    expect(res.body.status).toBe('ASSIGNED');
    expect(res.body.senseId).toBe(SENSE_FINANCIAL);
    expect(res.body.studentId).toBe(studentId);
    expect(res.body.reviewCount).toBe(0);
    expect(res.body.firstEncounteredAt).toBeNull();
  });

  it('re-assigning the same sense is idempotent', async () => {
    const studentId = await createStudent(`${PREFIX}Idempotent`);
    const first = await agent
      .post(`/api/v1/students/${studentId}/vocabulary/${SENSE_RIVER}/assign`)
      .send({})
      .expect(200);
    const second = await agent
      .post(`/api/v1/students/${studentId}/vocabulary/${SENSE_RIVER}/assign`)
      .send({})
      .expect(200);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.reviewCount).toBe(0);
    expect(await stateCount(studentId)).toBe(1);
  });

  it('lists student vocabulary with state + sense details', async () => {
    const studentId = await createStudent(`${PREFIX}List`);
    await agent
      .post(
        `/api/v1/students/${studentId}/vocabulary/${SENSE_FINANCIAL}/assign`,
      )
      .send({})
      .expect(200);

    const res = await agent
      .get(`/api/v1/students/${studentId}/vocabulary`)
      .expect(200);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].state.status).toBe('ASSIGNED');
    expect(res.body.data[0].state.isDue).toBe(false);
    expect(res.body.data[0].sense.id).toBe(SENSE_FINANCIAL);
    expect(res.body.data[0].sense.lemma.toLowerCase()).toContain('bank');
    expect(res.body.data[0].sense.definition.length).toBeGreaterThan(10);
    expect(Array.isArray(res.body.data[0].sense.translations)).toBe(true);
    expect(Array.isArray(res.body.data[0].sense.cefrLevels)).toBe(true);
  });

  it('keeps bank senses as separate learning items', async () => {
    const studentId = await createStudent(`${PREFIX}BothSenses`);
    const a = await agent
      .post(
        `/api/v1/students/${studentId}/vocabulary/${SENSE_FINANCIAL}/assign`,
      )
      .send({})
      .expect(200);
    const b = await agent
      .post(`/api/v1/students/${studentId}/vocabulary/${SENSE_RIVER}/assign`)
      .send({})
      .expect(200);
    expect(a.body.id).not.toBe(b.body.id);

    const res = await agent
      .get(`/api/v1/students/${studentId}/vocabulary`)
      .expect(200);
    expect(res.body.meta.total).toBe(2);
    const senseIds = res.body.data
      .map((d: { sense: { id: number } }) => d.sense.id)
      .sort((x: number, y: number) => x - y);
    expect(senseIds).toEqual([SENSE_FINANCIAL, SENSE_RIVER]);
  });

  it('a first AGAIN review moves ASSIGNED -> LEARNING with counters', async () => {
    const studentId = await createStudent(`${PREFIX}Again`);
    const reviewed = await agent
      .post(
        `/api/v1/students/${studentId}/vocabulary/${SENSE_FINANCIAL}/review`,
      )
      .send(reviewBody('AGAIN'))
      .expect(200);

    expect(reviewed.body.state.status).toBe('LEARNING');
    expect(reviewed.body.state.reviewCount).toBe(1);
    expect(reviewed.body.state.correctCount).toBe(0);
    expect(reviewed.body.state.incorrectCount).toBe(1);
    expect(reviewed.body.state.lapses).toBe(0);
    expect(reviewed.body.state.firstLearnedAt).not.toBeNull();
    expect(
      new Date(reviewed.body.state.nextReviewAt).getTime(),
    ).toBeGreaterThan(Date.now());
    expect(reviewed.body.state.isDue).toBe(false);
    expect(reviewed.body.state.stability).toBeGreaterThan(0);
    expect(reviewed.body.state.difficulty).toBeGreaterThan(1);
    expect(reviewed.body.recentReviews[0].rating).toBe('AGAIN');
    expect(reviewed.body.recentReviews[0].newStatus).toBe('LEARNING');
    expect(reviewed.body.recentReviews[0].previousStatus).toBe('ASSIGNED');
  });

  it('GOOD schedules a later next review than AGAIN on fresh cards', async () => {
    const studentA = await createStudent(`${PREFIX}CompareA`);
    const studentB = await createStudent(`${PREFIX}CompareB`);
    const again = await agent
      .post(`/api/v1/students/${studentA}/vocabulary/${SENSE_FINANCIAL}/review`)
      .send(reviewBody('AGAIN'))
      .expect(200);
    const good = await agent
      .post(`/api/v1/students/${studentB}/vocabulary/${SENSE_RIVER}/review`)
      .send(reviewBody('GOOD'))
      .expect(200);

    expect(good.body.state.status).toBe('LEARNING');
    expect(good.body.state.correctCount).toBe(1);
    expect(good.body.state.incorrectCount).toBe(0);
    const againAt = new Date(again.body.state.nextReviewAt).getTime();
    const goodAt = new Date(good.body.state.nextReviewAt).getTime();
    expect(goodAt).toBeGreaterThan(againAt);
  });

  it('successive reviews shift scheduling forward monotonically', async () => {
    const studentId = await createStudent(`${PREFIX}Mono`);
    const ratings = ['AGAIN', 'AGAIN', 'GOOD', 'GOOD'] as const;
    const nextAt: number[] = [];
    let detail;
    for (const rating of ratings) {
      detail = await agent
        .post(
          `/api/v1/students/${studentId}/vocabulary/${SENSE_FINANCIAL}/review`,
        )
        .send(reviewBody(rating))
        .expect(200);
      nextAt.push(new Date(detail.body.state.nextReviewAt).getTime());
    }
    expect(detail.body.state.reviewCount).toBe(4);
    expect(new Set(nextAt).size).toBe(4);
    for (let i = 1; i < nextAt.length; i++) {
      expect(nextAt[i]).toBeGreaterThan(nextAt[i - 1]);
    }
  });

  it('appends immutable history with newest first', async () => {
    const studentId = await createStudent(`${PREFIX}History`);
    const url = `/api/v1/students/${studentId}/vocabulary/${SENSE_RIVER}/review`;
    await agent.post(url).send(reviewBody('AGAIN')).expect(200);
    await agent.post(url).send(reviewBody('GOOD')).expect(200);
    const detail = await agent
      .post(url)
      .send(reviewBody('HARD', { sourceType: 'activity', sourceId: 77 }))
      .expect(200);

    const history = detail.body.recentReviews;
    expect(history.length).toBe(3);
    expect(history[0].rating).toBe('HARD');
    expect(history[0].sourceType).toBe('activity');
    expect(history[0].sourceId).toBe(77);
    expect(history[0].newStatus).toBe('LEARNING');
    expect(history[1].rating).toBe('GOOD');
    expect(new Date(history[0].createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date(history[1].createdAt).getTime(),
    );
  });

  it('due endpoint returns exactly the due cards', async () => {
    const studentId = await createStudent(`${PREFIX}Due`);
    await agent
      .post(
        `/api/v1/students/${studentId}/vocabulary/${SENSE_FINANCIAL}/review`,
      )
      .send(reviewBody('GOOD'))
      .expect(200);

    let res = await agent
      .get(`/api/v1/students/${studentId}/reviews/due`)
      .expect(200);
    expect(res.body.meta.total).toBe(0);

    const state = await prisma.student_vocabulary_states.findUnique({
      where: {
        student_id_vocabulary_sense_id: {
          student_id: BigInt(studentId),
          vocabulary_sense_id: BigInt(SENSE_FINANCIAL),
        },
      },
    });
    expect(state).not.toBeNull();

    await prisma.student_vocabulary_states.update({
      where: { id: state!.id },
      data: { next_review_at: new Date(Date.now() - 60_000) },
    });

    res = await agent
      .get(`/api/v1/students/${studentId}/reviews/due`)
      .expect(200);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].state.senseId).toBe(SENSE_FINANCIAL);
    expect(res.body.data[0].state.isDue).toBe(true);

    await prisma.student_vocabulary_states.create({
      data: {
        student_id: BigInt(studentId),
        vocabulary_sense_id: BigInt(SENSE_RIVER),
        status: 'ENCOUNTERED',
        first_encountered_at: new Date(),
      },
    });

    res = await agent
      .get(`/api/v1/students/${studentId}/reviews/due`)
      .expect(200);
    expect(res.body.meta.total).toBe(2);
    const dueStatuses = res.body.data
      .map((d: { state: { status: string } }) => d.state.status)
      .sort();
    expect(dueStatuses).toEqual(['ENCOUNTERED', 'LEARNING']);
  });

  it('public token endpoints expose summary, vocabulary and due reviews', async () => {
    const studentId = await createStudent(`${PREFIX}Public`);
    const token = await tokenFor(studentId);
    await agent
      .post(
        `/api/v1/students/${studentId}/vocabulary/${SENSE_FINANCIAL}/assign`,
      )
      .send({})
      .expect(200);

    const anon = request(app.getHttpServer());
    const summary = await anon
      .get(`/api/v1/student-access/${token}/vocabulary/summary`)
      .expect(200);
    expect(summary.body.assigned).toBe(1);
    expect(summary.body.total).toBe(1);
    expect(summary.body.dueNow).toBe(0);

    const vocab = await anon
      .get(`/api/v1/student-access/${token}/vocabulary`)
      .expect(200);
    expect(vocab.body.meta.total).toBe(1);

    const due = await anon
      .get(`/api/v1/student-access/${token}/reviews/due`)
      .expect(200);
    expect(due.body.meta.total).toBe(0);
  });

  it('isolates students entirely', async () => {
    const studentA = await createStudent(`${PREFIX}IsoA`);
    const studentB = await createStudent(`${PREFIX}IsoB`);
    await agent
      .post(`/api/v1/students/${studentA}/vocabulary/${SENSE_FINANCIAL}/assign`)
      .send({});
    await agent
      .post(`/api/v1/students/${studentB}/vocabulary/${SENSE_RIVER}/assign`)
      .send({});

    const a = await agent
      .get(`/api/v1/students/${studentA}/vocabulary`)
      .expect(200);
    const b = await agent
      .get(`/api/v1/students/${studentB}/vocabulary`)
      .expect(200);
    expect(a.body.meta.total).toBe(1);
    expect(a.body.data[0].sense.id).toBe(SENSE_FINANCIAL);
    expect(b.body.meta.total).toBe(1);
    expect(b.body.data[0].sense.id).toBe(SENSE_RIVER);
  });

  it('a revoked token locks the public vocabulary surface', async () => {
    const studentId = await createStudent(`${PREFIX}Locked`);
    const token = await tokenFor(studentId);
    await agent
      .post(
        `/api/v1/students/${studentId}/vocabulary/${SENSE_FINANCIAL}/assign`,
      )
      .send({});
    await agent
      .post(`/api/v1/students/${studentId}/access-token/revoke`)
      .expect(200);

    const anon = request(app.getHttpServer());
    await anon.get(`/api/v1/student-access/${token}/vocabulary`).expect(404);
    await anon
      .get(`/api/v1/student-access/${token}/vocabulary/summary`)
      .expect(404);
    await anon.get(`/api/v1/student-access/${token}/reviews/due`).expect(404);
  });

  it('teacher override flips status to MASTERED and audits it', async () => {
    const studentId = await createStudent(`${PREFIX}Override`);
    await agent
      .post(
        `/api/v1/students/${studentId}/vocabulary/${SENSE_FINANCIAL}/assign`,
      )
      .send({});

    const res = await agent
      .patch(
        `/api/v1/students/${studentId}/vocabulary/${SENSE_FINANCIAL}/state`,
      )
      .send({ status: 'MASTERED' })
      .expect(200);
    expect(res.body.status).toBe('MASTERED');
    expect(res.body.nextReviewAt).toBeNull();
    expect(res.body.isDue).toBe(false);

    const detail = await agent
      .get(`/api/v1/students/${studentId}/vocabulary/${SENSE_FINANCIAL}`)
      .expect(200);
    expect(detail.body.state.status).toBe('MASTERED');
    expect(detail.body.recentReviews[0].rating).toBeNull();
    expect(detail.body.recentReviews[0].sourceType).toBe('teacher-override');
    expect(detail.body.recentReviews[0].newStatus).toBe('MASTERED');

    await prisma.student_vocabulary_states.updateMany({
      where: { student_id: BigInt(studentId) },
      data: { next_review_at: new Date(Date.now() - 60_000) },
    });
    const due = await agent
      .get(`/api/v1/students/${studentId}/reviews/due`)
      .expect(200);
    expect(due.body.meta.total).toBe(1);
  });

  it('rejects an invalid rating with 400', async () => {
    const studentId = await createStudent(`${PREFIX}BadRating`);
    await agent
      .post(
        `/api/v1/students/${studentId}/vocabulary/${SENSE_FINANCIAL}/review`,
      )
      .send(reviewBody('SOMETIMES'))
      .expect(400);
  });

  it('rolls back a failed review atomically', async () => {
    const studentId = await createStudent(`${PREFIX}Rollback`);
    const before = await agent
      .post(
        `/api/v1/students/${studentId}/vocabulary/${SENSE_FINANCIAL}/review`,
      )
      .send(reviewBody('GOOD'))
      .expect(200);
    const stateId = before.body.state.id;
    const beforeReviewCount = before.body.state.reviewCount;
    const beforeNext = before.body.state.nextReviewAt;

    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION raise_on_ninja() RETURNS trigger AS $$
      BEGIN
        IF NEW.source_id = 987654 THEN
          RAISE EXCEPTION 'injected failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;`);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER trg_raise_on_ninja
      BEFORE INSERT ON vocabulary_review_history
      FOR EACH ROW EXECUTE FUNCTION raise_on_ninja();`);

    try {
      await agent
        .post(
          `/api/v1/students/${studentId}/vocabulary/${SENSE_FINANCIAL}/review`,
        )
        .send(reviewBody('EASY', { sourceId: 987654 }))
        .expect(500);
    } finally {
      await prisma.$executeRawUnsafe(`
        DROP TRIGGER IF EXISTS trg_raise_on_ninja ON vocabulary_review_history;`);
      await prisma.$executeRawUnsafe(
        `DROP FUNCTION IF EXISTS raise_on_ninja();`,
      );
    }

    const after = await prisma.student_vocabulary_states.findUnique({
      where: { id: BigInt(stateId) },
    });
    expect(after).not.toBeNull();
    expect(Number(after!.review_count)).toBe(beforeReviewCount);
    expect(after!.next_review_at?.toISOString()).toBe(beforeNext);

    const leaked = await prisma.vocabulary_review_history.findMany({
      where: {
        student_vocabulary_state_id: BigInt(stateId),
        source_id: BigInt(987654),
      },
    });
    expect(leaked.length).toBe(0);
  });
});
