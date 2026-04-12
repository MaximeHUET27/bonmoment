'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/app/context/AuthContext'

const ADMIN_EMAIL = 'bonmomentapp@gmail.com'

const NAV = [
  { href: '/admin',                label: 'Dashboard',      icon: '📊' },
  { href: '/admin/commercants',    label: 'Commerçants',    icon: '🏪' },
  { href: '/admin/clients',        label: 'Clients',        icon: '👥' },
  { href: '/admin/offres',         label: 'Offres',         icon: '🎟️' },
  { href: '/admin/villes',         label: 'Villes',         icon: '📍' },
  { href: '/admin/comptabilite',   label: 'Comptabilité',   icon: '💰' },
]

export default function AdminLayout({ children }) {
  const { user, loading, signOut } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && (!user || user.email !== ADMIN_EMAIL)) {
      router.replace('/')
    }
  }, [user, loading, router])

  if (loading || !user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* ── Header ── */}
      <header className="bg-white border-b border-[#EBEBEB] sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex items-center gap-3 h-14">
          <Link href="/admin">
            <Image src="/LOGO.png" alt="BONMOMENT" width={600} height={300} unoptimized priority className="w-[90px] h-auto" />
          </Link>
          <span className="text-[10px] font-black text-white bg-[#FF6B00] px-2 py-0.5 rounded-full tracking-wider uppercase shrink-0">
            ADMIN
          </span>

          {/* Nav desktop */}
          <nav className="hidden sm:flex items-center gap-1 ml-4">
            {NAV.map(n => {
              const active = pathname === n.href || (n.href !== '/admin' && pathname.startsWith(n.href))
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#FF6B00] text-white'
                      : 'text-[#3D3D3D] hover:bg-[#FFF0E0] hover:text-[#FF6B00]'
                  }`}
                >
                  <span className="text-base">{n.icon}</span>
                  {n.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:block text-xs text-[#3D3D3D]/50 truncate max-w-[160px]">{user.email}</span>
            <button
              onClick={() => signOut().then(() => router.push('/'))}
              className="text-xs text-[#3D3D3D]/60 hover:text-[#FF6B00] transition-colors whitespace-nowrap"
            >
              Quitter →
            </button>
          </div>
        </div>

        {/* Nav mobile */}
        <nav className="sm:hidden flex gap-1 px-3 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {NAV.map(n => {
            const active = pathname === n.href || (n.href !== '/admin' && pathname.startsWith(n.href))
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#FF6B00] text-white'
                    : 'bg-[#F5F5F5] text-[#3D3D3D] hover:text-[#FF6B00]'
                }`}
              >
                <span>{n.icon}</span>
                {n.label}
              </Link>
            )
          })}
        </nav>
      </header>

      {/* ── Contenu ── */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}
