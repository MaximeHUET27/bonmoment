/**
 * Statut temporel d'une offre (indépendant du statut en base).
 * 'programmee' : maintenant < date_debut
 * 'en_cours'   : date_debut <= maintenant <= date_fin
 * 'expiree'    : maintenant > date_fin
 */
export function getOffreStatus(offre) {
  const now   = new Date()
  const debut = new Date(offre.date_debut)
  const fin   = new Date(offre.date_fin)
  if (now < debut) return 'programmee'
  if (now > fin)   return 'expiree'
  return 'en_cours'
}

/**
 * Formate une date ISO en "lundi 24 mars à 14h30" (fr-FR).
 */
export function formatDebut(dateStr) {
  const d = new Date(dateStr)
  return (
    d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) +
    ' à ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  )
}
