import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'Mentions légales – BONMOMENT',
  description: 'Mentions légales de bonmoment.app – Maxime HUET, auto-entrepreneur.',
}

export default function MentionsLegales() {
  return (
    <main className="min-h-screen bg-white flex flex-col">

      <header className="px-6 pt-8 pb-6 border-b border-[#F5F5F5] text-center">
        <Link href="/" className="inline-block mb-4">
          <Image src="/LOGO.png" alt="Logo BONMOMENT" width={600} height={300} unoptimized priority className="w-[110px] h-auto mx-auto" />
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] mb-1">bonmoment.app</p>
        <h1 className="text-2xl sm:text-3xl font-black text-[#0A0A0A]">Mentions légales</h1>
        <p className="text-xs text-[#3D3D3D]/60 mt-1">Version en vigueur : Mars 2026</p>
        <p className="text-xs text-[#3D3D3D]/50 mt-3 max-w-xl mx-auto leading-relaxed">
          Ces mentions légales sont obligatoires en vertu de la Loi pour la Confiance dans l'Économie Numérique (LCEN) du 21 juin 2004. Leur absence est passible d'une amende pouvant aller jusqu'à 75 000 €.
        </p>
      </header>

      <section className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full flex flex-col gap-10 text-[#3D3D3D] text-sm leading-relaxed">

        {/* 1. Éditeur */}
        <div>
          <SectionTitle num="1">Éditeur du site</SectionTitle>
          <table className="w-full text-sm border-collapse mt-3">
            <tbody>
              <Tr label="Nom et prénom" value="Maxime HUET" />
              <Tr label="Statut juridique" value="Auto-entrepreneur (Entrepreneur Individuel)" />
              <Tr label="Adresse postale" value="7 rue du Chesne, 27190 Nogent-le-Sec" />
<Tr label="Email de contact" value={<a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a>} />
              <Tr label="Site web" value={<a href="https://bonmoment.app" className="text-[#FF6B00] hover:text-[#CC5500]">bonmoment.app</a>} />
              <Tr label="SIRET" value={<em className="text-[#3D3D3D]/60">En cours d'immatriculation, à compléter dès réception</em>} />
              <Tr label="Numéro de TVA" value={<em className="text-[#3D3D3D]/60">En cours, à compléter dès réception</em>} />
              <Tr label="Directeur de la publication" value="Maxime HUET" last />
            </tbody>
          </table>
        </div>

        {/* 2. Hébergeur */}
        <div>
          <SectionTitle num="2">Hébergeur du site</SectionTitle>
          <table className="w-full text-sm border-collapse mt-3">
            <tbody>
              <Tr label="Raison sociale" value="Vercel Inc." />
              <Tr label="Adresse" value="340 Pine Street, Suite 900, San Francisco, CA 94111, États-Unis" />
              <Tr label="Site web" value={<a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-[#FF6B00] hover:text-[#CC5500]">vercel.com</a>} />
              <Tr label="Contact" value={<a href="mailto:privacy@vercel.com" className="text-[#FF6B00] hover:text-[#CC5500]">privacy@vercel.com</a>} last />
            </tbody>
          </table>
        </div>

        {/* 3. Propriété intellectuelle */}
        <div>
          <SectionTitle num="3">Propriété intellectuelle</SectionTitle>
          <p className="mt-3">
            L'ensemble du contenu du site bonmoment.app (textes, graphismes, logotypes, icônes, images, sons, vidéos, logiciels, bases de données) est la propriété exclusive de Maxime HUET ou de ses partenaires, et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
          </p>
          <p className="mt-3">
            Toute reproduction, représentation, modification, publication, adaptation ou exploitation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans l'autorisation préalable écrite de Maxime HUET, sous peine de poursuites judiciaires.
          </p>
        </div>

        {/* 4. Responsabilité */}
        <div>
          <SectionTitle num="4">Responsabilité</SectionTitle>
          <p className="mt-3">
            Maxime HUET s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur bonmoment.app. Toutefois, Maxime HUET ne peut garantir l'exactitude, la complétude ou l'actualité des informations diffusées sur ce site.
          </p>
          <p className="mt-3">
            Maxime HUET décline toute responsabilité pour tout dommage résultant de l'utilisation du site ou de l'impossibilité d'y accéder, de même que pour tout dommage causé par des virus informatiques ou tout autre élément nuisible pouvant infecter l'équipement informatique de l'utilisateur.
          </p>
        </div>

        {/* 5. Données personnelles */}
        <div>
          <SectionTitle num="5">Données personnelles</SectionTitle>
          <p className="mt-3">
            Le traitement des données personnelles collectées sur bonmoment.app est régi par la{' '}
            <Link href="/confidentialite" className="text-[#FF6B00] hover:text-[#CC5500] underline underline-offset-2">Politique de Confidentialité</Link>{' '}
            disponible sur le site. Conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679) et à la loi Informatique et Libertés modifiée, vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et d'opposition à vos données.
          </p>
          <p className="mt-3">Pour exercer ces droits, contactez : <a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a></p>
          <p className="mt-2">Vous pouvez également adresser une réclamation à la CNIL : <a href="https://cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#FF6B00] hover:text-[#CC5500]">cnil.fr</a></p>
        </div>

        {/* 6. Cookies */}
        <div>
          <SectionTitle num="6">Cookies</SectionTitle>
          <p className="mt-3">
            Le site bonmoment.app utilise des cookies techniques nécessaires au fonctionnement de la plateforme (authentification, session utilisateur). Aucun cookie publicitaire ou de traçage tiers n'est utilisé. En continuant à naviguer sur le site, vous acceptez l'utilisation de ces cookies techniques.
          </p>
        </div>

        {/* 7. Droit applicable */}
        <div>
          <SectionTitle num="7">Droit applicable et juridiction compétente</SectionTitle>
          <p className="mt-3">
            Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français seront seuls compétents.
          </p>
        </div>

        {/* 8. Médiation */}
        <div>
          <SectionTitle num="8">Médiation à la consommation</SectionTitle>
          <p className="mt-3">
            Conformément à l'article L. 612-1 du Code de la consommation, tout consommateur a le droit de recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable d'un litige. Pour plus d'informations :{' '}
            <a href="https://www.economie.gouv.fr/mediation-conso" target="_blank" rel="noopener noreferrer" className="text-[#FF6B00] hover:text-[#CC5500]">economie.gouv.fr/mediation-conso</a>
          </p>
        </div>

        {/* 9. Contact */}
        <div>
          <SectionTitle num="9">Contact</SectionTitle>
          <p className="mt-3">
            Pour toute question relative aux présentes mentions légales, vous pouvez nous contacter à l'adresse suivante :{' '}
            <a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a>
          </p>
        </div>

        {/* Lien registre CNIL */}
        <div className="bg-[#FFF0E0] border border-[#FF6B00]/20 rounded-2xl px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#FF6B00] mb-2">Document interne RGPD</p>
          <p className="text-sm text-[#3D3D3D] mb-3">
            Conformément à l'article 30 du RGPD, BONMOMENT tient un registre des activités de traitement.
          </p>
          <Link
            href="/registre-cnil"
            className="inline-block text-xs font-bold text-[#FF6B00] underline underline-offset-2 hover:text-[#CC5500] transition-colors"
          >
            Consulter le registre des traitements (CNIL) →
          </Link>
        </div>

        <p className="text-xs text-[#3D3D3D]/40 text-center pt-4 border-t border-[#F5F5F5]">
          Document généré le Mars 2026 — bonmoment.app — Maxime HUET — 7 rue du Chesne, 27190 Nogent-le-Sec
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

function Tr({ label, value, last }) {
  return (
    <tr className={`border-b ${last ? 'border-transparent' : 'border-[#F5F5F5]'}`}>
      <td className="py-2.5 pr-4 font-semibold text-[#0A0A0A] w-2/5 align-top">{label}</td>
      <td className="py-2.5 text-[#3D3D3D] align-top">{value}</td>
    </tr>
  )
}
