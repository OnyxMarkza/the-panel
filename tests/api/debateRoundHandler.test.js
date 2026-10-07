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

  it('runs a round with normalized persona names', async () => {
    const req = {
      method: 'POST',
      body: {
        topic: 'Space exploration',
        roundNumber: 1,
        personas: [{ archetype: 'Scientist', bias: 'Pro', tone: 'calm' }],
        history: [],
      },
    };
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0].persona).toBe('Panellist 1');
    expect(vi.mocked(callGroq)).toHaveBeenCalledOnce();
  });
});
