-- Migration : ajout de la colonne photo_url sur la table villes
-- À exécuter dans l'éditeur SQL Supabase

ALTER TABLE villes ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Exemples de mise à jour manuelle pour les villes actives :
-- UPDATE villes SET photo_url = 'https://...' WHERE nom = 'Conches-en-Ouche';
-- UPDATE villes SET photo_url = 'https://...' WHERE nom = 'Le Neubourg';
