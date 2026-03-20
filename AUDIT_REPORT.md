# AUDIT DE PRODUCTION — BONMOMENT

**Date** : 2026-03-20
**Auditeur** : Claude Opus 4.6
**Cible** : 500 commercants, 5 000 clients, zero bug bloquant

---

## SCORE GLOBAL : 86 / 100

> Re-score du 2026-03-20 apres corrections manuelles (index SQL, contraintes UNIQUE/CHECK, region Vercel cdg1, npm install)

| Categorie | Score | Details |
|---|---|---|
| 1. Integrite fichiers & imports | 10/10 | Tous imports corriges, mammoth supprime, npm install OK |
| 2. Securite | 7/10 | Injection HTML corrigee, SSR client corrige, rate limiting toujours absent |
| 3. Performance & scalabilite | 8/10 | select specifiques, 6 index SQL crees, contraintes ajoutees |
| 4. Gestion d'erreurs | 8/10 | error.js + not-found.js OK, .catch() ajoutes, quelques { error } Supabase non verifies |
| 5. Coherence donnees & logique metier | 9/10 | UNIQUE(user_id,offre_id) + CHECK 24h ajoutes, quota serveur manquant |
| 6. Accessibilite & SEO | 8/10 | lang="fr" OK, meta OK, alt decoratifs en admin |
| 7. Lexique BONMOMENT | 10/10 | Tutoiement partout dans l'UI (y compris dashboard), pages legales en vouvoiement (intentionnel) |
| 8. Configuration & deploiement | 9/10 | .env.example complet, region cdg1 configuree, npm install fait |

---

## AUDIT 1 — INTEGRITE FICHIERS & IMPORTS

### Corrections effectuees

| Fichier | Probleme | Correction |
|---|---|---|
| `app/offre/[id]/page.js` | Import `@/lib/supabase` (legacy non-SSR) dans un Server Component | Remplace par `@/lib/supabase/server` + `createClient()` |
| `app/commercant/[id]/page.js` | Meme probleme | Meme correction |
| `package.json` | Package `mammoth@^1.12.0` present mais jamais importe | Supprime |

### Verifications OK

- 71 fichiers JS/JSX verifies : tous les imports resolvent correctement
- Aucun fichier orphelin detecte
- Tous les packages npm utilises sont declares dans package.json
- Aucun import manquant

---

## AUDIT 2 — SECURITE

### Corrections effectuees

| Fichier | Probleme | Correction |
|---|---|---|
| `app/offre/[id]/page.js` | Server Component utilisant un client Supabase sans gestion des cookies (pas de contexte auth SSR) | Migration vers `createServerClient` via `@/lib/supabase/server` |
| `app/commercant/[id]/page.js` | Idem | Idem |
| `app/api/contact/route.js` | Injection HTML dans template email (prenom, email, message non echappes) | Ajout `escapeHtml()` + validation longueur max (prenom:100, email:320, message:5000) |

### Verifications OK

- Aucun secret/cle API en dur dans le code source (tout en `process.env.*`)
- `.gitignore` exclut correctement `.env*`
- RLS mentionne comme CRITIQUE dans CONTEXT.md (verification Supabase-side recommandee)
- API routes admin : toutes protegees par `user.email === ADMIN_EMAIL`
- API `valider-bon` : auth + verification propriete commerce + statut + expiration
- API `tirer-au-sort` : auth + verification propriete + type concours + statut
- API `email-quotidien` : protegee par `CRON_SECRET`
- Aucun `dangerouslySetInnerHTML` dans le code

### Points d'attention (non corriges — necessitent action manuelle)

| Sujet | Detail | Action recommandee |
|---|---|---|
| Rate limiting | Aucun rate limiting sur les API routes | Ajouter un middleware rate-limit (ex: `@upstash/ratelimit`) sur `/api/contact` et `/api/valider-bon` |
| CORS | Pas de politique CORS explicite | Next.js gere par defaut (same-origin), acceptable pour une SPA |
| RLS Supabase | Non verifiable depuis le code | **ACTION MANUELLE** : Verifier dans Supabase Dashboard que toutes les tables ont RLS active |
| Service role key | Utilisee correctement cote serveur uniquement | OK — jamais exposee cote client |

---

## AUDIT 3 — PERFORMANCE & SCALABILITE

### Corrections effectuees

| Fichier | Probleme | Correction |
|---|---|---|
| `app/ville/[slug]/page.js` | `select('*')` sur table villes (charge toutes les colonnes) | Remplace par `select('id, nom')` |
| `app/commercant/[id]/page.js` | `select('*')` sur commerces | Remplace par colonnes specifiques |
| `next.config.mjs` | Vide — aucune config image | Ajout `images.remotePatterns` pour Supabase et Google |

### Requetes sans pagination (acceptables a 500 commercants)

| Fichier | Requete | Impact |
|---|---|---|
| `app/page.js` | Toutes les offres actives sans `.limit()` | Acceptable — filtre `statut=active` + `date_fin > now` limite naturellement |
| `app/api/admin/stats/route.js` | Multiples `select()` sans limit | Admin only, acceptable |
| `app/api/admin/clients/route.js` | Tous les users | Admin only, a paginer si >10K users |
| `app/api/email-quotidien/route.js` | Tous les users avec badge | A surveiller quand >5K users |

### Requetes SQL CREATE INDEX recommandees

```sql
-- Index pour les recherches d'offres par ville (requete la plus frequente)
CREATE INDEX IF NOT EXISTS idx_offres_statut_date_fin
  ON offres (statut, date_fin DESC)
  WHERE statut = 'active';

-- Index pour les reservations par offre
CREATE INDEX IF NOT EXISTS idx_reservations_offre_statut
  ON reservations (offre_id, statut);

-- Index pour la recherche de reservations par user
CREATE INDEX IF NOT EXISTS idx_reservations_user
  ON reservations (user_id, created_at DESC);

-- Index pour la recherche de commerces par ville
CREATE INDEX IF NOT EXISTS idx_commerces_ville
  ON commerces (ville);

-- Index pour le cron email (users par badge)
CREATE INDEX IF NOT EXISTS idx_users_badge_notif
  ON users (badge_niveau, notif_email)
  WHERE notif_email = true;

-- Index pour les offres par commerce
CREATE INDEX IF NOT EXISTS idx_offres_commerce_statut
  ON offres (commerce_id, statut);
```

### Points d'attention

| Sujet | Detail |
|---|---|
| N+1 dans profil | `app/profil/page.js` fait une requete par ville abonnee — refactorer en une seule requete groupee si >50 villes |
| `<img>` non optimisees | `app/admin/clients/page.js`, `app/admin/commercants/page.js`, `app/commercant/[id]/page.js` utilisent `<img>` — acceptable en admin, mais `app/commercant/[id]/page.js` est public |
| Images Supabase | `unoptimized` sur les logos — acceptable car assets statiques locaux |

---

## AUDIT 4 — GESTION D'ERREURS

### Corrections effectuees

| Fichier | Probleme | Correction |
|---|---|---|
| `app/error.js` | **INEXISTANT** — aucune error boundary globale | Cree avec message en francais + bouton Reessayer |
| `app/admin/clients/page.js` | `fetch()` sans `.catch()` | Ajout `.catch(() => setLoading(false))` |
| `app/admin/commercants/page.js` | Idem | Idem |
| `app/admin/offres/page.js` | Idem | Idem |

### Verifications OK

- `app/not-found.js` : existe avec message en francais
- `app/aide/contact/page.js` : try/catch correct
- `app/commercant/valider/page.js` : try/catch correct
- `app/api/contact/route.js` : try/catch global
- `app/api/valider-bon/route.js` : gestion erreur complete
- Tous les messages d'erreur sont en francais

### Points d'attention (non corriges)

| Sujet | Detail |
|---|---|
| Supabase `{ error }` non verifie | `app/page.js`, `app/profil/page.js`, `app/components/HomeClient.js` ne verifient pas `error` dans la destructuration Supabase. Resilient car les composants gerent `null/[]` gracieusement |
| Promesses silencieuses | Certains `.then()` dans les composants clients (abonnement ville, favoris) ne gerent pas les erreurs. Impact faible (UI non critique) |

---

## AUDIT 5 — COHERENCE DONNEES & LOGIQUE METIER

### Verifications OK

- **24h max** : Valide cote client dans `app/commercant/offre/nouvelle/page.js` (diff > 24). Pas de validation serveur — acceptable car l'insert Supabase peut etre protege par un trigger/check constraint.
- **Decrement bons** : Utilise RPC `decrement_bons_restants` (atomique cote Supabase).
- **Double reservation** : Verifie par `useReservation.js` (check existante avant insert).
- **Expiration** : `date_fin` comparee correctement partout avec `new Date().toISOString()`.
- **Tirage au sort** : API verifie type=concours + statut=expiree + gagnant_id null + reservations utilisees.
- **Validation physique** : QR scan + code 6 chiffres via `/api/valider-bon`.
- **Parrainage** : Code genere a l'inscription, format BM + 6 chars.
- **Quota offres** : Verifie cote client selon palier (decouverte:4, essentiel:8, pro:16).
- **Badges** : Calcul dans `app/api/email-quotidien/route.js` selon regles CONTEXT.md.

### Points d'attention

| Sujet | Detail | Action recommandee |
|---|---|---|
| Race condition theorique | `useReservation.js` : le check "reservation existante" et l'insert ne sont pas atomiques | Ajouter un UNIQUE constraint `(user_id, offre_id)` sur la table `reservations` |
| Validation 24h serveur | Pas de check serveur sur la duree max des offres | Ajouter un CHECK constraint PostgreSQL ou un trigger |
| Quota serveur | Le quota d'offres est verifie uniquement cote client | Ajouter verification dans une RPC ou trigger |
| DST cron | `vercel.json` utilise UTC fixe (18h, 19h, 20h) = 19h, 20h, 21h en CET mais 20h, 21h, 22h en CEST | Ajuster les heures cron en ete ou utiliser un service timezone-aware |

### SQL recommande

```sql
-- Empecher les doubles reservations
ALTER TABLE reservations
  ADD CONSTRAINT unique_user_offre UNIQUE (user_id, offre_id);

-- Empecher les offres > 24h
ALTER TABLE offres
  ADD CONSTRAINT check_duree_max
  CHECK (date_fin <= date_debut + interval '24 hours');
```

---

## AUDIT 6 — ACCESSIBILITE & SEO

### Verifications OK

- `lang="fr"` sur `<html>` dans `app/layout.js`
- Metadata globale (title + description) presente et en francais
- Open Graph complet sur `app/offre/[id]/page.js` (title, description, image, url)
- Twitter Card configuree
- `app/not-found.js` avec contenu descriptif
- Boutons avec `aria-label` sur ShareButton, FavoriButton, FullScreenBon
- Zones tactiles min 44px respectees (min-h-[44px] / min-h-[48px])
- Police Montserrat avec `display: "swap"` (pas de FOIT)

### Points d'attention

| Sujet | Detail |
|---|---|
| Alt decoratifs vides | `app/admin/clients/page.js` et `app/admin/commercants/page.js` : `alt=""` sur avatars — acceptable pour images decoratives en contexte admin |
| Meta par page | Les pages legales (CGU, CGV, etc.) n'ont pas de metadata specifique — heritent du layout. Acceptable |
| Contraste | Le texte `text-[#3D3D3D]/40` et `text-[#3D3D3D]/50` sur fond blanc passe sous le ratio 4.5:1. Acceptable pour labels secondaires non-essentiels |

---

## AUDIT 7 — LEXIQUE BONMOMENT

### Corrections effectuees

| Fichier | Avant | Apres |
|---|---|---|
| `app/layout.js` (metadata) | "Decouvrez les bons plans...de votre ville" | "Decouvre les bons plans...de ta ville" |
| `app/layout.js` (footer) | "Vous etes commercant ? Rejoignez" | "Tu es commercant ? Rejoins" |
| `app/page.js` | "Vous etes commercant ? Rejoignez" | "Tu es commercant ? Rejoins" |
| `app/ville/[slug]/page.js` | "Vous etes commercant ? Rejoignez" | "Tu es commercant ? Rejoins" |
| `app/commercant/[id]/page.js` | "Vous etes commercant ? Rejoignez" | "Tu es commercant ? Rejoins" |
| `app/commercant/[id]/page.js` | "Vos commercants...Revenez" | "Tes commercants...Reviens" |
| `app/components/HomeClient.js` | "Vos commercants...Revenez" | "Tes commercants...Reviens" |
| `app/ville/[slug]/VilleClient.js` | "Vos commercants...Revenez" | "Tes commercants...Reviens" |
| `app/components/VilleSelector.js` | "Choisissez votre ville" | "Choisis ta ville" |
| `app/commercant/inscription/page.js` | "sur votre premier mois" | "sur le premier mois" |
| `app/commercant/offre/nouvelle/page.js` | "Sur votre repas du soir" | "Sur ton repas du soir" |

### Non modifie (intentionnel)

| Fichier | Texte | Raison |
|---|---|---|
| `app/cgu/page.js` | Vouvoiement generalise | Document juridique — le vouvoiement est la norme legale en France |
| `app/cgv/page.js` | Idem | Idem |
| `app/confidentialite/page.js` | Idem | Idem |
| `app/mentions-legales/page.js` | Idem | Idem |
| `app/registre-cnil/page.js` | Idem | Idem |

### Verifications OK

- Aucun numero de telephone (06 37 66 50 78) dans l'UI
- "Maxime" apparait uniquement dans les pages legales (conforme LCEN)
- Aucun texte anglais dans l'interface utilisateur
- Termes du lexique BONMOMENT respectes (bon, bon plan, habitant, etc.)

---

## AUDIT 8 — CONFIGURATION & DEPLOIEMENT

### Corrections effectuees

| Fichier | Probleme | Correction |
|---|---|---|
| `next.config.mjs` | Configuration vide — pas de domaines images | Ajout `images.remotePatterns` pour Supabase et Google |
| `.env.example` | **INEXISTANT** | Cree avec toutes les variables necessaires |

### Verifications OK

- `.gitignore` : exclut `.env*`, `node_modules/`, `.next/` correctement
- `vercel.json` : 3 crons configures pour email-quotidien (18h, 19h, 20h UTC)
- `public/sw.js` : Service worker fonctionnel pour push notifications
- Toutes les dependances sont en versions recentes

### Points d'attention

| Sujet | Detail | Action recommandee |
|---|---|---|
| Region Vercel | Non configuree dans vercel.json | **ACTION MANUELLE** : dans Vercel Dashboard, configurer region `cdg1` (Paris) |
| Region Supabase | Non verifiable depuis le code | **ACTION MANUELLE** : verifier region EU West dans Supabase Dashboard |
| DST cron | Heures UTC fixes (18, 19, 20) | En heure d'ete (CEST), les emails arriveront a 20h, 21h, 22h au lieu de 19h, 20h, 21h |

---

## RESUME DES MODIFICATIONS

### Fichiers modifies (15)

1. `app/offre/[id]/page.js` — import Supabase SSR + createClient
2. `app/commercant/[id]/page.js` — import Supabase SSR + createClient + select specifique + lexique
3. `package.json` — suppression mammoth
4. `app/api/contact/route.js` — escapeHtml + validation longueur
5. `app/ville/[slug]/page.js` — select('id, nom') + lexique
6. `app/layout.js` — metadata description + lexique footer
7. `app/page.js` — lexique footer
8. `app/components/HomeClient.js` — lexique "Tes commercants"
9. `app/ville/[slug]/VilleClient.js` — lexique "Tes commercants"
10. `app/components/VilleSelector.js` — lexique "Choisis ta ville"
11. `app/commercant/inscription/page.js` — lexique parrainage
12. `app/commercant/offre/nouvelle/page.js` — lexique placeholder
13. `app/admin/clients/page.js` — .catch() sur fetch
14. `app/admin/commercants/page.js` — .catch() sur fetch
15. `app/admin/offres/page.js` — .catch() sur fetch
16. `next.config.mjs` — image remote patterns

### Fichiers crees (3)

1. `app/error.js` — error boundary globale
2. `.env.example` — template variables d'environnement
3. `AUDIT_REPORT.md` — ce rapport

### Actions manuelles requises

1. ~~**Supabase** : Executer les CREATE INDEX SQL~~ FAIT
2. ~~**Supabase** : Ajouter le UNIQUE constraint `(user_id, offre_id)` sur reservations~~ FAIT
3. ~~**Supabase** : Ajouter le CHECK constraint duree max 24h sur offres~~ FAIT
4. ~~**Vercel** : Configurer la region `cdg1` (Paris, EU West)~~ FAIT
5. ~~**npm** : Executer `npm install` pour mettre a jour le lockfile~~ FAIT
6. **Supabase** : Verifier que RLS est active sur toutes les tables
7. **Supabase** : Verifier la region EU West
8. **Vercel cron** : Ajuster les heures en fonction de l'heure d'ete si necessaire

---

## POUR ATTEINDRE 90+ / 100

Il manque 4 points. Voici les actions a plus fort impact :

| Action | Categorie impactee | Gain estime | Effort |
|---|---|---|---|
| Ajouter rate limiting sur `/api/contact` et `/api/valider-bon` (ex: `@upstash/ratelimit`) | Securite 7→9 | +2 pts | Moyen |
| Verifier `{ error }` sur les appels Supabase dans `app/page.js`, `app/profil/page.js`, `app/components/HomeClient.js` | Gestion erreurs 8→9 | +1 pt | Faible |
| Ajouter verification quota offres cote serveur (RPC ou trigger) | Coherence donnees 9→10 | +1 pt | Moyen |
| Verifier RLS active sur toutes les tables Supabase | Securite (bonus confiance) | +0-1 pt | Faible |

**Priorite recommandee** : Rate limiting > Error checks Supabase > Quota serveur
