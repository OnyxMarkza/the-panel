import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../server/lib/groq.js', () => ({
  callGroq: vi.fn(),
}));

const { callGroq } = await import('../../server/lib/groq.js');
const { createApp } = await import('../../server/app.js');

const samplePersonas = [
  { name: 'Alex Chen', archetype: 'Policy analyst', bias: 'Cautious on regulation', tone: 'measured' },
  { name: 'Jordan Lee', archetype: 'Startup founder', bias: 'Pro-innovation', tone: 'direct' },
];

describe('Express API contract (mocked Groq)', () => {
  const app = createApp();

  beforeEach(() => {
    vi.mocked(callGroq).mockReset();
    vi.mocked(callGroq).mockResolvedValue('This is a mock panel response.');
  });

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/debate-round validates personas and topic', async () => {
    const res = await request(app)
      .post('/api/debate-round')
      .send({ topic: 'AI safety', personas: [] });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: true,
      code: 'VALIDATION_ERROR',
      message: 'personas and topic are required.',
    });
  });

  it('POST /api/debate-round appends one message per persona', async () => {
    const res = await request(app)
      .post('/api/debate-round')
      .send({
        topic: 'Urban transit',
        roundNumber: 1,
        personas: samplePersonas,
        history: [],
      });

    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(2);
    expect(vi.mocked(callGroq)).toHaveBeenCalledTimes(2);
    expect(res.body.history[0].persona).toBe('Alex Chen');
    expect(res.body.history[1].content).toContain('mock panel response');
  });

  it('POST /api/generate-personas requires topic', async () => {
    const res = await request(app).post('/api/generate-personas').send({ topic: '' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/generate-personas returns personas from mocked Groq JSON', async () => {
    const third = {
      name: 'Riley Park',
      archetype: 'Journalist',
      bias: 'Skeptical',
      tone: 'curious',
      stance: '',
      relationships: [],
    };
    const mockPersonas = [...samplePersonas, third].map((p) => ({ ...p, stance: p.stance ?? '', relationships: p.relationships ?? [] }));
    vi.mocked(callGroq).mockResolvedValueOnce(JSON.stringify(mockPersonas));

    const res = await request(app)
      .post('/api/generate-personas')
      .send({ topic: 'Renewable energy', count: 3 });

    expect(res.status).toBe(200);
    expect(res.body.personas).toHaveLength(3);
    expect(res.body.persona_count).toBe(3);
  });

  it('GET /api/debates returns 503 when Supabase is not configured', async () => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.resetModules();

    const { createApp: createAppFresh } = await import('../../server/app.js');
    const freshApp = createAppFresh();

    const res = await request(freshApp).get('/api/debates');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('SERVICE_UNAVAILABLE');
    expect(res.body.message).toMatch(/Supabase is not configured/i);

    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });
});
