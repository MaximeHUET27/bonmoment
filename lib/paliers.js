/**
 * Source unique des paliers commerçant.
 *
 *  - basic     : gratuit, attribué automatiquement à l'inscription
 *                (et au retour après résiliation d'un palier payant).
 *                1 offre/mois, bons illimités. Statistiques en temps réel
 *                et avis Google automatiques VISIBLES MAIS GRISÉS (upsell).
 *  - essentiel : 29 €/mois via Stripe
 *  - pro       : 49 €/mois via Stripe
 *
 * Les colonnes commerces.palier / abonnement_actif restent écrites
 * UNIQUEMENT côté serveur (service_role) — cf. sql/lock_billing_columns.sql.
 */

export const PALIER_BASIC = 'basic'

export const PALIERS = {
  basic:     { key: 'basic',     nom: 'Basic',     prix: 0,  quota: 1,    payant: false },
  essentiel: { key: 'essentiel', nom: 'Essentiel', prix: 29, quota: 8,    payant: true  },
  pro:       { key: 'pro',       nom: 'Pro',       prix: 49, quota: null, payant: true  },
}

/** Paliers achetables via Stripe Checkout. */
export const PALIERS_PAYANTS = ['essentiel', 'pro']

/** Quota d'offres par mois (null = illimité). Palier inconnu/absent → Basic. */
export function quotaOffres(palier) {
  const p = PALIERS[palier] || PALIERS.basic
  return p.quota
}

/** Vrai si le commerce est sur l'offre gratuite (palier 'basic' ou pas encore de palier). */
export function estBasic(palier) {
  return !palier || palier === PALIER_BASIC
}

/** Statistiques en temps réel : paliers payants uniquement. */
export function aStatsTempsReel(palier) {
  return !estBasic(palier)
}

/** Collecte automatique d'avis Google : paliers payants uniquement. */
export function aAvisGoogle(palier) {
  return !estBasic(palier)
}

export function nomPalier(palier) {
  return (PALIERS[palier] || PALIERS.basic).nom
}
