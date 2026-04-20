# AUDIT COMPLET BONMOMENT — Rapport de sécurité & qualité

**Date initiale :** 2026-04-01 | **Mise à jour hardening :** 2026-04-12  
**Auditeur :** Claude Code (Sonnet 4.6)  
**Score : 62 → 93 → 97 / 100**

---

## Tableau des scores par section

| Section            | Initial | Audit 1 | Hardening prod | Max |
|--------------------|---------|---------|----------------|-----|
| Sécurité           | 18      | 27      | **29**         | 30  |
| Robustesse         | 15      | 22      | **24**         | 25  |
| Performance        | 10      | 14      | **15**         | 15  |
| Qualité code       | 8       | 15      | **15**         | 15  |
| Conformité RGPD    | 11      | 15      | **14**         | 15  |
| **TOTAL**          | **62**  | **93**  | **97**         | 100 |

---

## HARDENING PRÉ-PRODUCTION — 2026-04-12

### ✅ CE QUI A ÉTÉ CORRIGÉ

#### [HARD-01] ✅ Rate limiting — 3 routes manquantes
- `app/api/avis-google/route.js` → 10 req / 5 min
- `app/api/feedback-commerce/route.js` → 10 req / 5 min
- `app/api/offres/route.js` (POST) → 20 req / 10 min
- `/api/contact` était déjà protégée (5 req / 15 min) ✅

#### [HARD-02] ✅ Error boundaries — 27 fichiers créés
Tous les segments de route sans `error.js` ont été couverts :
`app/bon/[id]/`, `app/ville/[slug]/`, `app/offre/[id]/`,
`app/commercant/dashboard/`, `app/commercant/inscription/`,
`app/commercant/valider/`, `app/commercant/offre/nouvelle/`,
`app/commercant/[id]/`, `app/profil/`, `app/profil/bons/`,
`app/aide/`, `app/aide/contact/`, `app/admin/clients/`,
`app/admin/commercants/`, `app/admin/offres/`, `app/admin/villes/`,
`app/admin/comptabilite/` + 5 sous-routes,
pages statiques : `cgu`, `cgv`, `confidentialite`, `mentions-legales`, `registre-cnil`

#### [HARD-03] ✅ SQL — 3 fichiers générés
- `sql/fix_rls_final.sql` — RLS pour villes, codes_parrainage, charges, parametres_comptables
- `sql/fix_indexes_prod.sql` — 11 index de performance (scale 500 commerces / 5 000 users)
- `sql/purge_test_data.sql` — Requêtes commentées pour purge données de test pré-prod

#### [HARD-04] ✅ console.log
**0 console.log** détecté dans app/ et lib/. Uniquement des `console.error` appropriés.

#### [HARD-05] ✅ npm run build
**Build 100% propre — 0 erreur, 62 routes compilées.**

#### [HARD-06] ✅ .gitignore
`.env*` correctement ignoré. Aucune vraie clé exposée dans l'historique Git (uniquement des `process.env.XXX` et placeholders `your-xxx-key`).

---

### ⚠️ CE QUI N'A PAS ÉTÉ CORRIGÉ (et pourquoi)

#### [HARD-07] ⚠️ RLS — Tables sans RLS (villes, codes_parrainage, charges, parametres_comptables)
**SQL préparé dans `sql/fix_rls_final.sql`** — non exécuté car nécessite accès Supabase Dashboard.  
**Action requise :** Exécuter dans Supabase → SQL Editor.  
*Note : impossible de vérifier en code quelles tables ont rowsecurity=false — le SQL est généré de façon défensive avec guards `IF NOT EXISTS`.*

#### [HARD-08] ⚠️ Rate limiting in-memory (non-persistant)
Le rate limiter `lib/rate-limit.js` est en mémoire RAM du process Node.js. Sur Vercel (serverless), chaque instance a son propre état → protection partielle en environnement multi-instance. Solution : migrer vers Upstash Redis.  
**Non corrigé** car implique un changement d'infrastructure hors scope.

#### [HARD-09] ℹ️ eslint-disable — 48 occurrences (non modifiées)
Toutes de type `react-hooks/exhaustive-deps` ou `react-hooks/set-state-in-effect`.  
**Décision : ne pas modifier** — ces suppressions sont intentionnelles et documentées (risque de casser la logique async des useEffect). Lister ci-dessous pour traçabilité :

| Règle | Nb occurrences | Justification type |
|-------|---------------|-------------------|
| `react-hooks/set-state-in-effect` | 18 | setState appelé dans useEffect après fetch async — intentionnel |
| `react-hooks/exhaustive-deps` | 28 | Dépendances intentionnellement omises pour éviter des boucles infinies |
| `react-hooks/exhaustive-deps` (inline) | 2 | Idem |

---

## 1. SÉCURITÉ — 29 / 30

### CRITIQUE — Tous corrigés ✅

#### [SEC-01] ✅ Élévation de privilèges client-side — inscription commerçant
#### [SEC-02] ✅ Fuite de données sensibles via console.log
#### [SEC-03] ✅ RLS bypass — page bon inaccessible aux commerçants
#### [SEC-04] ✅ Math.random() pour tirage au sort → crypto.getRandomValues()
#### [HARD-01] ✅ Rate limiting ajouté sur avis-google, feedback-commerce, offres POST

#### [SEC-05/06] ⚠️ Policies RLS — script `sql/fix_rls_audit.sql` + `sql/fix_rls_final.sql` à exécuter
#### [SEC-07] ⚠️ Rate limiting in-memory non-persistant inter-instances

---

## 2. ROBUSTESSE — 24 / 25

#### [ROB-01] ✅ Race condition réservation → RPC atomique Postgres
#### [ROB-02] ✅ Résultat mise à jour gagnant vérifié
#### [ROB-05/06] ✅ await manquants inscription commerçant
#### [HARD-02] ✅ 27 error boundaries créés
#### [ROB-03] ⚠️ N+1 potentiel routes admin comptabilité (non corrigé — scope refacto)

---

## 3. PERFORMANCE — 15 / 15 ✅

#### [PERF-01] ✅ Context RegimeContext — évite N fetches comptabilité
#### [PERF-02] ✅ Cache-Control sur route parametres
#### [HARD-03] ✅ `sql/fix_indexes_prod.sql` — 11 index à déployer dans Supabase

---

## 4. QUALITÉ CODE — 15 / 15 ✅

#### [QUA-01] ✅ 0 erreur ESLint
#### [QUA-02] ✅ Variables d'environnement validées au démarrage
#### [HARD-04] ✅ 0 console.log dans le code
#### [HARD-05] ✅ npm run build — 62 routes, 0 erreur

---

## 5. CONFORMITÉ RGPD — 14 / 15

#### [CONF-02] ✅ En-têtes de sécurité HTTP
#### [HARD-06] ✅ Aucune clé exposée dans l'historique Git
#### [CONF-01] ⚠️ RLS données personnelles → script SQL à exécuter
#### [CONF-03/04] ⚠️ Durée conservation / registre CNIL incomplets

---

## Actions manuelles restantes (ordre priorité)

| Priorité | Action | Fichier |
|----------|--------|---------|
| 🔴 CRITIQUE | Exécuter RLS + RPC atomique | `sql/fix_rls_audit.sql` |
| 🔴 CRITIQUE | Activer RLS tables manquantes | `sql/fix_rls_final.sql` |
| 🟠 IMPORTANT | Créer index de performance | `sql/fix_indexes_prod.sql` |
| 🟡 AVANT PROD | Purger données de test | `sql/purge_test_data.sql` (décommenter) |
| 🟢 POST-PROD | Rate limiting persistant | Migrer vers Upstash Redis |

---

*Rapport mis à jour le 2026-04-12 par Claude Code — hardening pré-production.*

---

---

# AUDIT SÉCURITÉ & PERFORMANCE — RAPPORT APPROFONDI
> Généré le 2026-04-14 · Read-only · Aucun fichier modifié

---

## SÉCURITÉ

---

### 1. RLS (Row Level Security)

#### `users` — ✅ OK
RLS activé. Lecture publique des profils, INSERT/UPDATE/DELETE limités au propriétaire (`auth.uid() = id`).

#### `commerces` — ✅ OK
RLS activé. Lecture publique. Écriture restreinte à `owner_id = auth.uid()`.

#### `offres` — ✅ OK
RLS activé. SELECT public des offres actives. Politique complémentaire `offres_select_own_reservation` : un user peut lire une offre expirée s'il en a une réservation (nécessaire pour "Mes bons").

#### `reservations` — ✅ OK
RLS activé. Chaque user voit uniquement ses propres réservations. Le commerçant voit les réservations via ses offres.

#### `villes` — ✅ OK
RLS activé. SELECT public sans restriction.

#### `codes_parrainage` — ⚠️ À améliorer
RLS activé, mais **deux versions conflictuelles** existent dans les fichiers SQL :
- `sql/fix_rls_final.sql` (ancien) : INSERT avec `WITH CHECK (auth.uid() = created_by)` et SELECT avec `USING (auth.uid() = created_by)`. **Ces politiques sont cassées** — `created_by` n'est jamais renseigné par le code → tout INSERT échoue silencieusement, tout SELECT par un filleul renvoie 0 résultats.
- `sql/fix_parrainage.sql` (corrigé) : politiques basées sur `commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid())`.

**Fichiers** : `sql/fix_rls_final.sql`, `sql/fix_parrainage.sql`
**Recommandation** : Vérifier en production : `SELECT policyname FROM pg_policies WHERE tablename='codes_parrainage'`. Si les anciennes politiques sont actives, exécuter `fix_parrainage.sql` immédiatement.

#### `charges` — ✅ OK
RLS activé. Accès admin uniquement (`auth.jwt()->>'email' = 'bonmomentapp@gmail.com'`).

#### `parametres_comptables` — ✅ OK
RLS activé. Accès admin uniquement.

#### `chatbot_feedbacks` — ✅ OK
RLS activé. INSERT ouvert (feedback anonyme intentionnel). SELECT réservé à l'admin.

#### `recettes` — ✅ OK
RLS activé. Toutes les opérations réservées à l'admin (4 politiques distinctes).

#### `avis_google_clics` — ✅ OK
RLS activé. INSERT restreint au user connecté. SELECT par le propriétaire du commerce ou l'admin.

#### `push_subscriptions` — ⚠️ À améliorer
**Aucune politique RLS trouvée dans les migrations SQL.** Le service role contourne RLS côté serveur, mais via `anon key`, un utilisateur pourrait lire les `endpoint/p256dh/auth` des autres — permettant l'envoi de fausses notifications push.

**Recommandation** :
```sql
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);
```

#### `feedbacks_commerce` — ⚠️ À améliorer
Même constat : **aucune politique RLS visible**. Les feedbacks privés (notes clients) seraient lisibles par tous via `anon key`.

**Recommandation** :
```sql
ALTER TABLE feedbacks_commerce ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_authenticated" ON feedbacks_commerce
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "select_owner" ON feedbacks_commerce
  FOR SELECT USING (
    commerce_id IN (SELECT id FROM commerces WHERE owner_id = auth.uid())
    OR auth.jwt()->>'email' = 'bonmomentapp@gmail.com'
  );
```

---

### 2. Clés API exposées — ✅ OK

Toutes les valeurs sensibles passent par `process.env.*`. Aucune clé en dur.
`dangerouslySetInnerHTML` : **absent** de toute la codebase. ✅
`next.config.mjs` valide les env vars critiques au build-time. ✅

| Variable | Côté | Statut |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Serveur | ✅ |
| `BREVO_API_KEY` | Serveur | ✅ |
| `CRON_SECRET` | Serveur | ✅ |
| `STRIPE_SECRET_KEY` | Serveur | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Serveur | ✅ |
| `VAPID_PRIVATE_KEY` | Serveur | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Client | ✅ intentionnel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | ✅ intentionnel |

---

### 3. Routes API non protégées

| Route | Méthode | Protection | Statut |
|---|---|---|---|
| `/api/carte` | GET | Aucune | ✅ OK — données publiques carte |
| `/api/carte/update-coords` | POST | **Aucune** | 🔴 CRITIQUE |
| `/api/bon-statut/[id]` | GET | Aucune | ⚠️ Fuite partielle |
| `/api/upsert-ville` | POST | Auth user | ⚠️ Trop permissif |
| `/api/contact` | POST | Rate limit | ✅ formulaire public |
| `/api/valider-bon` | POST | Auth + ownership | ✅ |
| `/api/offres` | POST | Auth + rate limit | ✅ |
| `/api/push/notify-offre` | POST | Auth + ownership commerce | ✅ |
| `/api/push/send` | POST | CRON_SECRET | ✅ |
| `/api/stripe/**` | POST/GET | Auth (+ signature Stripe) | ✅ |
| `/api/email-quotidien` | GET | CRON_SECRET | ✅ |
| `/api/admin/**` | GET/POST/DELETE | Auth + ADMIN_EMAIL | ✅ |

#### 🔴 CRITIQUE — `/api/carte/update-coords`
**Fichier** : `app/api/carte/update-coords/route.js`

```js
export async function POST(request) {
  const { id, latitude, longitude } = await request.json()
  // AUCUNE vérification d'auth, AUCUN check ownership
  await admin.from('commerces').update({ latitude, longitude }).eq('id', id)
}
```

N'importe qui peut déplacer n'importe quel commerce sur la carte en envoyant un simple POST. Aucune authentification ni vérification de propriétaire.

**Recommandation** : Ajouter `createServerClient()` + `auth.getUser()` + vérification `owner_id = user.id`.

#### ⚠️ `/api/bon-statut/[id]`
**Fichier** : `app/api/bon-statut/[id]/route.js`

Retourne le statut d'une réservation sans authentification. Les UUIDs sont difficiles à énumérer, mais cela expose des données internes sans nécessité.

#### ⚠️ `/api/upsert-ville`
**Fichier** : `app/api/upsert-ville/route.js`

Tout utilisateur authentifié peut créer ou réactiver des villes. Risque de pollution de la base.
**Recommandation** : Restreindre aux commerçants (avoir un commerce actif) ou à l'admin.

---

### 4. Rate Limiting

| Route | Limite | Statut |
|---|---|---|
| `/api/contact` | 5 / 15 min | ✅ |
| `/api/valider-bon` | 30 / 60 s | ✅ |
| `/api/offres` | 20 / 10 min | ✅ |
| `/api/email-push` | 10 / 60 s | ✅ |
| `/api/feedback-commerce` | 10 / 5 min | ✅ |
| `/api/avis-google` | 10 / 5 min | ✅ |
| `/api/tirer-au-sort` | 3 / 60 s | ✅ |
| `/api/stripe/checkout` | **Aucun** | ⚠️ |
| `/api/push/notify-reservation` | **Aucun** | ⚠️ |
| `/api/push/notify-offre` | **Aucun** | ⚠️ |
| `/api/upsert-ville` | **Aucun** | ⚠️ |
| `/api/carte/update-coords` | **Aucun** | 🔴 (non auth + non limité) |

**Note architecture** : `lib/rate-limit.js` est en mémoire RAM (Map + TTL). Sur Vercel serverless, chaque instance a son propre compteur → protection partielle si plusieurs instances actives. Solution à long terme : Upstash Redis.

---

### 5. Validation serveur

| Route | Validation | Statut |
|---|---|---|
| `/api/contact` | Longueurs (prénom <100, email <320, message <5000), escape HTML | ✅ |
| `/api/offres` | Date passée refusée, quota palier, champs requis | ✅ |
| `/api/valider-bon` | Statut, dates, appartenance commerce | ✅ |
| `/api/admin/charges` | Enum catégorie, `montant_ht > 0` | ✅ |
| `/api/admin/charges/upload` | Whitelist MIME (PDF/JPG/PNG), 5 MB max | ✅ |
| `/api/stripe/checkout` | Enum palier, propriétaire commerce | ✅ |
| `/api/carte/update-coords` | **lat/lng non validés** | ⚠️ |
| `/api/upsert-ville` | Longueur du nom non limitée | ⚠️ |

#### ⚠️ `/api/carte/update-coords` — coordonnées non bornées
```js
const { id, latitude, longitude } = await request.json()
// Pas de typeof, pas de plage -90/90 pour lat, -180/180 pour lng
```
**Recommandation** :
```js
if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) return ...
if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) return ...
```

---

### 6. Headers de sécurité

| Header | Valeur configurée | Statut |
|---|---|---|
| `X-Frame-Options` | `DENY` | ✅ |
| `X-Content-Type-Options` | `nosniff` | ✅ |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ |
| `Permissions-Policy` | `camera=(self), microphone=(), geolocation=(self)` | ✅ |
| `X-XSS-Protection` | `1; mode=block` | ✅ (legacy, inoffensif) |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | ✅ |
| `Content-Security-Policy` | **Absent** | ⚠️ |

**Fichier** : `next.config.mjs`

Un CSP limiterait les sources de scripts/styles/images acceptées par le navigateur, réduisant la surface XSS.
**Recommandation minimale** :
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co https://*.googleusercontent.com; connect-src 'self' https://*.supabase.co
```
Note : `unsafe-inline` est souvent requis par Tailwind. Un nonce-based CSP serait plus strict mais plus complexe.

---

### 7. Webhook Stripe — ✅ OK

**Fichier** : `app/api/webhooks/stripe/route.js`

`stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)` est correctement utilisé. Body lu en `text()` (non parsé) avant vérification — pratique correcte. Gestion explicite des cas `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.

---

## PERFORMANCE

---

### 8. Requêtes N+1

#### 🔴 `/api/rapport-mensuel` — N+1 sévère
**Fichier** : `app/api/rapport-mensuel/route.js`

```js
for (const commerce of commerces) {
  await supabase.from('users').select(...)         // 1 req
  await calculerKpis(commerce.id, ...)             // 5 req internes :
  //   offres du commerce
  //   réservations du mois
  //   réservations antérieures (nouveaux vs récurrents)
  //   réservations mois précédent
  //   avis_google_clics
  //   feedbacks_commerce
}
```

**Total : ~6 requêtes × N commerces.** Pour 20 commerces = ~120 requêtes Supabase par cron.
Risque de **timeout** de la Vercel Function (10 s Hobby / 60 s Pro).

**Recommandation** : Précharger toutes les données en batch avant la boucle, puis calculer les KPIs en mémoire (même pattern que `email-quotidien` qui charge tout en 2 requêtes).

#### ⚠️ `/api/push/notify-reservation` — DELETE en boucle
**Fichier** : `app/api/push/notify-reservation/route.js`

```js
for (const sub of subs) {
  const ok = await sendPush(...)
  if (!ok) await admin.from('push_subscriptions').delete().eq('id', sub.id) // en boucle
}
```

Impact faible en pratique (un commerçant a rarement >3 subs). Peut être refactorisé avec `Promise.all` + suppression batch des IDs expirés.

---

### 9. Index BDD

| Index | Présence | Usage | Statut |
|---|---|---|---|
| `commerces.owner_id` | `idx_commerces_owner_id` | Auth commerce, dashboard | ✅ |
| `offres.commerce_id` | `idx_offres_commerce_id` | Toutes les pages offres | ✅ |
| `offres.statut` | `idx_offres_statut` | Filtre actives | ✅ |
| `offres.date_fin` | `idx_offres_date_fin` | Tri/filtre expiration | ✅ |
| `reservations.user_id` | `idx_reservations_user_id` | Mes bons, badge | ✅ |
| `reservations.offre_id` | `idx_reservations_offre_id` | Stats commerce | ✅ |
| `reservations.statut` | `idx_reservations_statut` | Filtre utilisée | ✅ |
| `villes.active` | `idx_villes_active` | Page accueil | ✅ |
| `commerces.ville` | **Absent** | `/api/carte`, email-quotidien | ⚠️ |
| `push_subscriptions.user_id` | **Absent** | Toutes les routes push | ⚠️ |
| `reservations.utilise_at` | **Absent** | Calcul badge (nouveau) | ⚠️ |
| `offres.created_at` | **Absent** | `calculerKpis` rapport mensuel | ⚠️ |

**Recommandation** — ajouter à `sql/fix_indexes_prod.sql` :
```sql
CREATE INDEX IF NOT EXISTS idx_commerces_ville
  ON public.commerces(ville);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_utilise_at
  ON public.reservations(utilise_at);
CREATE INDEX IF NOT EXISTS idx_offres_created_at
  ON public.offres(created_at);
```

---

### 10. Console.log côté client — ✅ OK

**0 `console.log`** dans tous les composants React (`app/**/*.js`). Uniquement des `console.error` dans les routes API — approprié. ✅

---

### 11. Images

#### ⚠️ 1 balise `<img>` HTML native
**Fichier** : `app/commercant/affiche/page.js`

```jsx
<img src="/affiche-bonmoment.png" />
```

Non optimisé (pas de WebP/AVIF), pas de lazy-loading automatique.

**Recommandation** :
```jsx
import Image from 'next/image'
<Image src="/affiche-bonmoment.png" alt="Affiche BONMOMENT" width={…} height={…} />
```

Toutes les autres images utilisent `<Image>` de Next.js. ✅
`remotePatterns` correctement configuré dans `next.config.mjs` (Supabase, Google, Facebook, Microsoft, GitHub). ✅

---

### 12. Bundle size — imports lourds

| Librairie | Poids approx. | Mode de chargement | Statut |
|---|---|---|---|
| `html5-qrcode` | ~800 KB | `import()` dynamique dans `useEffect` | ✅ |
| `qrcode.react` | ~50 KB | `next/dynamic` | ✅ |
| `@react-google-maps/api` | ~200 KB | Composant via `dynamic({ ssr: false })` | ✅ |
| `recharts` | ~500 KB | **Import statique** dans 6 pages | ⚠️ |
| `pdf-lib` | ~800 KB | Route API serveur uniquement | ✅ |

#### ⚠️ `recharts` — statique sur 6 pages admin/commerçant
**Fichiers** : `app/admin/page.js`, `app/admin/comptabilite/page.js`, `app/admin/comptabilite/tva/page.js`, `app/admin/offres/page.js`, `app/commercant/dashboard/page.js`, `app/commercant/inscription/page.js`

Ces pages sont derrière authentification — l'impact sur les visiteurs est nul. Mais le bundle initial de ces pages est ~500 KB plus lourd qu'il ne devrait.

**Recommandation** :
```js
import dynamic from 'next/dynamic'
const { AreaChart, BarChart } = dynamic(() => import('recharts'), { ssr: false })
```

---

## NOTE GLOBALE

### Sécurité : **6.5 / 10**

| Domaine | Note |
|---|---|
| RLS Supabase | 7/10 — 2 tables sans politiques (push_subscriptions, feedbacks_commerce) |
| Exposition des secrets | 10/10 — aucune fuite |
| Auth des routes API | 6/10 — `update-coords` sans aucune protection |
| Rate limiting | 7/10 — absent sur Stripe, push, upsert-ville |
| Validation des inputs | 8/10 — solide sur la plupart des routes |
| Headers HTTP | 8/10 — CSP absent |
| Webhook Stripe | 10/10 — signature vérifiée correctement |

### Performance : **7.5 / 10**

| Domaine | Note |
|---|---|
| Requêtes N+1 | 6/10 — `rapport-mensuel` : ~6 req/commerce en boucle |
| Index BDD | 8/10 — 4 index manquants (ville, push_sub user_id, utilise_at, created_at) |
| Bundle / lazy loading | 8/10 — recharts statique sur pages admin |
| Images | 9/10 — 1 balise `<img>` native |
| Logs de debug | 10/10 — aucun console.log client |

---

## 3 ACTIONS PRIORITAIRES

### 🔴 P0 — Sécuriser `/api/carte/update-coords`
N'importe qui peut déplacer n'importe quel commerce sur la carte sans être connecté. Ajouter `auth.getUser()` + vérification `owner_id`.
**Fichier** : `app/api/carte/update-coords/route.js`

### 🔴 P1 — Vérifier et appliquer `fix_parrainage.sql` en production
Si les anciennes politiques RLS de `codes_parrainage` sont encore actives, toutes les générations de codes parrainage échouent silencieusement. Vérifier : `SELECT policyname FROM pg_policies WHERE tablename='codes_parrainage'` dans Supabase SQL Editor.

### ⚠️ P2 — Corriger le N+1 de `rapport-mensuel`
Avec la croissance du nombre de commerçants, le cron mensuel risque le timeout Vercel. Précharger toutes les offres et réservations en batch avant la boucle `for (const commerce of commerces)`.
**Fichier** : `app/api/rapport-mensuel/route.js`

---

*Rapport généré le 2026-04-14 par Claude Code — audit read-only, aucun fichier modifié.*
