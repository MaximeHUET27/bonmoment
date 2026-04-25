import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'Politique de confidentialité – BONMOMENT',
  description: 'Politique de confidentialité de BONMOMENT – Conforme RGPD (UE 2016/679).',
}

export default function Confidentialite() {
  return (
    <main className="min-h-screen bg-white flex flex-col">

      <header className="px-6 pt-8 pb-6 border-b border-[#F5F5F5] text-center">
        <Link href="/" className="inline-block mb-4">
          <Image src="/LOGO.png" alt="Logo BONMOMENT" width={600} height={300} unoptimized priority className="w-[110px] h-auto mx-auto" />
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] mb-1">bonmoment.app</p>
        <h1 className="text-2xl sm:text-3xl font-black text-[#0A0A0A]">Politique de confidentialité</h1>
        <p className="text-xs text-[#3D3D3D]/60 mt-1">Version en vigueur : Avril 2026</p>
        <p className="text-xs text-[#3D3D3D]/50 mt-3 max-w-xl mx-auto leading-relaxed">
          Document établi conformément au Règlement Général sur la Protection des Données (RGPD — UE 2016/679) et à la loi Informatique et Libertés n°78-17 du 6 janvier 1978 modifiée par la loi n°2018-493 du 20 juin 2018.
        </p>
      </header>

      <section className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full flex flex-col gap-10 text-[#3D3D3D] text-sm leading-relaxed">

        {/* 1. Responsable */}
        <div>
          <SectionTitle num="1">Identité du Responsable de traitement</SectionTitle>
          <table className="w-full text-sm border-collapse mt-3">
            <tbody>
              <Tr label="Responsable de traitement" value="Manon LISSE" />
              <Tr label="SIRET" value="10314509000017" />
              <Tr label="Adresse" value="7 rue du Chesne, 27190 Nogent-le-Sec" />
              <Tr label="Email DPO / Contact RGPD" value={<a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a>} />
              <Tr label="Site web" value={<a href="https://bonmoment.app" className="text-[#FF6B00] hover:text-[#CC5500]">bonmoment.app</a>} last />
            </tbody>
          </table>
        </div>

        {/* 2. Données collectées */}
        <div>
          <SectionTitle num="2">Données collectées et finalités</SectionTitle>

          <SubTitle>2.1 Côté client (Habitant)</SubTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#F5F5F5]">
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tl-xl">Donnée collectée</th>
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tr-xl">Finalité</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Adresse email', 'Création de compte, envoi de notifications'],
                  ['Prénom / pseudo', "Affichage dans l'interface"],
                  ['Photo de profil', 'Récupérée via Google/Facebook/Apple/Microsoft si fournie'],
                  ['Villes suivies', 'Personnalisation des offres affichées'],
                  ['Commerces favoris', 'Personnalisation des alertes'],
                  ['Historique des réservations', 'Suivi des bons, calcul des badges'],
                  ['Badge de fidélité', 'Affichage et récompenses progressives'],
                  ["Date d'inscription", 'Gestion du compte'],
                ].map(([donnee, finalite], i, arr) => (
                  <tr key={i} className={i < arr.length - 1 ? 'border-b border-[#F5F5F5]' : ''}>
                    <td className="px-4 py-2.5 font-semibold text-[#0A0A0A]">{donnee}</td>
                    <td className="px-4 py-2.5">{finalite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SubTitle className="mt-6">2.2 Côté commerçant</SubTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#F5F5F5]">
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tl-xl">Donnée collectée</th>
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tr-xl">Finalité</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Adresse email', 'Création de compte, facturation, communications'],
                  ['Nom du commerce', 'Affichage sur la plateforme'],
                  ['Adresse du commerce', 'Géolocalisation, filtrage par ville'],
                  ['Place ID Google', 'Unicité du profil, anti-doublons'],
                  ['Photo de commerce', 'Affichage (récupérée via Google Places)'],
                  ["Historique des offres publiées", 'Statistiques, facturation'],
                  ['Données de paiement', 'Gérées exclusivement par Stripe — jamais stockées par BONMOMENT'],
                ].map(([donnee, finalite], i, arr) => (
                  <tr key={i} className={i < arr.length - 1 ? 'border-b border-[#F5F5F5]' : ''}>
                    <td className="px-4 py-2.5 font-semibold text-[#0A0A0A]">{donnee}</td>
                    <td className="px-4 py-2.5">{finalite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 bg-[#FFF0E0] border border-[#FF6B00]/20 rounded-2xl px-5 py-3">
            <p className="font-bold text-[#0A0A0A]">Données bancaires</p>
            <p className="mt-1">
              BONMOMENT ne stocke JAMAIS les données de carte bancaire. Ces données sont traitées exclusivement par Stripe, certifié PCI-DSS Level 1. Stripe agit en tant que sous-traitant au sens de l&apos;article 28 du RGPD.
            </p>
          </div>
        </div>

        {/* 3. Base légale */}
        <div>
          <SectionTitle num="3">Base légale des traitements</SectionTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#F5F5F5]">
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tl-xl">Traitement</th>
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tr-xl">Base légale</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Gestion des comptes et authentification", "Exécution du contrat (Art. 6.1.b RGPD)"],
                  ["Envoi de notifications et alertes", "Consentement explicite (Art. 6.1.a RGPD)"],
                  ["Facturation commerçants", "Obligation légale (Art. 6.1.c RGPD)"],
                  ["Statistiques d'usage anonymisées", "Intérêt légitime (Art. 6.1.f RGPD)"],
                  ["Conservation des factures", "Obligation légale comptable — 10 ans"],
                ].map(([traitement, base], i, arr) => (
                  <tr key={i} className={i < arr.length - 1 ? 'border-b border-[#F5F5F5]' : ''}>
                    <td className="px-4 py-2.5">{traitement}</td>
                    <td className="px-4 py-2.5 font-semibold text-[#0A0A0A]">{base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Durées de conservation */}
        <div>
          <SectionTitle num="4">Durées de conservation</SectionTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#F5F5F5]">
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tl-xl">Donnée</th>
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tr-xl">Durée de conservation</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Compte client actif", "Durée de la relation contractuelle"],
                  ["Historique des réservations", "2 ans maximum après la réservation"],
                  ["Données commerçant désabonné", "3 mois après la résiliation"],
                  ["Factures Stripe", "10 ans — obligation comptable légale"],
                  ["Logs d'activité serveur", "12 mois — suppression automatique"],
                  ["Données supprimées à la demande", "Effacement sous 30 jours ouvrés"],
                ].map(([donnee, duree], i, arr) => (
                  <tr key={i} className={i < arr.length - 1 ? 'border-b border-[#F5F5F5]' : ''}>
                    <td className="px-4 py-2.5">{donnee}</td>
                    <td className="px-4 py-2.5 font-semibold text-[#0A0A0A]">{duree}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Destinataires */}
        <div>
          <SectionTitle num="5">Destinataires des données</SectionTitle>
          <SubTitle>5.1 Sous-traitants</SubTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#F5F5F5]">
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tl-xl">Sous-traitant</th>
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tr-xl">Rôle</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Supabase (PostgreSQL)", "Stockage de la base de données — Région EU West"],
                  ["Vercel Inc.", "Hébergement de l'application — CDN mondial"],
                  ["Stripe Inc.", "Traitement des paiements — certifié PCI-DSS"],
                  ["Brevo (Sendinblue)", "Envoi des emails transactionnels"],
                  ["Google LLC", "Authentification OAuth, Places API"],
                  ["Meta Platforms", "Authentification OAuth (Facebook)"],
                  ["Apple Inc.", "Authentification OAuth (Sign in with Apple)"],
                  ["Microsoft Corporation", "Authentification OAuth (Outlook / Microsoft)"],
                ].map(([st, role], i, arr) => (
                  <tr key={i} className={i < arr.length - 1 ? 'border-b border-[#F5F5F5]' : ''}>
                    <td className="px-4 py-2.5 font-semibold text-[#0A0A0A]">{st}</td>
                    <td className="px-4 py-2.5">{role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            Tous les sous-traitants ont été sélectionnés pour leurs garanties en matière de protection des données. Des contrats de traitement de données (DPA) sont en place avec chacun d&apos;eux conformément à l&apos;article 28 du RGPD.
          </p>

          <SubTitle className="mt-5">5.2 Transferts hors UE</SubTitle>
          <p className="mt-2">
            Certains sous-traitants (Vercel, Stripe, Google, Meta, Apple, Microsoft) sont établis aux États-Unis. Ces transferts sont encadrés par les Clauses Contractuelles Types (CCT) de la Commission Européenne et/ou par les mécanismes de conformité appropriés conformément au chapitre V du RGPD.
          </p>
        </div>

        {/* 6. Droits */}
        <div>
          <SectionTitle num="6">Droits des personnes concernées</SectionTitle>
          <p className="mt-3">Conformément au RGPD (articles 15 à 22), vous disposez des droits suivants :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong className="text-[#0A0A0A]">Droit d&apos;accès</strong> : obtenir une copie de vos données personnelles</li>
            <li><strong className="text-[#0A0A0A]">Droit de rectification</strong> : corriger des données inexactes</li>
            <li><strong className="text-[#0A0A0A]">Droit à l&apos;effacement (droit à l&apos;oubli)</strong> : demander la suppression de vos données</li>
            <li><strong className="text-[#0A0A0A]">Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
            <li><strong className="text-[#0A0A0A]">Droit d&apos;opposition</strong> : vous opposer à certains traitements</li>
            <li><strong className="text-[#0A0A0A]">Droit à la limitation</strong> : demander la suspension temporaire d&apos;un traitement</li>
            <li><strong className="text-[#0A0A0A]">Droit de retrait du consentement</strong> : à tout moment, sans préjudice des traitements antérieurs</li>
          </ul>
          <p className="mt-4">Pour exercer ces droits, vous pouvez :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Utiliser le bouton « Supprimer mon compte » directement dans l&apos;application</li>
            <li>Envoyer un email à : <a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a> — Réponse sous 30 jours ouvrés</li>
            <li>Adresser une réclamation à la CNIL : <a href="https://cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#FF6B00] hover:text-[#CC5500]">cnil.fr</a> / 3 Place de Fontenoy, 75007 Paris</li>
          </ul>
        </div>

        {/* 7. Sécurité */}
        <div>
          <SectionTitle num="7">Sécurité des données</SectionTitle>
          <p className="mt-3">BONMOMENT met en œuvre les mesures techniques et organisationnelles suivantes pour protéger vos données :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong className="text-[#0A0A0A]">Chiffrement en transit</strong> : HTTPS/TLS obligatoire sur tout le domaine .app (HSTS Preload Google)</li>
            <li><strong className="text-[#0A0A0A]">Chiffrement au repos</strong> : assuré par Supabase (PostgreSQL avec chiffrement AES-256)</li>
            <li><strong className="text-[#0A0A0A]">Authentification</strong> : OAuth uniquement — aucun mot de passe stocké par BONMOMENT</li>
            <li><strong className="text-[#0A0A0A]">Contrôle d&apos;accès</strong> : Row Level Security (RLS) activé sur toutes les tables de la base de données</li>
            <li><strong className="text-[#0A0A0A]">Sauvegardes</strong> : quotidiennes automatiques assurées par Supabase</li>
            <li>Serveurs hébergés en Union Européenne (région EU West)</li>
          </ul>
        </div>

        {/* 8. Cookies */}
        <div>
          <SectionTitle num="8">Cookies et traceurs</SectionTitle>
          <p className="mt-3">BONMOMENT utilise principalement des cookies techniques strictement nécessaires au fonctionnement de la plateforme :</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#F5F5F5]">
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tl-xl">Cookie</th>
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tr-xl">Finalité et durée</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#F5F5F5]">
                  <td className="px-4 py-2.5 font-semibold text-[#0A0A0A]">Cookie de session</td>
                  <td className="px-4 py-2.5">Maintien de la connexion de l&apos;utilisateur — Session (supprimé à la fermeture)</td>
                </tr>
                <tr className="border-b border-[#F5F5F5]">
                  <td className="px-4 py-2.5 font-semibold text-[#0A0A0A]">Token d&apos;authentification</td>
                  <td className="px-4 py-2.5">Identification sécurisée — 30 jours</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-[#0A0A0A]">Cookies Stripe (__stripe_mid, __stripe_sid)</td>
                  <td className="px-4 py-2.5">Prévention de la fraude lors du paiement — Page de checkout uniquement</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            Sur certaines pages spécifiques (carte interactive de votre ville, formulaire d&apos;inscription commerçant), nous utilisons l&apos;API Google Maps pour faciliter la géolocalisation. Le chargement de cette carte entraîne le dépôt de cookies par Google à ses propres fins (préférences utilisateur). Ces cookies sont déposés uniquement lors de l&apos;affichage effectif de la carte.
          </p>
          <p className="mt-3">
            Aucun cookie publicitaire, de mesure d&apos;audience ou de traçage marketing n&apos;est utilisé sur la plateforme.
          </p>
          <p className="mt-3">
            Pour vous opposer aux cookies Google Maps, vous pouvez configurer les paramètres de votre navigateur ou de votre compte Google directement sur{' '}
            <a href="https://myaccount.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#FF6B00] hover:text-[#CC5500]">https://myaccount.google.com/privacy</a>.
          </p>
          <p className="mt-3">
            Les cookies techniques ne nécessitent pas de consentement préalable (Article 82 de la loi Informatique et Libertés modifiée).
          </p>
        </div>

        {/* 9. Notifications */}
        <div>
          <SectionTitle num="9">Notifications et communications</SectionTitle>
          <p className="mt-3">BONMOMENT peut vous envoyer les communications suivantes selon vos préférences :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong className="text-[#0A0A0A]">Email quotidien à 21h</strong> : récapitulatif des offres du lendemain sur vos villes abonnées</li>
            <li><strong className="text-[#0A0A0A]">Email instantané</strong> : notification par email envoyée en temps réel lors de la publication d&apos;une offre par un commerce suivi ou dans une ville abonnée. Activé par défaut lors de l&apos;inscription, désactivable depuis les paramètres du compte. Base légale : exécution du service (article 6.1.b du RGPD), avec possibilité de désactivation à tout moment</li>
            <li><strong className="text-[#0A0A0A]">Notifications push</strong> : alertes en temps réel pour les commerces favoris</li>
          </ul>
          <p className="mt-3">
            Vous pouvez gérer ou désactiver ces communications à tout moment depuis les paramètres de votre compte.
          </p>
        </div>

        {/* 10. Violation */}
        <div>
          <SectionTitle num="10">Violation de données</SectionTitle>
          <p className="mt-3">En cas de violation de données à caractère personnel susceptible d&apos;engendrer un risque pour vos droits et libertés, BONMOMENT s&apos;engage à :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Notifier la CNIL dans les 72 heures suivant la prise de connaissance de la violation (Article 33 RGPD)</li>
            <li>Informer les personnes concernées dans les meilleurs délais si la violation est susceptible d&apos;engendrer un risque élevé (Article 34 RGPD)</li>
          </ul>
        </div>

        {/* 11. Mise à jour */}
        <div>
          <SectionTitle num="11">Mise à jour de la politique</SectionTitle>
          <p className="mt-3">
            La présente politique de confidentialité a été mise à jour le Avril 2026. Toute modification substantielle vous sera notifiée par email et/ou via un bandeau d&apos;information sur la plateforme.
          </p>
        </div>

        {/* 12. Contact */}
        <div>
          <SectionTitle num="12">Contact</SectionTitle>
          <p className="mt-3">
            Pour toute question relative à la présente politique de confidentialité :{' '}
            <a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a>
          </p>
        </div>

        <p className="text-xs text-[#3D3D3D]/40 text-center pt-4 border-t border-[#F5F5F5]">
          Document établi le Avril 2026 — bonmoment.app — Manon LISSE — Conforme RGPD (UE 2016/679)
        </p>

      </section>
    </main>
  )
}

function SectionTitle({ num, children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#FF6B00] text-white text-xs font-black flex items-center justify-center">{num}</span>
      <h2 className="text-base font-black text-[#0A0A0A]">{children}</h2>
    </div>
  )
}

function SubTitle({ children, className }) {
  return <h3 className={`text-sm font-black text-[#1A1A1A] mt-4 ${className || ''}`}>{children}</h3>
}

function Tr({ label, value, last }) {
  return (
    <tr className={`border-b ${last ? 'border-transparent' : 'border-[#F5F5F5]'}`}>
      <td className="py-2.5 pr-4 font-semibold text-[#0A0A0A] w-2/5 align-top">{label}</td>
      <td className="py-2.5 text-[#3D3D3D] align-top">{value}</td>
    </tr>
  )
}
