-- ============================================================================
-- Audit 2026-10 — M2 : lecture anonyme de toutes les colonnes de commerces
-- ============================================================================
-- La policy commerces_select_public (USING true) + les droits par defaut
-- laissaient anon lire les 42 colonnes, dont stripe_customer_id,
-- stripe_subscription_id, notes_admin, last_login_at, date_fin_essai,
-- cagnotte_parrainage_cents, owner_id, code_parrainage...
--
-- Recensement exhaustif des usages anon (code executant via la cle anon,
-- sans session) : app/commercant/[id]/page.js et app/offre/[id]/page.js
-- (seuls points d'acces publics directs, via le client serveur a cle anon).
-- Les autres pages publiques (ville/[slug], api/carte) utilisent deja la
-- cle service_role, non affectee par ces droits.
--
-- Colonnes conservees lisibles par anon (usage confirme) : id, nom,
-- categorie, categorie_bonmoment, adresse, ville, description, photo_url,
-- note_google, telephone, horaires, place_id, abonnement_actif.
--
-- authenticated n'est pas touche (owner_id, cagnotte_parrainage_cents etc.
-- restent lus par du code avec session : AuthButton, inscription,
-- fidelite, resiliation, chatbot...).
-- ============================================================================

BEGIN;

REVOKE SELECT ON public.commerces FROM anon;

GRANT SELECT (
  id, nom, categorie, categorie_bonmoment, adresse, ville, description,
  photo_url, note_google, telephone, horaires, place_id, abonnement_actif
) ON public.commerces TO anon;

COMMIT;
