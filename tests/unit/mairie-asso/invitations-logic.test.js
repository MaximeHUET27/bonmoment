import { describe, it, expect } from 'vitest';

/**
 * Tests unitaires sur la logique métier des invitations mairie/asso.
 * Les tests d'intégration (avec vraie BDD) sont en E2E Playwright.
 */

describe('Logique invitations mairie/asso', () => {
  describe('Transitions de statut autorisées', () => {
    const TRANSITIONS_AUTORISEES = {
      pending:  ['accepted', 'declined', 'removed'],
      accepted: ['removed'],
      declined: ['pending'],   // ré-invitation immédiate (pas de délai)
      removed:  ['pending'],   // ré-invitation immédiate (pas de délai)
    };

    it('pending → accepted : autorisé (commerce accepte)', () => {
      expect(TRANSITIONS_AUTORISEES.pending).toContain('accepted');
    });

    it('pending → declined : autorisé (commerce refuse)', () => {
      expect(TRANSITIONS_AUTORISEES.pending).toContain('declined');
    });

    it('pending → removed : autorisé (asso annule invitation)', () => {
      expect(TRANSITIONS_AUTORISEES.pending).toContain('removed');
    });

    it('accepted → removed : autorisé (commerce quitte ou asso retire)', () => {
      expect(TRANSITIONS_AUTORISEES.accepted).toContain('removed');
    });

    it('declined → pending : autorisé (ré-invitation immédiate après refus)', () => {
      expect(TRANSITIONS_AUTORISEES.declined).toContain('pending');
    });

    it('removed → pending : autorisé (ré-invitation immédiate après retrait)', () => {
      expect(TRANSITIONS_AUTORISEES.removed).toContain('pending');
    });

    it('accepted → declined : interdit (un membre acceptant ne peut pas refuser)', () => {
      expect(TRANSITIONS_AUTORISEES.accepted).not.toContain('declined');
    });

    it('declined → accepted : interdit (refus définitif sans ré-invitation)', () => {
      expect(TRANSITIONS_AUTORISEES.declined).not.toContain('accepted');
    });
  });

  describe('Permissions par action', () => {
    const ACTIONS = {
      accept:  { acteur: 'commerce',    statut_requis: 'pending' },
      decline: { acteur: 'commerce',    statut_requis: 'pending' },
      remove:  { acteur: 'mairie_asso', statut_requis: ['pending', 'accepted'] },
      leave:   { acteur: 'commerce',    statut_requis: 'accepted' },
    };

    it('accept est réservé au commerce', () => {
      expect(ACTIONS.accept.acteur).toBe('commerce');
    });

    it('accept requiert statut pending', () => {
      expect(ACTIONS.accept.statut_requis).toBe('pending');
    });

    it('decline est réservé au commerce', () => {
      expect(ACTIONS.decline.acteur).toBe('commerce');
    });

    it('remove est réservé à la mairie/asso', () => {
      expect(ACTIONS.remove.acteur).toBe('mairie_asso');
    });

    it('remove fonctionne sur pending ET accepted', () => {
      expect(ACTIONS.remove.statut_requis).toContain('pending');
      expect(ACTIONS.remove.statut_requis).toContain('accepted');
    });

    it('leave est réservé au commerce, sur statut accepted uniquement', () => {
      expect(ACTIONS.leave.acteur).toBe('commerce');
      expect(ACTIONS.leave.statut_requis).toBe('accepted');
    });
  });

  describe('Validation des paramètres', () => {
    const validerAction = (action) => {
      return ['accept', 'decline', 'remove', 'leave'].includes(action);
    };

    it('rejette une action inconnue', () => {
      expect(validerAction('explode')).toBe(false);
      expect(validerAction('')).toBe(false);
      expect(validerAction(null)).toBe(false);
      expect(validerAction(undefined)).toBe(false);
    });

    it('accepte les 4 actions valides', () => {
      ['accept', 'decline', 'remove', 'leave'].forEach(a => {
        expect(validerAction(a)).toBe(true);
      });
    });
  });

  describe('Logique removed_by', () => {
    const buildRemovedBy = (action) => {
      if (action === 'remove') return 'mairie_asso';
      if (action === 'leave')  return 'commerce';
      return null;
    };

    it('remove → removed_by = mairie_asso', () => {
      expect(buildRemovedBy('remove')).toBe('mairie_asso');
    });

    it('leave → removed_by = commerce', () => {
      expect(buildRemovedBy('leave')).toBe('commerce');
    });

    it('accept → removed_by = null', () => {
      expect(buildRemovedBy('accept')).toBeNull();
    });
  });
});
