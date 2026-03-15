import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'Registre des traitements (CNIL) – BONMOMENT',
  description: 'Registre des activités de traitement – Article 30 RGPD – bonmoment.app.',
}

export default function RegistreCNIL() {
  return (
    <main className="min-h-screen bg-white flex flex-col">

      <header className="px-6 pt-8 pb-6 border-b border-[#F5F5F5] text-center">
        <Link href="/" className="inline-block mb-4">
          <Image src="/LOGO.png" alt="Logo BONMOMENT" width={600} height={300} unoptimized priority className="w-[110px] h-auto mx-auto" />
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] mb-1">bonmoment.app</p>
        <h1 className="text-2xl sm:text-3xl font-black text-[#0A0A0A]">Registre des activités de traitement</h1>
        <p className="text-xs text-[#3D3D3D]/60 mt-1">Article 30 RGPD — Mars 2026</p>
        <p className="text-xs text-[#3D3D3D]/50 mt-3 max-w-xl mx-auto leading-relaxed">
          Document établi conformément à l'article 30 du Règlement Général sur la Protection des Données (RGPD — UE 2016/679). Ce registre doit être tenu à jour et présenté à la CNIL sur demande.
        </p>
        <div className="mt-4">
          <Link href="/mentions-legales" className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF6B00] hover:text-[#CC5500] transition-colors">
            ← Retour aux mentions légales
          </Link>
        </div>
      </header>

      <section className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full flex flex-col gap-10 text-[#3D3D3D] text-sm leading-relaxed">

        {/* Informations générales */}
        <div>
          <SectionTitle>Informations générales</SectionTitle>
          <table className="w-full text-sm border-collapse mt-3">
            <tbody>
              <Tr label="Responsable de traitement" value="Maxime HUET" />
              <Tr label="Qualité" value="Auto-entrepreneur — Éditeur de la plateforme bonmoment.app" />
              <Tr label="Adresse" value="7 rue du Chesne, 27190 Nogent-le-Sec" />
              <Tr label="Email DPO / Contact RGPD" value={<a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a>} />
              <Tr label="Date de création du registre" value="Mars 2026" />
              <Tr label="Dernière mise à jour" value="Mars 2026" last />
            </tbody>
          </table>
        </div>

        {/* Traitement 1 */}
        <TraitementBlock num="1" titre="Gestion des comptes clients (Habitants)">
          <TraitementTable rows={[
            ["Finalité", "Création et gestion des comptes clients — Personnalisation des offres affichées"],
            ["Base légale", "Exécution du contrat (Art. 6.1.b RGPD)"],
            ["Catégories de personnes", "Clients habitants inscrits sur la plateforme"],
            ["Données traitées", "Email, prénom, photo de profil, villes suivies, commerces favoris, historique des réservations, badge de fidélité"],
            ["Destinataires", "Supabase (stockage BDD) — Vercel (hébergement) — Brevo (emails)"],
            ["Transferts hors UE", "Vercel Inc. (USA) — CCT Commission Européenne"],
            ["Durée de conservation", "Durée de la relation contractuelle + 30 jours après suppression du compte"],
            ["Mesures de sécurité", "HTTPS/TLS, OAuth (Google/Facebook/Apple/Microsoft), RLS Supabase, chiffrement AES-256, serveurs EU"],
          ]} />
        </TraitementBlock>

        {/* Traitement 2 */}
        <TraitementBlock num="2" titre="Gestion des comptes commerçants">
          <TraitementTable rows={[
            ["Finalité", "Inscription, gestion du profil commerce, publication d'offres, statistiques"],
            ["Base légale", "Exécution du contrat (Art. 6.1.b RGPD)"],
            ["Catégories de personnes", "Commerçants inscrits sur la plateforme"],
            ["Données traitées", "Email, nom du commerce, adresse, Place ID Google, photo du commerce, historique des offres publiées"],
            ["Destinataires", "Supabase — Vercel — Stripe (paiement) — Brevo (emails) — Google Places API"],
            ["Transferts hors UE", "Vercel Inc. (USA) — Stripe Inc. (USA) — Google LLC (USA) — CCT Commission Européenne"],
            ["Durée de conservation", "Durée de la relation contractuelle + 3 mois après résiliation"],
            ["Mesures de sécurité", "HTTPS/TLS, OAuth (Google/Facebook/Apple/Microsoft), RLS Supabase, aucun mot de passe stocké"],
          ]} />
        </TraitementBlock>

        {/* Traitement 3 */}
        <TraitementBlock num="3" titre="Gestion des réservations (Bons)">
          <TraitementTable rows={[
            ["Finalité", "Enregistrement des réservations de bons, validation en caisse, prévention des fraudes"],
            ["Base légale", "Exécution du contrat (Art. 6.1.b RGPD)"],
            ["Catégories de personnes", "Clients ayant réservé au moins un bon"],
            ["Données traitées", "ID utilisateur, ID offre, code de validation à 6 chiffres, statut du bon, date de réservation, date d'utilisation"],
            ["Destinataires", "Supabase — Vercel — Commerçant concerné (accès limité à la validation)"],
            ["Transferts hors UE", "Vercel Inc. (USA) — CCT Commission Européenne"],
            ["Durée de conservation", "2 ans à compter de la date de réservation"],
            ["Mesures de sécurité", "RLS Supabase — accès restreint par rôle — HTTPS/TLS"],
          ]} />
        </TraitementBlock>

        {/* Traitement 4 */}
        <TraitementBlock num="4" titre="Facturation et paiements (Commerçants)">
          <TraitementTable rows={[
            ["Finalité", "Gestion des abonnements payants, facturation, comptabilité"],
            ["Base légale", "Obligation légale (Art. 6.1.c RGPD) + Exécution du contrat (Art. 6.1.b RGPD)"],
            ["Catégories de personnes", "Commerçants ayant souscrit un abonnement payant"],
            ["Données traitées", "Email, nom, adresse de facturation, données d'abonnement (palier, date, montant). Les données bancaires sont traitées exclusivement par Stripe et jamais stockées par BONMOMENT"],
            ["Destinataires", "Stripe Inc. (traitement paiements — PCI-DSS Level 1) — Expert-comptable si applicable"],
            ["Transferts hors UE", "Stripe Inc. (USA) — CCT Commission Européenne — Stripe est certifié Privacy Shield"],
            ["Durée de conservation", "10 ans — obligation comptable légale (Article L.123-22 du Code de commerce)"],
            ["Mesures de sécurité", "Données bancaires non stockées par BONMOMENT — Stripe certifié PCI-DSS Level 1"],
          ]} />
        </TraitementBlock>

        {/* Traitement 5 */}
        <TraitementBlock num="5" titre="Envoi de notifications et emails">
          <TraitementTable rows={[
            ["Finalité", "Envoi d'emails transactionnels (confirmations, alertes, récapitulatifs quotidiens)"],
            ["Base légale", "Consentement (Art. 6.1.a RGPD) pour les notifications marketing — Exécution du contrat pour les emails transactionnels"],
            ["Catégories de personnes", "Clients et commerçants ayant accepté les notifications"],
            ["Données traitées", "Adresse email, préférences de notification, contenu personnalisé selon les abonnements villes/commerces"],
            ["Destinataires", "Brevo (Sendinblue) — prestataire d'envoi d'emails"],
            ["Transferts hors UE", "Brevo est une société française — données stockées en UE"],
            ["Durée de conservation", "Logs d'envoi : 12 mois. Préférences : durée du compte"],
            ["Mesures de sécurité", "Chiffrement TLS des emails — Gestion des désinscriptions conforme à la loi RGPD"],
          ]} />
        </TraitementBlock>

        {/* Traitement 6 */}
        <TraitementBlock num="6" titre="Logs d'accès et sécurité">
          <TraitementTable rows={[
            ["Finalité", "Sécurité de la plateforme, détection des intrusions, résolution des incidents techniques"],
            ["Base légale", "Intérêt légitime (Art. 6.1.f RGPD) — sécurité informatique"],
            ["Catégories de personnes", "Tous les utilisateurs de la plateforme"],
            ["Données traitées", "Adresse IP, horodatage des connexions, actions effectuées (logs serveur)"],
            ["Destinataires", "Vercel (hébergement) — Supabase (BDD)"],
            ["Transferts hors UE", "Vercel Inc. (USA) — CCT Commission Européenne"],
            ["Durée de conservation", "12 mois — suppression automatique"],
            ["Mesures de sécurité", "Accès restreint aux logs (administrateur uniquement) — HTTPS/TLS"],
          ]} />
        </TraitementBlock>

        {/* Sous-traitants */}
        <div>
          <SectionTitle>Sous-traitants — Tableau récapitulatif</SectionTitle>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#F5F5F5]">
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tl-xl">Sous-traitant</th>
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tr-xl">Rôle et garanties RGPD</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Supabase Inc.", "Stockage base de données PostgreSQL — Région EU West — DPA disponible sur supabase.com"],
                  ["Vercel Inc.", "Hébergement et CDN — USA — CCT Commission Européenne — DPA disponible sur vercel.com"],
                  ["Stripe Inc.", "Traitement des paiements — USA — PCI-DSS Level 1 — DPA disponible sur stripe.com"],
                  ["Brevo (Sendinblue)", "Envoi emails transactionnels — France/UE — DPA disponible sur brevo.com"],
                  ["Google LLC", "OAuth + Places API — USA — CCT Commission Européenne — DPA disponible sur cloud.google.com"],
                  ["Meta Platforms Inc.", "OAuth Facebook — USA — CCT Commission Européenne"],
                  ["Apple Inc.", "Sign in with Apple — USA — CCT Commission Européenne"],
                  ["Microsoft Corporation", "OAuth Outlook/Microsoft — USA — CCT Commission Européenne — DPA disponible sur microsoft.com"],
                ].map(([st, role], i, arr) => (
                  <tr key={i} className={i < arr.length - 1 ? 'border-b border-[#F5F5F5]' : ''}>
                    <td className="px-4 py-2.5 font-semibold text-[#0A0A0A]">{st}</td>
                    <td className="px-4 py-2.5">{role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Checklist */}
        <div>
          <SectionTitle>Obligations à remplir avant le lancement</SectionTitle>
          <p className="mt-2 text-xs text-[#3D3D3D]/60">Liste de contrôle de conformité RGPD :</p>
          <ul className="mt-3 space-y-2">
            {[
              { done: true, text: "Remplir le présent registre des traitements (Article 30 RGPD)" },
              { done: true, text: "Publier la Politique de confidentialité sur le site" },
              { done: true, text: "Publier les CGU avec lien vers la politique de confidentialité" },
              { done: false, text: "Mettre en place le bouton « Supprimer mon compte » dans l'interface client" },
              { done: false, text: "Activer le Row Level Security (RLS) sur toutes les tables Supabase" },
              { done: false, text: "Configurer toutes les clés API en variables d'environnement Vercel" },
              { done: false, text: "Sélectionner la région EU West lors de la création du projet Supabase" },
              { done: false, text: "Sélectionner la région EU lors de la configuration Vercel" },
              { done: false, text: "Tester l'exercice du droit d'accès avant le lancement" },
              { done: false, text: "Tester l'exercice du droit d'effacement avant le lancement" },
            ].map(({ done, text }, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5 ${done ? 'bg-green-100 text-green-600' : 'bg-[#F5F5F5] text-[#3D3D3D]/40'}`}>
                  {done ? '✓' : '○'}
                </span>
                <span className={done ? 'text-[#3D3D3D]' : 'text-[#3D3D3D]/60'}>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Procédure violation */}
        <div>
          <SectionTitle>Procédure en cas de violation de données</SectionTitle>
          <p className="mt-3">En cas de violation de données à caractère personnel :</p>
          <ol className="list-decimal pl-5 mt-2 space-y-2">
            <li>Documenter immédiatement la violation (nature, données concernées, personnes affectées)</li>
            <li>Évaluer le risque pour les droits et libertés des personnes</li>
            <li>Si risque avéré : notifier la CNIL sous 72 heures via :{' '}
              <a href="https://cnil.fr/fr/notifier-une-violation-de-donnees" target="_blank" rel="noopener noreferrer" className="text-[#FF6B00] hover:text-[#CC5500]">cnil.fr/fr/notifier-une-violation-de-donnees</a>
            </li>
            <li>Si risque élevé pour les personnes : informer directement les personnes concernées</li>
            <li>Documenter les mesures correctives prises</li>
          </ol>
        </div>

        <p className="text-xs text-[#3D3D3D]/40 text-center pt-4 border-t border-[#F5F5F5]">
          Registre établi le Mars 2026 — Maxime HUET — 7 rue du Chesne, 27190 Nogent-le-Sec — À conserver et tenir à jour. Présentable à la CNIL sur demande.
        </p>

      </section>
    </main>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-base font-black text-[#0A0A0A] pb-2 border-b-2 border-[#FF6B00]/30">{children}</h2>
  )
}

function TraitementBlock({ num, titre, children }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-[#FF6B00] text-white text-xs font-black">
          Traitement n°{num}
        </span>
        <h2 className="text-base font-black text-[#0A0A0A]">{titre}</h2>
      </div>
      {children}
    </div>
  )
}

function TraitementTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse border border-[#F0F0F0] rounded-2xl overflow-hidden">
        <tbody>
          {rows.map(([param, detail], i) => (
            <tr key={i} className={i < rows.length - 1 ? 'border-b border-[#F0F0F0]' : ''}>
              <td className="px-4 py-2.5 font-semibold text-[#0A0A0A] bg-[#FAFAFA] w-1/3 align-top">{param}</td>
              <td className="px-4 py-2.5 text-[#3D3D3D] align-top">{detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Tr({ label, value, last }) {
  return (
    <tr className={`border-b ${last ? 'border-transparent' : 'border-[#F5F5F5]'}`}>
      <td className="py-2.5 pr-4 font-semibold text-[#0A0A0A] w-2/5 align-top">{label}</td>
      <td className="py-2.5 text-[#3D3D3D] align-top">{value}</td>
    </tr>
  )
}
