import { describe, it, expect, afterEach } from 'vitest';
import { checkApiKey, getExpectedApiKey } from '../../shared/apiAuth.js';

describe('apiAuth', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it('getExpectedApiKey prefers API_KEY over SAVE_API_KEY', () => {
    process.env.API_KEY = 'primary';
    process.env.SAVE_API_KEY = 'secondary';
    expect(getExpectedApiKey()).toBe('primary');
  });

  it('allows requests in non-production when no key is configured', () => {
    delete process.env.API_KEY;
    delete process.env.SAVE_API_KEY;
    delete process.env.VERCEL;
    process.env.NODE_ENV = 'test';

    const result = checkApiKey({ headers: {}, query: {} });
    expect(result.ok).toBe(true);
  });

  it('returns 401 when key is configured but header is missing', () => {
    process.env.API_KEY = 'secret-test-key';
    process.env.NODE_ENV = 'test';

    const result = checkApiKey({ headers: {}, query: {} });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(result.body.code).toBe('AUTH_ERROR');
  });

  it('accepts matching x-api-key header', () => {
    process.env.API_KEY = 'secret-test-key';
    const result = checkApiKey({ headers: { 'x-api-key': 'secret-test-key' }, query: {} });
    expect(result.ok).toBe(true);
  });

  it('returns 401 in production when server key is not configured', () => {
    delete process.env.API_KEY;
    delete process.env.SAVE_API_KEY;
    process.env.NODE_ENV = 'production';
    delete process.env.VERCEL;

    const result = checkApiKey({ headers: {}, query: {} }, { requireConfiguredKey: true });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });
});
