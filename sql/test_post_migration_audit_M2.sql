-- ============================================================================
-- Test post-migration — M2 : droits par colonne sur commerces pour anon
-- ============================================================================

-- 1. Colonnes publiques toujours lisibles par anon
SELECT column_name,
  has_column_privilege('anon', 'public.commerces', column_name, 'SELECT') AS anon_can_select
FROM information_schema.columns
WHERE table_schema='public' AND table_name='commerces'
ORDER BY column_name;
-- Attendu : true uniquement pour id, nom, categorie, categorie_bonmoment,
-- adresse, ville, description, photo_url, note_google, telephone, horaires,
-- place_id, abonnement_actif. false pour toutes les autres (owner_id,
-- stripe_customer_id, stripe_subscription_id, notes_admin, last_login_at,
-- date_fin_essai, cagnotte_parrainage_cents, code_parrainage, ...).

-- 2. authenticated inchangé (toutes colonnes lisibles, comme avant)
SELECT column_name,
  has_column_privilege('authenticated', 'public.commerces', column_name, 'SELECT') AS auth_can_select
FROM information_schema.columns
WHERE table_schema='public' AND table_name='commerces'
ORDER BY column_name;
-- Attendu : true partout (aucun changement pour authenticated)

-- 3. Non-régression manuelle : recharger en navigation privée (non connecté)
--    /ville/<slug>, /commercant/<id>, /offre/<id>, /carte — doivent toujours
--    afficher nom/adresse/photo/horaires/téléphone/note Google normalement.
