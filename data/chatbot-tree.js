/**
 * Arbre de décision du chatbot BON'Aide.
 * Chaque nœud : { user?, bot?, buttons: [{label, next}][], action? }
 * action types : 'navigate' (path), 'autoclose' (delay ms)
 */
const TREE = {

  /* ── Accueil ─────────────────────────────────────────────────────────── */
  start: {
    bot: "👋 Salut ! Je suis là pour t'aider. Tu es :",
    buttons: [
      { label: 'Un habitant 🏠',    next: 'habitant-menu' },
      { label: 'Un commerçant 🏪', next: 'commercant-menu' },
    ],
  },

  /* ══════════════════════════════════════════════════════════════════════ */
  /* BRANCHE HABITANT                                                       */
  /* ══════════════════════════════════════════════════════════════════════ */
  'habitant-menu': {
    user: 'Un habitant 🏠',
    bot: "D'accord ! Que puis-je faire pour toi ?",
    buttons: [
      { label: 'Comment réserver un bon ?',        next: 'h-reserver'      },
      { label: "Je n'arrive pas à me connecter",   next: 'h-connexion'     },
      { label: 'Mon bon ne fonctionne pas',        next: 'h-bon-probleme'  },
      { label: 'Comment suivre un commerce ?',     next: 'h-suivre'        },
      { label: 'Comment changer de ville ?',       next: 'h-ville'         },
      { label: 'Autre question',                   next: 'autre-question'  },
    ],
  },

  'h-reserver': {
    user: 'Comment réserver un bon ?',
    bot: "C'est très simple !\n1️⃣ Choisis ta ville\n2️⃣ Trouve une offre\n3️⃣ Clique sur Réserver mon bon\n4️⃣ Connecte-toi avec Google ou Facebook\n5️⃣ Ton bon apparaît avec un QR code — présente-le en caisse !",
    buttons: [
      { label: 'Oui, merci ! 😊',                 next: 'merci-fin'           },
      { label: "Non, j'ai encore une question",   next: 'habitant-menu-back'  },
    ],
  },

  'h-connexion': {
    user: "Je n'arrive pas à me connecter",
    bot: "Pas de panique ! Vérifie ces points :\n📱 Utilise le même compte qu'à ton inscription\n🔄 Rafraîchis la page\n🍪 Vérifie que les cookies sont activés\n📶 Vérifie ta connexion internet",
    buttons: [
      { label: "C'est résolu ! 😊",           next: 'merci-fin'      },
      { label: 'Toujours bloqué',             next: 'contacter-nav'  },
    ],
  },

  'h-bon-probleme': {
    user: 'Mon bon ne fonctionne pas',
    bot: "Quelques vérifications :\n⏰ Ton bon est-il encore valide ?\n📍 Es-tu chez le bon commerçant ?\n📱 Montre le QR code ET le code 6 chiffres",
    buttons: [
      { label: 'Oui, merci ! 😊', next: 'merci-fin'     },
      { label: 'Non',             next: 'contacter-nav' },
    ],
  },

  'h-suivre': {
    user: 'Comment suivre un commerce ?',
    bot: "Pour ne rater aucune offre :\n❤️ Clique sur l'icône cœur sur la page du commerce\n🔔 Tu recevras une notification dès qu'il publie une offre !",
    buttons: [
      { label: 'Super, merci ! 😊', next: 'merci-fin'           },
      { label: 'Autre question',    next: 'habitant-menu-back'  },
    ],
  },

  'h-ville': {
    user: 'Comment changer de ville ?',
    bot: "Tu peux t'abonner à plusieurs villes !\n🏠 Va sur la page d'accueil\n🔍 Clique sur Changer à côté du nom de la ville\n➕ Cherche et ajoute une nouvelle ville",
    buttons: [
      { label: 'Compris ! 😊',   next: 'merci-fin'           },
      { label: 'Autre question', next: 'habitant-menu-back'  },
    ],
  },

  /* Menu retour habitant */
  'habitant-menu-back': {
    bot: "Autre chose ?",
    buttons: [
      { label: 'Comment réserver un bon ?',        next: 'h-reserver'     },
      { label: "Je n'arrive pas à me connecter",   next: 'h-connexion'    },
      { label: 'Mon bon ne fonctionne pas',        next: 'h-bon-probleme' },
      { label: 'Comment suivre un commerce ?',     next: 'h-suivre'       },
      { label: 'Comment changer de ville ?',       next: 'h-ville'        },
      { label: 'Voir la FAQ complète',             next: 'faq-nav'        },
    ],
  },

  /* ══════════════════════════════════════════════════════════════════════ */
  /* BRANCHE COMMERÇANT                                                     */
  /* ══════════════════════════════════════════════════════════════════════ */
  'commercant-menu': {
    user: 'Un commerçant 🏪',
    bot: "Bienvenue ! Que puis-je faire pour toi ?",
    buttons: [
      { label: 'Comment créer une offre ?',          next: 'c-creer-offre'      },
      { label: 'Comment valider un bon ?',           next: 'c-valider-bon'      },
      { label: 'Comment fonctionne le parrainage ?', next: 'c-parrainage'       },
      { label: 'Modifier mon profil commerce',       next: 'c-profil'           },
      { label: 'Questions sur mon abonnement',       next: 'c-abonnement'       },
      { label: "Le tutoriel ne s'est pas lancé",    next: 'c-tuto'             },
      { label: 'Autre question',                     next: 'autre-question'     },
    ],
  },

  'c-creer-offre': {
    user: 'Comment créer une offre ?',
    bot: "Moins d'une minute !\n1️⃣ Va dans Mon commerce\n2️⃣ Clique sur Créer une offre\n3️⃣ Choisis le type\n4️⃣ Décris et choisis le nb de bons\n5️⃣ Définis le créneau\n6️⃣ Publie !\n\n💡 Astuce : programme sur tes heures creuses !",
    buttons: [
      { label: 'Parfait ! 😊',              next: 'merci-fin'             },
      { label: 'Revoir le tutoriel complet', next: 'c-revoir-tuto'        },
      { label: 'Autre question',             next: 'commercant-menu-back' },
    ],
  },

  'c-valider-bon': {
    user: 'Comment valider un bon ?',
    bot: "Quand un client se présente :\n📱 Clique sur Vérifier un bon\n📷 Scanne le QR code OU saisis le code 6 chiffres\n✅ Si tout est bon : Bon validé !",
    buttons: [
      { label: 'Compris ! 😊',       next: 'merci-fin'     },
      { label: 'Ça ne marche pas',   next: 'contacter-nav' },
    ],
  },

  'c-parrainage': {
    user: 'Comment fonctionne le parrainage ?',
    bot: "Ton code est dans Mon commerce → Parrainage.\n🎁 Partage-le à un commerçant non inscrit\n💰 Vous recevez tous les deux une remise : Découverte -10€, Essentiel -15€, Pro -20€\n⚠️ Max 3 parrainages/mois. Code valable 3 mois.",
    buttons: [
      { label: 'Merci ! 😊',    next: 'merci-fin'             },
      { label: 'Autre question', next: 'commercant-menu-back' },
    ],
  },

  'c-profil': {
    user: 'Modifier mon profil commerce',
    bot: "Le nom, adresse et horaires viennent de ta fiche Google et se mettent à jour automatiquement.\nTu peux modifier depuis Mon commerce :\n✏️ La description\n📸 Ajouter des photos.\n\nPour le reste → mets à jour ta fiche Google Business.",
    buttons: [
      { label: 'OK ! 😊',        next: 'merci-fin'             },
      { label: 'Autre question', next: 'commercant-menu-back'  },
    ],
  },

  'c-abonnement': {
    user: 'Questions sur mon abonnement',
    bot: "Que veux-tu savoir ?",
    buttons: [
      { label: 'Paliers et tarifs',       next: 'c-tarifs'         },
      { label: 'Comment changer de palier ?', next: 'c-changer-palier' },
      { label: 'Comment résilier ?',      next: 'c-resilier'       },
      { label: 'Mes factures',            next: 'c-factures'       },
    ],
  },

  'c-tarifs': {
    user: 'Paliers et tarifs',
    bot: "📋 Découverte : 29€/mois — 4 offres\nEssentiel : 49€/mois — 8 offres\nPro : 79€/mois — 16 offres\n\n🎁 Premier mois offert ! Bons illimités sur tous les paliers.",
    buttons: [
      { label: 'Merci ! 😊', next: 'merci-fin' },
    ],
  },

  'c-changer-palier': {
    user: 'Comment changer de palier ?',
    bot: "Depuis Mon commerce → Abonnement → Changer de palier. Le changement est effectif immédiatement. Montée → prorata. Descente → prend effet au prochain renouvellement.",
    buttons: [
      { label: 'OK ! 😊', next: 'merci-fin' },
    ],
  },

  'c-resilier': {
    user: 'Comment résilier ?',
    bot: "Sans engagement !\n⚙️ Mon commerce → Abonnement → Résilier\nPrend effet fin du mois en cours.\n💡 Tu peux aussi choisir Pause 1 mois !",
    buttons: [
      { label: 'OK ! 😊', next: 'merci-fin' },
    ],
  },

  'c-factures': {
    user: 'Mes factures',
    bot: "Tes factures sont envoyées par email chaque mois. Retrouve-les aussi dans Mon commerce → Abonnement → Historique.",
    buttons: [
      { label: 'Merci ! 😊', next: 'merci-fin' },
    ],
  },

  'c-tuto': {
    user: "Le tutoriel ne s'est pas lancé",
    bot: "Pas de souci ! Va dans Mon commerce, tu verras un bandeau Lancer le guide en haut de la page. Clique dessus et suis les étapes !",
    buttons: [
      { label: 'Merci ! 😊',    next: 'merci-fin'             },
      { label: 'Autre question', next: 'commercant-menu-back' },
    ],
  },

  'c-revoir-tuto': {
    user: 'Revoir le tutoriel complet',
    bot: "Je t'emmène directement vers le guide ! 🚀",
    action: { type: 'navigate', path: '/commercant/dashboard' },
    buttons: [],
  },

  /* Menu retour commerçant */
  'commercant-menu-back': {
    bot: "Autre chose ?",
    buttons: [
      { label: 'Comment créer une offre ?',          next: 'c-creer-offre' },
      { label: 'Comment valider un bon ?',           next: 'c-valider-bon' },
      { label: 'Comment fonctionne le parrainage ?', next: 'c-parrainage'  },
      { label: 'Modifier mon profil commerce',       next: 'c-profil'      },
      { label: 'Questions sur mon abonnement',       next: 'c-abonnement'  },
      { label: 'Voir la FAQ complète',               next: 'faq-nav'       },
    ],
  },

  /* ── Nœuds partagés ──────────────────────────────────────────────────── */
  'autre-question': {
    user: 'Autre question',
    bot: "Je n'ai pas la réponse 😅 Tu peux :",
    buttons: [
      { label: '📖 Voir la FAQ complète', next: 'faq-nav'      },
      { label: '📧 Contacter BONMOMENT',   next: 'contacter-nav' },
    ],
  },

  'faq-nav': {
    user: '📖 Voir la FAQ complète',
    bot: "Je t'emmène vers la FAQ...",
    action: { type: 'navigate', path: '/aide' },
    buttons: [],
  },

  'contacter-nav': {
    user: '📧 Contacter BONMOMENT',
    bot: "Je t'emmène vers notre équipe. On te répond sous 24h 😊",
    action: { type: 'navigate', path: '/aide/contact' },
    buttons: [],
  },

  'merci-fin': {
    bot: "Ravi d'avoir pu t'aider ! 😊 À bientôt sur BONMOMENT !",
    action: { type: 'autoclose', delay: 2500 },
    buttons: [],
  },
}

export default TREE
