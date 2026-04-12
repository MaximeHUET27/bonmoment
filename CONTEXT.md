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
Offre expirée → Trop tard !
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
Désactivé : "Trop tard !" → grisé pour offres expirées
Spécial : "Tirer au sort 🎰" → fond sombre

Architecture UX

Connexion : bottom sheet (panneau coulissant depuis le bas), PAS une page séparée. Se déclenche uniquement au clic sur "Réserver mon bon" pour les non-connectés.
Après réservation : QR code plein écran (fond blanc, QR 250px min, code 6 chiffres Courier New 32px).
Page d'accueil : liste filtrée par catégorie (offres urgentes triées en premier, badge urgence visible sur la carte).
Bandeau ville : affiche toujours "📍 [Ville] [Changer ▼]" + bouton "S'abonner".
Abonnements : le client peut s'abonner à plusieurs communes (stocké localement).
Lexique corrigé : "Bons plans de ta ville" (pas "du quartier").

---

ÉTAT D'IMPLÉMENTATION (mis à jour 2026-03-27)
==============================================

STACK TECHNIQUE
---------------
- Next.js 16.1.6 (App Router, React 19.2.3)
- Tailwind CSS v4 + PostCSS v4
- Supabase (PostgreSQL + Auth + RLS)
- Hébergement : Vercel (EU West)
- Librairies : @supabase/supabase-js v2.99.1, @supabase/ssr v0.9.0,
  html5-qrcode v2.3.8, qrcode.react v4.2.0, jsonwebtoken v9.0.3
- Services externes : Google Places API, Brevo (emails), Google Wallet API,
  Web Push API (VAPID)

ARCHITECTURE DES FICHIERS
--------------------------

bonmoment/
├── app/
│   ├── admin/                        # Panneau admin (accès bonmomentapp@gmail.com uniquement)
│   │   ├── layout.js                 # Layout admin avec vérification d'accès
│   │   ├── page.js                   # Stats dashboard (MRR, churn, DAU, MAU)
│   │   ├── clients/page.js           # Liste des habitants
│   │   ├── commercants/page.js       # Liste des commerçants
│   │   └── offres/page.js            # Liste de toutes les offres
│   ├── aide/
│   │   ├── page.js                   # Hub d'aide
│   │   └── contact/page.js           # Formulaire de contact
│   ├── api/
│   │   ├── admin/
│   │   │   ├── clients/route.js      # GET : liste habitants
│   │   │   ├── commercants/route.js  # GET : liste commerçants
│   │   │   ├── offres/route.js       # GET : liste offres
│   │   │   └── stats/route.js        # GET : statistiques admin
│   │   ├── contact/route.js          # POST : envoi formulaire contact (Brevo)
│   │   ├── email-quotidien/route.js  # POST : cron digest email 21h (CRON_SECRET)
│   │   ├── offres/route.js           # POST : création offre (quota palier vérifié)
│   │   ├── tirer-au-sort/route.js    # POST : tirage au sort concours (CRON_SECRET)
│   │   ├── valider-bon/route.js      # POST : validation/rachat bon (rate-limitée)
│   │   └── wallet/google/route.js    # GET : génération pass Google Wallet Android
│   ├── auth/callback/route.js        # GET : callback OAuth (échange code + upsert profil)
│   ├── bon/[id]/
│   │   ├── page.js                   # Page bon (server-rendered, accessible via QR)
│   │   └── BonDisplay.js             # Affichage bon : QR + code 6 chiffres + countdown
│   ├── cgu/page.js                   # CGU
│   ├── cgv/page.js                   # CGV
│   ├── commercant/
│   │   ├── [id]/
│   │   │   ├── page.js               # Profil public du commerce
│   │   │   ├── DeleteCommerceButton.js  # Bouton suppression commerce (avec confirmation)
│   │   │   └── loading.js            # Skeleton de chargement
│   │   ├── components/
│   │   │   └── TirageAuSort.js       # Composant tirage au sort concours
│   │   ├── dashboard/page.js         # Dashboard commerçant (multi-commerce)
│   │   ├── inscription/page.js       # Inscription commerçant (Google Places)
│   │   ├── offre/nouvelle/page.js    # Création nouvelle offre
│   │   └── valider/
│   │       ├── page.js               # Page validation bons (QR ou code manuel)
│   │       └── QrScanner.js          # Composant scanner QR (html5-qrcode)
│   ├── components/                   # Composants partagés
│   │   ├── AdminFooterLink.js        # Lien caché vers admin dans le footer
│   │   ├── AuthBottomSheet.js        # Bottom sheet connexion (OAuth providers)
│   │   ├── AuthButton.js             # Bouton connexion/déconnexion header
│   │   ├── ChatbotWidget.js          # Widget chatbot intégré
│   │   ├── FavoriButton.js           # Bouton cœur favori commerçant
│   │   ├── FloatingBonButton.js      # Bouton flottant accès rapide bons
│   │   ├── FullScreenBon.js          # Affichage plein écran bon (wake lock)
│   │   ├── HomeClient.js             # Page d'accueil côté client (filtres, catégories)
│   │   ├── NotifBottomSheet.js       # Bottom sheet préférences notifications
│   │   ├── ScrollingBanner.js        # Bandeau défilant
│   │   ├── ShareButton.js            # Bouton partage bon/offre
│   │   ├── SignInPanel.js            # Panel boutons OAuth (Google, Facebook, Apple, Microsoft)
│   │   ├── SkeletonCard.js           # Skeleton loading card
│   │   ├── tutorial/
│   │   │   ├── TutorialDashboard.js  # Tutoriel onboarding dashboard commerçant
│   │   │   ├── TutorialOffre.js      # Tutoriel création offre
│   │   │   ├── TutorialProgress.js   # Barre de progression tutoriel
│   │   │   └── TutorialTooltip.js    # Tooltip guidé tutoriel
│   │   ├── VilleAbonnement.js        # Composant abonnement à une ville
│   │   ├── VilleSearchOverlay.js     # Overlay recherche & filtre villes
│   │   └── VilleSelector.js          # Sélecteur ville dropdown
│   ├── confidentialite/page.js       # Politique de confidentialité
│   ├── context/
│   │   ├── AuthContext.js            # État auth global + signIn/signOut + upsert profil
│   │   └── FavorisContext.js         # État favoris + toggleFavori (optimiste avec rollback)
│   ├── error.js                      # Boundary d'erreur global
│   ├── globals.css                   # Styles globaux + imports Tailwind
│   ├── hooks/
│   │   └── useReservation.js         # Hook réservation (code 6 chiffres, décrément stock, QR)
│   ├── layout.js                     # Root layout (providers, header, footer)
│   ├── mentions-legales/page.js      # Mentions légales
│   ├── not-found.js                  # Page 404
│   ├── offre/[id]/
│   │   ├── page.js                   # Page détail offre (SSR)
│   │   └── UrgencyAndCTA.js          # Countdown, barre urgence, bouton réservation
│   ├── page.js                       # Page d'accueil (fetch SSR villes + offres)
│   ├── profil/
│   │   ├── page.js                   # Profil : badges, abonnements, favoris, notifs
│   │   └── bons/page.js              # Historique des réservations
│   ├── registre-cnil/page.js         # Registre CNIL
│   └── ville/[slug]/
│       ├── page.js                   # Page ville (SSR)
│       ├── OffreCard.js              # Carte offre (mapping catégories Google Places)
│       └── VilleClient.js            # Composant client page ville
├── lib/
│   ├── supabase/
│   │   ├── client.js                 # Client navigateur (createBrowserClient)
│   │   └── server.js                 # Client serveur (createServerClient + cookies)
│   ├── offreStatus.js                # Helpers statut offre (getOffreStatus, formatDebut)
│   ├── rate-limit.js                 # Middleware rate limiting (30 req/60s)
│   └── utils.js                      # Utilitaires (toSlug, etc.)
├── supabase/
│   ├── schema.sql                    # Schéma complet BDD avec policies RLS
│   ├── seed.sql                      # Données initiales
│   └── seed-test.sql                 # Données de test
├── sql/
│   └── migrations_abonnements_favoris.sql  # Migrations abonnements, favoris, notifs
├── public/
│   └── LOGO.png
├── scripts/                          # Scripts utilitaires
├── data/                             # Fichiers de données locaux
├── .env.example                      # Template variables d'environnement
├── next.config.mjs
├── postcss.config.mjs
├── vercel.json                       # Config déploiement Vercel
├── eslint.config.mjs
├── jsconfig.json                     # Alias de chemins JS
├── package.json
├── CONTEXT.md                        # Ce fichier
├── AUDIT_REPORT.md                   # Rapport audit sécurité/code
└── README.md

SCHÉMA BASE DE DONNÉES (Supabase PostgreSQL)
--------------------------------------------

Table villes :
  id (UUID PK), nom (text unique), code_insee (text unique),
  departement (text), active (boolean)
  RLS : lecture publique des villes actives

Table users :
  id (UUID FK auth.users), email, nom, avatar_url,
  villes_abonnees (text[]), commerces_abonnes (UUID[]),
  badge_niveau ('habitant'|'bon_habitant'|'habitant_exemplaire'),
  role ('habitant'|'commerçant'|'admin'),
  notifications_actives (bool), notifications_email (bool défaut true),
  notifications_push (bool défaut false), push_subscription (jsonb),
  created_at
  RLS : chaque utilisateur lit/écrit uniquement son propre profil

Table commerces :
  id (UUID PK), place_id (text unique, Google Places),
  owner_id (UUID FK users), nom, categorie (Google), categorie_bonmoment,
  adresse, ville, description, photo_url, qr_code_url, telephone,
  note_google (numeric 3,1), horaires (jsonb),
  abonnement_actif (bool), palier ('decouverte'|'essentiel'|'pro'),
  code_parrainage (text unique, format BMxxxxxx),
  code_parrainage_expire_at (timestamp), parrain_id (UUID),
  parrainage_filleuls_mois (int), created_at
  RLS : lecture publique, écriture owner uniquement

Table offres :
  id (UUID PK), commerce_id (UUID FK commerces),
  titre, description,
  type_remise ('pourcentage'|'montant_fixe'|'montant'|'cadeau'|
               'produit_offert'|'service_offert'|'concours'|'atelier'),
  valeur (numeric), date_debut (timestamp), date_fin (timestamp),
  nb_bons_total (int), nb_bons_restants (int, null/9999=illimité),
  statut ('active'|'expiree'|'programmee'),
  est_recurrente (bool), jours_recurrence (int),
  gagnant_id (UUID, pour concours), created_at
  RLS : lecture publique des offres actives, écriture owner uniquement

Table reservations :
  id (UUID PK), user_id (UUID FK users), offre_id (UUID FK offres),
  code_validation (text, 6 chiffres), qr_code_data (text, URL /bon/{id}),
  statut ('reservee'|'utilisee'|'expiree'|'annulee'),
  created_at, utilise_at (timestamp)
  UNIQUE(user_id, offre_id) — impossible de réserver deux fois la même offre
  RLS : habitants voient leurs bons, commerçants voient les bons de leurs offres

FONCTIONNALITÉS IMPLÉMENTÉES
-----------------------------

CÔTÉ HABITANT :
- Connexion OAuth (Google, Facebook, Apple, Microsoft) via bottom sheet
- Navigation des offres par ville et catégorie
- Abonnement à plusieurs villes (persisté en BDD + localStorage)
- Réservation d'un bon : génère code 6 chiffres unique + URL QR (/bon/{id})
- Vérification doublon : UNIQUE(user_id, offre_id) côté BDD
- Affichage bon plein écran (fond blanc, QR 250px min, code Courier New 32px)
- Wake lock écran : empêche la mise en veille pendant l'affichage du bon
- Countdown temps restant avant expiration (mis à jour chaque seconde)
- Compteur bons restants + badge "Urgent !" (< 30 min ou < 5 bons)
- Preuve sociale : "X habitants ont déjà réservé"
- Bouton favoris (cœur) sur chaque commerce (mise à jour optimiste)
- Partage bon/offre via Web Share API
- Email notifications : digest quotidien à 21h (Brevo)
- Push notifications : temps réel (VAPID)
- Système de badges gamification (Habitant → Bon Habitant → Habitant Exemplaire)
- Profil : gestion abonnements, favoris, historique bons, suppression compte
- Historique des réservations avec statuts

CÔTÉ COMMERÇANT :
- Inscription via Google Places autocomplete (auto-remplissage photo, tel, horaires, note, adresse, catégorie)
- Détection doublon commerce (place_id unique)
- Sélection catégorie BONMOMENT (5 catégories, détection auto depuis type Google)
- Support multi-commerce (un owner peut avoir plusieurs commerces)
- Code parrainage unique au format BMxxxxxx, validité 3 mois, auto-régénéré
- Validation code parrainage à l'inscription (remise parrain + filleul)
- Premier mois gratuit avec CB enregistrée
- Création d'offres avec vérification quota selon palier (4/8/16 offres/mois)
- Types offres : pourcentage, montant_fixe, cadeau, produit_offert, service_offert, concours, atelier
- Offres récurrentes (auto-renouvellement après expiration)
- Dashboard : switch entre commerces, aperçu offres actives/expirées, stock, expiration
- QR code profil commerce (téléchargeable, partage l'URL du profil)
- Validation bons : scanner QR (html5-qrcode) OU saisie manuelle code 6 chiffres
- Retour haptique (vibration) : motifs différents succès/erreur
- Vérifications validation : propriétaire du commerce, bon déjà utilisé, expiré, pas encore actif
- Tirage au sort concours (POST /api/tirer-au-sort après expiration offre)
- Tutoriel onboarding guidé (dashboard + création offre)
- Page profil public du commerce

CÔTÉ ADMIN (bonmomentapp@gmail.com uniquement) :
- Dashboard stats : MRR, churn, DAU, MAU, villes actives, taux utilisation
- Liste habitants (filtrage, tri)
- Liste commerçants (filtrage, tri)
- Liste offres (toutes, filtrage)
- Accès via lien caché dans le footer (AdminFooterLink)

PAGES LÉGALES :
- CGU, CGV, Politique de confidentialité, Mentions légales, Registre CNIL

SÉCURITÉ & INFRASTRUCTURE :
- RLS activé sur toutes les tables
- Rate limiting : /api/valider-bon (30 req/60s) via lib/rate-limit.js
- Validation serveur sur tous les formulaires
- Toutes les clés API en variables d'environnement
- Cron jobs sécurisés par CRON_SECRET (email quotidien, tirage au sort)
- Région EU West (Supabase + Vercel) pour conformité RGPD

VARIABLES D'ENVIRONNEMENT REQUISES (.env.local)
------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          (serveur uniquement, jamais exposé)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
BREVO_API_KEY
CRON_SECRET
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
ADMIN_EMAIL                        (= bonmomentapp@gmail.com)

FLUX AUTHENTIFICATION
---------------------
1. Habitant clique "Réserver mon bon" → AuthBottomSheet si non connecté
2. SignInPanel affiche 4 boutons OAuth
3. signIn(provider) → popup Supabase OAuth → redirect /auth/callback?code=...&next=/offre/123
4. /auth/callback échange le code, upsert profil users, redirige vers next ou accueil

GESTION D'ÉTAT
--------------
AuthContext    : état utilisateur global, signIn/signOut, upsert profil au changement d'auth
FavorisContext : liste favoris, isFavori(id), toggleFavori(id) avec mise à jour optimiste
useReservation : hook complet réservation (génération code, décrémentation stock, persistance)

SCRIPTS DE DÉVELOPPEMENT
------------------------
npm run dev    → serveur dev localhost:3000
npm run build  → build production
npm start      → serveur production
npm run lint   → ESLint

MIGRATIONS BASE DE DONNÉES
--------------------------
Schéma principal : supabase/schema.sql (à exécuter dans l'éditeur SQL Supabase)
Migrations supplémentaires : sql/migrations_abonnements_favoris.sql
Données de test : supabase/seed-test.sql
