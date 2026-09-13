import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import request from 'supertest';
import { App } from 'supertest/types';
import { hash } from 'bcryptjs';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import type { AddressInfo } from 'net';
import { PrismaService } from '../src/database/prisma.service';
import type {
  LiveStudentDto,
  MirrorPayload,
  PresencePayload,
  WatchResult,
} from '../src/realtime/realtime.types';
import {
  createTestApp,
  removeStudentsWithPrefix,
  seedTeacher,
  TEST_TEACHER,
} from './helpers';

jest.setTimeout(20_000);

const PREFIX = 'E2E Live ';

const SENSE_A = 4593;
const SENSE_B = 4603;

const TEACHER_B = {
  email: 'e2e-live-teacher-b@example.com',
  password: 'E2e-Live-Teacher-B-2026',
  displayName: 'E2E Live Teacher B',
};

type TeacherRecord = {
  id: number;
  accessToken: string;
};

function connect(role: 'teacher' | 'student', token: string, url: string) {
  return io(url, {
    auth: { role, token },
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    timeout: 5_000,
  });
}

function onConnect(client: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('socket connect timeout')),
      8_000,
    );
    client.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    client.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function onReady(
  client: ClientSocket,
  timeoutMs = 8_000,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('live:ready timeout')),
      timeoutMs,
    );
    client.once('live:ready', (payload) => {
      clearTimeout(timer);
      resolve(payload as Record<string, unknown>);
    });
    client.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/** Connect, then await server authentication (live:ready). The ready listener
 *  is registered BEFORE connect resolves to avoid missing the handshake event. */
async function connectAndReady(
  role: 'teacher' | 'student',
  token: string,
  url: string,
): Promise<{ client: ClientSocket; ready: Record<string, unknown> }> {
  const client = connect(role, token, url);
  const readyPromise = onReady(client);
  await onConnect(client);
  const ready = await readyPromise;
  return { client, ready };
}

function watch(client: ClientSocket, studentId: number): Promise<WatchResult> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('live:watch timeout')),
      8_000,
    );
    client.once('live:watch', (result) => {
      clearTimeout(timer);
      resolve(result as WatchResult);
    });
    client.emit('live:watch', { studentId });
  });
}

function waitEvent(
  client: ClientSocket,
  predicate: (payload: MirrorPayload) => boolean,
  timeoutMs = 10_000,
): Promise<MirrorPayload> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('live:event not received in time')),
      timeoutMs,
    );
    const handler = (payload: unknown) => {
      const typed = payload as MirrorPayload;
      if (predicate(typed)) {
        clearTimeout(timer);
        client.off('live:event', handler);
        resolve(typed);
      }
    };
    client.on('live:event', handler);
  });
}

function waitPresence(
  client: ClientSocket,
  predicate: (payload: PresencePayload) => boolean,
): Promise<PresencePayload> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('live:presence not received in time')),
      10_000,
    );
    const handler = (payload: unknown) => {
      const typed = payload as PresencePayload;
      if (predicate(typed)) {
        clearTimeout(timer);
        client.off('live:presence', handler);
        resolve(typed);
      }
    };
    client.on('live:presence', handler);
  });
}

describe('Realtime live mirror (e2e, real PostgreSQL)', () => {
  let app: INestApplication<App>;
  let agent: ReturnType<typeof request.agent>;
  let prisma: PrismaService;
  let url: string;
  let teacherA: TeacherRecord;
  let teacherB: TeacherRecord;

  beforeAll(async () => {
    app = await createTestApp();
    app.useWebSocketAdapter(new IoAdapter(app));
    await seedTeacher(app);
    prisma = app.get(PrismaService);
    agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/login').send({
      email: TEST_TEACHER.email,
      password: TEST_TEACHER.password,
    });
    await seedTeacherB();
    teacherA = await loginAs(TEST_TEACHER.email, TEST_TEACHER.password);
    teacherB = await loginAs(TEACHER_B.email, TEACHER_B.password);
    await app.listen(0);
    url = `http://localhost:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await removeStudentsWithPrefix(app, PREFIX);
    await prisma.teacher_accounts.deleteMany({
      where: { email: TEACHER_B.email },
    });
    await app.close();
  });

  async function loginAs(
    email: string,
    password: string,
  ): Promise<TeacherRecord> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return { id: res.body.teacher.id, accessToken: res.body.accessToken };
  }

  async function seedTeacherB(): Promise<void> {
    const passwordHash = await hash(TEACHER_B.password, 10);
    await prisma.teacher_accounts.upsert({
      where: { email: TEACHER_B.email },
      update: {
        password_hash: passwordHash,
        display_name: TEACHER_B.displayName,
        is_active: true,
      },
      create: {
        email: TEACHER_B.email,
        password_hash: passwordHash,
        display_name: TEACHER_B.displayName,
      },
    });
  }

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

  async function createActivityForTeacher(
    teacherToken: string,
    studentId: number,
    senseIds: number[],
  ): Promise<number> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        studentId,
        title: 'Live mirror activity',
        activityType: 'FLASHCARDS',
        senseIds,
      })
      .expect(201);
    return res.body.id as number;
  }

  async function startActivity(
    studentToken: string,
    activityId: number,
  ): Promise<number> {
    const res = await request(app.getHttpServer())
      .post(
        `/api/v1/student-access/${studentToken}/activities/${activityId}/start`,
      )
      .expect(201);
    return res.body.session.id as number;
  }

  async function postEvent(
    studentToken: string,
    sessionId: number,
    body: Record<string, unknown>,
  ): Promise<void> {
    await request(app.getHttpServer())
      .post(
        `/api/v1/student-access/${studentToken}/activity-sessions/${sessionId}/events`,
      )
      .send(body)
      .expect(201);
  }

  function closeSockets(...sockets: Array<ClientSocket | undefined>) {
    for (const socket of sockets) {
      if (socket) socket.disconnect();
    }
  }

  // ------------------------------------------------------------------ tests

  it('rejects unauthenticated live snapshot (401)', async () => {
    await request(app.getHttpServer()).get('/api/v1/realtime/live').expect(401);
  });

  it('rejects unauthenticated realtime credentials (401)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/realtime/credentials')
      .expect(401);
  });

  it('issues realtime credentials usable for the teacher socket', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/realtime/credentials')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .expect(200);
    const credential = res.body.accessToken as string;
    expect(typeof credential).toBe('string');
    expect(credential.length).toBeGreaterThan(0);

    const { client } = await connectAndReady('teacher', credential, url);
    expect(client.connected).toBe(true);
    closeSockets(client);
  });

  it('lists every student in the HTTP live snapshot (single-teacher roster)', async () => {
    const ownedByA = await createStudent(`${PREFIX}OwnedByA`);
    const ownedByB = await createStudent(`${PREFIX}OwnedByB`);
    await createActivityForTeacher(teacherA.accessToken, ownedByA, [SENSE_A]);
    await createActivityForTeacher(teacherB.accessToken, ownedByB, [SENSE_B]);

    const res = await request(app.getHttpServer())
      .get('/api/v1/realtime/live')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .expect(200);
    const body = res.body as LiveStudentDto[];
    const ids = body.map((s) => s.studentId);
    expect(ids).toContain(ownedByA);
    expect(ids).toContain(ownedByB);
  });

  it('rejects a student socket with an invalid token', async () => {
    const client = connect('student', 'not-a-valid-token', url);
    await expect(onReady(client, 1_500)).rejects.toThrow();
    closeSockets(client);
  });

  it('connects a valid student socket and reports presence', async () => {
    const studentId = await createStudent(`${PREFIX}SocketA`);
    const token = await tokenFor(studentId);
    const { client, ready } = await connectAndReady('student', token, url);
    expect(ready.studentId).toBe(studentId);
    expect(ready.online).toBe(true);
    closeSockets(client);
  });

  it('allows teacher watch on any student (single-teacher roster)', async () => {
    const forA = await createStudent(`${PREFIX}DeniedA`);
    const forB = await createStudent(`${PREFIX}DeniedB`);
    await createActivityForTeacher(teacherA.accessToken, forA, [SENSE_A]);
    await createActivityForTeacher(teacherB.accessToken, forB, [SENSE_B]);

    const { client } = await connectAndReady(
      'teacher',
      teacherA.accessToken,
      url,
    );

    const result = await watch(client, forB);
    expect(result.allowed).toBe(true);

    closeSockets(client);
  });

  it('mirrors activity events to an owning teacher in near-real-time', async () => {
    const studentId = await createStudent(`${PREFIX}MirrorA`);
    const token = await tokenFor(studentId);
    const activityId = await createActivityForTeacher(
      teacherA.accessToken,
      studentId,
      [SENSE_A, SENSE_B],
    );

    const teacher = await connectAndReady('teacher', teacherA.accessToken, url);
    expect((await watch(teacher.client, studentId)).allowed).toBe(true);

    const startedPromise = waitEvent(
      teacher.client,
      (p) => p.eventType === 'ACTIVITY_STARTED',
    );
    const sessionId = await startActivity(token, activityId);
    const started = await startedPromise;
    expect(started.sessionId).toBe(sessionId);
    expect(started.activityId).toBe(activityId);
    expect(started.activityType).toBeTruthy();
    expect(started.status).toBe('ACTIVE');

    const cardPromise = waitEvent(
      teacher.client,
      (p) => p.eventType === 'CARD_SHOWN',
    );
    await postEvent(token, sessionId, {
      eventType: 'CARD_SHOWN',
      vocabularySenseId: SENSE_A,
    });
    const card = await cardPromise;
    expect(card.senseId).toBe(SENSE_A);
    expect(card.progress).toBeGreaterThanOrEqual(0);

    closeSockets(teacher.client);
  });

  it('does not leak a student activity to an unrelated teacher', async () => {
    const studentA = await createStudent(`${PREFIX}IsolationA`);
    const studentB = await createStudent(`${PREFIX}IsolationB`);
    const tokenA = await tokenFor(studentA);
    const activityA = await createActivityForTeacher(
      teacherA.accessToken,
      studentA,
      [SENSE_A],
    );
    await createActivityForTeacher(teacherB.accessToken, studentB, [SENSE_B]);

    const watcherB = await connectAndReady(
      'teacher',
      teacherB.accessToken,
      url,
    );
    expect((await watch(watcherB.client, studentB)).allowed).toBe(true);

    const foreign = waitEvent(watcherB.client, () => true, 800);
    await startActivity(tokenA, activityA);

    await expect(foreign).rejects.toThrow('not received');
    closeSockets(watcherB.client);
  });

  it('delivers student presence (online/session) to a watching teacher', async () => {
    const studentId = await createStudent(`${PREFIX}PresenceA`);
    const token = await tokenFor(studentId);
    await createActivityForTeacher(teacherA.accessToken, studentId, [SENSE_A]);

    const teacher = await connectAndReady('teacher', teacherA.accessToken, url);
    expect((await watch(teacher.client, studentId)).allowed).toBe(true);

    const presencePromise = waitPresence(
      teacher.client,
      (p) =>
        p.studentId === studentId && p.online === true && p.sessionId !== null,
    );
    const student = await connectAndReady('student', token, url);
    student.client.emit('live:identify', { sessionId: 42 });

    const presence = await presencePromise;
    expect(presence.sessionId).toBe(42);

    closeSockets(teacher.client, student.client);
  });

  it('never persists anything through the socket channel', async () => {
    const studentId = await createStudent(`${PREFIX}NoMutate`);
    const token = await tokenFor(studentId);

    const before = await prisma.$transaction([
      prisma.activity_events.count({
        where: { student_id: BigInt(studentId) },
      }),
      prisma.activity_sessions.count({
        where: { student_id: BigInt(studentId) },
      }),
      prisma.vocabulary_review_history.count({
        where: { student_id: BigInt(studentId) },
      }),
    ]);

    const client = await connectAndReady('student', token, url);
    client.client.emit('live:identify', { sessionId: 7 });
    client.client.emit('live:heartbeat');
    client.client.disconnect();
    await new Promise((r) => setTimeout(r, 300));

    const after = await prisma.$transaction([
      prisma.activity_events.count({
        where: { student_id: BigInt(studentId) },
      }),
      prisma.activity_sessions.count({
        where: { student_id: BigInt(studentId) },
      }),
      prisma.vocabulary_review_history.count({
        where: { student_id: BigInt(studentId) },
      }),
    ]);
    expect(after).toEqual(before);
  });
});
