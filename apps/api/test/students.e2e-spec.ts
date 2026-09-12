import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/database/prisma.service';
import { hashAccessToken } from '../src/common/utils/access-token.util';
import {
  createTestApp,
  removeStudentsWithPrefix,
  seedTeacher,
  TEST_TEACHER,
} from './helpers';

const PREFIX = 'E2E Student ';

describe('Students + private access tokens (e2e, real PostgreSQL)', () => {
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

  async function createStudent(displayName: string) {
    const res = await agent
      .post('/api/v1/students')
      .send({
        firstName: displayName,
        displayName,
        notes: 'e2e test student',
      })
      .expect(201);
    return res.body as { id: number };
  }

  it('creates a student', async () => {
    const student = await createStudent(`${PREFIX}Alpha`);
    expect(student.id).toBeGreaterThan(0);
  });

  it('lists students with pagination metadata', async () => {
    await createStudent(`${PREFIX}Beta`);
    await createStudent(`${PREFIX}Gamma`);
    const res = await agent
      .get('/api/v1/students')
      .query({ search: 'E2E Student', page: 1, limit: 2, isActive: 'true' })
      .expect(200);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(3);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(2);
  });

  it('searches and filters by active status', async () => {
    const res = await agent
      .get('/api/v1/students')
      .query({ search: 'Alpha', isActive: 'true' })
      .expect(200);
    expect(
      res.body.data.every((s: { firstName: string }) =>
        s.firstName.includes('Alpha'),
      ),
    ).toBe(true);
  });

  it('updates and soft-deactivates a student', async () => {
    const { id } = await createStudent(`${PREFIX}Delta`);
    const patched = await agent
      .patch(`/api/v1/students/${id}`)
      .send({ notes: 'updated notes' })
      .expect(200);
    expect(patched.body.notes).toBe('updated notes');

    await agent.delete(`/api/v1/students/${id}`).expect(200);
    const fetched = await agent.get(`/api/v1/students/${id}`).expect(200);
    expect(fetched.body.isActive).toBe(false);
  });

  it('generates a private access token', async () => {
    const { id } = await createStudent(`${PREFIX}TokenA`);
    const res = await agent
      .post(`/api/v1/students/${id}/access-token`)
      .send({})
      .expect(201);
    expect(res.body.rawToken).toMatch(/^[0-9a-f]{64}$/);
    expect(res.body.url).toBe(`/student/${res.body.rawToken}`);
  });

  it('resolves the valid token to the correct student (public endpoint)', async () => {
    const { id } = await createStudent(`${PREFIX}Resolve`);
    const tokenRes = await agent
      .post(`/api/v1/students/${id}/access-token`)
      .send({})
      .expect(201);
    const res = await request(app.getHttpServer())
      .get(`/api/v1/student-access/${tokenRes.body.rawToken}`)
      .expect(200);
    expect(res.body.student.id).toBe(id);
    expect(res.body.student.displayName).toBe(`${PREFIX}Resolve`);
    expect(res.body.student.notes).toBeUndefined();
    expect(res.body.student.isActive).toBeUndefined();
  });

  it('records last used time on the resolution', async () => {
    const { id } = await createStudent(`${PREFIX}LastUsed`);
    const tokenRes = await agent
      .post(`/api/v1/students/${id}/access-token`)
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .get(`/api/v1/student-access/${tokenRes.body.rawToken}`)
      .expect(200);
    const record = await prisma.student_access_tokens.findUnique({
      where: { token_hash: hashAccessToken(tokenRes.body.rawToken) },
    });
    expect(record?.last_used_at).toBeInstanceOf(Date);
  });

  it('rejects a revoked token', async () => {
    const { id } = await createStudent(`${PREFIX}Revoke`);
    const tokenRes = await agent
      .post(`/api/v1/students/${id}/access-token`)
      .send({})
      .expect(201);
    await agent.post(`/api/v1/students/${id}/access-token/revoke`).expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/student-access/${tokenRes.body.rawToken}`)
      .expect(404);
  });

  it('fails the old token after regeneration', async () => {
    const { id } = await createStudent(`${PREFIX}Recycle`);
    const first = await agent
      .post(`/api/v1/students/${id}/access-token`)
      .send({})
      .expect(201);
    const second = await agent
      .post(`/api/v1/students/${id}/access-token/regenerate`)
      .send({})
      .expect(201);
    expect(second.body.rawToken).not.toBe(first.body.rawToken);

    await request(app.getHttpServer())
      .get(`/api/v1/student-access/${first.body.rawToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/student-access/${second.body.rawToken}`)
      .expect(200);
  });

  it('rejects a random invalid token', async () => {
    await request(app.getHttpServer())
      .get(
        '/api/v1/student-access/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      )
      .expect(404);
  });

  it('rejects an expired token', async () => {
    const { id } = await createStudent(`${PREFIX}Expired`);
    const created = await agent
      .post(`/api/v1/students/${id}/access-token`)
      .send({ expiresInSeconds: 3600 })
      .expect(201);
    await prisma.student_access_tokens.update({
      where: { token_hash: hashAccessToken(created.body.rawToken) },
      data: { expires_at: new Date(Date.now() - 60_000) },
    });
    await request(app.getHttpServer())
      .get(`/api/v1/student-access/${created.body.rawToken}`)
      .expect(404);
  });

  it('never stores the raw token in the database', async () => {
    const { id } = await createStudent(`${PREFIX}HashCheck`);
    const res = await agent
      .post(`/api/v1/students/${id}/access-token`)
      .send({})
      .expect(201);
    const record = await prisma.student_access_tokens.findUnique({
      where: { token_hash: hashAccessToken(res.body.rawToken) },
    });
    expect(record?.token_hash).not.toContain(res.body.rawToken);
    expect(record?.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(record?.token_prefix).toBeDefined();
  });
});
