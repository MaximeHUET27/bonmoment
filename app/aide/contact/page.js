'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ContactPage() {
  const [prenom,  setPrenom]  = useState('')
  const [email,   setEmail]   = useState('')
  const [profil,  setProfil]  = useState('habitant')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [toast,   setToast]   = useState(null)
  const [errors,  setErrors]  = useState({})

  function validate() {
    const errs = {}
    if (!prenom.trim())  errs.prenom  = 'Ton prénom est requis.'
    if (!email.trim() || !email.includes('@')) errs.email = 'Email invalide.'
    if (!message.trim() || message.trim().length < 10) errs.message = 'Message trop court (min 10 caractères).'
    return errs
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSending(true)
    try {
      const res = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prenom: prenom.trim(), email: email.trim(), profil, message: message.trim() }),
      })

      if (res.ok) {
        setToast("📧 Message envoyé ! L'équipe BONMOMENT te répondra sous 24h.")
        setPrenom('')
        setEmail('')
        setProfil('habitant')
        setMessage('')
        setErrors({})
      } else {
        setToast('❌ Erreur lors de l\'envoi. Écris directement à bonmomentapp@gmail.com')
      }
    } catch {
      setToast('❌ Erreur réseau. Écris directement à bonmomentapp@gmail.com')
    } finally {
      setSending(false)
      setTimeout(() => setToast(null), 6000)
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5]">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#EBEBEB] px-5 py-6">
        <div className="max-w-lg mx-auto">
          <Link
            href="/aide"
            className="text-xs text-[#3D3D3D]/50 hover:text-[#FF6B00] transition-colors mb-4 inline-block"
          >
            ← FAQ
          </Link>
          <h1 className="text-3xl font-black text-[#0A0A0A] mb-1">Besoin d&apos;aide personnalisée ?</h1>
          <p className="text-sm text-[#3D3D3D]/70 leading-relaxed">
            L&apos;équipe BONMOMENT est là pour t&apos;aider.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 flex flex-col gap-5">

        {/* ── Infos contact ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl px-6 py-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">📧</span>
            <a href="mailto:bonmomentapp@gmail.com" className="text-sm font-bold text-[#0A0A0A] hover:text-[#FF6B00] transition-colors">
              bonmomentapp@gmail.com
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl">💬</span>
            <p className="text-sm text-[#3D3D3D]/70">Réponse sous 24h</p>
          </div>
        </div>

        {/* ── Formulaire ────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl px-6 py-6 shadow-sm flex flex-col gap-4">
          <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">Envoyer un message</h2>

          {/* Prénom */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#3D3D3D]/60 uppercase tracking-widest">Prénom</label>
            <input
              type="text"
              value={prenom}
              onChange={e => setPrenom(e.target.value)}
              placeholder="Ton prénom"
              autoComplete="given-name"
              className="border-2 border-[#E0E0E0] focus:border-[#FF6B00] focus:outline-none rounded-2xl px-4 py-3 text-sm font-semibold text-[#0A0A0A] placeholder:font-normal placeholder:text-[#3D3D3D]/30 transition-colors min-h-[48px]"
            />
            {errors.prenom && <p className="text-xs text-red-500 font-semibold">⚠ {errors.prenom}</p>}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#3D3D3D]/60 uppercase tracking-widest">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ton@email.fr"
              autoComplete="email"
              className="border-2 border-[#E0E0E0] focus:border-[#FF6B00] focus:outline-none rounded-2xl px-4 py-3 text-sm font-semibold text-[#0A0A0A] placeholder:font-normal placeholder:text-[#3D3D3D]/30 transition-colors min-h-[48px]"
            />
            {errors.email && <p className="text-xs text-red-500 font-semibold">⚠ {errors.email}</p>}
          </div>

          {/* Tu es */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#3D3D3D]/60 uppercase tracking-widest">Tu es :</label>
            <div className="flex gap-3">
              {[
                { id: 'habitant',   label: 'Un habitant 🏠'    },
                { id: 'commercant', label: 'Un commerçant 🏪'  },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setProfil(id)}
                  className={`flex-1 py-3 rounded-2xl border-2 text-sm font-bold transition-all min-h-[48px] ${
                    profil === id
                      ? 'bg-[#FF6B00] border-[#FF6B00] text-white'
                      : 'border-[#E0E0E0] text-[#3D3D3D] hover:border-[#FF6B00] hover:text-[#FF6B00]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#3D3D3D]/60 uppercase tracking-widest">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Décris ton problème ou ta question..."
              rows={4}
              className="border-2 border-[#E0E0E0] focus:border-[#FF6B00] focus:outline-none rounded-2xl px-4 py-3 text-sm font-semibold text-[#0A0A0A] placeholder:font-normal placeholder:text-[#3D3D3D]/30 transition-colors resize-none"
            />
            {errors.message && <p className="text-xs text-red-500 font-semibold">⚠ {errors.message}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={sending}
            className="w-full bg-[#FF6B00] hover:bg-[#CC5500] disabled:bg-[#D0D0D0] text-white font-black text-base py-4 rounded-2xl transition-colors min-h-[56px] flex items-center justify-center gap-2"
          >
            {sending ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Envoyer →'
            )}
          </button>
        </form>

      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-[#0A0A0A] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl max-w-[90vw] text-center">
          {toast}
        </div>
      )}
    </main>
  )
}
