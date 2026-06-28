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

/**
 * Formate la fenêtre temporelle d'une offre (début → fin) en fuseau Europe/Paris.
 * Retourne { court, long }.
 * NULL sur l'une ou l'autre date → fallback propre, jamais "Invalid Date".
 *
 * Même jour   → court : "Le jeu. 2 juil. · 12:00 → 12:45"
 *               long  : "Le jeudi 2 juillet, de 12:00 à 12:45"
 * Multi-jours → court : "Du jeu. 2 juil. 12:00 au ven. 3 juil. 01:00"
 *               long  : "Du jeudi 2 juillet à 12:00 au vendredi 3 juillet à 01:00"
 */
export function formatFenetreOffre(date_debut, date_fin) {
  const d1 = date_debut ? new Date(date_debut) : null
  const d2 = date_fin   ? new Date(date_fin)   : null

  if (d1 && isNaN(d1.getTime())) return { court: '—', long: '—' }
  if (d2 && isNaN(d2.getTime())) return { court: '—', long: '—' }
  if (!d1 && !d2)                return { court: '—', long: '—' }

  const TZ = 'Europe/Paris'
  const h   = d => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(d)
  const dc  = d => new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ }).format(d)
  const dl  = d => new Intl.DateTimeFormat('fr-FR', { weekday: 'long',  day: 'numeric', month: 'long',  timeZone: TZ }).format(d)
  const js  = d => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: TZ }).format(d)

  if (!d1) return { court: `Jusqu'au ${dc(d2)} ${h(d2)}`, long: `Jusqu'au ${dl(d2)} à ${h(d2)}` }
  if (!d2) return { court: `Le ${dc(d1)} · ${h(d1)}`,     long: `Le ${dl(d1)} à ${h(d1)}` }

  if (js(d1) === js(d2)) return {
    court: `Le ${dc(d1)} · ${h(d1)} → ${h(d2)}`,
    long:  `Le ${dl(d1)}, de ${h(d1)} à ${h(d2)}`,
  }

  return {
    court: `Du ${dc(d1)} ${h(d1)} au ${dc(d2)} ${h(d2)}`,
    long:  `Du ${dl(d1)} à ${h(d1)} au ${dl(d2)} à ${h(d2)}`,
  }
}
