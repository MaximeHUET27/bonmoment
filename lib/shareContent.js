import { getTypeLabelFr, cleanOffreTitre } from '@/lib/offreTitle'

export const BASE_URL = 'https://bonmoment.app'

export function formatHeure(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const h = d.getHours()
  const m = d.getMinutes()
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

export function buildShareContent(offre, commerce) {
  const nom   = commerce?.nom   || 'ce commerce'
  const ville = commerce?.ville || 'ta ville'
  const nb    = offre?.nb_bons_restants
  const url   = `${BASE_URL}/offre/${offre?.id}`
  const badge = `${getTypeLabelFr(offre)} : ${cleanOffreTitre(offre)}`
  const heure = offre?.date_fin ? ` jusqu'à ${formatHeure(offre.date_fin)}` : ''
  const nbStr = nb && nb !== 9999 && nb > 0 ? ` Plus que ${nb} bons dispo.` : ''

  return {
    title: `🔥 ${badge} chez ${nom}`,
    text:  `🔥 ${badge} chez ${nom} à ${ville}${heure} !${nbStr} Réserve ton bon gratuit :`,
    url,
  }
}
