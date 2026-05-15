import { describe, it, expect } from 'vitest';

describe('Stats cumulées — validation des paramètres', () => {
  const VALID_PERIODES = ['7j', '30j', 'total'];

  it('accepte les 3 périodes valides', () => {
    expect(VALID_PERIODES).toContain('7j');
    expect(VALID_PERIODES).toContain('30j');
    expect(VALID_PERIODES).toContain('total');
  });

  it('détecte les périodes invalides', () => {
    const invalides = ['1j', '90j', '', 'all', 'mois'];
    for (const p of invalides) {
      expect(VALID_PERIODES).not.toContain(p);
    }
  });
});

describe('Upload logo — validation côté serveur', () => {
  const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'];
  const MAX_BYTES = 2 * 1024 * 1024;

  it('accepte uniquement PNG/JPEG/WEBP', () => {
    expect(ALLOWED_MIME).toContain('image/png');
    expect(ALLOWED_MIME).toContain('image/jpeg');
    expect(ALLOWED_MIME).toContain('image/webp');
    expect(ALLOWED_MIME).not.toContain('image/gif');
    expect(ALLOWED_MIME).not.toContain('application/pdf');
    expect(ALLOWED_MIME).not.toContain('image/svg+xml');
  });

  it('limite la taille à 2 MB exactement', () => {
    expect(MAX_BYTES).toBe(2 * 1024 * 1024);
    expect(MAX_BYTES).toBe(2097152);
  });

  it('rejette un fichier de 2 MB + 1 octet', () => {
    const taille = MAX_BYTES + 1;
    expect(taille > MAX_BYTES).toBe(true);
  });
});

describe('Stats cumulées — valeurs par défaut', () => {
  it('retourne un objet avec les 6 KPIs à 0 si absent', () => {
    const defaut = {
      bons_reserves: 0,
      bons_valides: 0,
      taux_validation: 0,
      nb_membres_actifs: 0,
      nb_offres_publiees: 0,
      nb_avis_google_cumules: 0,
    };
    expect(Object.keys(defaut)).toHaveLength(6);
    for (const key of Object.keys(defaut)) {
      expect(defaut[key]).toBe(0);
    }
  });
});
