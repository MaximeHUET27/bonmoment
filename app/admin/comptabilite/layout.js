'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

export const RegimeContext = createContext('micro')
export function useRegime() { return useContext(RegimeContext) }

const TABS = [
  { href: '/admin/comptabilite',              label: 'Tableau de bord' },
  { href: '/admin/comptabilite/recettes',     label: 'Recettes' },
  { href: '/admin/comptabilite/charges',      label: 'Charges' },
  { href: '/admin/comptabilite/tva',          label: 'TVA' },
  { href: '/admin/comptabilite/declarations', label: 'Déclarations' },
  { href: '/admin/comptabilite/parametres',   label: 'Paramètres' },
]

export default function ComptabiliteLayout({ children }) {
  const [regime, setRegime] = useState('micro')
  const pathname = usePathname()
  const router   = useRouter()

  useEffect(() => {
    fetch('/api/admin/comptabilite/parametres')
      .then(r => r.json())
      // eslint-disable-next-line react-hooks/set-state-in-effect
      .then(d => { if (d?.regime) setRegime(d.regime) })
  }, [])

  const activeHref = TABS.slice().reverse().find(t => pathname === t.href || pathname.startsWith(t.href + '/'))?.href || TABS[0].href

  return (
    <RegimeContext.Provider value={regime}>
    <div className="flex flex-col gap-5">
      {/* En-tête section */}
      <div>
        <h1 className="text-2xl font-black text-[#0A0A0A]">Comptabilité</h1>
        <p className="text-sm text-[#3D3D3D]/60 mt-0.5">Module pré-comptable — calibré micro → SAS</p>
      </div>

      {/* Onglets desktop */}
      <nav className="hidden sm:flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              activeHref === t.href
                ? 'bg-[#FF6B00] text-white'
                : 'bg-[#F5F5F5] text-[#3D3D3D] hover:bg-[#FFF0E0] hover:text-[#FF6B00]'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* Onglets mobile → select */}
      <select
        className="sm:hidden w-full border border-[#EBEBEB] rounded-xl px-3 py-2.5 text-sm font-semibold text-[#3D3D3D] bg-white"
        value={activeHref}
        onChange={e => router.push(e.target.value)}
      >
        {TABS.map(t => (
          <option key={t.href} value={t.href}>{t.label}</option>
        ))}
      </select>

      {children}
    </div>
    </RegimeContext.Provider>
  )
}
