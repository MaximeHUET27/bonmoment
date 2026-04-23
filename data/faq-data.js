/**
 * Données FAQ BONMOMENT — 27 questions réparties en 5 catégories.
 */
const FAQ = [
  {
    id: 'general',
    icon: '🌟',
    titre: 'Général',
    questions: [
      {
        q: "C'est quoi BONMOMENT ?",
        r: "BONMOMENT est une plateforme web qui permet aux commerçants de publier des offres sur des créneaux définis, et aux habitants de réserver des bons gratuitement. Tout fonctionne sans téléchargement — accessible par QR code ou lien direct.",
      },
      {
        q: 'BONMOMENT est-il gratuit pour les clients ?',
        r: "Oui, 100% gratuit. Tu peux voir les offres, réserver des bons et les utiliser sans jamais payer.",
      },
      {
        q: "Faut-il télécharger une application ?",
        r: "Non ! BONMOMENT fonctionne directement dans ton navigateur. Tu peux ajouter un raccourci sur ton écran d'accueil pour y accéder comme une app.",
      },
      {
        q: 'Dans quelles villes BONMOMENT est-il disponible ?',
        r: "Nous lançons à Conches-en-Ouche et au Neubourg. De nouvelles villes s'ouvrent dès qu'un premier commerçant s'y inscrit.",
      },
      {
        q: "Comment ajouter BONMOMENT sur mon écran d'accueil ?",
        r: "iPhone : Safari → icône partage → Sur l'écran d'accueil. Android : Chrome → menu ⋮ → Ajouter à l'écran d'accueil.",
      },
    ],
  },
  {
    id: 'compte',
    icon: '👤',
    titre: 'Compte & Connexion',
    questions: [
      {
        q: 'Comment créer un compte ?',
        r: "Clique sur Réserver mon bon sur n'importe quelle offre, puis connecte-toi avec Google ou Facebook. Ton compte est créé automatiquement.",
      },
      {
        q: "Pourquoi pas d'email/mot de passe ?",
        r: "Pour ta sécurité et ta tranquillité. Connexion via Google ou Facebook uniquement. Aucun mot de passe à retenir, aucun risque de le perdre.",
      },
      {
        q: "Je n'arrive pas à me connecter",
        r: "Vérifie que tu utilises le même compte qu'à ta première connexion. Rafraîchis la page et vide le cache. Si ça persiste, écris-nous : bonmomentapp@gmail.com",
      },
      {
        q: 'Comment supprimer mon compte ?',
        r: "Profil → Supprimer mon compte. Toutes tes données seront effacées sous 30 jours. Cette action est irréversible.",
      },
    ],
  },
  {
    id: 'offres',
    icon: '🎟️',
    titre: 'Offres & Bons',
    questions: [
      {
        q: 'Comment réserver un bon ?',
        r: "Choisis ta ville, trouve une offre, clique Réserver mon bon, connecte-toi. Ton bon s'affiche avec QR code et code 6 chiffres.",
      },
      {
        q: 'Combien de bons puis-je réserver ?',
        r: "Un bon par offre. Pas de limite sur le nombre total de bons sur différentes offres.",
      },
      {
        q: "Comment recevoir les offres de ma ville ?",
        r: "Abonne-toi à ta ville en cliquant sur le ♡ en haut de la page ville. Tu recevras : un email récap chaque soir à 21h, un email instantané à chaque nouvelle offre publiée, et des notifications push si tu les as activées dans ton profil.",
      },
      {
        q: "Comment activer les notifications d'un commerce ?",
        r: "Sur la carte d'une offre ou la page du commerce, clique sur le ❤️ cœur pour l'ajouter en favori. Tu seras notifié en priorité dès qu'il publie une nouvelle offre. Active les notifications push dans Profil → Notifications pour ne rien rater.",
      },
      {
        q: "Mon bon a expiré, c'est grave ?",
        r: "Pas du tout ! Aucune pénalité. Le bon expire simplement à la fin de l'offre. Reviens vite, de nouvelles offres arrivent régulièrement !",
      },
      {
        q: "Mon bon a expiré, puis-je en avoir un autre ?",
        r: "Un bon expiré ne peut pas être réutilisé, mais tu peux réserver un nouveau bon dès que le commerçant publie une nouvelle offre. Ajoute-le en favori pour être alerté en premier !",
      },
      {
        q: "Comment laisser un avis sur un commerce ?",
        r: "Tu peux laisser un avis depuis la fiche du commerce en appuyant sur '⭐ Laisser un avis'. Note ton expérience de 1 à 5 étoiles. Ton avis aide le commerce à se développer.",
      },
      {
        q: "Je reçois trop d'emails, comment réduire ?",
        r: "Depuis ton profil → Notifications, tu peux choisir : l'email quotidien du soir (1 seul email récap), les emails instantanés (un email par offre publiée), ou les notifications push. Désactive ceux que tu ne veux plus.",
      },
      {
        q: 'Comment utiliser mon bon en caisse ?',
        r: "Présente ton écran avec le QR code au commerçant. Il le scanne ou saisit ton code 6 chiffres. En quelques secondes c'est validé !",
      },
      {
        q: "Que signifie \"Trop tard !\" ?",
        r: "L'offre est terminée. Abonne-toi au commerce pour être prévenu de la prochaine !",
      },
      {
        q: "C'est quoi les badges ?",
        r: "Habitant = compte créé. Bon habitant = 3 bons validés en 1 semaine. Habitant exemplaire = 3 bons/semaine pendant 1 mois. Plus ton niveau monte, plus tu reçois les alertes en avance !",
      },
    ],
  },
  {
    id: 'fidelite-clients',
    icon: '🎯',
    titre: 'Carte fidélité — Pour les clients',
    questions: [
      {
        q: "C'est quoi la carte fidélité BONMOMENT ?",
        r: "C'est une carte fidélité universelle, gratuite, qui fonctionne chez tous les commerçants BONMOMENT avec un programme actif. À chaque passage en caisse, tu gagnes des tampons. Quand tu atteins le seuil fixé par le commerçant, tu débloques une récompense (café offert, -10%, cadeau...). Pas d'appli à télécharger, pas de carte physique à perdre.",
      },
      {
        q: "Comment j'active ma carte ?",
        r: "Va dans ton profil et clique sur \"Activer ma carte fidélité\". Tu saisis ton numéro de téléphone (06 ou 07), et c'est fini. Ce numéro sera utilisé pour retrouver ta carte chez chaque commerçant.",
      },
      {
        q: "Que fait le commerçant avec mon numéro ?",
        r: "Il l'utilise uniquement pour retrouver ta carte dans la caisse quand tu passes. Il ne peut pas te contacter ni t'envoyer de SMS. Tes données sont protégées par le RGPD et tu peux désactiver ta carte à tout moment.",
      },
      {
        q: "Est-ce que je peux changer mon numéro si je change de téléphone ?",
        r: "Oui, depuis ton profil, clique sur \"Modifier\" à côté de ton numéro lié. Si tu avais déjà utilisé ton nouveau numéro chez un commerçant, tes tampons seront fusionnés automatiquement.",
      },
      {
        q: "Comment je désactive ma carte ?",
        r: "Dans ton profil, en bas de la section carte fidélité, clique sur \"Désactiver ma carte fidélité\". Toutes tes cartes et tampons seront supprimés. Tu peux toujours réactiver plus tard avec le même numéro ou un nouveau.",
      },
    ],
  },
  {
    id: 'commercants',
    icon: '🏪',
    titre: 'Commerçants',
    questions: [
      {
        q: 'Combien coûte BONMOMENT ?',
        r: "Découverte 29€/mois (4 offres), Essentiel 49€/mois (8 offres), Pro 79€/mois (16 offres). Premier mois offert avec CB enregistrée. Bons illimités sur tous les paliers.",
      },
      {
        q: 'Faut-il un SIRET ?',
        r: "Non, le SIRET n'est pas requis à l'inscription.",
      },
      {
        q: 'Comment créer une offre ?',
        r: "Mon commerce → Créer une offre → Type, description, bons, créneau → Publier. Moins d'une minute.",
      },
      {
        q: "Durée max d'une offre ?",
        r: "24 heures. BONMOMENT est conçu pour les offres courtes et urgentes qui créent du passage en boutique.",
      },
      {
        q: 'Les bons non utilisés se reportent ?',
        r: "Non. Les bons non utilisés et les offres non publiées du mois ne se reportent pas au mois suivant.",
      },
      {
        q: 'Comment valider un bon ?',
        r: "Vérifier un bon → Scanne le QR code ou saisis le code 6 chiffres → Confirmation. Simple et rapide.",
      },
      {
        q: 'Comment fonctionne le concours ?',
        r: "Chaque client fait valider son bon chez toi. Après expiration de l'offre, un bouton Tirer au sort apparaît dans Mon commerce. Le gagnant est notifié automatiquement par email.",
      },
      {
        q: 'Comment résilier ?',
        r: "Mon commerce → Abonnement → Résilier. Prend effet fin du mois en cours. Sans engagement et sans frais.",
      },
      {
        q: 'Comment parrainer ?',
        r: "Mon commerce → Parrainage → Partage ton code. Le filleul et toi recevez une remise selon le palier choisi (Découverte -10€, Essentiel -15€, Pro -20€). Max 3 parrainages/mois.",
      },
      {
        q: 'Comment voir mes statistiques ?',
        r: "Dashboard → section Statistiques. Tu vois les bons réservés, utilisés, le taux d'utilisation, les nouveaux clients touchés et les créneaux horaires les plus actifs.",
      },
      {
        q: 'Comment fonctionnent les avis Google ?',
        r: "Quand un client utilise son bon chez toi, il est invité à laisser un avis sur ta fiche Google Business. Plus tu publies d'offres, plus tu génères de passages en boutique et donc d'avis.",
      },
      {
        q: 'Comment changer de palier ?',
        r: "Mon commerce → Abonnement → Changer de formule. Le changement est pris en compte au prochain cycle de facturation. Tu peux monter ou descendre en palier à tout moment.",
      },
      {
        q: 'Comment imprimer mon QR code vitrine ?',
        r: "Dashboard → Mon QR code → Télécharger (format A4 haute résolution). Imprime-le et affiche-le en vitrine pour que tes clients scannent directement ta page BONMOMENT.",
      },
    ],
  },
  {
    id: 'fidelite-commercants',
    icon: '🎯',
    titre: 'Carte fidélité — Pour les commerçants',
    questions: [
      {
        q: "La carte fidélité est-elle incluse dans mon abonnement ?",
        r: "Elle est incluse dans le palier Pro uniquement. Les paliers Découverte et Essentiel te donnent accès aux offres mais pas au système de fidélité. Tu peux passer au Pro à tout moment depuis ton dashboard.",
      },
      {
        q: "Comment je configure mon programme fidélité ?",
        r: "Dans ton dashboard, section \"🎯 Ma carte fidélité\", onglet \"Configuration\". Tu choisis le seuil (entre 1 et 1000 passages), la récompense (ex : \"1 café offert\") et tu actives le programme. Tes clients peuvent dès lors accumuler des tampons.",
      },
      {
        q: "Comment j'ajoute un tampon à un client ?",
        r: "Sur la page validation, tu as 3 moyens distincts :\n• Scanner le QR d'un bon actif : le bon est validé et l'écran te propose ensuite d'ajouter un tampon fidélité au client\n• Saisir le code 6 chiffres d'un bon : même comportement que le scan QR\n• Saisir le numéro de téléphone du client (existant ou nouveau) : ajout direct d'un tampon, sans toucher aux bons en cours du client\n\nTu peux choisir le nombre de tampons à ajouter (entre 1 et 10) selon le contexte (ex : \"+3\" si c'est un gros achat).",
      },
      {
        q: "Puis-je ajouter un client qui n'a pas de compte BONMOMENT ?",
        r: "Oui. Tu saisis son numéro de téléphone en caisse, il te confirme verbalement son consentement, et une carte légère est créée pour lui. S'il décide plus tard de créer un compte BONMOMENT avec le même numéro, ses tampons seront fusionnés automatiquement avec son nouveau compte.",
      },
      {
        q: "Combien de tampons je peux ajouter en un seul passage ?",
        r: "Entre 1 et 10. Pratique pour les achats importants (ex : \"1 tampon par tranche de 50€\"). Tu peux aussi ajuster manuellement les tampons d'un client depuis ta base client si besoin.",
      },
    ],
  },
  {
    id: 'donnees',
    icon: '🔒',
    titre: 'Données & Sécurité',
    questions: [
      {
        q: 'Quelles données collectez-vous ?',
        r: "Email, prénom, avatar, villes suivies, historique des bons. Aucune donnée bancaire stockée chez nous (Stripe gère les paiements de façon sécurisée). Voir notre politique de confidentialité.",
      },
      {
        q: 'Mes données sont-elles en sécurité ?',
        r: "Oui. HTTPS sur tout le site, OAuth uniquement (pas de mot de passe stocké), serveurs en Europe (Supabase + Vercel EU West), Row Level Security sur toute la base de données.",
      },
      {
        q: 'Comment exercer mes droits RGPD ?',
        r: "Écris à bonmomentapp@gmail.com. Réponse sous 30 jours. Tu peux aussi supprimer ton compte directement depuis ton profil.",
      },
    ],
  },
]

export default FAQ
