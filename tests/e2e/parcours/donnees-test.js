import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { env } from '../securite/helpers.js'

/**
 * Donnees de test ISOLEES par marqueurs (la base de test dediee n'existe pas :
 * plan Supabase gratuit). Tout ce que le parcours cree porte un de ces marqueurs
 * et nettoyer() ne supprime QUE ce qui les porte.
 */
export const TEST_VILLE = 'Zz-Test-E2E-Ville'
export const TEST_PLACE_PREFIX = 'zz-e2e-'
export const TEST_EMAIL_DOMAIN = '@zz-e2e-bonmoment.example.com'
export const MOT_DE_PASSE = 'E2e-Test-' + 'Mdp-9f3kQ2xL!'

const URL = env('NEXT_PUBLIC_SUPABASE_URL')
const ANON = env('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const SERVICE = env('SUPABASE_SERVICE_ROLE_KEY')

export const admin = () => createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })

export async function creerUtilisateur(role, suffixe) {
  const a = admin()
  const email = `${suffixe}${TEST_EMAIL_DOMAIN}`
  const { data, error } = await a.auth.admin.createUser({ email, password: MOT_DE_PASSE, email_confirm: true })
  if (error) throw new Error('createUser: ' + error.message)
  const { error: e2 } = await a.from('users').upsert({ id: data.user.id, email, nom: `ZZ Test ${suffixe}`, role })
  if (e2) throw new Error('users upsert: ' + e2.message)
  return { id: data.user.id, email }
}

/** Connexion mot de passe -> session + client supabase authentifie (RLS reelle). */
export async function connecter(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await c.auth.signInWithPassword({ email, password: MOT_DE_PASSE })
  if (error) throw new Error('signIn: ' + error.message)
  return { client: c, session: data.session }
}

/** Cookie(s) au format @supabase/ssr (base64url, decoupe en morceaux de 3180). */
export function cookiesSession(session) {
  const ref = new globalThis.URL(URL).hostname.split('.')[0]
  const name = `sb-${ref}-auth-token`
  const val = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  const morceaux = val.match(/.{1,3180}/g) || [val]
  const base = { domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' }
  return morceaux.length === 1
    ? [{ name, value: val, ...base }]
    : morceaux.map((v, i) => ({ name: `${name}.${i}`, value: v, ...base }))
}

export async function nettoyer() {
  const a = admin()
  const rapport = {}

  const { data: us } = await a.from('users').select('id, email').like('email', `%${TEST_EMAIL_DOMAIN}`)
  const userIds = (us || []).map((u) => u.id)

  const { data: cs } = await a.from('commerces').select('id, stripe_customer_id').or(
    `place_id.like.${TEST_PLACE_PREFIX}%,ville.eq.${TEST_VILLE}${userIds.length ? `,owner_id.in.(${userIds.join(',')})` : ''}`)
  const commerceIds = (cs || []).map((c) => c.id)

  const { data: os } = commerceIds.length ? await a.from('offres').select('id').in('commerce_id', commerceIds) : { data: [] }
  const offreIds = (os || []).map((o) => o.id)

  const step = async (nom, p) => { const { error } = await p; rapport[nom] = error ? 'ERREUR ' + error.message : 'ok' }

  if (offreIds.length) {
    await step('reservations', a.from('reservations').delete().in('offre_id', offreIds))
    await step('participations', a.from('participations_offres').delete().in('offre_id', offreIds))
  }
  if (userIds.length) {
    await step('reservations_users', a.from('reservations').delete().in('user_id', userIds))
    await step('cartes', a.from('cartes_fidelite').delete().in('user_id', userIds))
    await step('feedbacks', a.from('feedbacks_commerce').delete().in('user_id', userIds))
    await step('avis_clics', a.from('avis_google_clics').delete().in('user_id', userIds))
    await step('push_subs', a.from('push_subscriptions').delete().in('user_id', userIds))
  }
  if (commerceIds.length) {
    await step('offres', a.from('offres').update({ gagnant_id: null }).in('commerce_id', commerceIds))
    await step('offres_del', a.from('offres').delete().in('commerce_id', commerceIds))
    await step('codes_parrainage', a.from('codes_parrainage').delete().in('commerce_id', commerceIds))
    await step('programmes', a.from('programmes_fidelite').delete().in('commerce_id', commerceIds))
    await step('cartes_commerce', a.from('cartes_fidelite').delete().in('commerce_id', commerceIds))
    await step('avis_clics_c', a.from('avis_google_clics').delete().in('commerce_id', commerceIds))
    await step('feedbacks_c', a.from('feedbacks_commerce').delete().in('commerce_id', commerceIds))
    await step('recettes', a.from('recettes').delete().in('commerce_id', commerceIds))
    await step('commerces', a.from('commerces').delete().in('id', commerceIds))
  }
  for (const id of userIds) {
    await a.from('users').delete().eq('id', id)
    const { error } = await a.auth.admin.deleteUser(id)
    if (error) rapport['auth_' + id] = 'ERREUR ' + error.message
  }
  await step('ville', a.from('villes').delete().eq('nom', TEST_VILLE))

  // Clients Stripe (mode test uniquement) crees par le parcours.
  const sk = env('STRIPE_SECRET_KEY')
  if (sk?.startsWith('sk_test_')) {
    const stripe = new Stripe(sk)
    const ids = new Set((cs || []).map((c) => c.stripe_customer_id).filter(Boolean))
    for (const email of (us || []).map((u) => u.email)) {
      const r = await stripe.customers.list({ email, limit: 10 })
      r.data.forEach((c) => ids.add(c.id))
    }
    for (const id of ids) await stripe.customers.del(id).catch(() => {})
    rapport.stripe_clients_supprimes = ids.size
  }
  return rapport
}

/** Compte les residus : doit valoir 0 partout apres nettoyer(). */
export async function residus() {
  const a = admin()
  const n = async (p) => (await p).count ?? -1
  const { data: auth } = await a.auth.admin.listUsers({ perPage: 1000 })
  return {
    users: await n(a.from('users').select('id', { count: 'exact', head: true }).like('email', `%${TEST_EMAIL_DOMAIN}`)),
    auth: (auth?.users || []).filter((u) => u.email?.endsWith(TEST_EMAIL_DOMAIN)).length,
    commerces: await n(a.from('commerces').select('id', { count: 'exact', head: true }).or(`place_id.like.${TEST_PLACE_PREFIX}%,ville.eq.${TEST_VILLE}`)),
    villes: await n(a.from('villes').select('id', { count: 'exact', head: true }).eq('nom', TEST_VILLE)),
    offres_orphelines: await n(a.from('offres').select('id', { count: 'exact', head: true }).like('titre', 'ZZ TEST%')),
  }
}
