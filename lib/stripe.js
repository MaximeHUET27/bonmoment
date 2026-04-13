import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export const PLANS = {
  decouverte: {
    nom:        'Découverte',
    prix:       29,
    offres_max: 4,
    description: '4 offres/mois — Bons illimités',
  },
  essentiel: {
    nom:        'Essentiel',
    prix:       49,
    offres_max: 8,
    description: '8 offres/mois — Bons illimités',
  },
  pro: {
    nom:        'Pro',
    prix:       79,
    offres_max: 16,
    description: '16 offres/mois — Bons illimités',
  },
}
