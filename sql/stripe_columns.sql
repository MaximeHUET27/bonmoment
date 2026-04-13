-- Migration : colonnes Stripe sur la table commerces
-- À exécuter une fois dans Supabase > SQL Editor

ALTER TABLE commerces ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS abonnement_actif        BOOLEAN DEFAULT false;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS palier                  TEXT;  -- NULL = pas d'abonnement

-- Supprimer le DEFAULT 'decouverte' s'il existait (évite les faux abonnements à l'inscription)
ALTER TABLE commerces ALTER COLUMN palier DROP DEFAULT;

-- Nettoyer les faux paliers : si pas de subscription Stripe → palier = NULL
UPDATE commerces SET palier = NULL WHERE stripe_subscription_id IS NULL AND palier = 'decouverte';

-- Index pour les lookups Stripe (webhooks)
CREATE INDEX IF NOT EXISTS idx_commerces_stripe_customer      ON commerces (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_commerces_stripe_subscription  ON commerces (stripe_subscription_id);
