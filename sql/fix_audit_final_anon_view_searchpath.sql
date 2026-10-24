-- ============================================================================
-- Audit 2026-10 — finalisation : anon/EXECUTE, vue fidelite, search_path
-- ============================================================================
-- 1. vue_base_client_fidelite (SECURITY DEFINER implicite) etait lisible par
--    tout role avec DML complet : filtre ajoute sur proprietaire du commerce
--    (ou admin), DML et anon retires. Colonnes inchangees.
-- 2. 11 fonctions SECURITY DEFINER executables par anon : toutes exigent
--    deja auth.uid() ; EXECUTE retire a PUBLIC/anon (authenticated conserve).
--    Les 2 helpers (peut_utiliser_fidelite, check_rate_limit_fidelite) ne sont
--    appeles que depuis des fonctions SECURITY DEFINER : retires aussi a
--    authenticated.
-- 3. search_path fixe sur les 3 fonctions restantes.
-- ============================================================================
BEGIN;

CREATE OR REPLACE VIEW public.vue_base_client_fidelite AS
 SELECT cf.id AS carte_id,
    cf.commerce_id,
    cf.client_type,
    COALESCE(u.nom, (ul.prenom)::text, 'Client anonyme'::text) AS prenom_affiche,
        CASE
            WHEN (((cf.client_type)::text = 'full'::text) AND (u.telephone IS NOT NULL)) THEN ((SUBSTRING(u.telephone FROM 1 FOR 4) || ' ** ** '::text) || SUBSTRING(u.telephone FROM 9 FOR 2))
            WHEN ((cf.client_type)::text = 'light'::text) THEN ((SUBSTRING(ul.telephone FROM 1 FOR 4) || ' ** ** '::text) || SUBSTRING(ul.telephone FROM 9 FOR 2))
            ELSE '—'::text
        END AS telephone_masque,
    cf.nb_passages_total,
    cf.nb_passages_depuis_derniere_recompense,
    cf.nb_recompenses_debloquees,
    cf.recompense_en_attente,
    cf.derniere_activite,
    (EXTRACT(day FROM (now() - (cf.derniere_activite)::timestamp with time zone)))::integer AS jours_depuis_activite,
    cf.seuil_passages_carte AS seuil_passages,
    cf.description_recompense_carte AS description_recompense
   FROM ((cartes_fidelite cf
     LEFT JOIN users u ON ((u.id = cf.user_id)))
     LEFT JOIN users_light ul ON ((ul.id = cf.user_light_id)))
  WHERE public.is_admin()
     OR cf.commerce_id IN (SELECT c.id FROM public.commerces c WHERE c.owner_id = auth.uid());

REVOKE ALL ON public.vue_base_client_fidelite FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.vue_base_client_fidelite TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION
  public.activer_carte_fidelite_client(text),
  public.desactiver_fidelite_client(),
  public.modifier_telephone_client(text),
  public.get_commercants_invitables(uuid, text),
  public.get_invitations_et_adhesions_commerce(uuid),
  public.get_membres_mairie_asso(uuid),
  public.get_offres_collectives_commerce(uuid),
  public.get_participants_offre(uuid),
  public.get_stats_cumulees_mairie_asso(uuid, text),
  public.peut_utiliser_fidelite(uuid),
  public.check_rate_limit_fidelite(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.activer_carte_fidelite_client(text),
  public.desactiver_fidelite_client(),
  public.modifier_telephone_client(text),
  public.get_commercants_invitables(uuid, text),
  public.get_invitations_et_adhesions_commerce(uuid),
  public.get_membres_mairie_asso(uuid),
  public.get_offres_collectives_commerce(uuid),
  public.get_participants_offre(uuid),
  public.get_stats_cumulees_mairie_asso(uuid, text)
TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.peut_utiliser_fidelite(uuid), public.check_rate_limit_fidelite(uuid) FROM authenticated;

ALTER FUNCTION public.expire_offres() SET search_path = public;
ALTER FUNCTION public.check_mairie_asso_validity() SET search_path = public;
ALTER FUNCTION public.prevent_categorie_change_if_member() SET search_path = public;

COMMIT;
