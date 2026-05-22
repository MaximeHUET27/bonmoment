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
