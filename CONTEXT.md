CONTEXTE PROJET BONMOMENT
Identité

Porteur : Maxime HUET, auto-entrepreneur, 7 rue du Chesne, 27190 Nogent-le-Sec
Email : bonmomentapp@gmail.com | Tél : 06 37 66 50 78
Domaine : bonmoment.app | Hébergeur : Vercel Inc.
Tagline : Soyez là au bon moment

Lexique obligatoire (JAMAIS de termes génériques dans l'interface)

Utilisateurs → Habitants
Commerces partenaires → Tes commerçants
Offres disponibles → Bons plans de ta ville
Réserver un billet → Réserver mon bon
Notifications → Alertes de ta ville
S'inscrire → Rejoindre [Nom de la ville]
Tableau de bord → Mon commerce
Offre expirée → C'est parti !
Aucune offre disponible → Vos commerçants préparent des surprises... Revenez bientôt !

Charte graphique

Couleurs : orange #FF6B00, dark #CC5500, light #FFF0E0, black #0A0A0A, charcoal #1A1A1A, text #3D3D3D, muted #F5F5F5
Typo : Montserrat (400, 600, 700, 900) + Courier New pour les codes
H1: 900 Black 40-48px, H2: 700 Bold 28-32px, H3: 600 SemiBold 20-24px, Body: 400 16px, Labels: 700 Bold Caps 11-12px, Codes: Courier New 400 Mono 24px
Espacement base 4px : xs=4, sm=8, md=16, lg=24, xl=32, 2xl=48, 3xl=64
Mobile-first, zones tactiles min 44px, contraste min 4.5:1

Modèle économique

Client : 100% gratuit
Commerçant : Découverte 29€ HT/mois (4 offres), Essentiel 49€ HT/mois (8 offres), Pro 79€ HT/mois (16 offres). Bons illimités.
Premier mois offert avec CB enregistrée
Parrainage : code unique permanent par commerçant, remise selon palier filleul (Découverte 10€, Essentiel 15€, Pro 20€) pour parrain ET filleul. Max 3/mois. Code valable 3 mois puis auto-régénéré.

Types d'offres (prédéfinis)
pourcentage, montant_fixe, cadeau, produit_offert, service_offert, concours, atelier

Max 24h. Bons non utilisés = périmés auto. Concours : validation physique obligatoire + tirage au sort après expiration.

Badges clients

Habitant : compte créé → email quotidien à 21h
Bon habitant : 3 bons validés en 1 semaine → email à 20h
Habitant exemplaire : 3 bons/sem pendant 1 mois → email à 19h

Auth OAuth uniquement
Google, Facebook, Apple, Microsoft. Pas de mot de passe. Connexion requise uniquement pour réserver.
Sécurité

RLS sur toutes les tables CRITIQUE
Clés API en .env CRITIQUE
Validation serveur sur tous les formulaires
Région EU West (Supabase + Vercel)

Principes de design

Urgence & Rareté (FOMO, compte à rebours, compteur bons, preuve sociale)
Ancrage Local (communauté, ville, proximité)
Simplicité Extrême (<1min créer offre, <30s réserver)
Mobile First (pouce-friendly)
Chaleur & Positivité (jamais de messages froids)
Contraste & Lisibilité (min 4.5:1)

Boutons (charte)

CTA principal : "Réserver mon bon" → orange #FF6B00 fond plein blanc texte
Secondaire : "Voir les offres" → contour orange
Désactivé : "C'est parti !" → grisé pour offres expirées
Spécial : "Tirer au sort 🎰" → fond sombre

Architecture UX

Connexion : bottom sheet (panneau coulissant depuis le bas), PAS une page séparée. Se déclenche uniquement au clic sur "Réserver mon bon" pour les non-connectés.
Après réservation : QR code plein écran (fond blanc, QR 250px min, code 6 chiffres Courier New 32px).
Page d'accueil : zone urgence en haut (offres < 2h OU < 5 bons restants) en carrousel horizontal + liste filtrée par catégorie en dessous.
Bandeau ville : affiche toujours "📍 [Ville] [Changer ▼]" + bouton "S'abonner".
Abonnements : le client peut s'abonner à plusieurs communes (stocké localement).
Lexique corrigé : "Bons plans de ta ville" (pas "du quartier").
