import { describe, it, expect, afterEach, vi } from 'vitest';

describe('server/lib/supabase lazy init', () => {
  const envBackup = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  afterEach(() => {
    if (envBackup.SUPABASE_URL === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = envBackup.SUPABASE_URL;
    if (envBackup.SUPABASE_SERVICE_ROLE_KEY === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = envBackup.SUPABASE_SERVICE_ROLE_KEY;
    vi.resetModules();
  });

  it('throws SupabaseNotConfiguredError when env vars are missing', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.resetModules();

    const { fetchDebates, SupabaseNotConfiguredError } = await import('../server/lib/supabase.js');

    await expect(fetchDebates()).rejects.toBeInstanceOf(SupabaseNotConfiguredError);
    await expect(fetchDebates()).rejects.toMatchObject({
      code: 'SUPABASE_NOT_CONFIGURED',
    });
  });

  it('does not throw at import time when env is unset', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.resetModules();

    await expect(import('../server/lib/supabase.js')).resolves.toBeDefined();
  });
});
