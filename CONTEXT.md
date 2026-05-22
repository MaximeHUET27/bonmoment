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
pourcentage, montant_fixe, montant, cadeau, produit_offert, service_offert, concours, atelier, fidelite, offert, anti_gaspi

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
               'produit_offert'|'service_offert'|'concours'|'atelier'|
               'fidelite'|'offert'|'anti_gaspi'),  ← CHECK constraint BDD
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
- Types offres : pourcentage, montant_fixe, montant, cadeau, produit_offert, service_offert, concours, atelier, fidelite, offert, anti_gaspi
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

---

FEATURE : CARTE FIDÉLITÉ UNIVERSELLE
=====================================
Branche Git : feat/carte-fidelite-universelle
État        : Migration SQL créée, non exécutée en prod
Feature flag: NEXT_PUBLIC_FIDELITE_ENABLED (false par défaut partout)
Palier requis: commerces.palier = 'pro' ET abonnement_actif = TRUE

PRINCIPE DE SÉCURITÉ
--------------------
Double garde-fou avant tout affichage ou exécution :
  1. NEXT_PUBLIC_FIDELITE_ENABLED === 'true' (variable d'environnement)
  2. commerce.palier === 'pro' + programme_fidelite.actif === true
Si l'un est false → aucune UI visible, aucun endpoint actif.

COLONNE AJOUTÉE SUR TABLE EXISTANTE
------------------------------------
users.telephone (VARCHAR(15), NULLABLE, index unique partiel)
  → Zéro impact sur les lignes existantes (pas de DEFAULT, pas de NOT NULL)

NOUVELLES TABLES (additif pur — rien de modifié dans l'existant)
----------------------------------------------------------------
1. users_light          — Clients caisse non-BONMOMENT (identifiés par 06/07)
2. programmes_fidelite  — Programme par commerce (1 ligne/commerce, PK=commerce_id)
3. cartes_fidelite      — Une carte par (client × commerce), seuil figé à la création
4. passages_fidelite    — Un tampon = une ligne, N tampons/passage → même passage_group_id
5. fidelite_flags_antifraude — Alertes anti-fraude (accès service_role uniquement)
+ Vue : vue_base_client_fidelite (téléphones masqués, RLS commerce)

RÈGLE SEUIL : Option C — le seuil_passages est figé par carte à la création.
Modifier le programme ne casse pas les clients existants.
Baisser le seuil (Option A) débloque immédiatement les clients éligibles.

RPC CRÉÉES (10 fonctions SECURITY DEFINER)
------------------------------------------
enregistrer_passage_fidelite(commerce_id, mode, identifier, prenom?, consultation?, nb_tampons?)
  → Passage principal : résolution client, création carte si besoin, incrémentation,
    validation bon si actif, gestion multi-tampons (1 à 10 par passage)

annuler_passage_fidelite(passage_group_id)
  → Annule TOUS les tampons du groupe, restaure le bon, recalcule les récompenses

ajuster_tampons_manuel(carte_id, nb_tampons, commentaire)
  → Ajustement commerçant ±50 tampons (traçabilité dans passages_fidelite)

confirmer_recompense_remise(carte_id)
  → Remet recompense_en_attente à FALSE après remise physique

activer_carte_fidelite_client(telephone)
  → Lie un 06/07 au compte client BONMOMENT + fusionne les cartes light existantes

desactiver_fidelite_client()
  → RGPD : supprime toutes les cartes + efface users.telephone

modifier_telephone_client(nouveau_telephone)
  → Changement de numéro + fusion des cartes light éventuelles

mettre_a_jour_programme_fidelite(commerce_id, seuil, description, actif, regle?)
  → Crée/met à jour le programme + débloche auto si baisse de seuil (Option A)

peut_utiliser_fidelite(commerce_id) → BOOLEAN
  → Vérifie palier = 'pro' ET abonnement_actif = TRUE
  → CORRECTION CRITIQUE : colonne 'palier' (TEXT), PAS 'palier_abonnement'

check_rate_limit_fidelite(commerce_id) → BOOLEAN
  → Refuse si > 30 passages/minute pour ce commerce

ARCHITECTURE API ROUTES (Commit 2+)
------------------------------------
Toutes les mutations passent par des API routes Next.js (pattern /api/valider-bon) :
  app/api/fidelite/enregistrer-passage/route.js
  app/api/fidelite/annuler-passage/route.js
  app/api/fidelite/confirmer-recompense/route.js
  app/api/fidelite/ajuster-tampons/route.js
  app/api/fidelite/activer-carte/route.js
  app/api/fidelite/desactiver/route.js
  app/api/fidelite/modifier-telephone/route.js
  app/api/fidelite/programme/route.js (GET + POST)
Les lectures (SELECT) restent en direct via client Supabase (RLS suffisant).

FICHIERS SQL
------------
sql/add_fidelite_universelle.sql     → Migration (à exécuter manuellement dans Supabase)
sql/rollback_fidelite_universelle.sql → Rollback complet (< 10s, données perdues)
sql/test_post_migration_fidelite.sql  → Tests à exécuter après migration

PROCÉDURE DE ROLLBACK (3 niveaux)
----------------------------------
Niveau 0 — Désactiver le flag (INSTANTANÉ, 30s, données conservées) :
  Vercel → Environment Variables → NEXT_PUBLIC_FIDELITE_ENABLED = false → redeploy

Niveau 1 — Désactiver côté serveur (1s, données conservées) :
  SQL : UPDATE programmes_fidelite SET actif = FALSE;

Niveau 2 — Revert Git (code retiré, tables conservées) :
  git revert <hash_commit_fidelite> && git push

Niveau 3 — Rollback DB complet (données perdues, < 10s) :
  Exécuter sql/rollback_fidelite_universelle.sql dans Supabase SQL Editor

ACTIVATION PROGRESSIVE
-----------------------
1. Déployer tout le code avec NEXT_PUBLIC_FIDELITE_ENABLED=false (aucune UI visible)
2. Tester en local avec NEXT_PUBLIC_FIDELITE_ENABLED=true dans .env.local
3. Activer sur Preview Vercel → tester sur l'URL preview
4. Activer sur Production uniquement après validation complète
5. Passer un commerce pilote en palier 'pro' + configurer son programme

---

FEATURE : MODULE MAIRIE / ASSOCIATION
=====================================
Branche Git : feat/mairie-asso-lot1-fondations (Lot 1 sur 4)
État        : Lot 1 terminé — fondations en place, aucune UI fonctionnelle visible
Feature flag: NEXT_PUBLIC_MAIRIE_ASSO_ENABLED (false par défaut partout)

PRINCIPE DE SÉCURITÉ
--------------------
Double garde-fou avant tout affichage ou exécution :
  1. NEXT_PUBLIC_MAIRIE_ASSO_ENABLED === 'true' (variable d'environnement)
  2. commerce.categorie_bonmoment === 'mairie_asso' (côté BDD)
Si l'un est false → aucune UI mairie_asso visible, aucun endpoint actif.

COLONNES AJOUTÉES SUR TABLES EXISTANTES
----------------------------------------
commerces.logo_url (TEXT, NULLABLE)
  → Logo personnalisé pour les comptes mairie_asso uniquement
commerces.affiche_logo_mairie_asso_id (UUID, NULLABLE, FK→commerces)
  → Choix du commerçant pour son affiche vitrine PDF
offres.avec_bon (BOOLEAN, NOT NULL, DEFAULT TRUE)
  → FALSE = offre d'information (réservé aux mairie_asso, lot 3)

NOUVELLE TABLE
--------------
mairie_asso_membres
  → Liens N-N entre comptes mairie_asso et commerces
  → Statuts : pending / accepted / declined / removed
  → 2 triggers de cohérence + 4 policies RLS

CATÉGORIE AJOUTÉE
-----------------
'mairie_asso' devient la 6ème valeur acceptée pour commerces.categorie_bonmoment
(categorie_bonmoment est TEXT sans CHECK constraint — validation applicative uniquement)
Filtre client correspondant : 🏛️ Mairie / Association (à venir lot 3)
Détection auto Google Places : local_government_office, city_hall, town_hall

FICHIERS SQL
------------
sql/add_mairie_asso.sql              → Migration (à exécuter manuellement)
sql/rollback_mairie_asso.sql         → Rollback complet
sql/test_post_migration_mairie_asso.sql → Tests post-migration (8 tests)

TESTS AUTOMATISÉS
-----------------
Framework : Vitest (unitaires) + Playwright (E2E)
Commandes :
  npm test                 → Vitest run
  npm run test:e2e         → Playwright
  npm run test:non-regression → Tests de non-régression uniquement
Objectif unique : si flag OFF, aucun test commerce existant ne doit échouer.

PROCÉDURE DE ROLLBACK (3 niveaux)
----------------------------------
Niveau 0 — Désactiver le flag (INSTANTANÉ, données conservées) :
  Vercel → Environment Variables → NEXT_PUBLIC_MAIRIE_ASSO_ENABLED = false → redeploy

Niveau 1 — Désactiver côté serveur (1s, données conservées) :
  SQL : UPDATE commerces SET categorie_bonmoment = 'autres' WHERE categorie_bonmoment = 'mairie_asso';
  (à n'exécuter qu'en dernier recours, casse les liens existants)

Niveau 2 — Revert Git (code retiré, tables conservées) :
  git revert <hash_commit_lot1> && git push

Niveau 3 — Rollback DB complet (données mairie_asso perdues) :
  Exécuter sql/rollback_mairie_asso.sql dans Supabase SQL Editor

LOTS RESTANTS
-------------
  Aucun — module Mairie / Association complet (Lots 1, 2, 3, 4A, 4B livrés)

LOT 2 — INVITATIONS (terminé)
------------------------------
État : code livré sur la branche feat/mairie-asso-lot1-fondations, non mergé sur master

API Routes ajoutées :
  GET    /api/mairie-asso/commercants-invitables  → recherche commerces invitables (par ville + nom)
  POST   /api/mairie-asso/invitations              → créer invitation (rate limit 20/min)
  PATCH  /api/mairie-asso/invitations/[id]         → accept/decline/remove/leave

Composants ajoutés :
  app/components/ConfirmModal.js                       → modale réutilisable charte BONMOMENT
  app/components/mairie-asso/GestionAdherents.js       → section dashboard mairie/asso
  app/components/mairie-asso/BandeauInvitations.js     → bandeau dashboard commerçant
  app/components/mairie-asso/MesAdhesions.js           → section dashboard commerçant

Helpers ajoutés :
  lib/brevo/sendInvitationEmail.js  → envoi email invitation Brevo

Modifications :
  app/commercant/dashboard/page.js  → ajout categorie_bonmoment au select, intégration des 3 composants sous flag

Décisions produit appliquées :
  - Recherche par nom uniquement (pas de filtre catégorie ni pagination)
  - Bandeau orange + modale au clic (pas de toast permanent)
  - Ré-invitation immédiate possible après refus ou retrait (pas de délai)
  - Aucune notification à l'asso quand le commerçant agit (visible dans dashboard)
  - Confirmation : pas pour Accepter, modale pour Décliner / Retirer / Quitter
  - Rate limit : 20 invitations/minute par IP (pattern existant lib/rate-limit.js)
  - useState(() => createClient()) pour stabilité de la ref Supabase dans useCallback

Tests ajoutés :
  tests/unit/mairie-asso/invitations-logic.test.js  → logique transitions + permissions + removed_by
  tests/e2e/mairie-asso/invitations-flow.spec.js     → non-régression UI avec flag OFF
  tests/non-regression/feature-flag.test.js          → enrichi (bloc API routes)

LOT 3 — OFFRES ET VALIDATION (terminé)
---------------------------------------
État : code livré sur la branche feat/mairie-asso-lot1-fondations, non mergé sur master

SQL ajouté (add_mairie_asso_lot3.sql) :
  - Table participations_offres  → inscriptions aux événements sans bon, 4 policies RLS
  - RPC get_offres_collectives_commerce(p_commerce_id) → offres actives des assos parentes
  - RPC get_participants_offre(p_offre_id) → participants d'une offre sans bon

API Routes ajoutées :
  GET/POST /api/offres/[id]/participants     → liste/inscription participants sans bon
  GET      /api/commercant/offres-collectives → offres actives de l'asso (RPC)

Modifications formulaire offre (nouvelle/page.js) :
  - Ajout categorie_bonmoment au select commerce
  - Toggle "Événement sans bon" visible si typeRemise=atelier + compte mairie_asso
  - Champ date fin séparé (multi-jours jusqu'à 30j) pour événements sans bon
  - Validation : skip nbBons si avecBon=false, max 30j pour mairie_asso

Modifications API offres (route.js) :
  - categorie_bonmoment dans le select commerce
  - Validation durée : max 30j si mairie_asso, max 1j sinon
  - Insertion du champ avec_bon dans offres

Modifications côté client :
  - VilleClient.js : filtre 🏛️ Mairie/Asso ajouté aux FILTERS_CATEGORIE
  - OffreCard.js : gestion avec_bon=false (plage dates, "📍 En savoir plus", pas de timer/stock)
  - offre/[id]/page.js : fetch participants, bloc "sans bon" (dates + participants), mention asso
  - valider-bon/route.js : validation multi-point (membres asso peuvent valider bons de l'asso)
  - commercant/valider/page.js ResultScreen : mention "🏛️ Bon de [Asso]" si validation croisée

Composant ajouté :
  app/components/mairie-asso/OffresCollectives.js  → liste des offres collectives dans dashboard membre

Modification dashboard :
  app/commercant/dashboard/page.js → ajout <OffresCollectives> pour les membres non-mairie_asso

LOT 4A — DASHBOARD STATS CUMULÉES + UPLOAD LOGO + AFFICHE ENRICHIE (terminé)
------------------------------------------------------------------------------
État : code livré sur la branche feat/mairie-asso-lot1-fondations, non mergé sur master

SQL ajouté :
  sql/add_mairie_asso_lot4a.sql        → RPC get_stats_cumulees_mairie_asso + colonne nb_avis_google
  sql/update_rpc_lot4a.sql             → mise à jour get_invitations_et_adhesions_commerce (ajout logo_url)
  sql/setup_storage_lot4a.md           → instructions bucket Supabase Storage logos-mairie-asso
  sql/test_post_migration_mairie_asso_lot4a.sql → 5 tests post-migration
  sql/rollback_mairie_asso_lot4a.sql   → rollback

ROUTES API LOT 4A
-----------------
  POST   /api/mairie-asso/logo             → upload logo (PNG/JPG/WEBP, max 2 MB)
  DELETE /api/mairie-asso/logo             → suppression logo + reset logo_url
  GET    /api/mairie-asso/stats-cumulees   → 6 KPIs cumulés avec filtre 7j/30j/total
  PATCH  /api/commercant/logo-affiche      → choix du logo à afficher sur l'affiche vitrine

RPC SQL
-------
  get_stats_cumulees_mairie_asso(asso_id, periode)   SECURITY DEFINER
  get_invitations_et_adhesions_commerce (mise à jour, ajout colonne mairie_asso_logo_url)

NOUVEAU CHAMP
-------------
  commerces.nb_avis_google INTEGER DEFAULT 0   (pour cumul avis Google des membres)

SUPABASE STORAGE
----------------
  Bucket public : logos-mairie-asso
  Structure des chemins : {mairie_asso_id}/logo.{ext}
  Policies RLS : lecture publique, upload/update/delete uniquement par l'owner mairie_asso

COMPOSANTS AJOUTÉS
------------------
  app/components/mairie-asso/StatsCumuleesMairieAsso.js  → 6 KPIs + filtre temporel
  app/components/mairie-asso/UploadLogoMairieAsso.js     → upload/suppression logo
  app/components/mairie-asso/SelecteurLogoAffiche.js     → choix logo pour commerçants membres

HELPERS AJOUTÉS
---------------
  lib/supabase/storage-logos.js   → uploadLogoMairieAsso / deleteLogosMairieAsso

MODIFICATIONS
-------------
  app/commercant/dashboard/page.js :
    - Select commerce enrichi : logo_url, affiche_logo_mairie_asso_id
    - Intégration StatsCumuleesMairieAsso (mairie_asso uniquement)
    - Intégration UploadLogoMairieAsso (mairie_asso uniquement)
    - Intégration SelecteurLogoAffiche (commerçants non-mairie_asso)
    - QRVitrine : fetch logo asso + passage logoAssoUrl à AfficheContent
  app/commercant/components/AfficheContent.js :
    - Prop logoAssoUrl ajoutée (optionnelle)
    - Logo positionné en haut à droite : top:15px, right:15px, 80×80px
    - Marges : 272px du bord droit du nom (top 28.5%), 225px au-dessus du nom

TESTS AJOUTÉS
-------------
  tests/unit/mairie-asso/stats-cumulees.test.js     → validation paramètres + KPIs
  tests/non-regression/lot4a-isolation.test.js      → 404 avec flag OFF
  tests/e2e/mairie-asso/lot4a-affiche.spec.js        → absences UI avec flag OFF

LOT 4B — TEXTES LÉGAUX, CHATBOT, FAQ, ADMIN (terminé)
------------------------------------------------------
État : code livré sur la branche feat/mairie-asso-lot1-fondations, non mergé sur master

Fichiers modifiés :
  app/cgv/page.js                              → section 3.3 "Cas particulier Mairie/Asso" (flag-gated)
  app/confidentialite/page.js                  → section 5.3 "Partage données Mairie/Asso" (flag-gated)
  app/registre-cnil/page.js                    → suppression définitive section "Obligations" (sans flag)
  app/components/chatbot/chatbotData.js        → 3e branche racine + 7 nœuds m-q-* (flag-gated)
  data/faq-data.js                             → catégorie "Associations et mairies" 7 Q&As (flag-gated)
  app/admin/page.js                            → KPI "Mairies/Assos actives" (flag-gated)
  app/admin/commercants/page.js                → filtre "Type de compte" (flag-gated)
  app/api/admin/commercants/route.js           → paramètre type_compte dans le GET
  app/api/admin/dashboard/route.js             → KPI mairie_asso_actifs dans la réponse

Fichiers créés :
  tests/non-regression/lot4b-isolation.test.js  → tests flag OFF/ON FAQ + chatbot + admin
  tests/e2e/lot4b-non-regression.spec.js         → non-régression UI (CGV, confidentialité, CNIL, FAQ)
  docs/banc-test-V3-mairie-asso.md               → 67 cas de test en 6 phases

Décisions produit :
  - section 3.3 CGV : consentement explicite, désaffiliation sans frais, données agrégées uniquement
  - section 5.3 Confidentialité : base légale 6.1.b + 6.1.f, historique conservé anonymisé
  - Registre CNIL : section "Obligations à remplir" retirée définitivement (checklist obsolète)
  - Chatbot : nœuds m-cat + m-q-1 à m-q-7, option racine avec spread conditionnel
  - FAQ : spread conditionnel en fin de tableau avec isMairieAssoEnabled via process.env
  - Admin : KPI mairie_asso_actifs comptabilisé à partir du champ type_compte dans commerces

---

MIGRATIONS CORRECTIVES
======================

sql/add_anti_gaspi_type_check.sql      → Ajout 'anti_gaspi' au CHECK constraint
sql/rollback_anti_gaspi_type_check.sql → Rollback associé (⚠ voir avertissement dans le fichier)
sql/test_post_migration_anti_gaspi.sql → Tests post-migration (3 tests)

Contexte : La feature anti-gaspi (commits 8e9c3f6, 5a26419, ad2ce8d) ajoutait
type_remise='anti_gaspi' côté applicatif sans mettre à jour le CHECK constraint BDD.
Migration exécutée manuellement en prod le 2026-05-23. Le commit qui synchronise
ce fichier (fix(db): alignement code source) ne modifie pas la BDD.

Point d'attention : Les valeurs 'fidelite' et 'offert' existaient déjà dans le
CHECK constraint prod mais n'étaient pas documentées dans CONTEXT.md (lacune
comblée par cette mise à jour).

Module Mairie / Association : COMPLET
