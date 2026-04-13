import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:bonmomentapp@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

/**
 * Envoie une notification push à un seul abonné.
 * @param {{ endpoint: string, keys: { p256dh: string, auth: string } }} subscription
 * @param {{ title: string, body: string, url?: string, icon?: string }} payload
 * @returns {Promise<boolean>} true = succès, false = abonnement expiré/invalide
 */
export async function sendPush(subscription, payload) {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body:  payload.body,
        url:   payload.url  || '/',
        icon:  payload.icon || '/icon-192.png',
      }),
    )
    return true
  } catch (err) {
    // 410 Gone = abonnement révoqué → à supprimer de la DB
    if (err.statusCode === 410 || err.statusCode === 404) return false
    console.error('[push] Erreur envoi:', err.message)
    return false
  }
}

/**
 * Envoie une notification push à plusieurs abonnés.
 * Retourne le nombre de succès.
 * @param {Array<{ id: string, endpoint: string, p256dh: string, auth: string }>} subs
 * @param {{ title: string, body: string, url?: string, icon?: string }} payload
 * @param {import('@supabase/supabase-js').SupabaseClient} [adminClient] - pour supprimer les abonnements expirés
 */
export async function sendPushToMany(subs, payload, adminClient) {
  let ok = 0
  const expired = []

  await Promise.all(
    subs.map(async (sub) => {
      const success = await sendPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
      if (success) {
        ok++
      } else {
        expired.push(sub.id)
      }
    }),
  )

  // Supprime les abonnements expirés / révoqués
  if (expired.length > 0 && adminClient) {
    await adminClient.from('push_subscriptions').delete().in('id', expired)
  }

  return ok
}
