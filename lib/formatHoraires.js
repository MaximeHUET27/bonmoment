const JOURS_EN_FR = {
  Monday: 'Lundi', Tuesday: 'Mardi', Wednesday: 'Mercredi',
  Thursday: 'Jeudi', Friday: 'Vendredi', Saturday: 'Samedi', Sunday: 'Dimanche',
}

function convertAmPm(str) {
  return str.replace(/(\d{1,2}):(\d{2})\s*(AM|PM)/g, (_, h, m, period) => {
    let hour = parseInt(h, 10)
    if (period === 'PM' && hour !== 12) hour += 12
    if (period === 'AM' && hour === 12) hour = 0
    return `${hour}h${m}`
  })
}

export function formatHoraire(str) {
  if (!str) return str
  let s = str
  // Jour anglais → français (début de chaîne)
  s = s.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/, d => JOURS_EN_FR[d] || d)
  // AM/PM → 24h
  s = convertAmPm(s)
  // Termes anglais résiduels
  s = s.replace(/Open 24 hours/gi, 'Ouvert 24h')
  s = s.replace(/\bOpen\b/gi, 'Ouvert')
  s = s.replace(/\bClosed\b/gi, 'Fermé')
  return s
}
