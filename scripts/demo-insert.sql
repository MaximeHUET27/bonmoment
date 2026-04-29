-- BONMOMENT — Données démo Le Neubourg
-- Activer 5 min pour screenshots, puis lancer demo-cleanup.sql
-- Exécuter dans Supabase SQL Editor

BEGIN;

-- ── 0. Propriétaire fictif des 34 commerces ───────────────────────────────
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated',
  'demo_owner@fake.test',
  NULL, NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"DEMO Propriétaire"}',
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, nom, villes_abonnees, notifications_actives)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo_owner@fake.test',
  'DEMO Propriétaire',
  '{}',
  false
) ON CONFLICT (id) DO NOTHING;


-- ── 1. 34 commerces à Le Neubourg ─────────────────────────────────────────
INSERT INTO public.commerces (id, owner_id, nom, description, categorie, ville, adresse, place_id, abonnement_actif)
VALUES
  ('de000001-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Boulangerie Dupont',
   '[DEMO] Pain artisanal, viennoiseries et pâtisseries normandes depuis 1987.',
   'boulangerie', 'Le Neubourg', '12 rue de la République, Le Neubourg', 'DEMO_001', true),

  ('de000002-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Boucherie Lefèvre',
   '[DEMO] Viandes de race normande, charcuterie maison et volailles fermières.',
   'boucherie', 'Le Neubourg', '8 place du Marché, Le Neubourg', 'DEMO_002', true),

  ('de000003-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Café des Amis',
   '[DEMO] Bar-café convivial au cœur du bourg, petite restauration midi.',
   'café', 'Le Neubourg', '3 place du Général de Gaulle, Le Neubourg', 'DEMO_003', true),

  ('de000004-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Pharmacie Centrale',
   '[DEMO] Pharmacie de garde, parapharmacie et conseils santé.',
   'pharmacie', 'Le Neubourg', '15 rue du Maréchal Foch, Le Neubourg', 'DEMO_004', true),

  ('de000005-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Épicerie Fine Normande',
   '[DEMO] Produits du terroir normand, cidres, calvados et fromages AOP.',
   'épicerie', 'Le Neubourg', '22 rue Victor Hugo, Le Neubourg', 'DEMO_005', true),

  ('de000006-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Fleuriste La Rose du Neubourg',
   '[DEMO] Compositions florales, bouquets de saison et livraison locale.',
   'fleuriste', 'Le Neubourg', '5 avenue de la Gare, Le Neubourg', 'DEMO_006', true),

  ('de000007-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Coiffure Élégance',
   '[DEMO] Salon mixte, coloration, soins kératine et coupe tendance.',
   'coiffeur', 'Le Neubourg', '18 rue de la Libération, Le Neubourg', 'DEMO_007', true),

  ('de000008-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Restaurant Le Logis Normand',
   '[DEMO] Cuisine de terroir : tripes, camembert rôti et tarte normande.',
   'restaurant', 'Le Neubourg', '27 rue du Château, Le Neubourg', 'DEMO_008', true),

  ('de000009-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Pressing du Centre',
   '[DEMO] Nettoyage à sec, repassage express et retouches sur mesure.',
   'pressing', 'Le Neubourg', '9 rue de Verdun, Le Neubourg', 'DEMO_009', true),

  ('de000010-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Librairie Pages & Récits',
   '[DEMO] Librairie indépendante, BD, jeunesse et dédicaces d''auteurs locaux.',
   'librairie', 'Le Neubourg', '11 rue Jean Jaurès, Le Neubourg', 'DEMO_010', true),

  ('de000011-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Auto École Normandie',
   '[DEMO] Permis B, A et conduite accompagnée, moniteurs diplômés d''État.',
   'auto-école', 'Le Neubourg', '6 boulevard des Alliés, Le Neubourg', 'DEMO_011', true),

  ('de000012-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Fromagerie Le Terroir',
   '[DEMO] Camembert AOP, livarot, pont-l''évêque affinés à la coupe.',
   'fromagerie', 'Le Neubourg', '14 place Aristide Briand, Le Neubourg', 'DEMO_012', true),

  ('de000013-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Pizzeria Bella Napoli',
   '[DEMO] Pizzas artisanales au feu de bois, pâtes fraîches et tiramisu maison.',
   'restaurant', 'Le Neubourg', '19 rue de l''Église, Le Neubourg', 'DEMO_013', true),

  ('de000014-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Bar-Tabac du Commerce',
   '[DEMO] Tabac-presse, PMU, retrait colis et espace détente.',
   'tabac', 'Le Neubourg', '1 place du Commerce, Le Neubourg', 'DEMO_014', true),

  ('de000015-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Optique Vision Plus',
   '[DEMO] Lunettes de vue, solaires, lentilles et bilan visuel gratuit.',
   'optique', 'Le Neubourg', '23 rue Pasteur, Le Neubourg', 'DEMO_015', true),

  ('de000016-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Cave à Vins Les Cépages',
   '[DEMO] Sélection de vins de producteurs, cidres fermiers et spiritueux normands.',
   'cave', 'Le Neubourg', '7 rue des Tonneliers, Le Neubourg', 'DEMO_016', true),

  ('de000017-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Institut Beauté Éclat',
   '[DEMO] Soins visage, épilation, onglerie gel et manucure.',
   'beauté', 'Le Neubourg', '16 rue du Moulin, Le Neubourg', 'DEMO_017', true),

  ('de000018-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Bijouterie L''Or Normand',
   '[DEMO] Joaillerie, montres, gravure et réparation bijoux.',
   'bijouterie', 'Le Neubourg', '4 place de la Mairie, Le Neubourg', 'DEMO_018', true),

  ('de000019-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Chaussures Confort Normand',
   '[DEMO] Chaussures de confort, pointures larges et orthopédiques sur commande.',
   'mode', 'Le Neubourg', '30 rue de la Paix, Le Neubourg', 'DEMO_019', true),

  ('de000020-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Mode & Style Boutique',
   '[DEMO] Prêt-à-porter femme et homme, marques locales et tendances saison.',
   'mode', 'Le Neubourg', '25 rue du Bac, Le Neubourg', 'DEMO_020', true),

  ('de000021-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Bio & Nature',
   '[DEMO] Épicerie bio, vrac, cosmétiques naturels et compléments alimentaires.',
   'épicerie', 'Le Neubourg', '10 rue du Colombier, Le Neubourg', 'DEMO_021', true),

  ('de000022-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Crêperie Les Galettes',
   '[DEMO] Crêpes bretonnes et galettes sarrasin, cidre artisanal.',
   'restaurant', 'Le Neubourg', '13 rue du Stade, Le Neubourg', 'DEMO_022', true),

  ('de000023-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Friterie La Bonne Frite',
   '[DEMO] Frites fraîches, burgers maison et sandwichs à emporter.',
   'restauration rapide', 'Le Neubourg', '2 allée des Sports, Le Neubourg', 'DEMO_023', true),

  ('de000024-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Pâtisserie Normandine',
   '[DEMO] Gâteaux sur commande, macarons et chocolats artisanaux.',
   'pâtisserie', 'Le Neubourg', '17 rue des Bouchers, Le Neubourg', 'DEMO_024', true),

  ('de000025-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Garage Moreau Automobiles',
   '[DEMO] Révision, contrôle technique préparatoire et vente de véhicules d''occasion.',
   'automobile', 'Le Neubourg', '55 route d''Évreux, Le Neubourg', 'DEMO_025', true),

  ('de000026-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Kinésithérapie du Neubourg',
   '[DEMO] Rééducation, drainage lymphatique et ostéopathie sur rendez-vous.',
   'santé', 'Le Neubourg', '20 rue Hector Berlioz, Le Neubourg', 'DEMO_026', true),

  ('de000027-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Vétérinaire Dr. Martin',
   '[DEMO] Soins animaux, vaccins, urgences et pension canine.',
   'santé', 'Le Neubourg', '42 rue des Écoles, Le Neubourg', 'DEMO_027', true),

  ('de000028-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Snack du Marché',
   '[DEMO] Kebab, wraps et salades fraîches, ouvert 7j/7.',
   'restauration rapide', 'Le Neubourg', '6 place du Marché, Le Neubourg', 'DEMO_028', true),

  ('de000029-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Jardinerie Vert Bocage',
   '[DEMO] Plantes, semences, outillage de jardin et conseil en création paysagère.',
   'jardinerie', 'Le Neubourg', '33 route de Bourgtheroulde, Le Neubourg', 'DEMO_029', true),

  ('de000030-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Droguerie Quincaillerie Norman',
   '[DEMO] Bricolage, peinture, plomberie et matériel de jardinage.',
   'quincaillerie', 'Le Neubourg', '28 rue du 8 Mai 1945, Le Neubourg', 'DEMO_030', true),

  ('de000031-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Salon de Thé Les Délices',
   '[DEMO] Thés du monde, pâtisseries maison et brunchs du dimanche.',
   'café', 'Le Neubourg', '21 rue Gambetta, Le Neubourg', 'DEMO_031', true),

  ('de000032-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Studio Photo Lumière',
   '[DEMO] Portraits, photos de famille, mariages et tirage grand format.',
   'services', 'Le Neubourg', '11 impasse des Artisans, Le Neubourg', 'DEMO_032', true),

  ('de000033-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Agence Immobilière Bocage',
   '[DEMO] Vente et location maisons normandes, estimations gratuites.',
   'immobilier', 'Le Neubourg', '3 rue de Gaulle, Le Neubourg', 'DEMO_033', true),

  ('de000034-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
   'Déco & Maison Le Neubourg',
   '[DEMO] Mobilier, décoration intérieure et articles de maison.',
   'décoration', 'Le Neubourg', '34 rue Henri Dunant, Le Neubourg', 'DEMO_034', true)

ON CONFLICT (id) DO NOTHING;


-- ── 2. 12 offres actives ───────────────────────────────────────────────────
INSERT INTO public.offres (id, commerce_id, titre, type_remise, valeur, description, date_debut, date_fin, nb_bons_total, nb_bons_restants, statut)
VALUES
  ('0f000001-0000-0000-0000-000000000000', 'de000001-0000-0000-0000-000000000000',
   '-15 % sur les viennoiseries', 'pourcentage', 15,
   'Croissants, pains au chocolat et brioches, du mardi au vendredi.',
   NOW(), NOW() + INTERVAL '6 hours', 20, 17, 'active'),

  ('0f000002-0000-0000-0000-000000000000', 'de000002-0000-0000-0000-000000000000',
   '200 g de merguez offerts', 'produit_offert', NULL,
   'Pour tout achat de 15 € et plus en boucherie.',
   NOW(), NOW() + INTERVAL '6 hours', 10, 8, 'active'),

  ('0f000003-0000-0000-0000-000000000000', 'de000008-0000-0000-0000-000000000000',
   'Menu midi à -20 %', 'pourcentage', 20,
   'Entrée + plat ou plat + dessert, du lundi au vendredi.',
   NOW(), NOW() + INTERVAL '6 hours', 50, 43, 'active'),

  ('0f000004-0000-0000-0000-000000000000', 'de000016-0000-0000-0000-000000000000',
   '-5 € dès 3 bouteilles', 'montant_fixe', 5,
   'Valable sur toute la sélection vins et cidres.',
   NOW(), NOW() + INTERVAL '6 hours', 15, 12, 'active'),

  ('0f000005-0000-0000-0000-000000000000', 'de000007-0000-0000-0000-000000000000',
   'Coupe + brushing à -10 %', 'pourcentage', 10,
   'Sur rendez-vous, sur présentation du bon BONMOMENT.',
   NOW(), NOW() + INTERVAL '6 hours', 5, 4, 'active'),

  ('0f000006-0000-0000-0000-000000000000', 'de000013-0000-0000-0000-000000000000',
   'Gagnez une pizza au choix !', 'concours', NULL,
   'Un gagnant tiré au sort parmi les participants.',
   NOW(), NOW() + INTERVAL '6 hours', NULL, NULL, 'active'),

  ('0f000007-0000-0000-0000-000000000000', 'de000024-0000-0000-0000-000000000000',
   '1 macaron offert', 'produit_offert', NULL,
   'Au choix parmi les 12 saveurs du moment, pour tout achat.',
   NOW(), NOW() + INTERVAL '6 hours', 20, 18, 'active'),

  ('0f000008-0000-0000-0000-000000000000', 'de000012-0000-0000-0000-000000000000',
   'Plateau 3 fromages offert', 'cadeau', NULL,
   'Camembert, livarot, pont-l''évêque offerts dès 20 € d''achats.',
   NOW(), NOW() + INTERVAL '6 hours', 10, 7, 'active'),

  ('0f000009-0000-0000-0000-000000000000', 'de000017-0000-0000-0000-000000000000',
   'Soin visage à -30 %', 'pourcentage', 30,
   'Soin hydratant ou anti-âge, sur rendez-vous.',
   NOW(), NOW() + INTERVAL '6 hours', 5, 3, 'active'),

  ('0f000010-0000-0000-0000-000000000000', 'de000021-0000-0000-0000-000000000000',
   '-3 € dès 15 € d''achats', 'montant_fixe', 3,
   'Sur tous les produits en vrac et épicerie sèche.',
   NOW(), NOW() + INTERVAL '6 hours', 50, 47, 'active'),

  ('0f000011-0000-0000-0000-000000000000', 'de000003-0000-0000-0000-000000000000',
   'Café offert pour un plat', 'cadeau', NULL,
   'Un café ou une infusion offert avec tout plat du midi.',
   NOW(), NOW() + INTERVAL '6 hours', 30, 26, 'active'),

  ('0f000012-0000-0000-0000-000000000000', 'de000022-0000-0000-0000-000000000000',
   'Galette + cidre à -10 %', 'pourcentage', 10,
   'Formule galette sarrasin + cidre artisanal bouteille.',
   NOW(), NOW() + INTERVAL '6 hours', NULL, NULL, 'active')

ON CONFLICT (id) DO NOTHING;


-- ── 3. 435 abonnés ville Le Neubourg ──────────────────────────────────────
-- email LIKE 'demo_%@fake.test' → ciblé par le cleanup

INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  ('b0b00000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
  'authenticated', 'authenticated',
  'demo_' || lpad(i::text, 3, '0') || '@fake.test',
  NULL, NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false
FROM generate_series(1, 435) AS s(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, nom, villes_abonnees, badge_niveau, notifications_actives)
SELECT
  ('b0b00000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
  'demo_' || lpad(i::text, 3, '0') || '@fake.test',
  'Habitant Demo',
  ARRAY['Le Neubourg'],
  'habitant',
  false
FROM generate_series(1, 435) AS s(i)
ON CONFLICT (id) DO NOTHING;

COMMIT;
