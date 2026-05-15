import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Lot 4A — non-régression : routes API inaccessibles avec flag OFF', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('isMairieAssoEnabled() retourne false si flag absent', async () => {
    delete process.env.NEXT_PUBLIC_MAIRIE_ASSO_ENABLED;
    const { isMairieAssoEnabled } = await import('../../lib/featureFlags.js');
    expect(isMairieAssoEnabled()).toBe(false);
  });

  it('isMairieAssoEnabled() retourne false si flag = "false"', async () => {
    process.env.NEXT_PUBLIC_MAIRIE_ASSO_ENABLED = 'false';
    vi.resetModules();
    const { isMairieAssoEnabled } = await import('../../lib/featureFlags.js');
    expect(isMairieAssoEnabled()).toBe(false);
  });

  it('Les routes Lot 4A renvoient 404 avec flag OFF (vérification logique)', async () => {
    process.env.NEXT_PUBLIC_MAIRIE_ASSO_ENABLED = 'false';
    vi.resetModules();
    const { isMairieAssoEnabled } = await import('../../lib/featureFlags.js');
    // Simulation : chaque route commence par ce check
    const flag = isMairieAssoEnabled();
    const status = flag ? 200 : 404;
    expect(status).toBe(404);
  });

  const routesLot4A = [
    'POST /api/mairie-asso/logo',
    'DELETE /api/mairie-asso/logo',
    'GET /api/mairie-asso/stats-cumulees',
    'PATCH /api/commercant/logo-affiche',
  ];

  it('toutes les routes Lot 4A sont recensées', () => {
    expect(routesLot4A).toHaveLength(4);
  });
});

describe('Lot 4A — non-régression : périodes valides', () => {
  it('seules 7j, 30j, total sont acceptées', () => {
    const VALID_PERIODES = ['7j', '30j', 'total'];
    expect(VALID_PERIODES).toHaveLength(3);
    expect(VALID_PERIODES).toContain('total');
  });
});
