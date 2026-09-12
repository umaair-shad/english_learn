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

const PREFIX = 'E2E Assign ';

const SENSE_FINANCIAL = 4593;
const SENSE_RIVER = 4603;
const SENSE_MISSING = 999_999_999;

describe('Assignments (e2e, real PostgreSQL)', () => {
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
    await prisma.vocabulary_sets.deleteMany({
      where: { name: { startsWith: PREFIX } },
    });
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

  async function createSet(name: string, senseIds: number[]): Promise<number> {
    const res = await agent
      .post('/api/v1/vocabulary-sets')
      .send({ name, senseIds })
      .expect(201);
    return res.body.id as number;
  }

  async function stateStatus(
    studentId: number,
    senseId: number,
  ): Promise<string | null> {
    const state = await prisma.student_vocabulary_states.findUnique({
      where: {
        student_id_vocabulary_sense_id: {
          student_id: BigInt(studentId),
          vocabulary_sense_id: BigInt(senseId),
        },
      },
    });
    return state?.status ?? null;
  }

  async function stateCount(studentId: number): Promise<number> {
    const r = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*) AS n FROM student_vocabulary_states
      WHERE student_id = ${studentId}`;
    return Number(r[0]?.n ?? 0);
  }

  it('rejects unauthenticated assignment access (401)', async () => {
    await request(app.getHttpServer()).get('/api/v1/assignments').expect(401);
  });

  it('creates an assignment seeding ASSIGNED learning states', async () => {
    const studentId = await createStudent(`${PREFIX}Basic`);
    const res = await agent
      .post('/api/v1/assignments')
      .send({
        studentId,
        title: `${PREFIX}Basic assignment`,
        senseIds: [SENSE_FINANCIAL, SENSE_RIVER],
      })
      .expect(201);

    expect(res.body.status).toBe('ASSIGNED');
    expect(res.body.student.id).toBe(studentId);
    expect(res.body.totalItems).toBe(2);
    expect(res.body.progress.mastered).toBe(0);
    expect(res.body.progress.percent).toBe(0);
    expect(res.body.items).toHaveLength(2);
    expect(
      res.body.items.every(
        (i: { learning: string }) => i.learning === 'ASSIGNED',
      ),
    ).toBe(true);
    expect(await stateCount(studentId)).toBe(2);
    expect(await stateStatus(studentId, SENSE_FINANCIAL)).toBe('ASSIGNED');
  });

  it('deduplicates senses from manual ids + set items (manual wins source)', async () => {
    const studentId = await createStudent(`${PREFIX}Dedupe`);
    const setA = await createSet(`${PREFIX}setA`, [
      SENSE_FINANCIAL,
      SENSE_RIVER,
    ]);

    const res = await agent
      .post('/api/v1/assignments')
      .send({
        studentId,
        title: `${PREFIX}Dedupe assignment`,
        senseIds: [SENSE_RIVER],
        vocabularySetIds: [setA],
      })
      .expect(201);

    expect(res.body.totalItems).toBe(2);
    expect(await stateCount(studentId)).toBe(2);

    const riverItem = res.body.items.find(
      (i: { senseId: number }) => i.senseId === SENSE_RIVER,
    );
    expect(riverItem.source.type).toBe('MANUAL');
    expect(riverItem.source.sourceSetId).toBeNull();

    const bankItem = res.body.items.find(
      (i: { senseId: number }) => i.senseId === SENSE_FINANCIAL,
    );
    expect(bankItem.source.type).toBe('VOCABULARY_SET');
    expect(bankItem.source.sourceSetId).toBe(setA);
  });

  it('preserves existing learning progress when re-assigning senses', async () => {
    const studentId = await createStudent(`${PREFIX}Preserve`);
    await agent
      .post('/api/v1/assignments')
      .send({
        studentId,
        title: `${PREFIX}first`,
        senseIds: [SENSE_FINANCIAL, SENSE_RIVER],
      })
      .expect(201);

    await agent
      .post(
        `/api/v1/students/${studentId}/vocabulary/${SENSE_FINANCIAL}/review`,
      )
      .send({ rating: 'AGAIN', responseTimeMs: 1500 })
      .expect(200);
    await agent
      .patch(`/api/v1/students/${studentId}/vocabulary/${SENSE_RIVER}/state`)
      .send({ status: 'MASTERED' })
      .expect(200);

    const res = await agent
      .post('/api/v1/assignments')
      .send({
        studentId,
        title: `${PREFIX}second`,
        senseIds: [SENSE_FINANCIAL, SENSE_RIVER],
      })
      .expect(201);

    expect(await stateCount(studentId)).toBe(2);
    expect(await stateStatus(studentId, SENSE_FINANCIAL)).toBe('LEARNING');
    expect(await stateStatus(studentId, SENSE_RIVER)).toBe('MASTERED');
    expect(res.body.progress.mastered).toBe(1);
    expect(res.body.progress.percent).toBe(50);
    const learningItem = res.body.items.find(
      (i: { senseId: number }) => i.senseId === SENSE_FINANCIAL,
    );
    expect(learningItem.reviewCount).toBe(1);
  });

  it('validates student, sense and set inputs', async () => {
    const studentId = await createStudent(`${PREFIX}Valid`);

    await agent
      .post('/api/v1/assignments')
      .send({ studentId: 999_999_999, title: 'x', senseIds: [SENSE_FINANCIAL] })
      .expect(404);

    await agent
      .post('/api/v1/assignments')
      .send({
        studentId,
        title: 'x',
        senseIds: [SENSE_FINANCIAL, SENSE_MISSING],
      })
      .expect(400);

    await agent
      .post('/api/v1/assignments')
      .send({ studentId, title: 'x', vocabularySetIds: [999_999_999] })
      .expect(400);

    const inactiveSet = await createSet(`${PREFIX}InactiveSet`, [
      SENSE_FINANCIAL,
    ]);
    await prisma.vocabulary_sets.update({
      where: { id: BigInt(inactiveSet) },
      data: { is_active: false },
    });
    await agent
      .post('/api/v1/assignments')
      .send({ studentId, title: 'x', vocabularySetIds: [inactiveSet] })
      .expect(400);
  });

  it('lists assignments with filters and progress', async () => {
    const studentA = await createStudent(`${PREFIX}ListA`);
    const studentB = await createStudent(`${PREFIX}ListB`);

    await agent
      .post('/api/v1/assignments')
      .send({
        studentId: studentA,
        title: `${PREFIX}due soon`,
        senseIds: [SENSE_FINANCIAL],
        dueAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201);
    await agent
      .post('/api/v1/assignments')
      .send({
        studentId: studentA,
        title: `${PREFIX}past due`,
        senseIds: [SENSE_RIVER],
        dueAt: new Date(Date.now() - 86_400_000).toISOString(),
      })
      .expect(201);
    await agent
      .post('/api/v1/assignments')
      .send({
        studentId: studentB,
        title: `${PREFIX}other student`,
        senseIds: [SENSE_RIVER],
      })
      .expect(201);

    const byStudent = await agent
      .get(`/api/v1/assignments?studentId=${studentA}`)
      .expect(200);
    expect(byStudent.body.meta.total).toBe(2);

    const upcoming = await agent
      .get(`/api/v1/assignments?studentId=${studentA}&due=upcoming`)
      .expect(200);
    expect(upcoming.body.meta.total).toBe(1);
    expect(upcoming.body.data[0].title).toContain('due soon');

    const overdue = await agent
      .get(`/api/v1/assignments?studentId=${studentA}&due=overdue`)
      .expect(200);
    expect(overdue.body.meta.total).toBe(1);
    expect(overdue.body.data[0].title).toContain('past due');

    const searched = await agent
      .get(`/api/v1/assignments?studentId=${studentA}&search=other`)
      .expect(200);
    expect(searched.body.meta.total).toBe(0);

    const first = overdue.body.data[0];
    expect(first.itemCount).toBe(1);
    expect(first.progress).toBe(0);
  });

  it('updates metadata and manages COMPLETED lifecycle', async () => {
    const studentId = await createStudent(`${PREFIX}Update`);
    await agent
      .post('/api/v1/assignments')
      .send({
        studentId,
        title: `${PREFIX}before`,
        senseIds: [SENSE_FINANCIAL],
      })
      .expect(201);

    const list = await agent
      .get(`/api/v1/assignments?studentId=${studentId}`)
      .expect(200);
    const id = list.body.data[0].id;

    const patched = await agent
      .patch(`/api/v1/assignments/${id}`)
      .send({ title: `${PREFIX}after`, status: 'COMPLETED' })
      .expect(200);
    expect(patched.body.title).toContain('after');
    expect(patched.body.status).toBe('COMPLETED');
    expect(patched.body.completedAt).not.toBeNull();

    const reopened = await agent
      .patch(`/api/v1/assignments/${id}`)
      .send({ status: 'ASSIGNED' })
      .expect(200);
    expect(reopened.body.status).toBe('ASSIGNED');
    expect(reopened.body.completedAt).toBeNull();
  });

  it('cancels an assignment softly, keeping states and items', async () => {
    const studentId = await createStudent(`${PREFIX}Cancel`);
    const created = await agent
      .post('/api/v1/assignments')
      .send({
        studentId,
        title: `${PREFIX}to cancel`,
        senseIds: [SENSE_FINANCIAL, SENSE_RIVER],
      })
      .expect(201);
    const id = created.body.id;

    const res = await agent.delete(`/api/v1/assignments/${id}`).expect(200);
    expect(res.body.cancelled).toBe(true);

    const detail = await agent.get(`/api/v1/assignments/${id}`).expect(200);
    expect(detail.body.status).toBe('CANCELLED');
    expect(detail.body.totalItems).toBe(2);
    expect(await stateCount(studentId)).toBe(2);
  });

  it('exposes assignments through the student token surface', async () => {
    const studentId = await createStudent(`${PREFIX}TokenSurface`);
    const token = await tokenFor(studentId);

    const created = await agent
      .post('/api/v1/assignments')
      .send({
        studentId,
        title: `${PREFIX}visible`,
        senseIds: [SENSE_FINANCIAL],
      })
      .expect(201);
    const id = created.body.id;

    const list = await agent
      .get(`/api/v1/student-access/${token}/assignments`)
      .expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(id);
    expect(list.body[0].itemCount).toBe(1);

    const detail = await agent
      .get(`/api/v1/student-access/${token}/assignments/${id}`)
      .expect(200);
    expect(detail.body.id).toBe(id);
  });

  it('hides drafts/cancelled and foreign assignments from the student', async () => {
    const studentId = await createStudent(`${PREFIX}Hidden`);
    const otherId = await createStudent(`${PREFIX}Other`);
    const token = await tokenFor(studentId);

    const visible = await agent
      .post('/api/v1/assignments')
      .send({
        studentId,
        title: `${PREFIX}hidden visible`,
        senseIds: [SENSE_FINANCIAL],
      })
      .expect(201);
    const visibleId = visible.body.id;

    const draft = await agent
      .post('/api/v1/assignments')
      .send({
        studentId,
        title: `${PREFIX}draft`,
        senseIds: [SENSE_RIVER],
      })
      .expect(201);
    await agent
      .patch(`/api/v1/assignments/${draft.body.id}`)
      .send({ status: 'DRAFT' })
      .expect(200);

    await agent
      .post('/api/v1/assignments')
      .send({
        studentId: otherId,
        title: `${PREFIX}foreign`,
        senseIds: [SENSE_RIVER],
      })
      .expect(201);

    await agent.delete(`/api/v1/assignments/${visibleId}`).expect(200);

    const list = await agent
      .get(`/api/v1/student-access/${token}/assignments`)
      .expect(200);
    expect(list.body).toHaveLength(0);

    await agent
      .get(`/api/v1/student-access/${token}/assignments/${visibleId}`)
      .expect(404);
  });

  it('rolls back the whole assignment transaction on failure', async () => {
    const studentId = await createStudent(`${PREFIX}Rollback`);

    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION raise_on_probe() RETURNS trigger AS $$
      BEGIN
        IF NEW.title = '${PREFIX}ROLLBACK-PROBE' THEN
          RAISE EXCEPTION 'injected failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;`);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER trg_raise_on_probe
      BEFORE INSERT ON assignments
      FOR EACH ROW EXECUTE FUNCTION raise_on_probe();`);

    try {
      await agent
        .post('/api/v1/assignments')
        .send({
          studentId,
          title: `${PREFIX}ROLLBACK-PROBE`,
          senseIds: [SENSE_FINANCIAL, SENSE_RIVER],
        })
        .expect(500);
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS trg_raise_on_probe ON assignments;`,
      );
      await prisma.$executeRawUnsafe(
        `DROP FUNCTION IF EXISTS raise_on_probe();`,
      );
    }

    const leaked = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*) AS n FROM assignments
      WHERE title = '${PREFIX}ROLLBACK-PROBE'`;
    expect(Number(leaked[0]?.n ?? 0)).toBe(0);

    const leakedItems = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*) AS n
      FROM assignment_items ai
      JOIN assignments a ON a.id = ai.assignment_id
      WHERE a.title = '${PREFIX}ROLLBACK-PROBE'`;
    expect(Number(leakedItems[0]?.n ?? 0)).toBe(0);

    expect(await stateCount(studentId)).toBe(0);
  });
});
