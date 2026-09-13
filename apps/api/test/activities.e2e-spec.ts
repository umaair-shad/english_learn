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

const PREFIX = 'E2E Act ';

const SENSE_FINANCIAL = 4593;
const SENSE_RIVER = 4603;
const SENSE_MISSING = 999_999_999;

describe('Activities (e2e, real PostgreSQL)', () => {
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

  async function createAssignment(
    studentId: number,
    title: string,
    senseIds: number[],
  ): Promise<number> {
    const res = await agent
      .post('/api/v1/assignments')
      .send({ studentId, title, senseIds })
      .expect(201);
    return res.body.id as number;
  }

  async function createActivity(
    body: Record<string, unknown>,
  ): Promise<number> {
    const res = await agent.post('/api/v1/activities').send(body);
    if (res.status !== 201) {
      console.error(
        'createActivity error:',
        res.status,
        JSON.stringify(res.body),
      );
    }
    expect(res.status).toBe(201);
    return res.body.id as number;
  }

  async function startActivity(
    token: string,
    activityId: number,
  ): Promise<number> {
    const res = await agent
      .post(`/api/v1/student-access/${token}/activities/${activityId}/start`)
      .expect(201);
    return res.body.session.id as number;
  }

  async function historyCount(
    studentId: number,
    senseId: number,
    sourceId: number,
  ): Promise<number> {
    const count = await prisma.vocabulary_review_history.count({
      where: {
        student_id: BigInt(studentId),
        vocabulary_sense_id: BigInt(senseId),
        source_type: 'activity',
        source_id: BigInt(sourceId),
      },
    });
    return Number(count);
  }

  it('rejects unauthenticated activity access (401)', async () => {
    await request(app.getHttpServer()).get('/api/v1/activities').expect(401);
  });

  it('creates a manual activity and deduplicates sense ids', async () => {
    const studentId = await createStudent(`${PREFIX}Manual`);
    const id = await createActivity({
      studentId,
      title: `${PREFIX}Manual activity`,
      activityType: 'FLASHCARDS',
      senseIds: [SENSE_FINANCIAL, SENSE_FINANCIAL, SENSE_RIVER],
    });

    const detail = await agent.get(`/api/v1/activities/${id}`).expect(200);
    expect(detail.body.status).toBe('ACTIVE');
    expect(detail.body.activityType).toBe('FLASHCARDS');
    expect(detail.body.itemCount).toBe(2);
    expect(
      detail.body.items.map((i: { senseId: number }) => i.senseId),
    ).toEqual([SENSE_FINANCIAL, SENSE_RIVER]);
    expect(Array.isArray(detail.body.items[0].examples)).toBe(true);
  });

  it('rejects manual creation with an unknown sense (404)', async () => {
    const studentId = await createStudent(`${PREFIX}BadSense`);
    await agent
      .post('/api/v1/activities')
      .send({
        studentId,
        title: `${PREFIX}bad`,
        activityType: 'QUIZ',
        senseIds: [SENSE_MISSING],
      })
      .expect(404);
  });

  it('rejects creation for a deactivated student (400)', async () => {
    const studentId = await createStudent(`${PREFIX}Inactive`);
    await agent
      .patch(`/api/v1/students/${studentId}`)
      .send({ isActive: false })
      .expect(200);
    await agent
      .post('/api/v1/activities')
      .send({
        studentId,
        title: `${PREFIX}blocked`,
        activityType: 'MEMORY',
        senseIds: [SENSE_FINANCIAL],
      })
      .expect(400);
  });

  it('builds an activity from an assignment (all items by default)', async () => {
    const studentId = await createStudent(`${PREFIX}FromAss`);
    const assignmentId = await createAssignment(studentId, `${PREFIX}ass`, [
      SENSE_FINANCIAL,
      SENSE_RIVER,
    ]);
    const id = await createActivity({
      studentId,
      assignmentId,
      title: `${PREFIX}From assignment`,
      activityType: 'QUIZ',
      settings: { shuffle: true },
    });

    const detail = await agent.get(`/api/v1/activities/${id}`).expect(200);
    expect(detail.body.assignment.id).toBe(assignmentId);
    expect(detail.body.itemCount).toBe(2);
    expect(detail.body.settings).toEqual({ shuffle: true });
  });

  it('honors itemCount when building from an assignment', async () => {
    const studentId = await createStudent(`${PREFIX}FirstN`);
    const assignmentId = await createAssignment(studentId, `${PREFIX}firstn`, [
      SENSE_FINANCIAL,
      SENSE_RIVER,
    ]);
    const id = await createActivity({
      studentId,
      assignmentId,
      title: `${PREFIX}First N`,
      activityType: 'FLASHCARDS',
      itemCount: 1,
    });
    const detail = await agent.get(`/api/v1/activities/${id}`).expect(200);
    expect(detail.body.itemCount).toBe(1);
    expect(
      detail.body.items.map((i: { senseId: number }) => i.senseId),
    ).toEqual([SENSE_FINANCIAL]);
  });

  it('rejects senses outside the assignment (400)', async () => {
    const studentId = await createStudent(`${PREFIX}Mismatch`);
    const assignmentId = await createAssignment(
      studentId,
      `${PREFIX}mismatch`,
      [SENSE_FINANCIAL],
    );
    await agent
      .post('/api/v1/activities')
      .send({
        studentId,
        assignmentId,
        title: `${PREFIX}bad subset`,
        activityType: 'QUIZ',
        senseIds: [SENSE_RIVER],
      })
      .expect(400);
  });

  it('rejects an assignment that belongs to another student (400)', async () => {
    const owner = await createStudent(`${PREFIX}Owner`);
    const stranger = await createStudent(`${PREFIX}Stranger`);
    const assignmentId = await createAssignment(owner, `${PREFIX}owner-ass`, [
      SENSE_FINANCIAL,
    ]);
    await agent
      .post('/api/v1/activities')
      .send({
        studentId: stranger,
        assignmentId,
        title: `${PREFIX}foreign`,
        activityType: 'MEMORY',
      })
      .expect(400);
  });

  it('updates activity metadata and blocks updates of cancelled activities', async () => {
    const studentId = await createStudent(`${PREFIX}Update`);
    const id = await createActivity({
      studentId,
      title: `${PREFIX}original`,
      activityType: 'FLASHCARDS',
      senseIds: [SENSE_FINANCIAL],
    });
    const patched = await agent
      .patch(`/api/v1/activities/${id}`)
      .send({
        title: `${PREFIX}renamed`,
        description: 'desc',
        settings: { repeat: 3 },
      })
      .expect(200);
    expect(patched.body.title).toBe(`${PREFIX}renamed`);
    expect(patched.body.settings).toEqual({ repeat: 3 });

    const removed = await agent.delete(`/api/v1/activities/${id}`).expect(200);
    expect(removed.body.cancelled).toBe(false);

    await agent
      .patch(`/api/v1/activities/${id}`)
      .send({ title: 'nope' })
      .expect(404);
    await agent.get(`/api/v1/activities/${id}`).expect(404);

    const cancelled = await createActivity({
      studentId,
      title: `${PREFIX}softcancelled`,
      activityType: 'MEMORY',
      senseIds: [SENSE_RIVER],
    });
    await agent
      .patch(`/api/v1/activities/${cancelled}`)
      .send({ status: 'CANCELLED' })
      .expect(200);
    await agent
      .patch(`/api/v1/activities/${cancelled}`)
      .send({ title: 'nope' })
      .expect(400);
  });

  it('starts a session, appends ACTIVITY_STARTED, and resumes the same session', async () => {
    const studentId = await createStudent(`${PREFIX}Start`);
    const token = await tokenFor(studentId);
    const id = await createActivity({
      studentId,
      title: `${PREFIX}start`,
      activityType: 'MEMORY',
      senseIds: [SENSE_FINANCIAL, SENSE_RIVER],
    });

    const first = await agent
      .post(`/api/v1/student-access/${token}/activities/${id}/start`)
      .expect(201);
    const session = first.body.session;
    expect(session.status).toBe('ACTIVE');
    expect(session.totalItems).toBe(2);
    expect(first.body.items).toHaveLength(2);

    const again = await agent
      .post(`/api/v1/student-access/${token}/activities/${id}/start`)
      .expect(201);
    expect(again.body.session.id).toBe(session.id);

    const startedEvents = await prisma.activity_events.count({
      where: {
        session_id: BigInt(session.id),
        event_type: 'ACTIVITY_STARTED',
      },
    });
    expect(Number(startedEvents)).toBe(1);
  });

  it('refuses to start a DRAFT activity (403)', async () => {
    const studentId = await createStudent(`${PREFIX}Draft`);
    const token = await tokenFor(studentId);
    const id = await createActivity({
      studentId,
      title: `${PREFIX}draft`,
      activityType: 'QUIZ',
      senseIds: [SENSE_FINANCIAL],
    });
    await agent
      .patch(`/api/v1/activities/${id}`)
      .send({ status: 'DRAFT' })
      .expect(200);
    await agent
      .post(`/api/v1/student-access/${token}/activities/${id}/start`)
      .expect(403);
  });

  it('handles pause/resume/finish lifecycle with events', async () => {
    const studentId = await createStudent(`${PREFIX}Lifecycle`);
    const token = await tokenFor(studentId);
    const id = await createActivity({
      studentId,
      title: `${PREFIX}lifecycle`,
      activityType: 'FILL_BLANK',
      senseIds: [SENSE_FINANCIAL],
    });
    const sessionId = await startActivity(token, id);

    const paused = await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/pause`,
      )
      .expect(200);
    expect(paused.body.status).toBe('PAUSED');
    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/pause`,
      )
      .expect(409);

    const resumed = await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/resume`,
      )
      .expect(200);
    expect(resumed.body.status).toBe('ACTIVE');
    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/resume`,
      )
      .expect(409);

    const finished = await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/finish`,
      )
      .expect(200);
    expect(finished.body.status).toBe('FINISHED');
    const finishedAgain = await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/finish`,
      )
      .expect(200);
    expect(finishedAgain.body.status).toBe('FINISHED');

    const types = await prisma.activity_events.findMany({
      where: { session_id: BigInt(sessionId) },
      select: { event_type: true },
      orderBy: { id: 'asc' },
    });
    expect(types.map((t) => t.event_type)).toEqual([
      'ACTIVITY_STARTED',
      'PAUSED',
      'RESUMED',
      'FINISHED',
    ]);
  });

  it('rejects postable lifecycle events and non-postable types', async () => {
    const studentId = await createStudent(`${PREFIX}Forge`);
    const token = await tokenFor(studentId);
    const id = await createActivity({
      studentId,
      title: `${PREFIX}forge`,
      activityType: 'FLASHCARDS',
      senseIds: [SENSE_FINANCIAL],
    });
    const sessionId = await startActivity(token, id);

    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({ eventType: 'PAUSED' })
      .expect(400);
    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({ eventType: 'ACTIVITY_STARTED' })
      .expect(400);
  });

  it('rejects events for senses outside the activity (400)', async () => {
    const studentId = await createStudent(`${PREFIX}ForeignSense`);
    const token = await tokenFor(studentId);
    const id = await createActivity({
      studentId,
      title: `${PREFIX}foreignsense`,
      activityType: 'MEMORY',
      senseIds: [SENSE_FINANCIAL],
    });
    const sessionId = await startActivity(token, id);

    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({
        eventType: 'CARD_SHOWN',
        vocabularySenseId: SENSE_RIVER,
      })
      .expect(400);
  });

  it('rejects ratings on non-answer events (400)', async () => {
    const studentId = await createStudent(`${PREFIX}BadRating`);
    const token = await tokenFor(studentId);
    const id = await createActivity({
      studentId,
      title: `${PREFIX}badrating`,
      activityType: 'FLASHCARDS',
      senseIds: [SENSE_FINANCIAL],
    });
    const sessionId = await startActivity(token, id);
    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({
        eventType: 'CARD_SHOWN',
        vocabularySenseId: SENSE_FINANCIAL,
        rating: 'GOOD',
      })
      .expect(400);
  });

  it('records correct answers with a rating and drives FSRS once', async () => {
    const studentId = await createStudent(`${PREFIX}Correct`);
    const token = await tokenFor(studentId);
    const id = await createActivity({
      studentId,
      title: `${PREFIX}correct`,
      activityType: 'FLASHCARDS',
      senseIds: [SENSE_FINANCIAL, SENSE_RIVER],
    });
    const sessionId = await startActivity(token, id);

    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({
        eventType: 'CARD_SHOWN',
        vocabularySenseId: SENSE_FINANCIAL,
        responseTimeMs: 1200,
      })
      .expect(201);
    const correct = await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({
        eventType: 'ANSWER_CORRECT',
        vocabularySenseId: SENSE_FINANCIAL,
        isCorrect: true,
        responseTimeMs: 800,
        rating: 'GOOD',
      })
      .expect(201);

    expect(correct.body.status).toBe('ACTIVE');
    expect(correct.body.correctCount).toBe(1);
    expect(correct.body.incorrectCount).toBe(0);
    expect(correct.body.completedCount).toBe(1);
    expect(correct.body.percentComplete).toBe(50);

    const state = await prisma.student_vocabulary_states.findUnique({
      where: {
        student_id_vocabulary_sense_id: {
          student_id: BigInt(studentId),
          vocabulary_sense_id: BigInt(SENSE_FINANCIAL),
        },
      },
    });
    expect(state?.status).not.toBe('ASSIGNED');
    expect(await historyCount(studentId, SENSE_FINANCIAL, id)).toBe(1);

    const sessionState = await agent
      .get(`/api/v1/student-access/${token}/activity-sessions/${sessionId}`)
      .expect(200);
    expect(sessionState.body.percentComplete).toBe(50);
    expect(sessionState.body.currentItemIndex).toBe(1);
  });

  it('records incorrect answers and exposes the open timeline to the teacher', async () => {
    const studentId = await createStudent(`${PREFIX}Incorrect`);
    const token = await tokenFor(studentId);
    const id = await createActivity({
      studentId,
      title: `${PREFIX}incorrect`,
      activityType: 'FLASHCARDS',
      senseIds: [SENSE_FINANCIAL],
    });
    const sessionId = await startActivity(token, id);

    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({
        eventType: 'ANSWER_SUBMITTED',
        vocabularySenseId: SENSE_FINANCIAL,
        response: 'a bank',
        isCorrect: true,
      })
      .expect(201);
    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({
        eventType: 'ANSWER_INCORRECT',
        vocabularySenseId: SENSE_FINANCIAL,
        response: 'a river',
        isCorrect: false,
        rating: 'AGAIN',
        responseTimeMs: 1500,
      })
      .expect(201);

    const events = await agent
      .get(`/api/v1/activity-sessions/${sessionId}/events`)
      .expect(200);
    expect(events.body.meta.total).toBe(3);
    const types = events.body.data.map(
      (e: { eventType: string }) => e.eventType,
    );
    expect(types).toEqual([
      'ACTIVITY_STARTED',
      'ANSWER_SUBMITTED',
      'ANSWER_INCORRECT',
    ]);

    const answered = events.body.data.find(
      (e: { eventType: string }) => e.eventType === 'ANSWER_INCORRECT',
    );
    expect(answered.sense.lemma).toBeTruthy();
    expect(answered.isCorrect).toBe(false);

    const state = await prisma.student_vocabulary_states.findUnique({
      where: {
        student_id_vocabulary_sense_id: {
          student_id: BigInt(studentId),
          vocabulary_sense_id: BigInt(SENSE_FINANCIAL),
        },
      },
    });
    expect(Number(state?.incorrect_count ?? 0)).toBe(1);

    const teacherSession = await agent
      .get(`/api/v1/activity-sessions/${sessionId}`)
      .expect(200);
    expect(teacherSession.body.incorrectCount).toBe(1);
    expect(teacherSession.body.completedCount).toBe(1);
  });

  it('memory: MATCH_FAILED scores last-answer-wins; MATCH_FOUND + answer keeps FSRS once', async () => {
    const studentId = await createStudent(`${PREFIX}MemoryFlow`);
    const token = await tokenFor(studentId);
    const id = await createActivity({
      studentId,
      title: `${PREFIX}memoryflow`,
      activityType: 'MEMORY',
      senseIds: [SENSE_FINANCIAL, SENSE_RIVER],
    });
    const sessionId = await startActivity(token, id);

    // MATCH_FAILED is graded for session progress (last-answer-wins) but
    // never writes an FSRS review.
    const miss = await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({
        eventType: 'MATCH_FAILED',
        vocabularySenseId: SENSE_FINANCIAL,
        response: 'bank / rzeka',
      })
      .expect(201);
    expect(miss.body.correctCount).toBe(0);
    expect(miss.body.incorrectCount).toBe(1);
    expect(miss.body.completedCount).toBe(1);
    expect(await historyCount(studentId, SENSE_FINANCIAL, id)).toBe(0);

    // A resolved pair: MATCH_FOUND records the gameplay event and the
    // companion answer event drives the standard FSRS bridge exactly once.
    // Last-answer-wins then counts the sense as correct.
    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({ eventType: 'MATCH_FOUND', vocabularySenseId: SENSE_FINANCIAL })
      .expect(201);
    const resolved = await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({
        eventType: 'ANSWER_CORRECT',
        vocabularySenseId: SENSE_FINANCIAL,
        rating: 'GOOD',
      })
      .expect(201);
    expect(resolved.body.correctCount).toBe(1);
    expect(resolved.body.incorrectCount).toBe(0);
    expect(resolved.body.completedCount).toBe(1);
    expect(resolved.body.percentComplete).toBe(50);
    expect(await historyCount(studentId, SENSE_FINANCIAL, id)).toBe(1);

    const types = await agent
      .get(`/api/v1/activity-sessions/${sessionId}/events`)
      .expect(200);
    expect(
      types.body.data.map((e: { eventType: string }) => e.eventType),
    ).toEqual([
      'ACTIVITY_STARTED',
      'MATCH_FAILED',
      'MATCH_FOUND',
      'ANSWER_CORRECT',
    ]);
  });

  it('seeds only one review and leaves non-answer events out of FSRS', async () => {
    const studentId = await createStudent(`${PREFIX}NoSpam`);
    const token = await tokenFor(studentId);
    const id = await createActivity({
      studentId,
      title: `${PREFIX}nospam`,
      activityType: 'QUIZ',
      senseIds: [SENSE_FINANCIAL, SENSE_RIVER],
    });
    const sessionId = await startActivity(token, id);

    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({ eventType: 'CARD_SHOWN', vocabularySenseId: SENSE_FINANCIAL })
      .expect(201);
    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({
        eventType: 'ANSWER_SUBMITTED',
        vocabularySenseId: SENSE_FINANCIAL,
      })
      .expect(201);
    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({
        eventType: 'ANSWER_CORRECT',
        vocabularySenseId: SENSE_FINANCIAL,
        rating: 'GOOD',
      })
      .expect(201);
    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({
        eventType: 'QUESTION_COMPLETED',
        vocabularySenseId: SENSE_FINANCIAL,
      })
      .expect(201);

    expect(await historyCount(studentId, SENSE_FINANCIAL, id)).toBe(1);
    const totalHistory = await prisma.vocabulary_review_history.count({
      where: { student_id: BigInt(studentId) },
    });
    expect(Number(totalHistory)).toBe(1);
  });

  it('shares learning progress across activities (single state row)', async () => {
    const studentId = await createStudent(`${PREFIX}Cross`);
    const token = await tokenFor(studentId);
    const a = await createActivity({
      studentId,
      title: `${PREFIX}cross A`,
      activityType: 'FLASHCARDS',
      senseIds: [SENSE_FINANCIAL],
    });
    const b = await createActivity({
      studentId,
      title: `${PREFIX}cross B`,
      activityType: 'MEMORY',
      senseIds: [SENSE_FINANCIAL, SENSE_RIVER],
    });
    const sessionA = await startActivity(token, a);
    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionA}/events`,
      )
      .send({
        eventType: 'ANSWER_CORRECT',
        vocabularySenseId: SENSE_FINANCIAL,
        rating: 'GOOD',
      })
      .expect(201);

    const state = await prisma.student_vocabulary_states.findUnique({
      where: {
        student_id_vocabulary_sense_id: {
          student_id: BigInt(studentId),
          vocabulary_sense_id: BigInt(SENSE_FINANCIAL),
        },
      },
    });
    expect(state?.status).not.toBe('ASSIGNED');

    const sessionB = await startActivity(token, b);
    const eventsB = await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionB}/events`,
      )
      .send({
        eventType: 'ANSWER_CORRECT',
        vocabularySenseId: SENSE_FINANCIAL,
        rating: 'EASY',
      })
      .expect(201);
    expect(eventsB.body.completedCount).toBe(1);
    expect(await historyCount(studentId, SENSE_FINANCIAL, a)).toBe(1);
    expect(await historyCount(studentId, SENSE_FINANCIAL, b)).toBe(1);
    const stateAfter = await prisma.student_vocabulary_states.findUnique({
      where: {
        student_id_vocabulary_sense_id: {
          student_id: BigInt(studentId),
          vocabulary_sense_id: BigInt(SENSE_FINANCIAL),
        },
      },
    });
    expect(Number(stateAfter?.review_count ?? 0)).toBe(2);
  });

  it('isolates sessions: another student or a revoked token cannot touch them', async () => {
    const alice = await createStudent(`${PREFIX}Alice`);
    const bob = await createStudent(`${PREFIX}Bob`);
    const tokenA = await tokenFor(alice);
    const tokenB = await tokenFor(bob);
    const id = await createActivity({
      studentId: alice,
      title: `${PREFIX}isolated`,
      activityType: 'FLASHCARDS',
      senseIds: [SENSE_FINANCIAL],
    });
    const sessionId = await startActivity(tokenA, id);

    await agent
      .get(`/api/v1/student-access/${tokenB}/activity-sessions/${sessionId}`)
      .expect(404);
    await agent
      .post(
        `/api/v1/student-access/${tokenB}/activity-sessions/${sessionId}/finish`,
      )
      .expect(404);
    await agent
      .get(`/api/v1/student-access/${tokenB}/activities/${id}`)
      .expect(404);

    await agent
      .post(`/api/v1/students/${alice}/access-token/revoke`)
      .expect(200);
    await agent
      .post(
        `/api/v1/student-access/${tokenA}/activity-sessions/${sessionId}/finish`,
      )
      .expect(404);
  });

  it('lists only the student own activities on the token dashboard', async () => {
    const alice = await createStudent(`${PREFIX}DashAlice`);
    const bob = await createStudent(`${PREFIX}DashBob`);
    const tokenA = await tokenFor(alice);
    void bob;
    const id = await createActivity({
      studentId: alice,
      title: `${PREFIX}dash`,
      activityType: 'QUIZ',
      senseIds: [SENSE_FINANCIAL],
    });

    const list = await agent
      .get(`/api/v1/student-access/${tokenA}/activities`)
      .expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(id);
    expect(list.body[0].latestSession).toBeNull();

    const teacherList = await agent
      .get(`/api/v1/students/${alice}/activities`)
      .expect(200);
    expect(teacherList.body).toHaveLength(1);
  });

  it('soft-cancels an activity that already has sessions', async () => {
    const studentId = await createStudent(`${PREFIX}SoftCancel`);
    const token = await tokenFor(studentId);
    const id = await createActivity({
      studentId,
      title: `${PREFIX}softcancel`,
      activityType: 'FLASHCARDS',
      senseIds: [SENSE_FINANCIAL],
    });
    await startActivity(token, id);

    const removed = await agent.delete(`/api/v1/activities/${id}`).expect(200);
    expect(removed.body.cancelled).toBe(true);
    const detail = await agent.get(`/api/v1/activities/${id}`).expect(200);
    expect(detail.body.status).toBe('CANCELLED');
    const again = await agent.delete(`/api/v1/activities/${id}`).expect(200);
    expect(again.body.cancelled).toBe(true);
  });

  it('prevents events on finished sessions (409)', async () => {
    const studentId = await createStudent(`${PREFIX}AfterFinish`);
    const token = await tokenFor(studentId);
    const id = await createActivity({
      studentId,
      title: `${PREFIX}afterfinish`,
      activityType: 'FLASHCARDS',
      senseIds: [SENSE_FINANCIAL],
    });
    const sessionId = await startActivity(token, id);
    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/finish`,
      )
      .expect(200);
    await agent
      .post(
        `/api/v1/student-access/${token}/activity-sessions/${sessionId}/events`,
      )
      .send({ eventType: 'CARD_SHOWN', vocabularySenseId: SENSE_FINANCIAL })
      .expect(409);
  });

  it('filters the teacher activity list', async () => {
    const studentId = await createStudent(`${PREFIX}Filter`);
    await createActivity({
      studentId,
      title: `${PREFIX}filter quiz`,
      activityType: 'QUIZ',
      senseIds: [SENSE_FINANCIAL],
    });
    await createActivity({
      studentId,
      title: `${PREFIX}filter memory`,
      activityType: 'MEMORY',
      senseIds: [SENSE_RIVER],
    });

    const byType = await agent
      .get(`/api/v1/activities?activityType=QUIZ`)
      .expect(200);
    expect(
      byType.body.data.every(
        (a: { activityType: string }) => a.activityType === 'QUIZ',
      ),
    ).toBe(true);

    const bySearch = await agent
      .get(`/api/v1/activities?search=${encodeURIComponent('filter memory')}`)
      .expect(200);
    expect(bySearch.body.data).toHaveLength(1);

    const byStudent = await agent
      .get(`/api/v1/activities?studentId=${studentId}`)
      .expect(200);
    expect(
      byStudent.body.data.every(
        (a: { studentId: number }) => a.studentId === studentId,
      ),
    ).toBe(true);
  });

  it('rolls back the whole session transaction on failure', async () => {
    const studentId = await createStudent(`${PREFIX}Rollback`);
    const token = await tokenFor(studentId);
    const id = await createActivity({
      studentId,
      title: `${PREFIX}rollback`,
      activityType: 'FLASHCARDS',
      senseIds: [SENSE_FINANCIAL],
    });

    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION raise_on_probe() RETURNS trigger AS $$
      BEGIN
        IF NEW.started_at = NOW() OR TRUE THEN
          RAISE EXCEPTION 'injected failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;`);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER trg_raise_on_probe
      BEFORE INSERT ON activity_sessions
      FOR EACH ROW EXECUTE FUNCTION raise_on_probe();`);

    try {
      await agent
        .post(`/api/v1/student-access/${token}/activities/${id}/start`)
        .expect(500);
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS trg_raise_on_probe ON activity_sessions;`,
      );
      await prisma.$executeRawUnsafe(
        `DROP FUNCTION IF EXISTS raise_on_probe();`,
      );
    }

    const sessions = await prisma.activity_sessions.count({
      where: { activity_id: BigInt(id) },
    });
    expect(Number(sessions)).toBe(0);
    const events = await prisma.activity_events.count({
      where: { activity_id: BigInt(id) },
    });
    expect(Number(events)).toBe(0);
  });
});
