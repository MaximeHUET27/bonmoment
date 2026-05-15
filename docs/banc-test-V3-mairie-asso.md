# Banc de test V3 — Module Mairie / Association

**Version :** 3.0  
**Date :** 2026-05-15  
**Périmètre :** Lots 1, 2, 3, 4A et 4B du module Mairie/Association  
**Prérequis :** Flag `NEXT_PUBLIC_MAIRIE_ASSO_ENABLED=true`, migrations SQL Lots 1-4A appliquées, bucket `logos-mairie-asso` créé.

---

## Phase 1 — Fondations (Lot 1)

| # | Cas de test | Action | Résultat attendu | Statut |
|---|-------------|--------|------------------|--------|
| 1.1 | Flag OFF — accès public | Ouvrir `/commercant/dashboard` sans flag | Les sections mairie/asso sont absentes | ☐ |
| 1.2 | Flag ON — table `mairie_asso_membres` | Vérifier l'existence de la table en BDD | Table présente avec colonnes `commerce_id`, `mairie_asso_id`, `statut` | ☐ |
| 1.3 | Colonne `type_compte` | Vérifier sur la table `commerces` | Colonne TEXT avec valeur par défaut `'commerce'` | ☐ |
| 1.4 | Colonne `affiche_logo_mairie_asso_id` | Vérifier sur la table `commerces` | Colonne UUID nullable | ☐ |
| 1.5 | RLS `mairie_asso_membres` | Tenter une lecture sans auth | Erreur 403 ou résultat vide | ☐ |
| 1.6 | Feature flag `isMairieAssoEnabled()` | Env absent | Retourne `false` | ☐ |
| 1.7 | Feature flag `isMairieAssoEnabled()` | Env = `'false'` | Retourne `false` | ☐ |
| 1.8 | Feature flag `isMairieAssoEnabled()` | Env = `'true'` | Retourne `true` | ☐ |

---

## Phase 2 — Gestion des membres (Lot 2)

| # | Cas de test | Action | Résultat attendu | Statut |
|---|-------------|--------|------------------|--------|
| 2.1 | Invitation — envoi | Compte mairie/asso invite un commerce | Ligne créée dans `mairie_asso_membres` avec `statut='pending'` | ☐ |
| 2.2 | Invitation — réception côté commerçant | Commerçant ouvre son dashboard | Badge "Invitation en attente" visible | ☐ |
| 2.3 | Acceptation d'invitation | Commerçant clique "Accepter" | `statut` passe à `'accepted'`, `accepted_at` renseigné | ☐ |
| 2.4 | Refus d'invitation | Commerçant clique "Refuser" | `statut` passe à `'rejected'` | ☐ |
| 2.5 | Désaffiliation | Commerçant clique "Quitter le réseau" | Ligne supprimée ou `statut='rejected'` | ☐ |
| 2.6 | Double invitation | Mairie tente d'inviter un commerce déjà membre | Erreur ou invitation bloquée | ☐ |
| 2.7 | Liste des membres | Compte mairie/asso consulte ses membres | Seuls les statuts `pending` et `accepted` sont affichés | ☐ |
| 2.8 | RPC `get_invitations_et_adhesions_commerce` | Appel avec `p_commerce_id` valide | Retourne les lignes avec `mairie_asso_logo_url` inclus | ☐ |

---

## Phase 3 — Offres collectives et validation (Lot 3)

| # | Cas de test | Action | Résultat attendu | Statut |
|---|-------------|--------|------------------|--------|
| 3.1 | Offre collective — création | Compte mairie/asso crée une offre | Offre visible dans les villes des membres actifs | ☐ |
| 3.2 | Offre collective — non-membres | Commerce non-membre vérifie ses offres | L'offre collective n'apparaît pas | ☐ |
| 3.3 | Validation multi-point | Habitant utilise un bon d'offre collective | Bon validé dans `reservations` avec `statut='utilisee'` | ☐ |
| 3.4 | Filtre "Sans bon" | Compte mairie/asso applique le filtre | Seuls les membres sans offre active sont listés | ☐ |
| 3.5 | UI sans bon — badge | Commerce sans offre active affiché dans la liste | Badge distinctif visible | ☐ |
| 3.6 | Ça m'intéresse | Habitant clique "Ça m'intéresse" sur une offre collective | Bon réservé, visible dans "Mes bons" | ☐ |
| 3.7 | Quota offres | Mairie/asso atteint son quota mensuel | Message d'erreur explicite, création bloquée | ☐ |

---

## Phase 4A — Stats, logo, affiche (Lot 4A)

| # | Cas de test | Action | Résultat attendu | Statut |
|---|-------------|--------|------------------|--------|
| 4.1 | Stats cumulées — période 7j | Appel `/api/mairie-asso/stats-cumulees?periode=7j` | 6 KPIs retournés, valeurs numériques | ☐ |
| 4.2 | Stats cumulées — période 30j | Appel avec `periode=30j` | Valeurs cohérentes (≥ 7j en général) | ☐ |
| 4.3 | Stats cumulées — période total | Appel avec `periode=total` | Cumul depuis le début | ☐ |
| 4.4 | Stats cumulées — période invalide | Appel avec `periode=90j` | Erreur 400 | ☐ |
| 4.5 | Stats cumulées — accès refusé | Appel sans auth ou mauvais `mairie_asso_id` | Erreur 403 | ☐ |
| 4.6 | Upload logo — fichier valide | PNG < 2 Mo uploadé | Logo stocké dans `logos-mairie-asso/{id}/logo.png`, `logo_url` mis à jour | ☐ |
| 4.7 | Upload logo — MIME invalide | GIF uploadé | Erreur 400 "Type de fichier non autorisé" | ☐ |
| 4.8 | Upload logo — taille > 2 Mo | Fichier 2 Mo + 1 octet | Erreur 400 "Fichier trop volumineux" | ☐ |
| 4.9 | Suppression logo | DELETE `/api/mairie-asso/logo` | `logo_url` remis à `null`, fichier supprimé du bucket | ☐ |
| 4.10 | Sélecteur logo affiche | Commerçant ouvre SelecteurLogoAffiche | Liste les assos acceptées avec logo uniquement | ☐ |
| 4.11 | Activation logo sur affiche | Commerçant sélectionne une asso | `affiche_logo_mairie_asso_id` mis à jour | ☐ |
| 4.12 | PDF avec logo | Commerçant télécharge son affiche PDF | Logo asso visible en haut à droite, 80×80px | ☐ |
| 4.13 | PDF sans logo | Commerçant sans asso télécharge l'affiche | PDF généré normalement sans logo | ☐ |
| 4.14 | Accès refusé logo affiche | Commerçant tente d'activer logo d'une asso dont il n'est pas membre | Erreur 403 | ☐ |

---

## Phase 4B — Légal, chatbot, FAQ, admin (Lot 4B)

| # | Cas de test | Action | Résultat attendu | Statut |
|---|-------------|--------|------------------|--------|
| 5.1 | CGV section 3.3 — flag OFF | Ouvrir `/cgv` sans flag | Section 3.3 "Cas particulier" absente | ☐ |
| 5.2 | CGV section 3.3 — flag ON | Ouvrir `/cgv` avec flag ON | Section 3.3 présente avec 4 paragraphes | ☐ |
| 5.3 | CGV — lire section 3.3 | Vérifier le contenu | Mention du consentement explicite et données agrégées | ☐ |
| 5.4 | Confidentialité 5.3 — flag OFF | Ouvrir `/confidentialite` sans flag | Section 5.3 absente | ☐ |
| 5.5 | Confidentialité 5.3 — flag ON | Ouvrir `/confidentialite` avec flag ON | Section 5.3 "Partage de données" présente | ☐ |
| 5.6 | Confidentialité — base légale | Lire section 5.3 | Mention article 6.1.b et 6.1.f du RGPD | ☐ |
| 5.7 | Registre CNIL — suppression | Ouvrir `/registre-cnil` (flag ON ou OFF) | Section "Obligations à remplir" absente définitivement | ☐ |
| 5.8 | Registre CNIL — continuité | Vérifier la suite | "Procédure en cas de violation" suit directement "Sous-traitants" | ☐ |
| 5.9 | Chatbot — flag OFF | Ouvrir le chatbot avec flag OFF | Seules 2 options à la racine (habitant, commerçant) | ☐ |
| 5.10 | Chatbot — flag ON | Ouvrir le chatbot avec flag ON | 3 options à la racine, dont "Tu représentes une mairie ou une association ?" | ☐ |
| 5.11 | Chatbot — branche m-cat | Cliquer sur l'option mairie/asso | 7 sous-questions affichées | ☐ |
| 5.12 | Chatbot — m-q-4 statistiques | Cliquer "Où voir les statistiques ?" | Réponse avec les 6 KPIs listés | ☐ |
| 5.13 | Chatbot — m-q-7 résiliation | Cliquer "Résilier" | Réponse avec bouton "Contacter l'équipe" | ☐ |
| 5.14 | FAQ — flag OFF | Ouvrir `/aide` sans flag | Catégorie "Associations et mairies" absente | ☐ |
| 5.15 | FAQ — flag ON | Ouvrir `/aide` avec flag ON | Catégorie "Associations et mairies" présente avec 7 questions | ☐ |
| 5.16 | FAQ — recherche mairie/asso | Taper "adhésion" dans la recherche | Les Q&A mairie/asso apparaissent dans les résultats | ☐ |
| 5.17 | Admin — KPI mairies/assos | Ouvrir le dashboard admin avec flag ON | Carte "Mairies/Assos actives" visible | ☐ |
| 5.18 | Admin — filtre type de compte | Ouvrir `/admin/commercants` avec flag ON | Dropdown "Tous types / Commerce / Mairie/Asso" présent | ☐ |
| 5.19 | Admin — filtre Mairie/Asso | Sélectionner "Mairie/Asso" dans le filtre | Seuls les comptes `type_compte='mairie_asso'` sont listés | ☐ |
| 5.20 | Admin — filtre flag OFF | Ouvrir `/admin/commercants` sans flag | Dropdown "Type de compte" absent | ☐ |

---

## Phase 6 — Non-régression globale

| # | Cas de test | Action | Résultat attendu | Statut |
|---|-------------|--------|------------------|--------|
| 6.1 | Chatbot habitant | Naviguer dans la branche habitant complète | Aucune régression, toutes les réponses s'affichent | ☐ |
| 6.2 | Chatbot commerçant | Naviguer dans la branche commerçant complète | Aucune régression, toutes les réponses s'affichent | ☐ |
| 6.3 | FAQ — catégories existantes | Vérifier les 6 catégories historiques | Général, Compte, Offres, Fidélité clients, Commerçants, Données & Sécurité toujours présentes | ☐ |
| 6.4 | PDF affiche — commerçant standard | Commerce sans affiliation mairie/asso génère un PDF | PDF généré, aucun logo parasite, QR code intact | ☐ |
| 6.5 | Tableau de bord commerçant | Commerce standard ouvre son dashboard | Aucune section mairie/asso visible si non-membre | ☐ |
| 6.6 | Validation bon classique | Habitant utilise un bon d'offre individuelle | Validation OK, pas d'interférence avec le module mairie/asso | ☐ |
| 6.7 | Build `npm run build` | Lancer le build complet | Aucune erreur TypeScript ou de compilation | ☐ |
| 6.8 | Lint `npm run lint` | Lancer ESLint | Aucune erreur critique | ☐ |
| 6.9 | Tests unitaires `npm test` | Lancer Vitest | Tous les tests Lots 1-4B passent au vert | ☐ |
| 6.10 | Tests E2E `npm run test:e2e` | Lancer Playwright | Tests de non-régression passent | ☐ |

---

## Résumé de couverture

| Lot | Fonctionnalités testées | Tests |
|-----|------------------------|-------|
| 1 — Fondations | Flag, tables, colonnes, RLS | 8 |
| 2 — Membres | Invitation, acceptation, RPC | 8 |
| 3 — Offres collectives | Création, validation, filtres | 7 |
| 4A — Stats/Logo/Affiche | KPIs, upload, PDF | 14 |
| 4B — Légal/Chatbot/FAQ/Admin | CGV, confidentialité, CNIL, chatbot, FAQ, admin | 20 |
| 6 — Non-régression | Régression globale, build, tests | 10 |
| **Total** | | **67** |
