-- ============================================================
-- BONMOMENT - Données de test (seed)
-- ============================================================
-- À coller dans l'éditeur SQL de Supabase

-- 1. Utilisateur de test dans auth.users (propriétaire des commerces)
-- ============================================================
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_super_admin
) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'test@bonmoment.app',
  '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456789',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"nom":"Admin Test"}',
  now(), now(), false, false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, nom, badge_niveau) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'test@bonmoment.app', 'Admin Test', 'habitant'
) ON CONFLICT (id) DO NOTHING;


-- 2. Villes
-- ============================================================
INSERT INTO public.villes (id, nom, code_insee, departement, active) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Le Neubourg',       '27432', 'Eure', true),
  ('b1000000-0000-0000-0000-000000000002', 'Conches-en-Ouche',  '27163', 'Eure', true)
ON CONFLICT (code_insee) DO NOTHING;


-- 3. Commerces
-- ============================================================
INSERT INTO public.commerces (
  id, place_id, owner_id, nom, categorie,
  adresse, ville, description, abonnement_actif, code_parrainage
) VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    'place_coiffeur_neubourg',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Coiff''Style', 'Coiffeur',
    '12 rue de la République', 'Le Neubourg',
    'Salon de coiffure mixte au cœur du Neubourg.',
    true, 'COIFF-NB01'
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    'place_restaurant_neubourg',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Le Vieux Pressoir', 'Restaurant',
    '3 place du Marché', 'Le Neubourg',
    'Cuisine normande traditionnelle, produits locaux.',
    true, 'RESTO-NB01'
  ),
  (
    'c1000000-0000-0000-0000-000000000003',
    'place_boulangerie_conches',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Boulangerie des Arcades', 'Boulangerie',
    '7 rue Saint-Étienne', 'Conches-en-Ouche',
    'Pains artisanaux et viennoiseries maison depuis 1987.',
    true, 'BOUL-CE01'
  )
ON CONFLICT (place_id) DO NOTHING;


-- 4. Offres actives
-- Le titre décrit UNIQUEMENT le contexte (pas la valeur de remise)
-- La valeur de remise est dans type_remise + valeur
-- ============================================================
INSERT INTO public.offres (
  id, commerce_id, titre, description,
  type_remise, valeur,
  date_debut, date_fin,
  nb_bons_total, nb_bons_restants,
  statut, est_recurrente
) VALUES
  -- Offre 1 : Coiffeur — −20% / contexte : type de coupe
  (
    'd1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'Sur toute coupe aujourd''hui',
    'Valable sur toutes les coupes hommes, femmes et enfants.',
    'pourcentage', 20,
    now(), now() + interval '5 hours',
    15, 15, 'active', false
  ),
  -- Offre 2 : Restaurant — Offert / contexte : quel plat, quand
  (
    'd1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000002',
    'Une entrée pour tout menu du midi',
    'Choisissez votre entrée parmi notre sélection du moment.',
    'offert', null,
    now(), now() + interval '3 hours',
    20, 17, 'active', false
  ),
  -- Offre 3 : Restaurant — −5€ / contexte : repas du soir
  (
    'd1000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000002',
    'Sur votre repas du soir',
    'Valable à partir de 2 personnes, du lundi au jeudi.',
    'montant', 5,
    now(), now() + interval '7 hours',
    10, 6, 'active', false
  ),
  -- Offre 4 : Boulangerie — −10% / contexte : viennoiseries après 16h
  (
    'd1000000-0000-0000-0000-000000000004',
    'c1000000-0000-0000-0000-000000000003',
    'Sur les viennoiseries après 16h',
    'Profitez de nos invendus du jour à prix réduit.',
    'pourcentage', 10,
    now(), now() + interval '2 hours',
    30, 22, 'active', false
  ),
  -- Offre 5 : Boulangerie — Offert / contexte : produit offert à l'achat
  (
    'd1000000-0000-0000-0000-000000000005',
    'c1000000-0000-0000-0000-000000000003',
    'Un croissant à l''achat de 2 baguettes tradition',
    'Un croissant au beurre offert pour l''achat de 2 baguettes tradition.',
    'offert', null,
    now(), now() + interval '4 hours 30 minutes',
    50, 43, 'active', false
  )
ON CONFLICT (id) DO NOTHING;
