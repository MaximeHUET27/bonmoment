BEGIN;
GRANT EXECUTE ON FUNCTION
  public.activer_carte_fidelite_client(text), public.desactiver_fidelite_client(),
  public.modifier_telephone_client(text), public.get_commercants_invitables(uuid, text),
  public.get_invitations_et_adhesions_commerce(uuid), public.get_membres_mairie_asso(uuid),
  public.get_offres_collectives_commerce(uuid), public.get_participants_offre(uuid),
  public.get_stats_cumulees_mairie_asso(uuid, text), public.peut_utiliser_fidelite(uuid),
  public.check_rate_limit_fidelite(uuid)
TO PUBLIC, anon, authenticated;
ALTER FUNCTION public.expire_offres() RESET search_path;
ALTER FUNCTION public.check_mairie_asso_validity() RESET search_path;
ALTER FUNCTION public.prevent_categorie_change_if_member() RESET search_path;
-- La vue : recréer sans la clause WHERE (voir fix_audit_final_anon_view_searchpath.sql) si necessaire.
GRANT ALL ON public.vue_base_client_fidelite TO anon, authenticated;
COMMIT;
