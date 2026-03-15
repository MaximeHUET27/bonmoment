import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'Mentions légales – BONMOMENT',
}

export default function MentionsLegales() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <header className="px-6 pt-8 pb-6 border-b border-[#F5F5F5] text-center">
        <Link href="/" className="inline-block mb-4">
          <Image src="/LOGO.png" alt="Logo BONMOMENT" width={600} height={300} unoptimized priority className="w-[110px] h-auto mx-auto" />
        </Link>
        <h1 className="text-2xl font-black text-[#0A0A0A]">Mentions légales</h1>
      </header>

      <section className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full flex flex-col gap-8 text-[#3D3D3D] text-sm leading-relaxed">

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">Éditeur du site</h2>
          <p><strong className="text-[#0A0A0A]">Maxime HUET</strong></p>
          <p>Auto-entrepreneur</p>
          <p>7 rue du Chesne, 27190 Nogent-le-Sec</p>
          <p>Téléphone : <a href="tel:0637665078" className="text-[#FF6B00] hover:text-[#CC5500]">06 37 66 50 78</a></p>
          <p>Email : <a href="mailto:bonmomentapp@gmail.com" className="text-[#FF6B00] hover:text-[#CC5500]">bonmomentapp@gmail.com</a></p>
          <p className="mt-2">SIRET : <em>en cours d'immatriculation</em></p>
          <p>N° TVA intracommunautaire : <em>en cours</em></p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">Directeur de publication</h2>
          <p>Maxime HUET</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">Hébergeur</h2>
          <p><strong className="text-[#0A0A0A]">Vercel Inc.</strong></p>
          <p>340 Pine Street, Suite 1201</p>
          <p>San Francisco, CA 94104 – États-Unis</p>
          <p><a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-[#FF6B00] hover:text-[#CC5500]">vercel.com</a></p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">Propriété intellectuelle</h2>
          <p>L'ensemble du contenu de ce site (textes, images, logo, design) est la propriété exclusive de Maxime HUET. Toute reproduction, même partielle, est interdite sans autorisation préalable.</p>
        </div>

        <div>
          <h2 className="text-base font-black text-[#0A0A0A] mb-3 uppercase tracking-widest text-xs text-[#FF6B00]">Droit applicable</h2>
          <p>Droit français. Tout litige sera soumis à la compétence des tribunaux d'Évreux (27).</p>
        </div>

      </section>
    </main>
  )
}
