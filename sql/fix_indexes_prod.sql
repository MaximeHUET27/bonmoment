-- ============================================================
-- BONMOMENT — Index BDD production
-- Scale cible : 500 commerces / 5000 utilisateurs
-- À exécuter dans Supabase SQL Editor
-- Tous les CREATE INDEX utilisent IF NOT EXISTS (idempotents)
-- ============================================================

-- Offres : recherche par commerce + statut (dashboard commerçant)
CREATE INDEX IF NOT EXISTS idx_offres_commerce_statut
  ON offres(commerce_id, statut);

-- Offres : filtrage offres actives par date (page ville, accueil)
CREATE INDEX IF NOT EXISTS idx_offres_ville_statut_datefin
  ON offres(statut, date_fin)
  WHERE statut = 'active';

-- Offres : tri par date_fin (rapport mensuel, expiration cron)
CREATE INDEX IF NOT EXISTS idx_offres_datefin
  ON offres(date_fin);

-- Réservations : lookup par user (profil, mes bons)
CREATE INDEX IF NOT EXISTS idx_reservations_user
  ON reservations(user_id);

-- Réservations : lookup par offre (stats commerçant, validation)
CREATE INDEX IF NOT EXISTS idx_reservations_offre
  ON reservations(offre_id);

-- Réservations : filtrage par statut (utilisee, reservee, expiree)
CREATE INDEX IF NOT EXISTS idx_reservations_statut
  ON reservations(statut);

-- Réservations : check doublon réservation (user + offre)
CREATE INDEX IF NOT EXISTS idx_reservations_user_offre
  ON reservations(user_id, offre_id);

-- Commerces : filtrage par ville + abonnement actif (chips accueil)
CREATE INDEX IF NOT EXISTS idx_commerces_ville_actif
  ON commerces(ville, abonnement_actif);

-- Commerces : lookup par owner (dashboard, inscription)
CREATE INDEX IF NOT EXISTS idx_commerces_owner
  ON commerces(owner_id);

-- Avis Google : stats par commerce (dashboard KPI)
CREATE INDEX IF NOT EXISTS idx_avis_google_commerce
  ON avis_google_clics(commerce_id);

-- Feedbacks : stats par commerce (dashboard KPI + rapport)
CREATE INDEX IF NOT EXISTS idx_feedbacks_commerce
  ON feedbacks_commerce(commerce_id);

-- Push subscriptions : lookup par user (routes push)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions(user_id);

-- Réservations : filtre badge habitant (utilise_at + user_id)
CREATE INDEX IF NOT EXISTS idx_reservations_utilise_at
  ON reservations(user_id, utilise_at)
  WHERE statut = 'utilisee';

-- Offres : filtre par date de création (rapport mensuel)
CREATE INDEX IF NOT EXISTS idx_offres_created_at
  ON offres(commerce_id, created_at);

-- ============================================================
-- Index déjà présents (créés dans fix_indexes_audit.sql) :
-- idx_villes_active, idx_users_notif_email,
-- idx_users_villes_abonnees, idx_users_commerces_abonnes
-- ============================================================
