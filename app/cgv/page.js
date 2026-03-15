import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'Conditions Générales de Vente – BONMOMENT',
}

export default function CGV() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <header className="px-6 pt-8 pb-6 border-b border-[#F5F5F5] text-center">
        <Link href="/" className="inline-block mb-4">
          <Image src="/LOGO.png" alt="Logo BONMOMENT" width={600} height={300} unoptimized priority className="w-[110px] h-auto mx-auto" />
        </Link>
        <h1 className="text-2xl font-black text-[#0A0A0A]">Conditions Générales de Vente</h1>
        <p className="text-xs text-[#3D3D3D]/60 mt-1">Pour les commerçants – Version du 15 mars 2026</p>
      </header>

      <section className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full flex flex-col gap-8 text-[#3D3D3D] text-sm leading-relaxed">

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">1. Offre commerciale</h2>
          <p>BONMOMENT propose trois formules d'abonnement aux commerçants :</p>
          <div className="mt-3 space-y-3">
            <div className="bg-[#F5F5F5] rounded-2xl px-4 py-3">
              <p className="font-black text-[#0A0A0A]">Découverte</p>
              <p>29 € HT/mois · <strong>34,80 € TTC</strong> · 4 bons plans actifs simultanément</p>
            </div>
            <div className="bg-[#FFF0E0] rounded-2xl px-4 py-3 border border-[#FF6B00]/20">
              <p className="font-black text-[#0A0A0A]">Essentiel <span className="text-[#FF6B00] text-xs font-semibold ml-1">Populaire</span></p>
              <p>49 € HT/mois · <strong>58,80 € TTC</strong> · 8 bons plans actifs simultanément</p>
            </div>
            <div className="bg-[#F5F5F5] rounded-2xl px-4 py-3">
              <p className="font-black text-[#0A0A0A]">Pro</p>
              <p>79 € HT/mois · <strong>94,80 € TTC</strong> · 16 bons plans actifs simultanément</p>
            </div>
          </div>
          <p className="mt-3">Le nombre de bons émis par offre est illimité. La TVA applicable est de 20 %.</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">2. Période d'essai</h2>
          <p>Le premier mois est offert avec enregistrement d'une carte bancaire valide. Aucun prélèvement n'est effectué avant la fin de la période d'essai. Le commerçant peut résilier avant la fin du premier mois sans frais.</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">3. Facturation et paiement</h2>
          <p>L'abonnement est prélevé mensuellement par carte bancaire via Stripe. Le paiement est dû en début de période. En cas d'échec de paiement, l'accès aux fonctionnalités commerçant est suspendu jusqu'à régularisation.</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">4. Résiliation</h2>
          <p>La résiliation peut être effectuée à tout moment depuis l'espace Mon commerce. Elle prend effet à la fin du mois en cours. Aucun remboursement partiel n'est accordé pour la période déjà facturée.</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">5. Parrainage</h2>
          <p>Chaque commerçant dispose d'un code de parrainage unique et permanent. Ce code est valable 3 mois puis automatiquement régénéré.</p>
          <p className="mt-2">Lorsqu'un filleul souscrit via ce code, le parrain et le filleul bénéficient tous deux d'une remise sur leur prochain mois :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Filleul Découverte : <strong className="text-[#0A0A0A]">10 € de remise</strong> pour le parrain et le filleul</li>
            <li>Filleul Essentiel : <strong className="text-[#0A0A0A]">15 € de remise</strong> pour le parrain et le filleul</li>
            <li>Filleul Pro : <strong className="text-[#0A0A0A]">20 € de remise</strong> pour le parrain et le filleul</li>
          </ul>
          <p className="mt-2">Maximum 3 parrainages pris en compte par mois calendaire.</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">6. Obligations du commerçant</h2>
          <p>Le commerçant s'engage à honorer les bons émis via BONMOMENT selon les conditions de son offre. Il est seul responsable du contenu de ses offres et de leur légalité. BONMOMENT ne peut être tenu responsable d'un litige entre le commerçant et un habitant.</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">7. Droit applicable</h2>
          <p>Les présentes CGV sont soumises au droit français. Tout litige sera porté devant les tribunaux compétents d'Évreux (27).</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">8. Contact</h2>
          <p><a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a></p>
        </div>

      </section>
    </main>
  )
}
