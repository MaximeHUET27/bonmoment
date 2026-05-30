-- ============================================================
-- SÉCURITÉ : Whitelist colonne INSERT/UPDATE sur public.commerces
-- Bloque les colonnes facturation/accès pour authenticated et anon.
-- Le service_role bypass automatiquement (non concerné).
-- La RLS n'est pas modifiée.
--
-- MÉCANISME (3 étapes nécessaires) :
-- Un simple REVOKE colonne-level ne suffit pas quand le grant original
-- est table-level (PostgreSQL retire alors tout le grant table-level sans
-- créer de grants colonne pour les colonnes restantes).
-- La bonne approche : REVOKE table-level → GRANT colonne-level safe seulement.
--
-- Prérequis : fix inscription (commit 44a23d8) déployé en prod.
-- ============================================================

-- ÉTAPE 1 : Retirer les grants table-level INSERT et UPDATE
REVOKE INSERT, UPDATE ON public.commerces FROM authenticated, anon;

-- ÉTAPE 2 : Re-accorder INSERT uniquement sur les colonnes sûres (authenticated)
-- (anon ne doit pas pouvoir créer de commerce)
GRANT INSERT (
  place_id, owner_id, nom, categorie, categorie_bonmoment, adresse, ville,
  description, photo_url, qr_code_url, horaires, note_google, telephone,
  tutoriel_complete, maps_url, latitude, longitude, rapport_mensuel_actif,
  logo_url, affiche_logo_mairie_asso_id, nb_avis_google
) ON public.commerces TO authenticated;

-- ÉTAPE 3 : Re-accorder UPDATE uniquement sur les colonnes sûres (authenticated)
-- Colonnes EXCLUES (jamais écrites côté client) :
--   Groupe A (facturation/accès) : abonnement_actif, palier, est_ambassadeur,
--     date_fin_ambassadeur, date_fin_abonnement, date_fin_essai,
--     resiliation_prevue, stripe_customer_id, stripe_subscription_id
--   Groupe B (admin/parrainage/système) : notes_admin, last_login_at, parrain_id,
--     parrainage_parrain_recompense, code_parrainage, code_parrainage_expire_at,
--     date_generation_parrainage, nb_parrainages_mois_courant, mois_parrainages
GRANT UPDATE (
  place_id, nom, categorie, categorie_bonmoment, adresse, ville,
  description, photo_url, qr_code_url, horaires, note_google, telephone,
  tutoriel_complete, maps_url, latitude, longitude, rapport_mensuel_actif,
  logo_url, affiche_logo_mairie_asso_id, nb_avis_google
) ON public.commerces TO authenticated;

-- ============================================================
-- ROLLBACK — à exécuter en cas de problème
-- GRANT INSERT, UPDATE ON public.commerces TO authenticated;
-- (Restaure les grants table-level d'origine — à ré-affiner ensuite)
-- ============================================================
