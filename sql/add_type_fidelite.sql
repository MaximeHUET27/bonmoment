-- Ajoute "fidelite" à la contrainte check de la colonne type_remise
ALTER TABLE offres DROP CONSTRAINT IF EXISTS offres_type_remise_check;
ALTER TABLE offres ADD CONSTRAINT offres_type_remise_check CHECK (
  type_remise IN (
    'pourcentage',
    'montant_fixe',
    'montant',
    'cadeau',
    'produit_offert',
    'service_offert',
    'concours',
    'atelier',
    'fidelite'
  )
);
