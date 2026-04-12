'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import FAQ from '@/data/faq-data'

/* ── Remove accents for search ───────────────────────────────────────────── */
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/* ── Accordion item ──────────────────────────────────────────────────────── */
function FaqItem({ q, r, highlight }) {
  const [open, setOpen] = useState(false)

  function highlightText(text) {
    if (!highlight) return text
    const norm = normalize(text)
    const normQ = normalize(highlight)
    const idx = norm.indexOf(normQ)
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-[#FFF0E0] text-[#FF6B00] rounded px-0.5 not-italic">
          {text.slice(idx, idx + highlight.length)}
        </mark>
        {text.slice(idx + highlight.length)}
      </>
    )
  }

  return (
    <div className="border-b border-[#F0F0F0] last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left min-h-[52px]"
      >
        <span className="text-sm font-bold text-[#0A0A0A] leading-snug">
          {highlightText(q)}
        </span>
        <span
          className={`shrink-0 text-[#FF6B00] text-lg transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="pb-4 pr-8">
          <p className="text-sm text-[#3D3D3D]/80 leading-relaxed">{highlightText(r)}</p>
        </div>
      )}
    </div>
  )
}

/* ── Page principale ─────────────────────────────────────────────────────── */
export default function AidePage() {
  const [search, setSearch] = useState('')

  const normSearch = normalize(search.trim())

  const filteredFaq = normSearch.length < 2
    ? FAQ
    : FAQ.map(cat => ({
        ...cat,
        questions: cat.questions.filter(
          ({ q, r }) =>
            normalize(q).includes(normSearch) ||
            normalize(r).includes(normSearch)
        ),
      })).filter(cat => cat.questions.length > 0)

  const totalResults = filteredFaq.reduce((sum, c) => sum + c.questions.length, 0)

  return (
    <main className="min-h-screen bg-[#F5F5F5]">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="w-full bg-white border-b border-[#EBEBEB] px-5 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link href="/">
          <Image src="/LOGO.png" alt="BONMOMENT" width={600} height={300} unoptimized priority className="w-[110px] h-auto" />
        </Link>
        <Link href="/" className="bg-[#FF6B00] hover:bg-[#CC5500] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors min-h-[44px] flex items-center whitespace-nowrap">
          Accueil
        </Link>
      </header>

      <div className="bg-white border-b border-[#EBEBEB] px-5 py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-black text-[#0A0A0A] mb-1">Besoin d&apos;aide ?</h1>
          <p className="text-sm text-[#3D3D3D]/60 mb-5">
            Trouve ta réponse parmi nos {FAQ.reduce((s, c) => s + c.questions.length, 0)} questions fréquentes.
          </p>

          {/* Search */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg pointer-events-none">🔍</span>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Recherche ta question..."
              className="w-full pl-11 pr-4 py-3.5 bg-[#F5F5F5] border-2 border-[#E0E0E0] focus:border-[#FF6B00] focus:outline-none rounded-2xl text-sm font-semibold text-[#0A0A0A] placeholder:font-normal placeholder:text-[#3D3D3D]/40 transition-colors"
            />
          </div>

          {/* Result count */}
          {normSearch.length >= 2 && (
            <p className="text-xs text-[#3D3D3D]/50 mt-2 font-medium">
              {totalResults === 0
                ? 'Aucun résultat'
                : `${totalResults} résultat${totalResults > 1 ? 's' : ''}`}
            </p>
          )}
        </div>
      </div>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-5 py-6 flex flex-col gap-5">

        {filteredFaq.length === 0 ? (
          <div className="bg-white rounded-3xl px-6 py-10 text-center flex flex-col items-center gap-4">
            <div className="text-5xl">🤔</div>
            <p className="font-black text-[#0A0A0A]">On n&apos;a pas la réponse ici…</p>
            <p className="text-sm text-[#3D3D3D]/60">Contacte l&apos;équipe BONMOMENT directement !</p>
            <Link
              href="/aide/contact"
              className="bg-[#FF6B00] text-white font-black text-sm px-6 py-3 rounded-2xl hover:bg-[#CC5500] transition-colors"
            >
              📧 Contacter BONMOMENT →
            </Link>
          </div>
        ) : (
          filteredFaq.map(cat => (
            <div key={cat.id} className="bg-white rounded-3xl px-6 py-2 shadow-sm">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-[#FF6B00] py-4 flex items-center gap-2">
                <span>{cat.icon}</span>
                <span>{cat.titre}</span>
              </h2>
              {cat.questions.map((item, i) => (
                <FaqItem
                  key={i}
                  q={item.q}
                  r={item.r}
                  highlight={normSearch.length >= 2 ? search.trim() : ''}
                />
              ))}
            </div>
          ))
        )}

        {/* Contact CTA */}
        <div className="bg-[#0A0A0A] rounded-3xl px-6 py-6 flex flex-col items-center gap-3 text-center">
          <p className="text-white font-black text-base">Tu n&apos;as pas trouvé ta réponse ?</p>
          <p className="text-white/60 text-sm">L&apos;équipe BONMOMENT te répond sous 24h.</p>
          <Link
            href="/aide/contact"
            className="bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm px-6 py-3 rounded-2xl transition-colors min-h-[44px] flex items-center"
          >
            📧 Contacter BONMOMENT →
          </Link>
        </div>

      </div>
    </main>
  )
}
