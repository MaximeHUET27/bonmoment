/**
 * Retourne le titre brut de l'offre, sans emoji préfixé.
 * À utiliser pour l'affichage UI où le badge est déjà visible (OffreCard, h1 page détail).
 */
export function getOffreTitle(offre) {
  return offre?.titre || ''
}

/**
 * Construit le titre complet avec emoji préfixé.
 * À utiliser pour le partage social (Web Share API, OG tags, emails, notifications push).
 */
export function getFullOffreTitle(offre) {
  if (!offre) return ''
  const titre = offre.titre || ''
  switch (offre.type_remise) {
    case 'pourcentage':
      return `-${offre.valeur}% ${titre}`
    case 'montant_fixe':
    case 'montant':
      return `-${offre.valeur}€ ${titre}`
    case 'cadeau':
    case 'produit_offert':
    case 'service_offert':
    case 'offert':
      return `🎁 ${titre}`
    case 'concours':
      return `🎰 ${titre}`
    case 'atelier':
      return `🎨 ${titre}`
    case 'fidelite':
      return `⭐ ${titre}`
    case 'anti_gaspi':
      return `🥗 ${titre}`
    default:
      return titre
  }
}

/** Libellé court et français du type d'offre, pour les titres de partage. */
export function getTypeLabelFr(offre) {
  if (!offre) return 'Offre'
  switch (offre.type_remise) {
    case 'pourcentage':    return `−${offre.valeur}%`
    case 'montant_fixe':
    case 'montant':        return `−${offre.valeur}€`
    case 'cadeau':         return 'Cadeau'
    case 'produit_offert': return 'Produit offert'
    case 'service_offert': return 'Service offert'
    case 'offert':         return 'Offert'
    case 'concours':       return 'Concours'
    case 'atelier':        return 'Évènement'
    case 'fidelite':       return 'Fidélité'
    case 'anti_gaspi':     return 'Anti-gaspi'
    default:               return 'Offre'
  }
}

/** Nettoie un titre d'offre pour un usage sur une seule ligne (OG, sujets d'email). */
export function cleanOffreTitre(offre, maxLen = 80) {
  const t = (offre?.titre || '').replace(/\s+/g, ' ').trim()
  return t.length > maxLen ? t.slice(0, maxLen).trimEnd() + '…' : t
}

/** Emoji du type d'offre — aligné sur les badges de OffreCard.js (l.107-113). */
export function getTypeEmoji(offre) {
  switch (offre?.type_remise) {
    case 'cadeau':         return '🎁'
    case 'produit_offert': return '📦'
    case 'service_offert': return '✂️'
    case 'concours':       return '🎰'
    case 'atelier':        return '🎉'
    case 'fidelite':       return '⭐'
    case 'pourcentage':
    case 'montant_fixe':
    case 'montant':        return '🏷️'
    default:               return '🔥'
  }
}
