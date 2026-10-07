import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../shared/groqClient.js', () => ({
  callGroq: vi.fn(),
}));

const { callGroq } = await import('../../shared/groqClient.js');
const handler = (await import('../../api/debate-round.js')).default;

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
}

describe('api/debate-round handler (Vercel)', () => {
  beforeEach(() => {
    delete process.env.API_KEY;
    delete process.env.SAVE_API_KEY;
    vi.mocked(callGroq).mockReset();
    vi.mocked(callGroq).mockResolvedValue('Serverless mock reply.');
  });

  it('returns same validation error as Express for empty personas', async () => {
    const req = { method: 'POST', body: { topic: 'Ethics', personas: [] } };
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: true,
      code: 'VALIDATION_ERROR',
      message: 'personas and topic are required.',
    });
  });

  it('returns 401 when API_KEY is configured and header is missing', async () => {
    const original = process.env.API_KEY;
    process.env.API_KEY = 'vercel-test-key';

    const req = { method: 'POST', headers: {}, body: { topic: 'Ethics', personas: [] } };
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('AUTH_ERROR');

    if (original === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = original;
  });

  it('runs a round with normalized persona names', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: {
        topic: 'Space exploration',
        roundNumber: 1,
        personas: [
          { archetype: 'Scientist', bias: 'Pro', tone: 'calm' },
          { name: 'B', archetype: 'Engineer', bias: 'Pro', tone: 'calm' },
          { name: 'C', archetype: 'Historian', bias: 'Neutral', tone: 'calm' },
        ],
        history: [],
      },
    };
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.history).toHaveLength(3);
    expect(res.body.history[0].persona).toBe('Panellist 1');
    expect(vi.mocked(callGroq)).toHaveBeenCalledTimes(3);
  });
});
