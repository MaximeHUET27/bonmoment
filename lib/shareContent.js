import { getTypeLabelFr, cleanOffreTitre, getTypeEmoji } from '@/lib/offreTitle'

export const BASE_URL = 'https://bonmoment.app'

export function formatHeure(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const h = d.getHours()
  const m = d.getMinutes()
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** "27/08" */
function formatDateCourte(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
}

/**
 * "🎉 Atelier maquillage chez Kocoon Family le 27/08 de 15h30 à 16h30"
 * Budget de 80 caractères : si dépassement, on retire d'abord la plage horaire,
 * puis on tronque le titre de l'offre avec "…".
 * "chez {commerce} le {date}" est TOUJOURS préservé.
 */
export function buildShareHeadline(offre, commerce) {
  const MAX   = 80
  const emoji = getTypeEmoji(offre)
  const nom   = commerce?.nom || 'ce commerce'
  const titre = cleanOffreTitre(offre, 200)     // pas de troncature ici
  const date  = formatDateCourte(offre?.date_debut)
  const h1    = formatHeure(offre?.date_debut)
  const h2    = formatHeure(offre?.date_fin)

  const suffixeDate  = date ? ` le ${date}` : ''
  const suffixeHeure = (h1 && h2) ? ` de ${h1} à ${h2}` : ''
  const base = (t, avecHeure) =>
    `${emoji} ${t} chez ${nom}${suffixeDate}${avecHeure ? suffixeHeure : ''}`

  let out = base(titre, true)
  if (out.length <= MAX) return out

  out = base(titre, false)                       // 1) on sacrifie les horaires
  if (out.length <= MAX) return out

  const fixe = base('', false).length            // 2) on tronque le titre
  const dispo = Math.max(12, MAX - fixe - 1)
  return base(titre.slice(0, dispo).trimEnd() + '…', false)
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
    title: buildShareHeadline(offre, commerce),
    text:  `🔥 ${badge} chez ${nom} à ${ville}${heure} !${nbStr} Réserve ton bon gratuit :`,
    url,
  }
}
