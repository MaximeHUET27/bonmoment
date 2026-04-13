-- Migration : colonnes Stripe sur la table commerces
-- À exécuter une fois dans Supabase > SQL Editor

ALTER TABLE commerces ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS palier                  TEXT DEFAULT 'decouverte';

-- Index pour les lookups Stripe (webhooks)
CREATE INDEX IF NOT EXISTS idx_commerces_stripe_customer      ON commerces (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_commerces_stripe_subscription  ON commerces (stripe_subscription_id);
