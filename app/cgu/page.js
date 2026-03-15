import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: "Conditions Générales d'Utilisation – BONMOMENT",
  description: "CGU de BONMOMENT – Conditions d'utilisation pour les clients (habitants).",
}

export default function CGU() {
  return (
    <main className="min-h-screen bg-white flex flex-col">

      <header className="px-6 pt-8 pb-6 border-b border-[#F5F5F5] text-center">
        <Link href="/" className="inline-block mb-4">
          <Image src="/LOGO.png" alt="Logo BONMOMENT" width={600} height={300} unoptimized priority className="w-[110px] h-auto mx-auto" />
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] mb-1">bonmoment.app</p>
        <h1 className="text-2xl sm:text-3xl font-black text-[#0A0A0A]">Conditions Générales d'Utilisation</h1>
        <p className="text-xs text-[#3D3D3D]/60 mt-1">Clients — Habitants — Mars 2026</p>
        <p className="text-xs text-[#3D3D3D]/50 mt-3 max-w-xl mx-auto leading-relaxed">
          Ces Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme BONMOMENT par les clients (habitants). En accédant à la plateforme ou en créant un compte, vous acceptez sans réserve les présentes CGU.
        </p>
      </header>

      <section className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full flex flex-col gap-10 text-[#3D3D3D] text-sm leading-relaxed">

        {/* 1. Présentation */}
        <div>
          <SectionTitle num="1">Présentation de la plateforme</SectionTitle>
          <p className="mt-3">
            BONMOMENT (bonmoment.app) est une plateforme web permettant aux habitants de découvrir et de réserver des offres promotionnelles horodatées publiées par des commerçants de proximité. L'accès à la plateforme est gratuit pour les clients.
          </p>
          <table className="w-full text-sm border-collapse mt-4">
            <tbody>
              <Tr label="Éditeur" value="Maxime HUET — Auto-entrepreneur" />
              <Tr label="Adresse" value="7 rue du Chesne, 27190 Nogent-le-Sec" />
              <Tr label="Email" value={<a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a>} />
              <Tr label="Site" value={<a href="https://bonmoment.app" className="text-[#FF6B00] hover:text-[#CC5500]">bonmoment.app</a>} last />
            </tbody>
          </table>
        </div>

        {/* 2. Accès */}
        <div>
          <SectionTitle num="2">Accès à la plateforme</SectionTitle>
          <SubTitle>2.1 Accès sans compte</SubTitle>
          <p className="mt-2">
            La consultation des offres disponibles est accessible sans création de compte, via le site bonmoment.app ou par scan d'un QR code chez un commerçant partenaire.
          </p>
          <SubTitle className="mt-4">2.2 Création de compte</SubTitle>
          <p className="mt-2">
            La réservation d'un bon nécessite la création d'un compte. L'inscription s'effectue exclusivement via un compte social existant (Google, Facebook, Apple ou Microsoft/Outlook). En vous inscrivant, vous confirmez :
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Avoir au moins 16 ans (conformément à l'article 8 du RGPD)</li>
            <li>Fournir des informations exactes et à jour</li>
            <li>Être responsable de la confidentialité de votre accès</li>
          </ul>
          <SubTitle className="mt-4">2.3 Résiliation du compte</SubTitle>
          <p className="mt-2">
            Vous pouvez supprimer votre compte à tout moment depuis les paramètres de l'application via le bouton « Supprimer mon compte ». La suppression entraîne l'effacement de toutes vos données personnelles dans un délai de 30 jours.
          </p>
        </div>

        {/* 3. Fonctionnement */}
        <div>
          <SectionTitle num="3">Fonctionnement des bons</SectionTitle>
          <SubTitle>3.1 Réservation</SubTitle>
          <p className="mt-2">
            Chaque offre publiée par un commerçant dispose d'un nombre de bons disponibles (ou d'un nombre illimité). La réservation d'un bon est gratuite et génère un code à 6 chiffres ainsi qu'un QR code à présenter en caisse.
          </p>
          <SubTitle className="mt-4">3.2 Validité</SubTitle>
          <p className="mt-2">
            Un bon est valable uniquement pendant la plage horaire définie par le commerçant. Passé ce délai, le bon expire automatiquement. Aucune pénalité n'est appliquée en cas de non-utilisation.
          </p>
          <SubTitle className="mt-4">3.3 Utilisation</SubTitle>
          <p className="mt-2">
            Chaque bon est à usage unique et personnel. Il ne peut pas être cédé, revendu ou utilisé par une tierce personne. Un bon ne peut être réservé qu'une seule fois par offre et par compte.
          </p>
          <SubTitle className="mt-4">3.4 Annulation par le commerçant</SubTitle>
          <p className="mt-2">
            Si un commerçant annule une offre après publication, vous serez notifié par email et/ou push notification. Le bon réservé est annulé sans frais pour vous.
          </p>
        </div>

        {/* 4. Comportement */}
        <div>
          <SectionTitle num="4">Comportement sur la plateforme</SectionTitle>
          <p className="mt-3">En utilisant BONMOMENT, vous vous engagez à ne pas :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Créer plusieurs comptes pour un même utilisateur</li>
            <li>Tenter de réserver des bons de manière automatisée ou massive</li>
            <li>Usurper l'identité d'un autre utilisateur ou d'un commerçant</li>
            <li>Publier des contenus diffamatoires, injurieux ou illicites</li>
            <li>Tenter de contourner les mesures de sécurité de la plateforme</li>
          </ul>
          <p className="mt-3">Tout manquement à ces règles peut entraîner la suspension ou la suppression immédiate de votre compte.</p>
        </div>

        {/* 5. Badges */}
        <div>
          <SectionTitle num="5">Système de badges</SectionTitle>
          <p className="mt-3">La plateforme propose un système de badges progressifs récompensant l'engagement :</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#F5F5F5]">
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tl-xl">Badge</th>
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tr-xl">Condition d'obtention</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#F5F5F5]">
                  <td className="px-4 py-3 font-semibold text-[#FF6B00]">Habitant</td>
                  <td className="px-4 py-3">Inscription sur la plateforme</td>
                </tr>
                <tr className="border-b border-[#F5F5F5]">
                  <td className="px-4 py-3 font-semibold text-[#FF6B00]">Bon habitant</td>
                  <td className="px-4 py-3">3 bons validés en 1 semaine</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-[#FF6B00]">Habitant exemplaire</td>
                  <td className="px-4 py-3">3 bons validés par semaine pendant 1 mois consécutif</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">Les badges sont attribués automatiquement. Ils n'ont pas de valeur monétaire et ne peuvent pas être échangés.</p>
        </div>

        {/* 6. Responsabilités */}
        <div>
          <SectionTitle num="6">Responsabilités</SectionTitle>
          <SubTitle>6.1 Responsabilité de BONMOMENT</SubTitle>
          <p className="mt-2">
            BONMOMENT agit en tant qu'intermédiaire technique entre les commerçants et les clients. BONMOMENT ne peut être tenu responsable :
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>De la qualité des offres proposées par les commerçants</li>
            <li>De l'exécution ou de la non-exécution des offres par les commerçants</li>
            <li>Des interruptions temporaires de service pour maintenance ou incident technique</li>
          </ul>
          <SubTitle className="mt-4">6.2 Responsabilité du client</SubTitle>
          <p className="mt-2">
            Le client est seul responsable de l'usage qu'il fait des bons réservés et du respect des conditions posées par chaque commerçant.
          </p>
        </div>

        {/* 7. Propriété intellectuelle */}
        <div>
          <SectionTitle num="7">Propriété intellectuelle</SectionTitle>
          <p className="mt-3">
            L'ensemble des éléments de la plateforme BONMOMENT (logo, textes, interface, code source) est protégé par le droit de la propriété intellectuelle. Toute reproduction non autorisée est interdite.
          </p>
        </div>

        {/* 8. Modifications */}
        <div>
          <SectionTitle num="8">Modifications des CGU</SectionTitle>
          <p className="mt-3">
            BONMOMENT se réserve le droit de modifier les présentes CGU à tout moment. Vous serez informé de toute modification substantielle par email et/ou via la plateforme. La poursuite de l'utilisation du service après notification vaut acceptation des nouvelles CGU.
          </p>
        </div>

        {/* 9. Loi applicable */}
        <div>
          <SectionTitle num="9">Loi applicable et juridiction</SectionTitle>
          <p className="mt-3">
            Les présentes CGU sont soumises au droit français. En cas de litige, une solution amiable sera recherchée en priorité. À défaut, les tribunaux compétents de la juridiction d'Évreux seront saisis.
          </p>
          <p className="mt-3">
            Conformément à l'article L.612-1 du Code de la consommation, vous pouvez recourir à un médiateur de la consommation en cas de litige non résolu.
          </p>
        </div>

        {/* 10. Contact */}
        <div>
          <SectionTitle num="10">Contact</SectionTitle>
          <p className="mt-3">
            Pour toute question relative aux présentes CGU :{' '}
            <a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a>
          </p>
        </div>

        <p className="text-xs text-[#3D3D3D]/40 text-center pt-4 border-t border-[#F5F5F5]">
          Document établi le Mars 2026 — bonmoment.app — Maxime HUET — Loi Toubon : document intégralement en français
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
