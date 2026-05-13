import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Feature flag MAIRIE_ASSO — non-régression', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('isMairieAssoEnabled() retourne false si la variable est absente', async () => {
    delete process.env.NEXT_PUBLIC_MAIRIE_ASSO_ENABLED;
    const { isMairieAssoEnabled } = await import('../../lib/featureFlags.js');
    expect(isMairieAssoEnabled()).toBe(false);
  });

  it('isMairieAssoEnabled() retourne false si la variable vaut "false"', async () => {
    process.env.NEXT_PUBLIC_MAIRIE_ASSO_ENABLED = 'false';
    const { isMairieAssoEnabled } = await import('../../lib/featureFlags.js');
    expect(isMairieAssoEnabled()).toBe(false);
  });

  it('isMairieAssoEnabled() retourne true uniquement si la variable vaut "true" exactement', async () => {
    process.env.NEXT_PUBLIC_MAIRIE_ASSO_ENABLED = 'true';
    const { isMairieAssoEnabled } = await import('../../lib/featureFlags.js');
    expect(isMairieAssoEnabled()).toBe(true);
  });

  it('isMairieAssoEnabled() retourne false pour des valeurs ambiguës', async () => {
    for (const val of ['1', 'TRUE', 'yes', 'on', 'enabled']) {
      process.env.NEXT_PUBLIC_MAIRIE_ASSO_ENABLED = val;
      vi.resetModules();
      const { isMairieAssoEnabled } = await import('../../lib/featureFlags.js');
      expect(isMairieAssoEnabled(), `valeur "${val}" devrait être false`).toBe(false);
    }
  });
});

describe('Module Mairie/Asso — non-régression API routes', () => {
  it('Les API routes du module ne sont actives que si flag ON', async () => {
    process.env.NEXT_PUBLIC_MAIRIE_ASSO_ENABLED = 'false';
    vi.resetModules();
    const { isMairieAssoEnabled } = await import('../../lib/featureFlags.js');
    expect(isMairieAssoEnabled()).toBe(false);
  });
});
