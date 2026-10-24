-- Attendu : anon_exec = false partout ; vue_anon_denied = true ; search_path non nul
SELECT proname, has_function_privilege('anon', oid, 'execute') AS anon_exec, proconfig
FROM pg_proc WHERE pronamespace = 'public'::regnamespace
AND proname IN ('activer_carte_fidelite_client','desactiver_fidelite_client','modifier_telephone_client',
 'get_commercants_invitables','get_invitations_et_adhesions_commerce','get_membres_mairie_asso',
 'get_offres_collectives_commerce','get_participants_offre','get_stats_cumulees_mairie_asso',
 'peut_utiliser_fidelite','check_rate_limit_fidelite','expire_offres','check_mairie_asso_validity','prevent_categorie_change_if_member');
SELECT NOT has_table_privilege('anon','public.vue_base_client_fidelite','select') AS vue_anon_denied;
