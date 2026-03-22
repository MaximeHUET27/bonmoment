-- BONMOMENT — Seed de test complet
-- Coller dans Supabase SQL Editor et exécuter

SET session_replication_role = replica;

DO $
DECLARE
  v_owner uuid := gen_random_uuid();
  v_u1 uuid := gen_random_uuid();
  v_u2 uuid := gen_random_uuid();
  v_u3 uuid := gen_random_uuid();
  v_u4 uuid := gen_random_uuid();
  v_u5 uuid := gen_random_uuid();
  v_c1 uuid := gen_random_uuid();
  v_c2 uuid := gen_random_uuid();
  v_c3 uuid := gen_random_uuid();
  v_c4 uuid := gen_random_uuid();
  v_c5 uuid := gen_random_uuid();
  v_o1 uuid := gen_random_uuid();
  v_o2 uuid := gen_random_uuid();
  v_o3 uuid := gen_random_uuid();
  v_o4 uuid := gen_random_uuid();
  v_o5 uuid := gen_random_uuid();
  v_o6 uuid := gen_random_uuid();
  v_o7 uuid := gen_random_uuid();
  v_o8 uuid := gen_random_uuid();
  v_o9 uuid := gen_random_uuid();
  v_o10 uuid := gen_random_uuid();
  v_o11 uuid := gen_random_uuid();
  v_o12 uuid := gen_random_uuid();
BEGIN

  -- VILLES
  INSERT INTO public.villes (id, nom, code_insee, departement, active) VALUES
    (gen_random_uuid(), 'Le Neubourg', '27428', '27', true),
    (gen_random_uuid(), 'Conches-en-Ouche', '27165', '27', true)
  ON CONFLICT (code_insee) DO NOTHING;

  -- USERS
  INSERT INTO public.users (id, email, nom, role) VALUES
    (v_owner, 'owner-test@bonmoment.app', 'Proprietaire Test', 'commercant'),
    (v_u1, 'user1-test@bonmoment.app', 'Marie Dupont', 'client'),
    (v_u2, 'user2-test@bonmoment.app', 'Paul Martin', 'client'),
    (v_u3, 'user3-test@bonmoment.app', 'Isabelle Leroux', 'client'),
    (v_u4, 'user4-test@bonmoment.app', 'Thomas Bernard', 'client'),
    (v_u5, 'user5-test@bonmoment.app', 'Sophie Petit', 'client');

  -- COMMERCES
  INSERT INTO public.commerces (id, place_id, owner_id, nom, categorie, adresse, ville, description, abonnement_actif, code_parrainage) VALUES
    (v_c1, 'test_place_coiffstyle', v_owner, 'Coiff Style', 'coiffeur', '12 rue de la Gare', 'Le Neubourg', 'Salon de coiffure mixte au coeur du Neubourg.', true, 'COIFF2026'),
    (v_c2, 'test_place_vieux_pressoir', v_owner, 'Le Vieux Pressoir', 'restaurant', '8 place de la Halle', 'Le Neubourg', 'Cuisine normande traditionnelle, produits locaux.', true, 'PRESS2026'),
    (v_c3, 'test_place_boulangerie_arcades', v_owner, 'Boulangerie des Arcades', 'boulangerie', '7 rue Saint-Etienne', 'Conches-en-Ouche', 'Pains artisanaux et viennoiseries maison.', true, 'BOUL2026'),
    (v_c4, 'test_place_beaute_zen', v_owner, 'Institut Beaute Zen', 'beauty_salon', '3 rue de la Republique', 'Conches-en-Ouche', 'Institut de beaute, soins du visage et du corps.', true, 'BZEN2026'),
    (v_c5, 'test_place_fleurs_saisons', v_owner, 'Fleurs et Saisons', 'fleuriste', '22 avenue de la Liberation', 'Le Neubourg', 'Fleuriste artisanal, bouquets et compositions.', true, 'FLEU2026')
  ON CONFLICT (place_id) DO NOTHING;

  -- OFFRES ACTIVES
  INSERT INTO public.offres (id, commerce_id, titre, description, type_remise, valeur, date_debut, date_fin, nb_bons_total, nb_bons_restants, statut, est_recurrente) VALUES
    (v_o1, v_c1, 'Sur toutes les coupes', 'Valable sur toutes les coupes hommes, femmes et enfants.', 'pourcentage', 20, now(), now() + interval '6 hours', 15, 12, 'active', false),
    (v_o2, v_c2, 'Dessert offert pour tout plat commande', 'Choisissez votre dessert parmi notre selection du jour.', 'cadeau', null, now(), now() + interval '4 hours', 20, 18, 'active', false),
    (v_o3, v_c3, 'Un croissant offert avec une baguette', 'Un croissant au beurre offert pour achat d une baguette tradition.', 'produit_offert', null, now(), now() + interval '5 hours', 30, 25, 'active', false),
    (v_o4, v_c4, 'Sur tout soin du visage', 'Valable sur l ensemble de nos soins du visage, sur rendez-vous.', 'montant_fixe', 15, now(), now() + interval '8 hours', 10, 8, 'active', false),
    (v_o5, v_c5, 'Sur tous les bouquets de saison', 'Profitez de nos compositions florales de printemps a prix reduit.', 'pourcentage', 15, now(), now() + interval '3 hours', 50, 47, 'active', false);

  -- OFFRES URGENTES
  INSERT INTO public.offres (id, commerce_id, titre, description, type_remise, valeur, date_debut, date_fin, nb_bons_total, nb_bons_restants, statut, est_recurrente) VALUES
    (v_o6, v_c1, 'Sur les colorations', 'Coloration complete ou meches, valable aujourd hui seulement.', 'pourcentage', 30, now(), now() + interval '45 minutes', 5, 2, 'active', false),
    (v_o7, v_c2, 'Cafe offert avec votre addition', 'Un cafe ou une infusion offert en fin de repas.', 'service_offert', null, now(), now() + interval '1 hour 30 minutes', 8, 3, 'active', false);

  -- CONCOURS ACTIF
  INSERT INTO public.offres (id, commerce_id, titre, description, type_remise, valeur, date_debut, date_fin, nb_bons_total, nb_bons_restants, statut, est_recurrente) VALUES
    (v_o8, v_c4, 'Gagnez un soin complet valeur 80 euros', 'Participez au tirage au sort et tentez de remporter un soin visage et corps.', 'concours', 80, now(), now() + interval '2 hours', 100, 95, 'active', false);

  -- ATELIER
  INSERT INTO public.offres (id, commerce_id, titre, description, type_remise, valeur, date_debut, date_fin, nb_bons_total, nb_bons_restants, statut, est_recurrente) VALUES
    (v_o9, v_c3, 'Initiation a la patisserie places limitees', 'Venez apprendre a realiser croissants et chaussons aux pommes.', 'atelier', null, now(), now() + interval '5 hours', 8, 6, 'active', false);

  -- OFFRES EXPIREES
  INSERT INTO public.offres (id, commerce_id, titre, description, type_remise, valeur, date_debut, date_fin, nb_bons_total, nb_bons_restants, statut, est_recurrente) VALUES
    (v_o10, v_c1, 'Sur les coupes homme', 'Valable sur toutes les coupes homme du jour.', 'pourcentage', 25, now() - interval '1 day', now() - interval '21 hours', 10, 0, 'expiree', false),
    (v_o11, v_c2, 'Sur votre repas du midi', 'Valable du lundi au vendredi sur le menu du midi.', 'montant_fixe', 5, now() - interval '1 day', now() - interval '20 hours', 15, 3, 'expiree', false);

  -- CONCOURS EXPIRE AVEC BONS VALIDES
  INSERT INTO public.offres (id, commerce_id, titre, description, type_remise, valeur, date_debut, date_fin, nb_bons_total, nb_bons_restants, statut, est_recurrente) VALUES
    (v_o12, v_c5, 'Gagnez un bouquet geant', 'Tentez de remporter un bouquet de fleurs de saison valeur 60 euros.', 'concours', 60, now() - interval '1 day', now() - interval '21 hours', 20, 0, 'expiree', false);

  -- RESERVATIONS SUR CONCOURS EXPIRE (pour tester tirage au sort)
  INSERT INTO public.reservations (id, user_id, offre_id, code_validation, qr_code_data, statut, created_at, utilise_at) VALUES
    (gen_random_uuid(), v_u1, v_o12, '482931', 'QR-FLEU-482931', 'utilisee', now() - interval '1 day', now() - interval '22 hours'),
    (gen_random_uuid(), v_u2, v_o12, '751084', 'QR-FLEU-751084', 'utilisee', now() - interval '1 day', now() - interval '22 hours'),
    (gen_random_uuid(), v_u3, v_o12, '319627', 'QR-FLEU-319627', 'utilisee', now() - interval '1 day', now() - interval '22 hours'),
    (gen_random_uuid(), v_u4, v_o12, '604852', 'QR-FLEU-604852', 'utilisee', now() - interval '1 day', now() - interval '22 hours'),
    (gen_random_uuid(), v_u5, v_o12, '193746', 'QR-FLEU-193746', 'utilisee', now() - interval '1 day', now() - interval '22 hours');

END $;

SET session_replication_role = DEFAULT;
