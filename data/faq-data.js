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
        q: "Mon bon a expiré, c'est grave ?",
        r: "Pas du tout ! Aucune pénalité. Le bon expire simplement à la fin de l'offre. Reviens vite, de nouvelles offres arrivent régulièrement !",
      },
      {
        q: 'Comment utiliser mon bon en caisse ?',
        r: "Présente ton écran avec le QR code au commerçant. Il le scanne ou saisit ton code 6 chiffres. En quelques secondes c'est validé !",
      },
      {
        q: "Que signifie \"C'est parti !\" ?",
        r: "L'offre est terminée. Abonne-toi au commerce pour être prévenu de la prochaine !",
      },
      {
        q: "C'est quoi les badges ?",
        r: "Habitant = compte créé. Bon habitant = 3 bons validés en 1 semaine. Habitant exemplaire = 3 bons/semaine pendant 1 mois. Plus ton niveau monte, plus tu reçois les alertes en avance !",
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
        r: "Découverte 29€ HT/mois (4 offres), Essentiel 49€ HT/mois (8 offres), Pro 79€ HT/mois (16 offres). Premier mois offert avec CB enregistrée. Bons illimités sur tous les paliers.",
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
