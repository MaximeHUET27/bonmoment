/**
 * Construit le titre complet d'une offre en incluant le type de remise.
 * À utiliser partout où un titre d'offre est affiché ou partagé.
 *
 * Règle :
 *   pourcentage  → "-20% sur les coupes"
 *   montant_fixe → "-5€ dès 100€"
 *   cadeau / produit_offert / service_offert → "🎁 Un croissant offert"
 *   concours     → "🎰 Gagnez un soin complet"
 *   atelier      → "🎉 Initiation à la pâtisserie"
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
    default:
      return titre
  }
}
