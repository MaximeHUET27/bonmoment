-- ============================================================================
-- Test post-migration — C2 : droits par colonne sur reservations
-- ============================================================================

-- 1. Droits de colonnes attendus pour authenticated
SELECT column_name,
  has_column_privilege('authenticated', 'public.reservations', column_name, 'UPDATE') AS can_update,
  has_column_privilege('authenticated', 'public.reservations', column_name, 'INSERT') AS can_insert
FROM information_schema.columns
WHERE table_schema='public' AND table_name='reservations'
ORDER BY column_name;
-- Attendu : can_update = true UNIQUEMENT pour qr_code_data, false partout ailleurs
--           can_insert = false sur toutes les colonnes

-- 2. anon/authenticated ne peuvent plus DELETE
SELECT has_table_privilege('authenticated', 'public.reservations', 'DELETE') AS auth_delete,
       has_table_privilege('anon', 'public.reservations', 'DELETE') AS anon_delete;
-- Attendu : false, false

-- 3. Non-régression fonctionnelle (à exécuter manuellement avec un vrai
--    utilisateur authentifié de test, pas via SQL direct) :
--    - réserver un bon (reserver_bon) -> succès, code + qr_code_data renseigné
--    - annuler ce bon (annuler_bon) -> succès, stock restitué
--    - re-réserver la même offre -> succès (réactivation de la ligne annulee)
--    - tentative directe .from('reservations').insert(...) côté client
--      -> doit échouer (permission denied for table reservations)
--    - tentative directe .from('reservations').update({statut:'reservee'})
--      sur un bon utilisee -> doit échouer (permission denied for column statut)
