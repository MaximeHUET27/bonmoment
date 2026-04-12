/**
 * Arbre de navigation du chatbot BONMOMENT Assist
 * Mode organigramme strict — boutons cliquables uniquement.
 *
 * Types de nœuds :
 *   'menu'   → liste de boutons de navigation
 *   'answer' → réponse texte + boutons d'action optionnels
 */

/* ── Actions ─────────────────────────────────────────────────────────────── */
// type: 'redirect'  → ferme chatbot + router.push(path)
// type: 'external'  → window.open(url, '_blank')
// type: 'event'     → window.dispatchEvent(new Event(event))

/* ── Nœuds ───────────────────────────────────────────────────────────────── */

export const NODES = {

  /* ── Racine ── */
  root: {
    type: 'menu',
    message: "👋 Salut ! Comment puis-je t'aider ?",
    options: [
      { label: '🏠 Je suis habitant',     nodeId: 'h-cat' },
      { label: '🏪 Je suis commerçant',   nodeId: 'c-cat' },
    ],
  },

  /* ════════════════════════════════════════════════════════════════════════
     HABITANT — Catégories
  ════════════════════════════════════════════════════════════════════════ */

  'h-cat': {
    type: 'menu',
    message: "Dans quelle catégorie se trouve ta question ?",
    options: [
      { label: '🔍 Découvrir BONMOMENT',          nodeId: 'h-decouvrir' },
      { label: '🎟️ Réserver et utiliser un bon',  nodeId: 'h-reserver' },
      { label: '📍 Villes et abonnements',         nodeId: 'h-villes' },
      { label: '⚙️ Mon compte',                    nodeId: 'h-compte' },
      { label: '🔧 Un problème ?',                 nodeId: 'h-probleme' },
      { label: '📋 Informations légales',          nodeId: 'h-legal' },
    ],
  },

  /* ── Découvrir BONMOMENT ── */

  'h-decouvrir': {
    type: 'menu',
    message: "Sur quel sujet ?",
    options: [
      { label: "Qu'est-ce que BONMOMENT ?",          nodeId: 'h-dec-1' },
      { label: "Comment ça marche ?",                 nodeId: 'h-dec-2' },
      { label: "C'est gratuit ?",                     nodeId: 'h-dec-3' },
      { label: "Comment m'inscrire ?",                nodeId: 'h-dec-4' },
      { label: "Que sont les badges ?",               nodeId: 'h-dec-5' },
    ],
  },

  'h-dec-1': {
    type: 'answer',
    question: "Qu'est-ce que BONMOMENT ?",
    response: `BONMOMENT connecte les habitants aux commerces de leur quartier. 🏘️\n\nLes commerçants publient des offres exclusives (remises, cadeaux, évènements, concours…) et les habitants les réservent gratuitement.\n\nC'est un cercle vertueux : le commerce de proximité se développe, et les habitants profitent d'avantages réels en magasin.`,
  },

  'h-dec-2': {
    type: 'answer',
    question: "Comment ça marche ?",
    response: `C'est simple en 3 étapes :\n\n1️⃣ **Choisis une offre** dans ta ville (remise, cadeau, évènement…)\n2️⃣ **Réserve gratuitement** — ton bon est activé immédiatement\n3️⃣ **Rends-toi en magasin** et présente ton bon (QR code ou code à 6 chiffres)\n\nLe commerçant valide ton bon, et c'est tout ! ✅`,
  },

  'h-dec-3': {
    type: 'answer',
    question: "C'est gratuit ?",
    response: `Oui, BONMOMENT est **100 % gratuit pour les habitants** ! 🎉\n\nTu réserves des bons, tu profites des offres, tu ne paies jamais rien.\n\nSeuls les commerçants ont un abonnement optionnel pour publier plus d'offres.`,
  },

  'h-dec-4': {
    type: 'answer',
    question: "Comment m'inscrire ?",
    response: `Crée ton compte en quelques secondes :\n\n1. Clique sur **Connexion** dans le menu\n2. Choisis **"Créer un compte"**\n3. Entre ton email et un mot de passe\n4. Confirme ton adresse email\n\nTu peux aussi te connecter avec Google. C'est gratuit ! 🙌`,
    actions: [
      { label: '👤 Se connecter', type: 'event', payload: 'bonmoment:open-auth' },
    ],
  },

  'h-dec-5': {
    type: 'answer',
    question: "Que sont les badges ?",
    response: `Les badges récompensent ta fidélité sur BONMOMENT 🏆\n\n🥉 **Explorateur** — Tu as réservé ton premier bon\n🥈 **Habitué** — 5 bons utilisés\n🥇 **Expert quartier** — 15 bons utilisés\n\nPlus tu utilises BONMOMENT, plus tu montes de niveau !`,
  },

  /* ── Réserver et utiliser un bon ── */

  'h-reserver': {
    type: 'menu',
    message: "Ta question sur les bons ?",
    options: [
      { label: "Comment réserver un bon ?",                    nodeId: 'h-res-1' },
      { label: "Où retrouver mon bon ?",                       nodeId: 'h-res-2' },
      { label: "Comment présenter mon bon en caisse ?",        nodeId: 'h-res-3' },
      { label: "Mon bon a expiré, que faire ?",                nodeId: 'h-res-4' },
      { label: "Puis-je réserver plusieurs fois la même offre ?", nodeId: 'h-res-5' },
    ],
  },

  'h-res-1': {
    type: 'answer',
    question: "Comment réserver un bon ?",
    response: `Réserver une offre prend 5 secondes :\n\n1. **Ouvre l'offre** qui t'intéresse\n2. Appuie sur le bouton orange **Réserver**\n3. Confirme — ton bon est activé immédiatement ! 🎉\n\nTu le retrouves dans **Profil → Mes bons**.`,
  },

  'h-res-2': {
    type: 'answer',
    question: "Où retrouver mon bon ?",
    response: `Tous tes bons actifs sont dans ton profil → section **Mes bons**.\n\nTu peux aussi les retrouver via le bouton 🎁 en bas de l'écran quand un bon est actif.`,
    actions: [
      { label: '🎁 Mes bons', type: 'redirect', path: '/profil/bons' },
    ],
  },

  'h-res-3': {
    type: 'answer',
    question: "Comment présenter mon bon en caisse ?",
    response: `Deux façons de présenter ton bon :\n\n📱 **QR code** — Ouvre ton bon dans l'app et montre le QR code au commerçant, qui le scanne\n\n🔢 **Code à 6 chiffres** — Dicte le code affiché sous le QR code, le commerçant le saisit manuellement\n\nLes deux méthodes sont acceptées partout. ✅`,
  },

  'h-res-4': {
    type: 'answer',
    question: "Mon bon a expiré, que faire ?",
    response: `Malheureusement, un bon expiré ne peut plus être utilisé. ⏳\n\nLes offres sont limitées dans le temps pour créer de vraies opportunités locales.\n\nBonne nouvelle : de nouvelles offres arrivent chaque semaine ! Pense à activer les notifications pour ne plus en rater. 🔔`,
  },

  'h-res-5': {
    type: 'answer',
    question: "Puis-je réserver plusieurs fois la même offre ?",
    response: `Non, chaque offre est limitée à **un bon par habitant**.\n\nC'est une règle équitable : plus de monde peut profiter de chaque offre !\n\nMais tu peux réserver autant d'offres différentes que tu veux. 🎯`,
  },

  /* ── Villes et abonnements ── */

  'h-villes': {
    type: 'menu',
    message: "Ta question sur les villes ?",
    options: [
      { label: "Comment m'abonner à une ville ?",              nodeId: 'h-vil-1' },
      { label: "Comment m'abonner à plusieurs villes ?",       nodeId: 'h-vil-2' },
      { label: "Comment suivre un commerce en favori ?",       nodeId: 'h-vil-3' },
      { label: "Comment ne plus recevoir les emails ?",        nodeId: 'h-vil-4' },
    ],
  },

  'h-vil-1': {
    type: 'answer',
    question: "Comment m'abonner à une ville ?",
    response: `Pour t'abonner à une ville :\n\n1. Va sur la **page de la ville** (via le sélecteur 📍 en haut)\n2. Clique sur le **cœur ♡** en haut à droite\n3. C'est tout ! Tu recevras les notifications pour cette ville 🔔`,
    actions: [
      { label: '📍 Changer de ville', type: 'event', payload: 'bonmoment:openvilles' },
    ],
  },

  'h-vil-2': {
    type: 'answer',
    question: "Comment m'abonner à plusieurs villes ?",
    response: `Tu peux t'abonner à autant de villes que tu veux !\n\nRends-toi sur la page de chaque ville et clique sur ♡ pour t'y abonner.\n\nTu retrouves toutes tes villes dans **Profil → Mes villes**, où tu peux aussi te désabonner. 🗺️`,
    actions: [
      { label: '👤 Mon profil', type: 'redirect', path: '/profil' },
    ],
  },

  'h-vil-3': {
    type: 'answer',
    question: "Comment suivre un commerce en favori ?",
    response: `Pour ajouter un commerce en favori :\n\nSur la carte d'une offre, clique sur le **❤️ cœur**.\n\nTu retrouves tous tes favoris dans **Profil → Mes favoris** et tu seras notifié en priorité lors de leurs nouvelles offres. 💛`,
  },

  'h-vil-4': {
    type: 'answer',
    question: "Comment ne plus recevoir les emails ?",
    response: `Pour gérer tes emails et notifications :\n\nVa dans **Profil → Notifications** et décoche les catégories dont tu ne veux plus.\n\nTu peux aussi te désabonner directement depuis le lien en bas de chaque email BONMOMENT. 📧`,
    actions: [
      { label: '🔔 Mes notifications', type: 'redirect', path: '/profil' },
    ],
  },

  /* ── Mon compte ── */

  'h-compte': {
    type: 'menu',
    message: "Ta question sur ton compte ?",
    options: [
      { label: "Comment modifier mes notifications ?",               nodeId: 'h-cpt-1' },
      { label: "Comment ajouter BONMOMENT sur mon téléphone ?",      nodeId: 'h-cpt-2' },
      { label: "Comment supprimer mon compte ?",                     nodeId: 'h-cpt-3' },
    ],
  },

  'h-cpt-1': {
    type: 'answer',
    question: "Comment modifier mes notifications ?",
    response: `Pour gérer tes notifications :\n\nVa dans **Profil → Notifications**.\n\nTu peux activer ou désactiver les alertes pour chaque ville, ou autoriser/refuser les notifications push depuis les paramètres de ton navigateur. 🔔`,
    actions: [
      { label: '⚙️ Mon profil', type: 'redirect', path: '/profil' },
    ],
  },

  'h-cpt-2': {
    type: 'answer',
    question: "Comment ajouter BONMOMENT sur mon téléphone ?",
    // Rendu conditionnel géré dans ChatbotPanel selon deviceType
    response: {
      mobile: `BONMOMENT est une app web (PWA) — pas besoin de store !\n\n📱 **Sur iPhone** : Safari → bouton Partager → "Sur l'écran d'accueil"\n📱 **Sur Android** : Chrome → menu ⋮ → "Ajouter à l'écran d'accueil"\n\nUne fois installée, elle fonctionne comme une vraie app native. ✨`,
      desktop: `Pour installer BONMOMENT sur ton téléphone, ouvre BONMOMENT **depuis ton téléphone** (pas depuis un ordinateur).\n\n📱 Sur iPhone → Safari → bouton Partager → "Sur l'écran d'accueil"\n📱 Sur Android → Chrome → menu ⋮ → "Ajouter à l'écran d'accueil"`,
    },
    actions: {
      mobile: [{ label: '📲 Instructions complètes', type: 'redirect', path: '/profil' }],
      desktop: [],
    },
  },

  'h-cpt-3': {
    type: 'answer',
    question: "Comment supprimer mon compte ?",
    response: `Pour supprimer ton compte :\n\nVa dans **Profil → Supprimer mon compte** en bas de page, ou contacte l'équipe BONMOMENT par email.\n\nNous supprimerons toutes tes données sous 48h, conformément au RGPD. 🔒`,
    actions: [
      { label: '👤 Mon profil', type: 'redirect', path: '/profil' },
    ],
  },

  /* ── Un problème ? ── */

  'h-probleme': {
    type: 'menu',
    message: "Quel est le problème ?",
    options: [
      { label: "Je n'arrive pas à me connecter",   nodeId: 'h-pb-1' },
      { label: "Le QR code ne fonctionne pas",     nodeId: 'h-pb-2' },
      { label: "Une offre a disparu",              nodeId: 'h-pb-3' },
      { label: "Autre problème",                   nodeId: 'h-pb-4' },
    ],
  },

  'h-pb-1': {
    type: 'answer',
    question: "Je n'arrive pas à me connecter",
    response: `Voici quelques pistes :\n\n1. **Vérifie ton email** — tu t'es peut-être inscrit avec une adresse différente\n2. **Mot de passe oublié** ? Clique sur "Mot de passe oublié" sur la page de connexion\n3. **Vide le cache** de ton navigateur et réessaie\n4. **Change de navigateur** (Chrome ou Safari recommandés)\n\nToujours bloqué ? Contacte l'équipe BONMOMENT. 📧`,
    actions: [
      { label: '📧 Contacter l\'équipe', type: 'redirect', path: '/aide/contact' },
    ],
  },

  'h-pb-2': {
    type: 'answer',
    question: "Le QR code ne fonctionne pas",
    response: `Si le QR code est refusé :\n\n1. Demande au commerçant d'utiliser la **saisie manuelle** du code à 6 chiffres\n2. Vérifie que ton bon n'est pas **expiré** (date affichée sur le bon)\n3. Assure-toi que le bon est bien pour **ce commerçant**\n\nLe commerçant peut saisir le code manuellement depuis sa page de validation. ✅`,
  },

  'h-pb-3': {
    type: 'answer',
    question: "Une offre a disparu",
    response: `Une offre peut disparaître si :\n\n⏰ Elle a **expiré** (date de fin dépassée)\n✗ Les **bons sont épuisés** (quota atteint)\n🚫 Le **commerçant l'a désactivée**\n\nDe nouvelles offres arrivent régulièrement ! Active les notifications pour être prévenu en premier. 🔔`,
  },

  'h-pb-4': {
    type: 'answer',
    question: "Autre problème",
    response: `L'équipe BONMOMENT est là pour t'aider ! 😊\n\nContacte-nous via le formulaire et nous te répondrons sous 24h (jours ouvrés).`,
    actions: [
      { label: '📧 Contacter l\'équipe BONMOMENT', type: 'redirect', path: '/aide/contact' },
    ],
  },

  /* ── Informations légales habitant ── */

  'h-legal': {
    type: 'menu',
    message: "Quelle information ?",
    options: [
      { label: "Données personnelles / RGPD",    nodeId: 'h-leg-1' },
      { label: "Conditions d'utilisation",        nodeId: 'h-leg-2' },
      { label: "Mentions légales",               nodeId: 'h-leg-3' },
    ],
  },

  'h-leg-1': {
    type: 'answer',
    question: "Données personnelles / RGPD",
    response: `BONMOMENT respecte le RGPD. 🔒\n\nNous collectons uniquement les données nécessaires : email, préférences de ville et historique de bons.\n\nTu peux consulter notre politique complète, demander l'export ou la suppression de tes données à tout moment.`,
    actions: [
      { label: '🔒 Politique de confidentialité', type: 'redirect', path: '/confidentialite' },
    ],
  },

  'h-leg-2': {
    type: 'answer',
    question: "Conditions d'utilisation",
    response: `Nos conditions d'utilisation détaillent les règles d'usage de la plateforme BONMOMENT.`,
    actions: [
      { label: '📄 Lire les CGU', type: 'redirect', path: '/cgu' },
    ],
  },

  'h-leg-3': {
    type: 'answer',
    question: "Mentions légales",
    response: `Les mentions légales de BONMOMENT sont disponibles sur la page dédiée.`,
    actions: [
      { label: '📄 Mentions légales', type: 'redirect', path: '/mentions-legales' },
    ],
  },

  /* ════════════════════════════════════════════════════════════════════════
     COMMERÇANT — Catégories
  ════════════════════════════════════════════════════════════════════════ */

  'c-cat': {
    type: 'menu',
    message: "Dans quelle catégorie se trouve ta question ?",
    options: [
      { label: '📝 Créer et gérer mes offres',        nodeId: 'c-offres' },
      { label: '✅ Valider un bon en caisse',          nodeId: 'c-valider' },
      { label: '📊 Mes statistiques',                  nodeId: 'c-stats' },
      { label: '🏪 Mon commerce',                      nodeId: 'c-commerce' },
      { label: '💰 Abonnement et parrainage',          nodeId: 'c-abo' },
      { label: '🔧 Un problème ?',                     nodeId: 'c-probleme' },
      { label: '📋 Informations légales',              nodeId: 'c-legal' },
    ],
  },

  /* ── Créer et gérer mes offres ── */

  'c-offres': {
    type: 'menu',
    message: "Ta question sur les offres ?",
    options: [
      { label: "Comment créer une offre ?",                nodeId: 'c-off-1' },
      { label: "Combien d'offres il me reste ce mois ?",   nodeId: 'c-off-2' },
      { label: "Comment supprimer une offre active ?",     nodeId: 'c-off-3' },
      { label: "Comment recréer une offre expirée ?",      nodeId: 'c-off-4' },
      { label: "Comment programmer une offre récurrente ?",nodeId: 'c-off-5' },
    ],
  },

  'c-off-1': {
    type: 'answer',
    question: "Comment créer une offre ?",
    response: `Pour créer une offre :\n\n1. Depuis ton **Dashboard → Nouvelle offre**\n2. Choisis le **type** (remise %, cadeau, évènement, concours)\n3. Renseigne le **titre**, la **valeur** et le **nombre de bons**\n4. Fixe les **dates de début et de fin**\n5. Clique sur **Publier** 🚀\n\nTon offre est visible instantanément par les habitants de ta ville !`,
    actions: [
      { label: '➕ Créer une offre', type: 'redirect', path: '/commercant/offre/nouvelle' },
    ],
  },

  'c-off-2': {
    type: 'answer',
    question: "Combien d'offres il me reste ce mois ?",
    response: `Le quota mensuel est visible dans ton **Dashboard → Ton abonnement**.\n\nTu y vois :\n- Ton palier actuel (Découverte / Essentiel / Pro)\n- Le nombre d'offres publiées ce mois\n- Le nombre de créations restantes\n- La date de renouvellement du quota 📅`,
    actions: [
      { label: '📊 Mon dashboard', type: 'redirect', path: '/commercant/dashboard' },
    ],
  },

  'c-off-3': {
    type: 'answer',
    question: "Comment supprimer une offre active ?",
    response: `Pour supprimer une offre active :\n\n1. Va dans **Dashboard → Mes offres** (onglet Actives)\n2. Sous l'offre, clique sur **Supprimer cette offre**\n3. Confirme la suppression\n\n⚠️ La suppression est impossible si des bons ont déjà été **validés** par des clients. Dans ce cas, l'offre s'arrêtera naturellement à sa date de fin.`,
    actions: [
      { label: '📋 Mes offres', type: 'redirect', path: '/commercant/dashboard' },
    ],
  },

  'c-off-4': {
    type: 'answer',
    question: "Comment recréer une offre expirée ?",
    response: `Le bouton **🔄 Réactualiser** te permet de relancer une offre passée en un clic :\n\n1. Va dans **Dashboard → Mes offres** (onglet Expirées)\n2. Clique sur **🔄 Réactualiser cette offre**\n3. Le formulaire de création s'ouvre pré-rempli avec les mêmes paramètres\n4. Ajuste si besoin et publie ! 🚀`,
    actions: [
      { label: '📋 Offres expirées', type: 'redirect', path: '/commercant/dashboard' },
    ],
  },

  'c-off-5': {
    type: 'answer',
    question: "Comment programmer une offre récurrente ?",
    response: `L'option **"Répéter cette offre"** est disponible dans le formulaire de création :\n\n1. Active le **toggle "Répéter cette offre"**\n2. Coche les **jours de la semaine** où l'offre est active\n3. Publie normalement\n\nPerfait pour les happy hours, promos du midi ou offres de week-end ! 🔄`,
    actions: [
      { label: '➕ Nouvelle offre', type: 'redirect', path: '/commercant/offre/nouvelle' },
    ],
  },

  /* ── Valider un bon en caisse ── */

  'c-valider': {
    type: 'menu',
    message: "Ta question sur la validation ?",
    options: [
      { label: "Comment scanner un QR code ?",           nodeId: 'c-val-1' },
      { label: "Comment taper un code manuellement ?",   nodeId: 'c-val-2' },
      { label: "Le scan ne fonctionne pas",              nodeId: 'c-val-3' },
      { label: "Un code est refusé, pourquoi ?",         nodeId: 'c-val-4' },
    ],
  },

  'c-val-1': {
    type: 'answer',
    question: "Comment scanner un QR code ?",
    response: `Pour scanner le bon d'un client :\n\n1. Va dans **Menu → Valider un bon** (ou clique "✅ Vérifier un bon" dans ton dashboard)\n2. Autorise l'accès à la **caméra** si demandé\n3. Pointe la caméra vers le QR code du client\n4. La validation s'effectue automatiquement ✅\n\nUtilise **Chrome ou Safari** pour la meilleure compatibilité caméra.`,
    actions: [
      { label: '📷 Valider un bon', type: 'redirect', path: '/commercant/valider' },
    ],
  },

  'c-val-2': {
    type: 'answer',
    question: "Comment taper un code manuellement ?",
    response: `Si le QR code ne peut pas être scanné :\n\n1. Va sur la page **Valider un bon**\n2. Sélectionne l'onglet **"Saisir un code"**\n3. Entre le **code à 6 chiffres** affiché sur le bon du client\n4. Valide — le bon est marqué "utilisé" instantanément ✅`,
    actions: [
      { label: '🔢 Saisir un code', type: 'redirect', path: '/commercant/valider' },
    ],
  },

  'c-val-3': {
    type: 'answer',
    question: "Le scan ne fonctionne pas",
    response: `Si la caméra ne s'ouvre pas ou ne scanne pas :\n\n1. **Autorise la caméra** dans les paramètres de ton navigateur (site → autoriser caméra)\n2. Utilise **Chrome ou Safari** (les autres navigateurs peuvent bloquer la caméra)\n3. En cas d'échec : utilise la **saisie manuelle** du code à 6 chiffres — c'est aussi rapide et toujours fiable 👌`,
    actions: [
      { label: '🔢 Saisie manuelle', type: 'redirect', path: '/commercant/valider' },
    ],
  },

  'c-val-4': {
    type: 'answer',
    question: "Un code est refusé, pourquoi ?",
    response: `Un bon peut être refusé pour plusieurs raisons :\n\n❌ **Bon expiré** — la date de fin est dépassée\n❌ **Déjà utilisé** — le bon a déjà été validé\n❌ **Mauvais commerce** — le bon appartient à un autre établissement\n❌ **Code invalide** — le client a peut-être saisi un mauvais chiffre\n\nDemande au client d'ouvrir son bon dans l'app pour vérifier son statut.`,
  },

  /* ── Mes statistiques ── */

  'c-stats': {
    type: 'menu',
    message: "Ta question sur les statistiques ?",
    options: [
      { label: "Où voir mes statistiques ?",         nodeId: 'c-sta-1' },
      { label: "Que signifient les indicateurs ?",   nodeId: 'c-sta-2' },
    ],
  },

  'c-sta-1': {
    type: 'answer',
    question: "Où voir mes statistiques ?",
    response: `Toutes tes stats sont dans ton **Dashboard BONMOMENT**.\n\nTu y retrouves :\n📊 Bons réservés et utilisés ce mois\n👥 Nouveaux clients touchés\n📈 Tendances par jour de la semaine et heure de la journée\n⭐ Taux d'utilisation de tes offres`,
    actions: [
      { label: '📊 Mon dashboard', type: 'redirect', path: '/commercant/dashboard' },
    ],
  },

  'c-sta-2': {
    type: 'answer',
    question: "Que signifient les indicateurs ?",
    response: `Voici le détail de tes indicateurs :\n\n🎟️ **Bons réservés** — nombre de réservations ce mois\n✅ **Bons utilisés** — bons effectivement présentés en caisse\n📊 **Taux d'utilisation** — % de bons réservés qui ont été utilisés (objectif : > 50%)\n👥 **Nouveaux clients** — habitants uniques ayant réservé ce mois\n📅 **Jours actifs** — jours de la semaine où tes clients viennent le plus\n⏰ **Heures de pointe** — créneaux horaires avec le plus de réservations`,
  },

  /* ── Mon commerce ── */

  'c-commerce': {
    type: 'menu',
    message: "Ta question sur ton commerce ?",
    options: [
      { label: "Comment modifier mes informations ?",          nodeId: 'c-com-1' },
      { label: "Comment télécharger mon QR code vitrine ?",    nodeId: 'c-com-2' },
      { label: "Mes horaires ou ma photo sont incorrects",     nodeId: 'c-com-3' },
    ],
  },

  'c-com-1': {
    type: 'answer',
    question: "Comment modifier mes informations ?",
    response: `Les informations de ton commerce (nom, adresse, horaires, photo) proviennent de **Google Business**.\n\nPour les mettre à jour :\n1. Connecte-toi sur **Google Business Profile**\n2. Modifie tes informations\n3. La synchronisation avec BONMOMENT se fait automatiquement lors du prochain cycle de mise à jour 🔄\n\nPour une modification urgente, contacte l'équipe BONMOMENT.`,
    actions: [
      { label: '📧 Contacter l\'équipe', type: 'redirect', path: '/aide/contact' },
    ],
  },

  'c-com-2': {
    type: 'answer',
    question: "Comment télécharger mon QR code vitrine ?",
    response: `Ton QR code vitrine est disponible dans le **Dashboard → Mon QR code**.\n\nTu peux :\n📱 **L'afficher** en plein écran pour que tes clients le scannent\n📥 **Le télécharger** en haute résolution (format A4) pour l'imprimer et l'afficher en vitrine\n\nLes clients qui scannent ce QR code découvrent directement ta page BONMOMENT !`,
    actions: [
      { label: '📥 Télécharger mon QR code', type: 'redirect', path: '/commercant/dashboard' },
    ],
  },

  'c-com-3': {
    type: 'answer',
    question: "Mes horaires ou ma photo sont incorrects",
    response: `Tes horaires et ta photo viennent de ta fiche **Google Business**.\n\nPour les corriger :\n1. Ouvre **Google Business Profile**\n2. Mets à jour tes horaires et/ou ta photo\n3. La synchronisation se fait automatiquement\n\nTu peux aussi modifier directement ta photo depuis ton Dashboard BONMOMENT.`,
    actions: [
      { label: '🗺️ Modifier sur Google Business', type: 'external', payload: 'https://business.google.com' },
      { label: '📊 Mon dashboard', type: 'redirect', path: '/commercant/dashboard' },
    ],
  },

  /* ── Abonnement et parrainage ── */

  'c-abo': {
    type: 'menu',
    message: "Ta question sur l'abonnement ?",
    options: [
      { label: "Comment fonctionne le parrainage ?",       nodeId: 'c-ab-1' },
      { label: "Comment partager mon code parrainage ?",   nodeId: 'c-ab-2' },
      { label: "Comment changer de palier ?",              nodeId: 'c-ab-3' },
      { label: "Quels sont les tarifs ?",                  nodeId: 'c-ab-4' },
      { label: "Comment résilier ou mettre en pause ?",    nodeId: 'c-ab-5' },
    ],
  },

  'c-ab-1': {
    type: 'answer',
    question: "Comment fonctionne le parrainage ?",
    response: `Le parrainage BONMOMENT te permet de gagner des mois offerts !\n\n🎁 Génère un **code de parrainage** depuis ton Dashboard (max 3 par mois)\n📤 Partage-le à un autre commerçant qui souhaite rejoindre BONMOMENT\n✅ Quand il s'inscrit avec ton code, vous bénéficiez tous les deux d'un **avantage fidélité**\n\nLes codes sont valables **3 mois** après génération.`,
    actions: [
      { label: '🎁 Générer un code', type: 'redirect', path: '/commercant/dashboard' },
    ],
  },

  'c-ab-2': {
    type: 'answer',
    question: "Comment partager mon code parrainage ?",
    response: `Depuis ton **Dashboard → Parrainage** :\n\n1. Génère un code (bouton orange)\n2. Clique sur **"📤 Partager ce code"**\n3. Envoie-le par WhatsApp, SMS ou email à un commerçant de ton réseau\n\nTu peux générer jusqu'à 3 codes par mois. Chaque code est unique et à usage unique.`,
    actions: [
      { label: '📤 Mon parrainage', type: 'redirect', path: '/commercant/dashboard' },
    ],
  },

  'c-ab-3': {
    type: 'answer',
    question: "Comment changer de palier ?",
    response: `Pour changer de formule, contacte l'équipe BONMOMENT :\n\n📧 Envoie-nous un message via le formulaire de contact\n✉️ Indique le palier souhaité (Découverte / Essentiel / Pro)\n\nLe changement est effectif au prochain cycle de facturation. Aucune interruption de service.`,
    actions: [
      { label: '📧 Changer de palier', type: 'redirect', path: '/aide/contact' },
    ],
  },

  'c-ab-4': {
    type: 'answer',
    question: "Quels sont les tarifs ?",
    response: `BONMOMENT propose 3 formules :\n\n🆓 **Découverte** — 29 €/mois\n→ 4 offres par mois\n\n⭐ **Essentiel** — 49 €/mois\n→ 8 offres par mois\n\n🚀 **Pro** — 79 €/mois\n→ 16 offres par mois\n\nTous les paliers incluent : validation QR, statistiques, QR code vitrine et parrainage. 💼`,
  },

  'c-ab-5': {
    type: 'answer',
    question: "Comment résilier ou mettre en pause ?",
    response: `Pour résilier ou suspendre ton abonnement :\n\nContacte l'équipe BONMOMENT via le formulaire de contact.\n\nLa résiliation prend effet à la fin de la période en cours, sans frais supplémentaires. Tes données et statistiques sont conservées 12 mois après résiliation.`,
    actions: [
      { label: '📧 Contacter l\'équipe', type: 'redirect', path: '/aide/contact' },
    ],
  },

  /* ── Un problème ? (commerçant) ── */

  'c-probleme': {
    type: 'menu',
    message: "Quel est le problème ?",
    options: [
      { label: "Mon commerce n'apparaît pas sur BONMOMENT",   nodeId: 'c-pb-1' },
      { label: "Je n'arrive pas à créer une offre",           nodeId: 'c-pb-2' },
      { label: "Un client conteste un bon",                   nodeId: 'c-pb-3' },
      { label: "Autre problème",                              nodeId: 'c-pb-4' },
    ],
  },

  'c-pb-1': {
    type: 'answer',
    question: "Mon commerce n'apparaît pas sur BONMOMENT",
    response: `Pour apparaître sur BONMOMENT, ton commerce doit d'abord avoir une **fiche Google Business vérifiée**.\n\nSi ce n'est pas encore le cas :\n1. Crée ta fiche sur **Google Business Profile**\n2. Fais-la vérifier par Google (quelques jours)\n3. Reviens t'inscrire sur BONMOMENT\n\nSi ta fiche Google existe et que tu ne t'affiches pas, contacte l'équipe BONMOMENT.`,
    actions: [
      { label: '📧 Contacter l\'équipe', type: 'redirect', path: '/aide/contact' },
    ],
  },

  'c-pb-2': {
    type: 'answer',
    question: "Je n'arrive pas à créer une offre",
    response: `Quelques causes fréquentes :\n\n❌ **Quota mensuel atteint** — vérifie ton solde dans Dashboard → Ton abonnement\n❌ **Dates invalides** — la date de fin doit être après la date de début\n❌ **Champ manquant** — tous les champs obligatoires doivent être remplis\n❌ **Session expirée** — déconnecte-toi et reconnecte-toi\n\nToujours bloqué ? Contacte l'équipe BONMOMENT.`,
    actions: [
      { label: '📊 Mon dashboard', type: 'redirect', path: '/commercant/dashboard' },
      { label: '📧 Contacter l\'équipe', type: 'redirect', path: '/aide/contact' },
    ],
  },

  'c-pb-3': {
    type: 'answer',
    question: "Un client conteste un bon",
    response: `En cas de litige avec un client :\n\n1. Demande au client de **montrer son bon** dans l'app (statut affiché)\n2. Vérifie via ta page de validation que le bon est bien actif\n3. Si le litige persiste, contacte l'équipe BONMOMENT en indiquant le code du bon\n\nNous arbitrons tous les litiges sous 48h. 🤝`,
    actions: [
      { label: '📧 Signaler un litige', type: 'redirect', path: '/aide/contact' },
    ],
  },

  'c-pb-4': {
    type: 'answer',
    question: "Autre problème",
    response: `L'équipe BONMOMENT est là pour t'aider ! 😊\n\nContacte-nous via le formulaire et nous te répondrons sous 24h (jours ouvrés).`,
    actions: [
      { label: '📧 Contacter l\'équipe BONMOMENT', type: 'redirect', path: '/aide/contact' },
    ],
  },

  /* ── Informations légales commerçant ── */

  'c-legal': {
    type: 'menu',
    message: "Quelle information ?",
    options: [
      { label: "Conditions de vente",              nodeId: 'c-leg-1' },
      { label: "Données personnelles / RGPD",      nodeId: 'c-leg-2' },
      { label: "Mentions légales",                 nodeId: 'c-leg-3' },
    ],
  },

  'c-leg-1': {
    type: 'answer',
    question: "Conditions de vente",
    response: `Les conditions générales de vente régissent la relation commerciale entre BONMOMENT et ses partenaires commerçants.`,
    actions: [
      { label: '📄 Lire les CGV', type: 'redirect', path: '/cgv' },
    ],
  },

  'c-leg-2': {
    type: 'answer',
    question: "Données personnelles / RGPD",
    response: `BONMOMENT traite les données de tes clients (réservations, utilisation des bons) dans le cadre de notre relation commerciale.\n\nConsulte notre politique de confidentialité pour le détail des traitements.`,
    actions: [
      { label: '🔒 Politique de confidentialité', type: 'redirect', path: '/confidentialite' },
    ],
  },

  'c-leg-3': {
    type: 'answer',
    question: "Mentions légales",
    response: `Les mentions légales de BONMOMENT sont disponibles sur la page dédiée.`,
    actions: [
      { label: '📄 Mentions légales', type: 'redirect', path: '/mentions-legales' },
    ],
  },

}
