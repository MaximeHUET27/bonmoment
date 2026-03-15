import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'Politique de confidentialité – BONMOMENT',
}

export default function Confidentialite() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <header className="px-6 pt-8 pb-6 border-b border-[#F5F5F5] text-center">
        <Link href="/" className="inline-block mb-4">
          <Image src="/LOGO.png" alt="Logo BONMOMENT" width={600} height={300} unoptimized priority className="w-[110px] h-auto mx-auto" />
        </Link>
        <h1 className="text-2xl font-black text-[#0A0A0A]">Politique de confidentialité</h1>
        <p className="text-xs text-[#3D3D3D]/60 mt-1">Version du 15 mars 2026 – Conforme RGPD</p>
      </header>

      <section className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full flex flex-col gap-8 text-[#3D3D3D] text-sm leading-relaxed">

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">1. Responsable du traitement</h2>
          <p>Maxime HUET – Auto-entrepreneur</p>
          <p>7 rue du Chesne, 27190 Nogent-le-Sec</p>
          <p><a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a></p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">2. Données collectées</h2>
          <p>Selon ton usage, nous collectons :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong className="text-[#0A0A0A]">Habitants :</strong> email, nom, avatar (via OAuth), villes abonnées, historique de réservations, badge</li>
            <li><strong className="text-[#0A0A0A]">Commerçants :</strong> email, nom du commerce, adresse, catégorie, photos, informations d'abonnement (via Stripe), code de parrainage</li>
          </ul>
          <p className="mt-2">Aucune donnée bancaire n'est stockée par BONMOMENT. Les paiements sont traités par Stripe.</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">3. Sous-traitants et transferts</h2>
          <div className="space-y-2 mt-2">
            <div className="bg-[#F5F5F5] rounded-xl px-4 py-3">
              <p><strong className="text-[#0A0A0A]">Supabase</strong> – Base de données et authentification – Région EU West (Frankfurt)</p>
            </div>
            <div className="bg-[#F5F5F5] rounded-xl px-4 py-3">
              <p><strong className="text-[#0A0A0A]">Vercel Inc.</strong> – Hébergement de l'application – Région EU West</p>
            </div>
            <div className="bg-[#F5F5F5] rounded-xl px-4 py-3">
              <p><strong className="text-[#0A0A0A]">Stripe Inc.</strong> – Gestion des paiements commerçants</p>
            </div>
            <div className="bg-[#F5F5F5] rounded-xl px-4 py-3">
              <p><strong className="text-[#0A0A0A]">Brevo (ex Sendinblue)</strong> – Envoi des emails d'alertes aux habitants</p>
            </div>
          </div>
          <p className="mt-3">Les prestataires basés hors UE (Stripe, Vercel) opèrent sous des garanties appropriées (clauses contractuelles types, Privacy Shield successeur).</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">4. Finalités du traitement</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Fourniture du service (réservation de bons, gestion du compte)</li>
            <li>Envoi d'alertes de ta ville (emails quotidiens selon badge)</li>
            <li>Facturation des abonnements commerçants</li>
            <li>Amélioration du service (statistiques anonymisées)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">5. Durée de conservation</h2>
          <p>Les données de compte sont conservées tant que le compte est actif. En cas de suppression, elles sont effacées sous 30 jours. Les données de facturation sont conservées 10 ans (obligation légale).</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">6. Tes droits (RGPD)</h2>
          <p>Conformément au RGPD, tu disposes des droits suivants :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong className="text-[#0A0A0A]">Accès</strong> à tes données personnelles</li>
            <li><strong className="text-[#0A0A0A]">Rectification</strong> des données inexactes</li>
            <li><strong className="text-[#0A0A0A]">Effacement</strong> (droit à l'oubli)</li>
            <li><strong className="text-[#0A0A0A]">Portabilité</strong> de tes données</li>
            <li><strong className="text-[#0A0A0A]">Opposition</strong> au traitement à des fins marketing</li>
            <li><strong className="text-[#0A0A0A]">Limitation</strong> du traitement</li>
          </ul>
          <p className="mt-3">Pour exercer ces droits, contacte-nous à <a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a>. Réponse sous 30 jours.</p>
          <p className="mt-2">Tu peux également introduire une réclamation auprès de la <strong className="text-[#0A0A0A]">CNIL</strong> (cnil.fr).</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">7. Cookies</h2>
          <p>BONMOMENT utilise uniquement des cookies techniques strictement nécessaires au fonctionnement du service (session d'authentification). Aucun cookie publicitaire ou de traçage tiers n'est utilisé.</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">8. Sécurité</h2>
          <p>Les données sont stockées en région EU West avec chiffrement en transit (TLS) et au repos. L'accès aux données est contrôlé par des règles de sécurité au niveau des lignes (RLS) côté base de données.</p>
        </div>

      </section>
    </main>
  )
}
