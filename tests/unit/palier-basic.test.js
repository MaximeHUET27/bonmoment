import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  PALIERS, PALIERS_PAYANTS, quotaOffres, estBasic, aStatsTempsReel, aAvisGoogle, nomPalier,
} from '@/lib/paliers'

const lire = (p) => readFileSync(join(process.cwd(), p), 'utf8')

describe('Paliers — quotas et droits', () => {
  it('Basic = gratuit, 1 offre/mois', () => {
    expect(PALIERS.basic.prix).toBe(0)
    expect(quotaOffres('basic')).toBe(1)
  })

  it('Essentiel 8 offres, Pro illimité (inchangés)', () => {
    expect(quotaOffres('essentiel')).toBe(8)
    expect(quotaOffres('pro')).toBeNull()
  })

  it('palier absent ou inconnu → traité comme Basic (jamais plus permissif)', () => {
    for (const p of [null, undefined, '', 'decouverte', 'xxx']) {
      expect(quotaOffres(p)).toBe(1)
      expect(nomPalier(p)).toBe('Basic')
    }
    expect(estBasic(null)).toBe(true)
  })

  it('stats temps réel et avis Google réservés aux paliers payants', () => {
    expect(aStatsTempsReel('basic')).toBe(false)
    expect(aAvisGoogle('basic')).toBe(false)
    expect(aAvisGoogle(undefined)).toBe(false)
    for (const p of ['essentiel', 'pro']) {
      expect(aStatsTempsReel(p)).toBe(true)
      expect(aAvisGoogle(p)).toBe(true)
    }
  })

  it('Basic ne fait pas partie des paliers achetables', () => {
    expect(PALIERS_PAYANTS).toEqual(['essentiel', 'pro'])
  })
})

describe('Sécurité — activation Basic', () => {
  const route = lire('app/api/commercant/activer-basic/route.js')

  it('exige un utilisateur connecté, propriétaire du commerce', () => {
    expect(route).toMatch(/auth\.getUser\(\)/)
    expect(route).toMatch(/\.eq\('owner_id', user\.id\)/)
  })

  it("n'agit que sur un commerce sans palier ni abonnement Stripe (pas de rétrogradation / réactivation)", () => {
    expect(route).toMatch(/\.is\('palier', null\)/)
    expect(route).toMatch(/\.is\('stripe_subscription_id', null\)/)
  })

  it("n'accepte aucun palier venant du client", () => {
    expect(route).not.toMatch(/body\.palier/)
  })

  it('est rate-limitée', () => {
    expect(route).toMatch(/rateLimit\(/)
  })

  it("l'inscription ne réécrit pas les colonnes de facturation côté client", () => {
    const inscription = lire('app/commercant/inscription/page.js')
    const insert = inscription.slice(inscription.indexOf(".from('commerces').insert("), inscription.indexOf(".select('id').single()"))
    expect(insert).not.toMatch(/palier|abonnement_actif/)
  })
})

describe("Checkout Stripe — Basic n'est pas achetable", () => {
  it('aucun price ID pour basic', () => {
    const checkout = lire('app/api/stripe/checkout/route.js')
    expect(checkout).not.toMatch(/basic\s*:/)
  })
})

describe('Sécurité — quota vérifié en base (trigger)', () => {
  const sql = lire('sql/quota_offres_trigger.sql')

  it('mêmes quotas que lib/paliers.js', () => {
    expect(sql).toMatch(/WHEN 'pro'\s+THEN NULL/)
    expect(sql).toMatch(/WHEN 'essentiel' THEN 8/)
    expect(sql).toMatch(/ELSE 1/)
    expect(quotaOffres('essentiel')).toBe(8)
    expect(quotaOffres('basic')).toBe(1)
  })

  it('trigger BEFORE INSERT, verrou par commerce, fonction non appelable par les clients', () => {
    expect(sql).toMatch(/BEFORE INSERT ON public\.offres/)
    expect(sql).toMatch(/pg_advisory_xact_lock/)
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.verifier_quota_offres\(\) FROM PUBLIC, anon, authenticated/)
  })

  it("l'API traduit le refus du trigger en 403", () => {
    expect(lire('app/api/offres/route.js')).toMatch(/QUOTA_OFFRES_ATTEINT[\s\S]{0,200}status: 403/)
  })
})
