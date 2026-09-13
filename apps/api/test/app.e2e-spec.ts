import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, seedTeacher, TEST_TEACHER } from './helpers';
import {
  PaginatedList,
  VocabularyDetailEntry,
} from './../src/vocabulary/dto/vocabulary-response.dto';

describe('Vocabulary API (e2e, real PostgreSQL)', () => {
  let app: INestApplication<App>;
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    app = await createTestApp();
    await seedTeacher(app);
    agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/login').send({
      email: TEST_TEACHER.email,
      password: TEST_TEACHER.password,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health reports a reachable database', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    const body = res.body as {
      status: string;
      database: string;
      tables: number;
    };
    expect(body.status).toBe('ok');
    expect(body.database).toBe('up');
    expect(body.tables).toBeGreaterThan(0);
  });

  it('search exposes the golden bank noun senses with correct Polish', async () => {
    const res = await agent
      .get('/api/v1/vocabulary/search')
      .query({ q: 'bank', limit: 200 })
      .expect(200);
    const body = res.body as PaginatedList;

    const bankNoun = body.data.filter(
      (row) => row.lemma === 'bank' && row.partOfSpeech === 'noun',
    );
    const definitions: Record<string, string> = {};
    const polish: Record<string, string[] | undefined> = {};
    for (const sense of bankNoun) {
      definitions[sense.position] = sense.definition;
      polish[sense.position] = sense.translations.map((t) => t.text);
    }

    const financial = Object.keys(definitions).find((p) =>
      definitions[p].toLowerCase().includes('institution'),
    );
    const river = Object.keys(definitions).find((p) =>
      definitions[p].toLowerCase().includes('edge of river'),
    );

    expect(financial).toBeDefined();
    expect(river).toBeDefined();
    expect(polish[financial!]).toContain('bank');
    expect(polish[river!]).toContain('brzeg');
    expect(polish[river!]).not.toContain('bank');
  });

  it('list endpoint supports filters and pagination metadata shape', async () => {
    const res = await agent
      .get('/api/v1/vocabulary')
      .query({
        partOfSpeech: 'noun',
        cefr: 'A1',
        hasPolishTranslation: 'true',
        frequencyRank: 1000,
        limit: 5,
      })
      .expect(200);
    const body = res.body as PaginatedList;

    expect(body.meta).toMatchObject({
      page: 1,
      limit: 5,
    });
    expect(body.meta.total).toBeGreaterThan(0);
    expect(body.data.length).toBeLessThanOrEqual(5);
    for (const row of body.data) {
      expect(row.partOfSpeech).toBe('noun');
      expect(row.translations.length).toBeGreaterThan(0);
      expect(row.cefrLevels).toContain('A1');
    }
  });

  it('detail returns a bank entry with freq, CEFR and WordNet evidence', async () => {
    const list = await agent
      .get('/api/v1/vocabulary/search')
      .query({ q: 'bank', limit: 200 })
      .expect(200);
    const listBody = list.body as PaginatedList;
    const bankRow = listBody.data.find(
      (r) => r.lemma === 'bank' && r.partOfSpeech === 'noun',
    );
    expect(bankRow).toBeDefined();

    const res = await agent
      .get(`/api/v1/vocabulary/${bankRow!.entryId}`)
      .expect(200);
    const body = res.body as VocabularyDetailEntry;

    expect(body.normalizedLemma).toBe('bank');
    expect(body.partOfSpeech).toBe('noun');
    expect(body.frequency.some((f) => f.rank === 627)).toBe(true);

    const financial = body.senses.find((s) =>
      s.definition.toLowerCase().includes('institution'),
    );
    expect(financial).toBeDefined();
    expect(financial!.translations.map((t) => t.text)).toContain('bank');
    expect(financial!.cefr[0].level).toBe('A1');
    expect(financial!.wordnet.some((w) => w.synsetId === '08437235-n')).toBe(
      true,
    );
  });
});
