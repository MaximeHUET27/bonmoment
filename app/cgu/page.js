import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: "Conditions Générales d'Utilisation – BONMOMENT",
}

export default function CGU() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <header className="px-6 pt-8 pb-6 border-b border-[#F5F5F5] text-center">
        <Link href="/" className="inline-block mb-4">
          <Image src="/LOGO.png" alt="Logo BONMOMENT" width={600} height={300} unoptimized priority className="w-[110px] h-auto mx-auto" />
        </Link>
        <h1 className="text-2xl font-black text-[#0A0A0A]">Conditions Générales d'Utilisation</h1>
        <p className="text-xs text-[#3D3D3D]/60 mt-1">Pour les habitants – Version du 15 mars 2026</p>
      </header>

      <section className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full flex flex-col gap-8 text-[#3D3D3D] text-sm leading-relaxed">

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">1. Accès au service</h2>
          <p>BONMOMENT est un service gratuit permettant aux habitants de découvrir et de réserver des bons plans proposés par les commerçants de leur ville. L'accès est libre et sans abonnement pour les habitants.</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">2. Connexion et compte</h2>
          <p>La connexion s'effectue exclusivement via OAuth (Google, Facebook, Apple, Microsoft). Aucun mot de passe n'est créé ni stocké par BONMOMENT. La connexion est requise uniquement pour réserver un bon. La navigation et la consultation des bons plans restent accessibles sans compte.</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">3. Réservation de bons</h2>
          <p>Chaque bon est à usage unique et nominatif. Un bon non utilisé avant la date d'expiration est automatiquement périmé. La réservation d'un bon est gratuite. Le commerçant reste seul responsable de l'offre proposée et de sa mise en œuvre.</p>
          <p className="mt-2">En cas de concours, la validation se fait physiquement chez le commerçant, et le tirage au sort est effectué après expiration de l'offre.</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">4. Badges et récompenses</h2>
          <p>Les badges sont attribués automatiquement selon l'activité :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong className="text-[#0A0A0A]">Habitant</strong> – dès la création du compte</li>
            <li><strong className="text-[#0A0A0A]">Bon habitant</strong> – 3 bons validés en 1 semaine</li>
            <li><strong className="text-[#0A0A0A]">Habitant exemplaire</strong> – 3 bons/semaine pendant 1 mois</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">5. Alertes de ta ville</h2>
          <p>En t'inscrivant à une ville, tu reçois des alertes quotidiennes par email selon ton badge. Tu peux te désinscrire à tout moment depuis les paramètres de ton compte ou via le lien de désinscription présent dans chaque email.</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">6. Suppression du compte</h2>
          <p>Tu peux demander la suppression de ton compte à tout moment en contactant <a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a>. Les données associées seront supprimées dans un délai de 30 jours.</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">7. Responsabilité</h2>
          <p>BONMOMENT est une plateforme de mise en relation. La responsabilité de BONMOMENT ne saurait être engagée en cas de litige entre un habitant et un commerçant concernant une offre. BONMOMENT ne garantit pas la disponibilité permanente du service.</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">8. Droit applicable</h2>
          <p>Les présentes CGU sont soumises au droit français. Tout litige sera porté devant les tribunaux compétents d'Évreux (27).</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">9. Contact</h2>
          <p><a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a></p>
        </div>

      </section>
    </main>
  )
}
