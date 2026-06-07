import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks — vi.hoisted() garantit que les objets sont disponibles quand les
// factories vi.mock() s'exécutent (celles-ci sont hoistées avant les imports).
// ─────────────────────────────────────────────────────────────────────────────

const mockSupabaseAdmin = vi.hoisted(() => ({
  from: vi.fn(),
  auth: { admin: { getUserById: vi.fn() } },
}))

const mockSupabaseServer = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from:  vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseAdmin,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(mockSupabaseServer),
}))

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
    customers: {
      createBalanceTransaction: vi.fn().mockResolvedValue({}),
      retrieve:                 vi.fn().mockResolvedValue({ balance: 0 }),
    },
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports des handlers (résolus avec les mocks déjà en place)
// ─────────────────────────────────────────────────────────────────────────────

import { stripe }                           from '@/lib/stripe'
import { POST as webhookPOST }              from '../../app/api/webhooks/stripe/route.js'
import { GET  as cagnotteGET }              from '../../app/api/commerce/cagnotte/route.js'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crée un chaînage Supabase fictif.
 * - Toutes les méthodes fluentes retournent `this` (chaînable, await-able).
 * - Les terminaux async (maybeSingle, single, upsert) retournent une Promise.
 */
function makeChain(maybeSingleData = null) {
  const chain = {}
  for (const m of ['select', 'eq', 'in', 'update', 'delete', 'lt', 'neq']) {
    chain[m] = vi.fn(() => chain)
  }
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: maybeSingleData })
  chain.single      = vi.fn().mockResolvedValue({ data: maybeSingleData })
  chain.upsert      = vi.fn().mockResolvedValue({ data: null })
  return chain
}

/** Crée une Request minimale pour le webhook. */
function makeWebhookReq() {
  return new Request('http://localhost/api/webhooks/stripe', {
    method:  'POST',
    headers: { 'stripe-signature': 'test-sig' },
    body:    '{}',
  })
}

/** Configure constructEvent pour retourner un événement précis. */
function mockEvent(event) {
  stripe.webhooks.constructEvent.mockReturnValueOnce(event)
}

function invoicePaidEvent(override = {}) {
  return {
    type: 'invoice.paid',
    data: { object: { subscription: 'sub_test', amount_paid: 1000, ...override } },
  }
}

function checkoutEvent(sessionOverride = {}) {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        customer: 'cus_new',
        metadata: { commerce_id: 'c-1', palier: 'essentiel' },
        ...sessionOverride,
      },
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// beforeEach — remise à zéro propre entre chaque test
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks()
  process.env.STRIPE_WEBHOOK_SECRET = 'test_secret'
  global.fetch = vi.fn().mockResolvedValue({ ok: true })

  // Valeurs par défaut réinstallées après reset
  stripe.customers.createBalanceTransaction.mockResolvedValue({})
  stripe.customers.retrieve.mockResolvedValue({ balance: 0 })
  mockSupabaseAdmin.from.mockReturnValue(makeChain(null))
  mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValue({
    data: { user: { email: 'parrain@test.com' } },
  })
  mockSupabaseServer.auth.getUser.mockResolvedValue({ data: { user: null } })
  mockSupabaseServer.from.mockReturnValue(makeChain(null))
})

// ─────────────────────────────────────────────────────────────────────────────
// A — Webhook invoice.paid : récompense parrain
// ─────────────────────────────────────────────────────────────────────────────

describe('A — Webhook invoice.paid — récompense parrain', () => {

  it('A1 — Essentiel + parrain avec stripe_customer_id → createBalanceTransaction(-1000)', async () => {
    const filleul = { id: 'f-1', nom: 'Café Dupont', parrain_id: 'p-1', parrainage_parrain_recompense: false, palier: 'essentiel' }
    const parrain = { id: 'p-1', nom: 'Pizza Roma', stripe_subscription_id: 'sub_p', stripe_customer_id: 'cus_parrain', owner_id: 'owner-p' }

    const filleulChain    = makeChain(filleul)
    const parrainChain    = makeChain(parrain)
    const recompenseChain = makeChain(null)

    mockSupabaseAdmin.from
      .mockReturnValueOnce(filleulChain)
      .mockReturnValueOnce(parrainChain)
      .mockReturnValueOnce(recompenseChain)

    mockEvent(invoicePaidEvent())
    const res = await webhookPOST(makeWebhookReq())
    expect(res.status).toBe(200)

    // A1.a — createBalanceTransaction appelé 1× avec amount = -1000
    expect(stripe.customers.createBalanceTransaction).toHaveBeenCalledTimes(1)
    expect(stripe.customers.createBalanceTransaction).toHaveBeenCalledWith(
      'cus_parrain',
      { amount: -1000, currency: 'eur', description: expect.stringContaining('Café Dupont') },
      { idempotencyKey: 'cagnotte-reward-f-1' }
    )

    // A1.b — from appelé 3× seulement (filleul, parrain, recompense) → pas de mise à jour cagnotte DB
    expect(mockSupabaseAdmin.from).toHaveBeenCalledTimes(3)

    // A1.c — parrainage_parrain_recompense passé à true sur le filleul
    expect(recompenseChain.update).toHaveBeenCalledWith({ parrainage_parrain_recompense: true })
  })

  it('A2 — Palier Pro + parrain avec stripe_customer_id → amount = -1500', async () => {
    const filleul = { id: 'f-2', nom: 'Fleuriste Bleu', parrain_id: 'p-2', parrainage_parrain_recompense: false, palier: 'pro' }
    const parrain = { id: 'p-2', nom: 'Boucherie Martin', stripe_subscription_id: 'sub_p2', stripe_customer_id: 'cus_p2', owner_id: 'owner-p2' }

    mockSupabaseAdmin.from
      .mockReturnValueOnce(makeChain(filleul))
      .mockReturnValueOnce(makeChain(parrain))
      .mockReturnValueOnce(makeChain(null))

    mockEvent(invoicePaidEvent())
    await webhookPOST(makeWebhookReq())

    expect(stripe.customers.createBalanceTransaction).toHaveBeenCalledWith(
      'cus_p2',
      expect.objectContaining({ amount: -1500, currency: 'eur' }),
      expect.anything()
    )
  })

  it('A3 — Parrain SANS stripe_customer_id (ambassadeur) → bancarisation DB, pas de Stripe', async () => {
    const filleul = { id: 'f-3', nom: 'Librairie Lire', parrain_id: 'p-3', parrainage_parrain_recompense: false, palier: 'essentiel' }
    const parrain = { id: 'p-3', nom: 'Atelier Bois', stripe_subscription_id: null, stripe_customer_id: null, owner_id: 'owner-p3' }

    const filleulChain         = makeChain(filleul)
    const parrainChain         = makeChain(parrain)
    const cagnotteSelectChain  = makeChain({ cagnotte_parrainage_cents: 0 })
    const cagnotteUpdateChain  = makeChain(null)
    const recompenseChain      = makeChain(null)

    mockSupabaseAdmin.from
      .mockReturnValueOnce(filleulChain)
      .mockReturnValueOnce(parrainChain)
      .mockReturnValueOnce(cagnotteSelectChain)
      .mockReturnValueOnce(cagnotteUpdateChain)
      .mockReturnValueOnce(recompenseChain)

    mockEvent(invoicePaidEvent())
    const res = await webhookPOST(makeWebhookReq())
    expect(res.status).toBe(200)

    // A3.a — AUCUN appel Stripe createBalanceTransaction
    expect(stripe.customers.createBalanceTransaction).not.toHaveBeenCalled()

    // A3.b — cagnotte_parrainage_cents mise à jour : 0 + 1000 = 1000
    expect(cagnotteUpdateChain.update).toHaveBeenCalledWith({ cagnotte_parrainage_cents: 1000 })

    // A3.c — flag recompense posé
    expect(recompenseChain.update).toHaveBeenCalledWith({ parrainage_parrain_recompense: true })
  })

  it('A4 — Cumul : cagnotte existante 1000 + filleul Essentiel → mise à jour à 2000', async () => {
    const filleul = { id: 'f-4', nom: 'Épicerie Bio', parrain_id: 'p-4', parrainage_parrain_recompense: false, palier: 'essentiel' }
    const parrain = { id: 'p-4', nom: 'Savonnerie', stripe_subscription_id: null, stripe_customer_id: null, owner_id: 'owner-p4' }

    const cagnotteUpdateChain = makeChain(null)

    mockSupabaseAdmin.from
      .mockReturnValueOnce(makeChain(filleul))
      .mockReturnValueOnce(makeChain(parrain))
      .mockReturnValueOnce(makeChain({ cagnotte_parrainage_cents: 1000 }))  // cagnotte existante
      .mockReturnValueOnce(cagnotteUpdateChain)
      .mockReturnValueOnce(makeChain(null))

    mockEvent(invoicePaidEvent())
    await webhookPOST(makeWebhookReq())

    expect(cagnotteUpdateChain.update).toHaveBeenCalledWith({ cagnotte_parrainage_cents: 2000 })
  })

  it('A5 — Idempotence : parrainage_parrain_recompense déjà true → aucun traitement', async () => {
    const filleul = { id: 'f-5', nom: 'Yoga Studio', parrain_id: 'p-5', parrainage_parrain_recompense: true, palier: 'essentiel' }

    mockSupabaseAdmin.from.mockReturnValueOnce(makeChain(filleul))

    mockEvent(invoicePaidEvent())
    await webhookPOST(makeWebhookReq())

    // Seul le select filleul est fait, puis break immédiat
    expect(mockSupabaseAdmin.from).toHaveBeenCalledTimes(1)
    expect(stripe.customers.createBalanceTransaction).not.toHaveBeenCalled()
  })

  it('A6 — Facture trial (amount_paid = 0) → aucun traitement', async () => {
    mockEvent(invoicePaidEvent({ amount_paid: 0 }))
    await webhookPOST(makeWebhookReq())

    expect(mockSupabaseAdmin.from).not.toHaveBeenCalled()
    expect(stripe.customers.createBalanceTransaction).not.toHaveBeenCalled()
  })

  it('A7 — Filleul sans parrain_id → aucun traitement', async () => {
    const filleul = { id: 'f-7', nom: 'Sans parrain', parrain_id: null, parrainage_parrain_recompense: false, palier: 'essentiel' }

    mockSupabaseAdmin.from.mockReturnValueOnce(makeChain(filleul))

    mockEvent(invoicePaidEvent())
    await webhookPOST(makeWebhookReq())

    // Seul le select filleul, puis break
    expect(mockSupabaseAdmin.from).toHaveBeenCalledTimes(1)
    expect(stripe.customers.createBalanceTransaction).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// B — Webhook checkout.session.completed : push cagnotte à la conversion
// ─────────────────────────────────────────────────────────────────────────────

describe('B — Webhook checkout.session.completed — push cagnotte', () => {

  it('B1 — cagnotte 2500 + customer présent → createBalanceTransaction(-2500) puis reset à 0', async () => {
    const resetChain = makeChain(null)

    mockSupabaseAdmin.from
      .mockReturnValueOnce(makeChain(null))                                // update commerce
      .mockReturnValueOnce(makeChain({ cagnotte_parrainage_cents: 2500 })) // select cagnotte
      .mockReturnValueOnce(resetChain)                                     // update cagnotte → 0

    mockEvent(checkoutEvent())
    const res = await webhookPOST(makeWebhookReq())
    expect(res.status).toBe(200)

    expect(stripe.customers.createBalanceTransaction).toHaveBeenCalledTimes(1)
    expect(stripe.customers.createBalanceTransaction).toHaveBeenCalledWith(
      'cus_new',
      { amount: -2500, currency: 'eur', description: expect.stringContaining('ambassadeur') },
      { idempotencyKey: 'cagnotte-conv-c-1' }
    )
    expect(resetChain.update).toHaveBeenCalledWith({ cagnotte_parrainage_cents: 0 })
  })

  it('B2 — cagnotte = 0 → aucun appel Stripe, pas de reset', async () => {
    mockSupabaseAdmin.from
      .mockReturnValueOnce(makeChain(null))                               // update commerce
      .mockReturnValueOnce(makeChain({ cagnotte_parrainage_cents: 0 }))  // select cagnotte

    mockEvent(checkoutEvent())
    await webhookPOST(makeWebhookReq())

    expect(stripe.customers.createBalanceTransaction).not.toHaveBeenCalled()
    // from appelé 2× seulement (pas de reset)
    expect(mockSupabaseAdmin.from).toHaveBeenCalledTimes(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// C — Route GET /api/commerce/cagnotte
// ─────────────────────────────────────────────────────────────────────────────

describe('C — Route GET /api/commerce/cagnotte', () => {

  it('C1 — Non authentifié → 401', async () => {
    mockSupabaseServer.auth.getUser.mockResolvedValue({ data: { user: null } })

    const res = await cagnotteGET(new Request('http://localhost/api/commerce/cagnotte?commerce_id=c-1'))
    expect(res.status).toBe(401)
  })

  it('C2 — commerce_id manquant → 400', async () => {
    mockSupabaseServer.auth.getUser.mockResolvedValue({ data: { user: { id: 'u-1' } } })

    const res = await cagnotteGET(new Request('http://localhost/api/commerce/cagnotte'))
    expect(res.status).toBe(400)
  })

  it('C3 — Commerce appartenant à un autre owner → 404', async () => {
    mockSupabaseServer.auth.getUser.mockResolvedValue({ data: { user: { id: 'u-1' } } })
    mockSupabaseServer.from.mockReturnValueOnce(makeChain(null))  // maybySingle → null

    const res = await cagnotteGET(new Request('http://localhost/api/commerce/cagnotte?commerce_id=c-1'))
    expect(res.status).toBe(404)
  })

  it('C4 — Solde Stripe -2500 (crédit) + cagnotte DB 0 → cents = 2500', async () => {
    const commerce = { id: 'c-1', stripe_customer_id: 'cus_x', cagnotte_parrainage_cents: 0 }
    mockSupabaseServer.auth.getUser.mockResolvedValue({ data: { user: { id: 'u-1' } } })
    mockSupabaseServer.from.mockReturnValueOnce(makeChain(commerce))
    stripe.customers.retrieve.mockResolvedValue({ balance: -2500 })

    const res = await cagnotteGET(new Request('http://localhost/api/commerce/cagnotte?commerce_id=c-1'))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.cents).toBe(2500)
  })

  it('C5 — Pas de customer Stripe + cagnotte DB 1000 → cents = 1000', async () => {
    const commerce = { id: 'c-1', stripe_customer_id: null, cagnotte_parrainage_cents: 1000 }
    mockSupabaseServer.auth.getUser.mockResolvedValue({ data: { user: { id: 'u-1' } } })
    mockSupabaseServer.from.mockReturnValueOnce(makeChain(commerce))

    const res = await cagnotteGET(new Request('http://localhost/api/commerce/cagnotte?commerce_id=c-1'))
    const data = await res.json()
    expect(data.cents).toBe(1000)
    expect(stripe.customers.retrieve).not.toHaveBeenCalled()
  })

  it('C6 — Solde Stripe positif (+500, débit) → creditStripe = 0 → cents = cagnotte DB seule', async () => {
    const commerce = { id: 'c-1', stripe_customer_id: 'cus_x', cagnotte_parrainage_cents: 750 }
    mockSupabaseServer.auth.getUser.mockResolvedValue({ data: { user: { id: 'u-1' } } })
    mockSupabaseServer.from.mockReturnValueOnce(makeChain(commerce))
    stripe.customers.retrieve.mockResolvedValue({ balance: 500 })  // positif → pas un crédit

    const res = await cagnotteGET(new Request('http://localhost/api/commerce/cagnotte?commerce_id=c-1'))
    const data = await res.json()
    expect(data.cents).toBe(750)  // creditStripe = 0, seul le DB compte
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// D — Email buildEmailParrain (testé via interception du fetch Brevo)
// ─────────────────────────────────────────────────────────────────────────────

describe('D — Email buildEmailParrain', () => {

  async function runInvoicePaidWithParrain(parrainOverride) {
    const filleul = { id: 'f-d', nom: 'Glacier Soleil', parrain_id: 'p-d', parrainage_parrain_recompense: false, palier: 'essentiel' }
    const parrain = { id: 'p-d', nom: 'Glacier Nord', stripe_subscription_id: null, owner_id: 'owner-d', ...parrainOverride }

    // Chains needed depend on whether parrain has stripe_customer_id
    if (parrainOverride.stripe_customer_id) {
      mockSupabaseAdmin.from
        .mockReturnValueOnce(makeChain(filleul))
        .mockReturnValueOnce(makeChain(parrain))
        .mockReturnValueOnce(makeChain(null))  // recompense
    } else {
      mockSupabaseAdmin.from
        .mockReturnValueOnce(makeChain(filleul))
        .mockReturnValueOnce(makeChain(parrain))
        .mockReturnValueOnce(makeChain({ cagnotte_parrainage_cents: 0 }))  // select cagnotte
        .mockReturnValueOnce(makeChain(null))  // update cagnotte
        .mockReturnValueOnce(makeChain(null))  // recompense
    }

    mockEvent(invoicePaidEvent())
    await webhookPOST(makeWebhookReq())

    const brevoCall = global.fetch.mock.calls.find(c => c[0].includes('brevo'))
    if (!brevoCall) return null
    return JSON.parse(brevoCall[1].body)
  }

  it('D1 — estPayant = true → htmlContent contient "déduit de vos prochaines mensualités"', async () => {
    const body = await runInvoicePaidWithParrain({ stripe_customer_id: 'cus_parrain' })
    expect(body).not.toBeNull()
    expect(body.htmlContent).toContain('déduit de vos prochaines mensualités')
  })

  it('D2 — estPayant = false → htmlContent contient "dès le début de votre abonnement payant"', async () => {
    const body = await runInvoicePaidWithParrain({ stripe_customer_id: null })
    expect(body).not.toBeNull()
    expect(body.htmlContent).toContain('dès le début de votre abonnement payant')
  })
})
