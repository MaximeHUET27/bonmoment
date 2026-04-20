/**
 * Helpers — Carte Fidélité Universelle
 *
 * DOUBLE GARDE-FOU avant tout affichage ou appel d'API fidélité :
 *   1. NEXT_PUBLIC_FIDELITE_ENABLED === 'true'  (kill switch environnement)
 *   2. commerce.palier === 'pro' + abonnement_actif === true
 *
 * Si l'un des deux est false → aucune UI, aucun endpoint, aucun effet de bord.
 *
 * À importer uniquement depuis les fichiers fidélité (app/lib/fidelite/*,
 * app/hooks/fidelite/*, app/components/fidelite/*).
 * Ne jamais importer depuis les fichiers existants du projet.
 */

// ── Kill switch global ────────────────────────────────────────────────────────
// false par défaut sur tous les environnements.
// Passer à 'true' uniquement en local pour développer/tester,
// puis sur Preview Vercel, puis sur Production.
export const FIDELITE_ENABLED =
  process.env.NEXT_PUBLIC_FIDELITE_ENABLED === 'true'

export const FIDELITE_PALIER_REQUIS = 'pro'

// ── Garde-fous ────────────────────────────────────────────────────────────────

/**
 * Garde-fou principal côté commerçant.
 * À appeler avant tout affichage de composant fidélité ou appel d'API mutation.
 *
 * @param {object|null} commerce - objet commerce chargé depuis Supabase
 * @returns {boolean}
 */
export function commercePeutUtiliserFidelite(commerce) {
  if (!FIDELITE_ENABLED) return false
  if (!commerce) return false
  if (commerce.abonnement_actif !== true) return false
  return commerce.palier === FIDELITE_PALIER_REQUIS
}

/**
 * Garde-fou simplifié pour les contextes sans objet commerce
 * (ex: section profil client, pages légales).
 * Ne vérifie que le kill switch environnement.
 *
 * @returns {boolean}
 */
export function fideliteFeatureActive() {
  return FIDELITE_ENABLED
}

// ── Téléphone ─────────────────────────────────────────────────────────────────

/**
 * Normalise un numéro de téléphone : supprime tout sauf les chiffres,
 * valide le format 06/07 français à 10 chiffres.
 *
 * @param {string|null|undefined} raw
 * @returns {string|null} numéro normalisé (ex: "0612345678") ou null si invalide
 */
export function normaliserTelephone(raw) {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (!/^(0[67])\d{8}$/.test(digits)) return null
  return digits
}

/**
 * Masque un numéro de téléphone pour l'affichage RGPD.
 * Ex: "0612345678" → "0612 ** ** 78"
 *
 * @param {string|null|undefined} tel - numéro à 10 chiffres
 * @returns {string}
 */
export function masquerTelephone(tel) {
  if (!tel || tel.length !== 10) return '—'
  return `${tel.substring(0, 4)} ** ** ${tel.substring(8, 10)}`
}

// ── Progression fidélité ──────────────────────────────────────────────────────

/**
 * Calcule le pourcentage de progression vers la récompense (0–100).
 *
 * @param {number} nbPassages - nb_passages_depuis_derniere_recompense
 * @param {number} seuil      - seuil_passages_carte
 * @returns {number} entier entre 0 et 100
 */
export function calculerProgression(nbPassages, seuil) {
  if (!seuil || seuil === 0) return 0
  return Math.min(100, Math.round((nbPassages / seuil) * 100))
}

/**
 * Message d'encouragement style Starbucks affiché sous la jauge.
 *
 * @param {number} nbPassages   - passages depuis la dernière récompense
 * @param {number} seuil        - seuil_passages_carte
 * @param {string} description  - description_recompense_carte
 * @returns {string}
 */
export function messageEncouragement(nbPassages, seuil, description) {
  if (!seuil || !description) return ''
  if (nbPassages >= seuil) return `🎉 ${description} débloqué !`
  const reste = seuil - nbPassages
  if (reste === 1) return `Plus qu'1 passage pour ${description} !`
  return `Plus que ${reste} passages pour ${description}`
}

// ── Activité client ───────────────────────────────────────────────────────────

/**
 * Indique si un client est dormant (dernière activité au-delà du seuil).
 *
 * @param {string|null|undefined} derniereActivite - ISO timestamp
 * @param {number} seuilJours - nombre de jours sans activité (défaut : 60)
 * @returns {boolean}
 */
export function estClientDormant(derniereActivite, seuilJours = 60) {
  if (!derniereActivite) return false
  const diff = Date.now() - new Date(derniereActivite).getTime()
  return diff > seuilJours * 86400000
}

// ── Formatage date ────────────────────────────────────────────────────────────

/**
 * Formate un timestamp ISO en date française lisible.
 * Ex: "2026-04-20T14:30:00Z" → "20/04/2026"
 *
 * @param {string|null|undefined} iso
 * @returns {string}
 */
export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  })
}
