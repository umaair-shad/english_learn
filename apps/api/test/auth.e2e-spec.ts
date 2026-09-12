import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, seedTeacher, TEST_TEACHER } from './helpers';

describe('Auth (e2e, real PostgreSQL)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
    await seedTeacher(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects anonymous access to protected routes', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    await request(app.getHttpServer()).get('/api/v1/students').expect(401);
  });

  it('rejects invalid login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: TEST_TEACHER.email, password: 'wrong-password' })
      .expect(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('rejects login for unknown email', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever-12345' })
      .expect(401);
  });

  it('accepts valid login and issues a cookie session', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: TEST_TEACHER.email, password: TEST_TEACHER.password })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.teacher.email).toBe(TEST_TEACHER.email);
    expect(res.body.teacher.displayName).toBe(TEST_TEACHER.displayName);
    const setCookie = res.headers['set-cookie'] as unknown as
      string[] | undefined;
    expect(setCookie?.some((c) => c.startsWith('vocab_auth='))).toBe(true);
  });

  it('resolves /auth/me with the cookie session', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/login').send({
      email: TEST_TEACHER.email,
      password: TEST_TEACHER.password,
    });
    const res = await agent.get('/api/v1/auth/me').expect(200);
    expect(res.body.teacher.email).toBe(TEST_TEACHER.email);
    expect(res.body.teacher.id).toBeGreaterThan(0);
  });

  it('clears the session on logout', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/login').send({
      email: TEST_TEACHER.email,
      password: TEST_TEACHER.password,
    });
    await agent.post('/api/v1/auth/logout').expect(200);
    await agent.get('/api/v1/auth/me').expect(401);
  });
});
