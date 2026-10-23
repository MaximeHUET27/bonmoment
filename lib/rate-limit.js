/**
 * Rate limiter partagé entre toutes les instances serverless Vercel
 * (audit M7 : une Map en mémoire ne limite rien en réalité, chaque
 * instance ayant son propre compteur). Fenêtre fixe stockée dans la
 * table Supabase `rate_limits`, incrémentée atomiquement par la
 * fonction SQL `check_rate_limit()`.
 *
 * Même clé qu'avant (maxRequests:windowMs:ip) — comportement identique,
 * seul le stockage change.
 */
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export function rateLimit({ maxRequests, windowMs }) {
  return async function check(request) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const key = `${maxRequests}:${windowMs}:${ip}`

    const { data: allowed, error } = await admin.rpc('check_rate_limit', {
      p_key: key,
      p_max: maxRequests,
      p_window_ms: windowMs,
    })

    if (error) {
      // Panne du stockage partagé : on ne bloque pas l'utilisateur,
      // on journalise seulement (la route reste protégée au pire
      // comme avant l'audit, jamais plus fermée qu'avant).
      console.error('[rate-limit] check_rate_limit error:', error.message)
      return null
    }

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Trop de tentatives, réessaie dans quelques minutes.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return null
  }
}
