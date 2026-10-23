/**
 * Audit M5 : point unique de verification admin, au lieu de comparer
 * l'email en dur dans plus de 20 fichiers. Meme email qu'avant, aucun
 * changement de comportement — seule la source de verite est centralisee.
 * Le passage a un role dans app_metadata est une etape separee.
 */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bonmomentapp@gmail.com'

export function isAdmin(user) {
  return !!user && user.email === ADMIN_EMAIL
}
