import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'Conditions Générales de Vente – BONMOMENT',
  description: 'CGV de BONMOMENT – Conditions de vente pour les commerçants.',
}

export default function CGV() {
  return (
    <main className="min-h-screen bg-white flex flex-col">

      <header className="px-6 pt-8 pb-6 border-b border-[#F5F5F5] text-center">
        <Link href="/" className="inline-block mb-4">
          <Image src="/LOGO.png" alt="Logo BONMOMENT" width={600} height={300} unoptimized priority className="w-[110px] h-auto mx-auto" />
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] mb-1">bonmoment.app</p>
        <h1 className="text-2xl sm:text-3xl font-black text-[#0A0A0A]">Conditions Générales de Vente</h1>
        <p className="text-xs text-[#3D3D3D]/60 mt-1">Commerçants — Mars 2026</p>
        <p className="text-xs text-[#3D3D3D]/50 mt-3 max-w-xl mx-auto leading-relaxed">
          Les présentes Conditions Générales de Vente (CGV) constituent, conformément à l&apos;article L.441-1 du Code de commerce, le socle unique de la relation commerciale entre BONMOMENT et tout commerçant souscripteur d&apos;un abonnement payant. Toute commande implique l&apos;acceptation sans réserve des présentes CGV.
        </p>
      </header>

      <section className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full flex flex-col gap-10 text-[#3D3D3D] text-sm leading-relaxed">

        {/* 1. Vendeur */}
        <div>
          <SectionTitle num="1">Vendeur</SectionTitle>
          <table className="w-full text-sm border-collapse mt-3">
            <tbody>
              <Tr label="Vendeur" value="Manon LISSE — Micro-entrepreneur" />
              <Tr label="Adresse" value="7 rue du Chesne, 27190 Nogent-le-Sec" />
              <Tr label="Email" value={<a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a>} />
              <Tr label="Site" value={<a href="https://bonmoment.app" className="text-[#FF6B00] hover:text-[#CC5500]">bonmoment.app</a>} />
              <Tr label="SIRET" value="10314509000017" />
              <Tr label="Régime TVA" value="TVA non applicable, article 293 B du CGI" last />
            </tbody>
          </table>
        </div>

        {/* 2. Objet */}
        <div>
          <SectionTitle num="2">Objet</SectionTitle>
          <p className="mt-3">
            Les présentes CGV ont pour objet de définir les conditions dans lesquelles BONMOMENT fournit au commerçant un accès à la plateforme web bonmoment.app permettant la publication d&apos;offres promotionnelles horodatées à destination des habitants des villes couvertes.
          </p>
        </div>

        {/* 3. Offres d'abonnement */}
        <div>
          <SectionTitle num="3">Offres d&apos;abonnement</SectionTitle>
          <SubTitle>3.1 Paliers tarifaires</SubTitle>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#F5F5F5]">
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tl-xl">Palier</th>
                  <th className="text-left px-4 py-2.5 font-black text-[#0A0A0A] rounded-tr-xl">Tarif et inclus</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#F5F5F5]">
                  <td className="px-4 py-3 font-semibold text-[#0A0A0A]">Découverte</td>
                  <td className="px-4 py-3">29 €/mois — 4 offres/mois — Bons illimités</td>
                </tr>
                <tr className="border-b border-[#F5F5F5] bg-[#FFF8F3]">
                  <td className="px-4 py-3 font-semibold text-[#FF6B00]">Essentiel</td>
                  <td className="px-4 py-3">49 €/mois — 8 offres/mois — Bons illimités</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-[#0A0A0A]">Pro</td>
                  <td className="px-4 py-3">79 €/mois — 16 offres/mois — Bons illimités</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[#3D3D3D]/70 italic">
            Règle commune à tous les paliers : une offre ne peut pas avoir une durée supérieure à 24 heures. Les bons non utilisés à l&apos;expiration d&apos;une offre sont automatiquement périmés et ne se reportent pas.
          </p>
          <p className="mt-2 text-xs text-[#3D3D3D]/70 italic">
            TVA non applicable, article 293 B du CGI.
          </p>

          <SubTitle className="mt-6">3.2 Période d&apos;essai gratuite</SubTitle>
          <p className="mt-2">
            Le premier mois d&apos;abonnement est offert sur le palier choisi par le commerçant lors de son inscription. L&apos;enregistrement d&apos;un moyen de paiement valide est requis pour activer cette période. Aucun prélèvement n&apos;est effectué durant cette période.
          </p>

          <div className="mt-4 bg-[#F5F5F5] rounded-2xl px-5 py-4">
            <p className="font-black text-[#0A0A0A] mb-2">Parrainage</p>
            <p className="mb-3">
              Tout commerçant actif dispose d&apos;un code de parrainage unique et permanent accessible depuis son espace « Mon commerce ». Ce dispositif fonctionne selon les règles suivantes :
            </p>
            <p className="mb-2">
              Lorsqu&apos;un nouveau commerçant s&apos;inscrit en utilisant un code de parrainage valide, le parrain et le filleul bénéficient chacun d&apos;une remise appliquée automatiquement lors du premier prélèvement Stripe, dont le montant dépend du palier souscrit par le filleul :
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>Palier Découverte (29 €/mois) : remise de <strong className="text-[#0A0A0A]">10 €</strong> pour le parrain et le filleul</li>
              <li>Palier Essentiel (49 €/mois) : remise de <strong className="text-[#0A0A0A]">15 €</strong> pour le parrain et le filleul</li>
              <li>Palier Pro (79 €/mois) : remise de <strong className="text-[#0A0A0A]">20 €</strong> pour le parrain et le filleul</li>
            </ul>
            <ul className="list-disc pl-5 space-y-1 text-[#3D3D3D]/80">
              <li>Un parrain ne peut bénéficier de cette remise que pour 3 parrainages maximum par mois calendaire — au-delà, le code reste actif mais n&apos;ouvre plus droit à la remise pour le mois en cours</li>
              <li>Chaque code de parrainage a une durée de validité de 3 mois à compter de sa date de génération. À expiration, un nouveau code est automatiquement régénéré et l&apos;ancien ne peut plus être utilisé</li>
              <li>Les remises de parrainage sont cumulables sans limite au lancement de la plateforme</li>
              <li>La remise est non remboursable, non reportable et ne peut pas être convertie en avoir</li>
              <li>BONMOMENT se réserve le droit de suspendre le bénéfice du parrainage en cas d&apos;usage frauduleux détecté (auto-parrainage, faux comptes, tentatives de contournement des limites mensuelles)</li>
            </ul>
          </div>
        </div>

        {/* 4. Paiement */}
        <div>
          <SectionTitle num="4">Modalités de paiement</SectionTitle>
          <SubTitle>4.1 Facturation</SubTitle>
          <p className="mt-2">
            La facturation est mensuelle, par prélèvement automatique via Stripe à la date anniversaire de souscription. Une facture conforme (numéro séquentiel) est automatiquement générée et envoyée par email après chaque prélèvement.
          </p>
          <SubTitle className="mt-4">4.2 Régime fiscal</SubTitle>
          <p className="mt-2">
            Les prix affichés sont en euros, montants nets. TVA non applicable, article 293 B du CGI. La mention « TVA non applicable, art. 293 B du CGI » figure sur chaque facture émise.
          </p>
          <SubTitle className="mt-4">4.3 Défaut de paiement</SubTitle>
          <p className="mt-2">
            En cas d&apos;échec de prélèvement, BONMOMENT adressera une notification par email. Sans régularisation dans un délai de 7 jours, l&apos;accès aux fonctionnalités payantes sera suspendu. Sans régularisation dans les 30 jours suivant la suspension, le compte sera résilié conformément à l&apos;article 5.
          </p>
        </div>

        {/* 5. Durée et résiliation */}
        <div>
          <SectionTitle num="5">Durée et résiliation</SectionTitle>
          <SubTitle>5.1 Durée</SubTitle>
          <p className="mt-2">
            L&apos;abonnement est souscrit mois par mois, sans engagement de durée minimale (sauf période d&apos;essai). Il se renouvelle automatiquement chaque mois jusqu&apos;à résiliation.
          </p>
          <SubTitle className="mt-4">5.2 Résiliation par le commerçant</SubTitle>
          <p className="mt-2">
            Le commerçant peut résilier son abonnement à tout moment depuis son espace « Mon commerce ». La résiliation prend effet à la fin du mois en cours. Aucun remboursement partiel n&apos;est accordé pour la période déjà payée.
          </p>
          <p className="mt-2">
            Avant la confirmation de résiliation, un bilan complet de l&apos;abonnement est présenté (bons utilisés, offres publiées, CA estimé généré).
          </p>
          <p className="mt-2">
            Une option de pause d&apos;un mois est proposée avant confirmation de la résiliation. Pendant la pause, le compte reste actif mais aucun prélèvement n&apos;est effectué. À l&apos;issue du mois de pause, l&apos;abonnement reprend automatiquement.
          </p>
          <SubTitle className="mt-4">5.3 Résiliation par BONMOMENT</SubTitle>
          <p className="mt-2">BONMOMENT se réserve le droit de résilier un abonnement en cas de :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Non-paiement après les relances prévues à l&apos;article 4.3</li>
            <li>Utilisation frauduleuse ou contraire aux présentes CGV</li>
            <li>Publication d&apos;offres illicites, trompeuses ou portant atteinte aux droits des clients</li>
          </ul>
          <p className="mt-2">En cas de résiliation par BONMOMENT pour manquement grave, aucun remboursement ne sera dû.</p>
        </div>

        {/* 6. Obligations commerçant */}
        <div>
          <SectionTitle num="6">Obligations du commerçant</SectionTitle>
          <p className="mt-3">En souscrivant à BONMOMENT, le commerçant s&apos;engage à :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Publier des offres exactes et conformes à la réalité de son activité</li>
            <li>Honorer les bons présentés par les clients dans les conditions définies</li>
            <li>Ne pas publier d&apos;offres mensongères, trompeuses ou contraires à la réglementation</li>
            <li>Informer BONMOMENT de toute fermeture temporaire ou définitive de son établissement</li>
            <li>Ne pas tenter de créer plusieurs comptes pour un même établissement</li>
          </ul>
          <p className="mt-3">Tout manquement à ces obligations pourra entraîner la suspension immédiate du compte sans remboursement.</p>
        </div>

        {/* 7. Obligations BONMOMENT */}
        <div>
          <SectionTitle num="7">Obligations de BONMOMENT</SectionTitle>
          <p className="mt-3">BONMOMENT s&apos;engage à :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Fournir l&apos;accès à la plateforme avec un niveau de disponibilité cible de 99 % (hors maintenances programmées)</li>
            <li>Notifier les maintenances programmées avec un préavis minimum de 24 heures</li>
            <li>Assurer la sécurité et la confidentialité des données du commerçant</li>
            <li>Fournir une assistance par email sous 48 heures ouvrées</li>
          </ul>
        </div>

        {/* 8. Responsabilité */}
        <div>
          <SectionTitle num="8">Responsabilité et garanties</SectionTitle>
          <p className="mt-3">
            BONMOMENT est une plateforme intermédiaire. Sa responsabilité est limitée à la fourniture de l&apos;accès technique à la plateforme. BONMOMENT ne peut être tenu responsable :
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Des litiges entre commerçants et clients concernant les offres publiées</li>
            <li>De la perte de chiffre d&apos;affaires liée à une interruption temporaire du service</li>
            <li>Des dommages indirects résultant de l&apos;utilisation de la plateforme</li>
          </ul>
          <p className="mt-3">
            La responsabilité totale de BONMOMENT ne pourra excéder les montants effectivement perçus au cours des 3 derniers mois précédant le fait générateur.
          </p>
        </div>

        {/* 9. Propriété des données */}
        <div>
          <SectionTitle num="9">Propriété des données</SectionTitle>
          <p className="mt-3">
            Les données saisies par le commerçant (offres, statistiques, historique) lui appartiennent. BONMOMENT ne vend pas ces données à des tiers. En cas de résiliation, le commerçant peut demander l&apos;export de ses données dans un délai de 30 jours suivant la fin du contrat.
          </p>
        </div>

        {/* 10. Droit de rétractation */}
        <div>
          <SectionTitle num="10">Droit de rétractation</SectionTitle>
          <p className="mt-3">
            Conformément à l&apos;article L.221-28 du Code de la consommation, le droit de rétractation ne s&apos;applique pas aux prestations de services pleinement exécutées avant la fin du délai de rétractation. Toutefois, BONMOMENT offre une période d&apos;essai gratuite d&apos;un mois permettant d&apos;évaluer le service sans engagement financier.
          </p>
        </div>

        {/* 11. Force majeure */}
        <div>
          <SectionTitle num="11">Force majeure</SectionTitle>
          <p className="mt-3">
            BONMOMENT ne pourra être tenu responsable de l&apos;inexécution de ses obligations en cas de force majeure au sens de l&apos;article 1218 du Code civil (catastrophes naturelles, pannes généralisées d&apos;infrastructure internet, décisions gouvernementales, etc.).
          </p>
        </div>

        {/* 12. Modification */}
        <div>
          <SectionTitle num="12">Modification des CGV</SectionTitle>
          <p className="mt-3">
            BONMOMENT se réserve le droit de modifier les présentes CGV. Toute modification substantielle sera notifiée par email avec un préavis de 30 jours. La poursuite de l&apos;abonnement après ce délai vaut acceptation des nouvelles conditions.
          </p>
        </div>

        {/* 13. Loi applicable */}
        <div>
          <SectionTitle num="13">Loi applicable — Juridiction — Médiation</SectionTitle>
          <p className="mt-3">
            Les présentes CGV sont soumises au droit français. En cas de litige, une résolution amiable sera recherchée en priorité (contact :{' '}
            <a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a>). À défaut, le tribunal compétent sera celui du ressort d&apos;Évreux (27).
          </p>
          <p className="mt-3">
            Conformément à l&apos;article L.612-1 du Code de la consommation, tout professionnel peut également recourir à un médiateur. Médiateur compétent pour les auto-entrepreneurs :{" "}
            <a href="https://www.mediation-des-entreprises.fr" target="_blank" rel="noopener noreferrer" className="text-[#FF6B00] hover:text-[#CC5500]">mediation-des-entreprises.fr</a>
          </p>
        </div>

        {/* 14. Contact */}
        <div>
          <SectionTitle num="14">Contact</SectionTitle>
          <p className="mt-3">
            Pour toute question relative aux présentes CGV :{' '}
            <a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a>
          </p>
        </div>

        <p className="text-xs text-[#3D3D3D]/40 text-center pt-4 border-t border-[#F5F5F5]">
          Document établi le Mars 2026 — bonmoment.app — Manon LISSE — Conforme Code de la consommation et Code de commerce français
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
