-- ============================================================================
-- Test post-migration — m4-mineur : colonnes users + garde-fou role
-- ============================================================================

-- 1. Droits de colonnes attendus
SELECT column_name,
  has_column_privilege('authenticated', 'public.users', column_name, 'UPDATE') AS can_update
FROM information_schema.columns
WHERE table_schema='public' AND table_name='users'
ORDER BY can_update DESC, column_name;
-- Attendu : true uniquement pour notifications_email,
-- notifications_email_push, notifications_push, villes_abonnees,
-- commerces_abonnes, role. false partout ailleurs (badge_niveau,
-- notes_admin, email, id...).

-- 2. Le trigger bloque toute transition de role hors client->commercant
-- (a executer en tant qu'authenticated avec un vrai auth.uid() de test) :
-- UPDATE users SET role = 'admin' WHERE id = auth.uid();
-- Attendu : ERREUR "Transition de role non autorisee"

-- 3. La transition legitime reste possible :
-- UPDATE users SET role = 'commercant' WHERE id = auth.uid() AND role = 'client';
-- Attendu : succes (si role etait bien 'client' avant)

-- 4. Non-regression manuelle : inscription commercant, preferences
-- notifications (email/push/instantane), abonnement ville/commerce
-- depuis le profil doivent continuer a fonctionner.
