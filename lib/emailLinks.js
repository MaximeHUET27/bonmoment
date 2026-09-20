import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.LIEN_ANNULATION_SECRET

export function signerAnnulation(reservationId) {
  return createHmac('sha256', SECRET).update(reservationId).digest('hex')
}

export function verifierAnnulation(reservationId, token) {
  if (!SECRET || !reservationId || !token) return false
  const attendu = Buffer.from(signerAnnulation(reservationId))
  const recu    = Buffer.from(String(token))
  return attendu.length === recu.length && timingSafeEqual(attendu, recu)
}
