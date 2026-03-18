import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className="text-6xl">🗺️</div>
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-black text-[#0A0A0A]">Page introuvable</h1>
        <p className="text-sm text-[#3D3D3D]/60 max-w-xs leading-relaxed">
          Cette page n&apos;existe pas ou a été déplacée. Pas de panique !
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/"
          className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm py-4 rounded-2xl transition-colors min-h-[52px] flex items-center justify-center"
        >
          🏠 Retour à l&apos;accueil
        </Link>
        <Link
          href="/aide"
          className="w-full border-2 border-[#FF6B00] text-[#FF6B00] font-black text-sm py-4 rounded-2xl hover:bg-[#FFF0E0] transition-colors min-h-[52px] flex items-center justify-center"
        >
          💬 Besoin d&apos;aide ?
        </Link>
        <Link
          href="/aide/contact"
          className="text-xs text-[#3D3D3D]/50 hover:text-[#FF6B00] transition-colors py-2"
        >
          📧 Contacter Maxime directement
        </Link>
      </div>
    </main>
  )
}
