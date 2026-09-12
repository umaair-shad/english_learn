import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/database/prisma.service';
import { createTestApp, seedTeacher, TEST_TEACHER } from './helpers';

const PREFIX = 'E2E Set ';

const SENSE_FINANCIAL = 4593;
const SENSE_RIVER = 4603;
const SENSE_MISSING = 999_999_999;

describe('Vocabulary sets (e2e, real PostgreSQL)', () => {
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
    await app.close();
  });

  async function createSet(
    name: string,
    senseIds: number[] = [],
  ): Promise<number> {
    const res = await agent
      .post('/api/v1/vocabulary-sets')
      .send({ name, senseIds })
      .expect(201);
    return res.body.id as number;
  }

  it('rejects unauthenticated access to vocabulary sets (401)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/vocabulary-sets')
      .expect(401);
  });

  it('creates a set with multiple senses and returns details', async () => {
    const id = await createSet(`${PREFIX}Multi`, [
      SENSE_FINANCIAL,
      SENSE_RIVER,
    ]);

    const list = await agent
      .get('/api/v1/vocabulary-sets?search=Multi')
      .expect(200);
    const found = list.body.data.find((s: { id: number }) => s.id === id);
    expect(found).toBeDefined();
    expect(found.itemCount).toBe(2);

    const detail = await agent.get(`/api/v1/vocabulary-sets/${id}`).expect(200);
    expect(detail.body.items).toHaveLength(2);
    expect(detail.body.items[0].senseId).toBe(SENSE_FINANCIAL);
    expect(detail.body.items[0].lemma.toLowerCase()).toContain('bank');
    expect(detail.body.items[0].definition.length).toBeGreaterThan(10);
    expect(Array.isArray(detail.body.items[0].translations)).toBe(true);
    expect(Array.isArray(detail.body.items[0].cefrLevels)).toBe(true);
    expect(Array.isArray(detail.body.items[0].categories)).toBe(true);
    expect(detail.body.items[1].senseId).toBe(SENSE_RIVER);
  });

  it('rejects duplicate sense ids on create (400)', async () => {
    await agent
      .post('/api/v1/vocabulary-sets')
      .send({ name: `${PREFIX}Dupe`, senseIds: [SENSE_RIVER, SENSE_RIVER] })
      .expect(400);
  });

  it('rejects an unknown sense id with 400', async () => {
    await agent
      .post('/api/v1/vocabulary-sets')
      .send({ name: `${PREFIX}BadSense`, senseIds: [SENSE_MISSING] })
      .expect(400);
  });

  it('supports an empty set and later bulk item add/remove', async () => {
    const id = await createSet(`${PREFIX}Grow`);

    const res = await agent
      .post(`/api/v1/vocabulary-sets/${id}/items`)
      .send({ senseIds: [SENSE_FINANCIAL] })
      .expect(201);
    expect(res.body.itemCount).toBe(1);

    await agent
      .post(`/api/v1/vocabulary-sets/${id}/items`)
      .send({ senseIds: [SENSE_FINANCIAL, SENSE_RIVER] })
      .expect(201);

    const afterAdd = await agent
      .get(`/api/v1/vocabulary-sets/${id}`)
      .expect(200);
    expect(afterAdd.body.itemCount).toBe(2);

    const removed = await agent
      .delete(`/api/v1/vocabulary-sets/${id}/items/${SENSE_RIVER}`)
      .expect(200);
    expect(removed.body.itemCount).toBe(1);

    const afterRemove = await agent
      .get(`/api/v1/vocabulary-sets/${id}`)
      .expect(200);
    expect(afterRemove.body.itemCount).toBe(1);
    expect(afterRemove.body.items[0].senseId).toBe(SENSE_FINANCIAL);
  });

  it('removing a sense that is not in the set returns 404', async () => {
    const id = await createSet(`${PREFIX}NoSense`, [SENSE_FINANCIAL]);
    await agent
      .delete(`/api/v1/vocabulary-sets/${id}/items/${SENSE_RIVER}`)
      .expect(404);
  });

  it('updates metadata and reflects isActive filtering', async () => {
    const id = await createSet(`${PREFIX}Patch`);

    await agent
      .patch(`/api/v1/vocabulary-sets/${id}`)
      .send({
        name: `${PREFIX}Patched`,
        description: 'updated description',
        isActive: false,
      })
      .expect(200);

    const inactive = await agent
      .get('/api/v1/vocabulary-sets?isActive=false&search=Patched')
      .expect(200);
    expect(inactive.body.meta.total).toBe(1);

    const active = await agent
      .get('/api/v1/vocabulary-sets?isActive=true&search=Patched')
      .expect(200);
    expect(active.body.meta.total).toBe(0);
  });

  it('soft-deletes a set and blocks item modification', async () => {
    const id = await createSet(`${PREFIX}SoftDelete`, [SENSE_FINANCIAL]);
    const res = await agent.delete(`/api/v1/vocabulary-sets/${id}`).expect(200);
    expect(res.body.deactivated).toBe(true);

    const detail = await agent.get(`/api/v1/vocabulary-sets/${id}`).expect(200);
    expect(detail.body.isActive).toBe(false);
    expect(detail.body.itemCount).toBe(1);

    await agent
      .post(`/api/v1/vocabulary-sets/${id}/items`)
      .send({ senseIds: [SENSE_RIVER] })
      .expect(400);
  });

  it('paginates the set list', async () => {
    await createSet(`${PREFIX}PageA`, [SENSE_FINANCIAL]);
    await createSet(`${PREFIX}PageB`, [SENSE_RIVER]);
    const res = await agent
      .get(
        `/api/v1/vocabulary-sets?limit=1&page=1&search=${encodeURIComponent(PREFIX)}`,
      )
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    expect(res.body.meta.totalPages).toBeGreaterThanOrEqual(2);
  });
});
