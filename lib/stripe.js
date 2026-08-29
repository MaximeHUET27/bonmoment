import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Tarifs : price IDs dans STRIPE_PRICE_ESSENTIEL / STRIPE_PRICE_PRO (env).
// Quotas d'offres : QUOTA_PAR_PALIER dans app/api/offres/route.js.
// Affichage : PLANS local dans app/commercant/abonnement/page.js.
