import { test, expect } from '@playwright/test'
import { rest, ANON_KEY, SUPABASE_URL } from './helpers.js'

// Attaques avec la cle publique (anon) contre la base reelle : lectures,
// ou ecritures qui DOIVENT etre refusees (aucune ligne reelle ciblee).
test.skip(!ANON_KEY || !SUPABASE_URL, 'variables Supabase absentes')
const UUID = '00000000-0000-0000-0000-000000000000'

async function aucuneLigne(res) {
  if (res.status() >= 400) return true
  const body = await res.json().catch(() => null)
  return Array.isArray(body) ? body.length === 0 : false
}

for (const t of ['users', 'users_light', 'reservations', 'charges', 'recettes', 'parametres_comptables', 'rate_limits',
  'essais_consommes', 'cartes_fidelite', 'passages_fidelite', 'vue_base_client_fidelite', 'chatbot_feedbacks',
  'feedbacks_commerce', 'participations_offres']) {
  test(`anon ne lit aucune ligne de ${t}`, async ({ request }) => {
    expect(await aucuneLigne(await rest(request, `${t}?select=*&limit=5`))).toBe(true)
  })
}

test('anon ne lit pas les colonnes sensibles de commerces', async ({ request }) => {
  for (const col of ['stripe_customer_id', 'stripe_subscription_id', 'notes_admin', 'owner_id', 'cagnotte_parrainage_cents', 'last_login_at']) {
    const res = await rest(request, `commerces?select=${col}&limit=1`)
    expect(res.status(), col).toBeGreaterThanOrEqual(400)
  }
  expect((await rest(request, 'commerces?select=*&limit=1')).status()).toBeGreaterThanOrEqual(400)
})

test('anon lit toujours les colonnes publiques de commerces (pas de regression)', async ({ request }) => {
  const res = await rest(request, 'commerces?select=id,nom,ville,categorie&limit=3')
  expect(res.status()).toBe(200)
  expect((await res.json()).length).toBeGreaterThan(0)
})

test('anon lit toujours les offres publiques', async ({ request }) => {
  expect((await rest(request, 'offres?select=id,titre&limit=3')).status()).toBe(200)
})

test('anon ne peut rien ecrire', async ({ request }) => {
  const cas = [
    ['POST', 'reservations', { offre_id: UUID, user_id: UUID }],
    ['PATCH', `users?id=eq.${UUID}`, { role: 'admin' }],
    ['PATCH', `commerces?id=eq.${UUID}`, { abonnement_actif: true }],
    ['PATCH', `offres?id=eq.${UUID}`, { statut: 'active' }],
    ['POST', 'offres', { titre: 'x' }],
    ['POST', 'rate_limits', { key: 'x' }],
    ['DELETE', `reservations?id=eq.${UUID}`, undefined],
    ['DELETE', `commerces?id=eq.${UUID}`, undefined],
  ]
  for (const [method, p, body] of cas) {
    const res = await rest(request, p, { method, body })
    // PATCH/DELETE filtres par RLS peuvent repondre 2xx avec 0 ligne touchee : corps vide exige.
    if (res.status() < 300) {
      const txt = (await res.text()).trim()
      expect(txt === '' || txt === '[]', `${method} ${p}`).toBe(true)
    }
  }
})

const RPC_INTERDITES = ['reserver_bon', 'annuler_bon', 'enregistrer_passage_fidelite', 'ajuster_tampons_manuel', 'annuler_passage_fidelite',
  'confirmer_recompense_remise', 'mettre_a_jour_programme_fidelite', 'activer_carte_fidelite_client', 'desactiver_fidelite_client',
  'modifier_telephone_client', 'get_commercants_invitables', 'get_invitations_et_adhesions_commerce', 'get_membres_mairie_asso',
  'get_offres_collectives_commerce', 'get_participants_offre', 'get_stats_cumulees_mairie_asso', 'peut_utiliser_fidelite', 'check_rate_limit_fidelite']

for (const fn of RPC_INTERDITES) {
  test(`anon ne peut pas appeler rpc/${fn}`, async ({ request }) => {
    const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }, data: {},
    })
    expect([401, 403, 404]).toContain(res.status())
  })
}

test('storage : anon ne peut pas deposer de fichier', async ({ request }) => {
  const res = await request.post(`${SUPABASE_URL}/storage/v1/object/commerces/e2e-intrusion.txt`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'text/plain' }, data: 'x',
  })
  expect(res.status()).toBeGreaterThanOrEqual(400)
})
