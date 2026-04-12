'use client'

/**
 * Bouton + animation de tirage au sort pour les concours expirés.
 * Visible uniquement si : type_remise = 'concours' ET statut = 'expiree'.
 *
 * Les modales (confirming / loading / animating / result) sont rendues via
 * createPortal sur document.body pour échapper au stacking context de la card
 * parente (overflow-hidden + relative z-10).
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { triggerConfetti } from '@/lib/confetti'

/* ─────────────────────────────────────────────────────────────────────────── */
/* Portal helper                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */

function ModalPortal({ children }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Contenu animation slot machine                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

const ITEM_H = 64

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3) }

function LotterySlot({ participants, winnerNom, onComplete }) {
  const [translateY, setTranslateY] = useState(0)
  const rafRef = useRef(null)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  const scrollList = useMemo(() => {
    const REPEATS = Math.max(5, Math.ceil(30 / Math.max(participants.length, 1)))
    const list = []
    for (let i = 0; i < REPEATS; i++) list.push(...participants)
    list.push({ id: '__winner__', nom: winnerNom })
    return list
  }, [participants, winnerNom])

  const W = scrollList.length - 1
  const targetY = ITEM_H * (1 - W)
  const duration = participants.length <= 1 ? 1500 : 3500

  useEffect(() => {
    const start = performance.now()
    function frame(now) {
      const t = Math.min((now - start) / duration, 1)
      setTranslateY(easeOutCubic(t) * targetY)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        setTimeout(() => onCompleteRef.current?.(), 500)
      }
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [targetY, duration])

  return (
    <div className="flex flex-col items-center gap-4 px-6 pt-6 pb-4 w-full">
      <p className="font-black text-xl text-[#0A0A0A]">🎰 Tirage en cours…</p>

      {/* Fenêtre slot */}
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: '200px' }}>
        {/* Surbrillance centrale */}
        <div
          className="absolute left-0 right-0 z-10 pointer-events-none rounded-xl border-2 border-[#FF6B00]"
          style={{ top: `${ITEM_H}px`, height: `${ITEM_H}px`, background: 'rgba(255,107,0,0.08)' }}
        />
        {/* Fondu haut */}
        <div
          className="absolute top-0 left-0 right-0 z-20 pointer-events-none"
          style={{ height: `${ITEM_H}px`, background: 'linear-gradient(to bottom, white 40%, transparent)' }}
        />
        {/* Fondu bas */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
          style={{ height: `${ITEM_H}px`, background: 'linear-gradient(to top, white 40%, transparent)' }}
        />
        {/* Items animés */}
        <div style={{ transform: `translateY(${translateY}px)`, willChange: 'transform' }}>
          {scrollList.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-center text-center select-none"
              style={{ height: `${ITEM_H}px` }}
            >
              <span className="font-black text-2xl text-[#0A0A0A]">
                {p.nom?.split(' ')[0] || '?'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-[#3D3D3D]/50 pb-2">
        {participants.length} participant{participants.length > 1 ? 's' : ''} en lice…
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Composant principal                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function TirageAuSort({ offre, nbParticipants, gagnantUser }) {
  // phases : idle | confirming | loading | animating | result | done
  const [phase,        setPhase]        = useState('idle')
  const [gagnant,      setGagnant]      = useState(null)
  const [participants, setParticipants] = useState([])
  const [errorMsg,     setErrorMsg]     = useState(null)
  const [emailSent,    setEmailSent]    = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)

  /* Si gagnant déjà tiré → done */
  useEffect(() => {
    if (offre.gagnant_id) setPhase('done')
  }, [offre.gagnant_id])

  /* ── Appel API tirage ── */
  async function lancerTirage() {
    setPhase('loading')
    setErrorMsg(null)
    try {
      const res  = await fetch('/api/tirer-au-sort', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ offre_id: offre.id }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setGagnant(data.gagnant)
        setParticipants(data.participants ?? [])
        setPhase('animating')
      } else {
        setErrorMsg(data.error ?? 'Erreur lors du tirage')
        setPhase('idle')
      }
    } catch {
      setErrorMsg('Erreur réseau')
      setPhase('idle')
    }
  }

  /* ── Animation terminée → résultat ── */
  const handleAnimationComplete = useCallback(() => {
    setPhase('result')
    triggerConfetti()
  }, [])

  /* ── Envoi email gagnant ── */
  async function envoyerEmailGagnant() {
    setEmailLoading(true)
    try {
      const res  = await fetch('/api/admin/email-gagnant', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ offre_id: offre.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setEmailSent(true)
      } else {
        setErrorMsg(data.error ?? 'Erreur envoi email')
      }
    } catch {
      setErrorMsg('Erreur réseau')
    } finally {
      setEmailLoading(false)
    }
  }

  /* ── Helpers noms ── */
  const nomAffiche   = gagnant?.prenom ?? gagnantUser?.prenom ?? gagnantUser?.nom?.split(' ')[0] ?? null
  const emailAffiche = gagnant?.email  ?? gagnantUser?.email  ?? null

  const showModal = phase === 'confirming' || phase === 'loading' || phase === 'animating' || phase === 'result'

  /* ─────────────────────────────────────────────────────────────────────── */

  return (
    <>
      {/* ── Contenu inline (phases idle / done) ── */}

      {phase === 'idle' && (
        <div className="flex flex-col gap-2">
          {errorMsg && <p className="text-xs text-red-500 font-semibold">⚠ {errorMsg}</p>}
          <button
            onClick={() => setPhase('confirming')}
            className="w-full bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white font-black text-sm py-3 rounded-xl transition-colors min-h-[48px] flex items-center justify-center gap-2"
          >
            🎰 Tirer au sort
          </button>
          {typeof nbParticipants === 'number' && (
            <p className="text-[11px] text-[#3D3D3D]/50 text-center">
              {nbParticipants} participant{nbParticipants > 1 ? 's' : ''} validé{nbParticipants > 1 ? 's' : ''} physiquement
            </p>
          )}
        </div>
      )}

      {phase === 'done' && (
        <div className="flex flex-col gap-2">
          <div className="bg-gradient-to-br from-[#FFD700]/20 to-[#FF8C00]/10 border border-[#FFD700]/40 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D3D3D]/50">Gagnant</p>
              <p className="text-base font-black text-[#0A0A0A]">
                {nomAffiche ?? 'Tirage effectué'}
              </p>
              {emailAffiche && (
                <p className="text-xs text-[#3D3D3D]/60">{emailAffiche}</p>
              )}
            </div>
          </div>

          {emailAffiche && (
            emailSent
              ? <p className="text-sm font-semibold text-green-600 text-center py-1">📧 Email renvoyé !</p>
              : (
                <button
                  onClick={envoyerEmailGagnant}
                  disabled={emailLoading}
                  className="w-full border border-[#FF6B00] text-[#FF6B00] hover:bg-[#FFF0E0] font-bold text-sm py-3 rounded-xl transition-colors min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {emailLoading
                    ? <span className="w-4 h-4 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                    : '📧 Renvoyer l\'email au gagnant'}
                </button>
              )
          )}

          {errorMsg && (
            <p className="text-xs text-red-500 font-semibold text-center">⚠ {errorMsg}</p>
          )}
        </div>
      )}

      {/* ── Modale via Portal — rendue sur document.body, hors de tout stacking context ── */}

      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70">

            {/* ── Confirmation ── */}
            {phase === 'confirming' && (
              <div className="relative z-[101] bg-[#0A0A0A] rounded-3xl w-full max-w-sm shadow-2xl px-4 py-4 flex flex-col gap-3">
                <p className="text-white text-sm font-bold leading-snug">
                  Le tirage au sort est irréversible.{' '}
                  {typeof nbParticipants === 'number'
                    ? <><strong>{nbParticipants}</strong> participant{nbParticipants > 1 ? 's' : ''} éligible{nbParticipants > 1 ? 's' : ''}.</>
                    : 'Continuer ?'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPhase('idle')}
                    className="flex-1 border border-white/20 text-white/70 hover:text-white font-semibold text-sm py-3 rounded-xl transition-colors min-h-[48px]"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={lancerTirage}
                    className="flex-1 bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm py-3 rounded-xl transition-colors min-h-[48px]"
                  >
                    Continuer 🎰
                  </button>
                </div>
              </div>
            )}

            {/* ── Chargement ── */}
            {phase === 'loading' && (
              <div className="relative z-[101] bg-white rounded-3xl w-full max-w-sm shadow-2xl flex items-center justify-center gap-3 py-8">
                <span className="w-5 h-5 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-[#3D3D3D]/60 font-semibold">Tirage en cours…</span>
              </div>
            )}

            {/* ── Animation + résultat ── */}
            {(phase === 'animating' || phase === 'result') && (
              <div className="relative z-[101] bg-white rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">

                {phase === 'animating' && gagnant && (
                  <LotterySlot
                    participants={participants}
                    winnerNom={gagnant.prenom ?? gagnant.nom ?? 'Gagnant'}
                    onComplete={handleAnimationComplete}
                  />
                )}

                {phase === 'result' && gagnant && (
                  <div className="flex flex-col gap-3 px-6 pt-6 pb-6">
                    <style>{`
                      @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(12px); }
                        to   { opacity: 1; transform: translateY(0); }
                      }
                      .anim-winner { animation: fadeInUp 0.4s ease both; }
                    `}</style>

                    <div className="anim-winner bg-gradient-to-br from-[#FFD700] to-[#FF8C00] rounded-2xl px-5 py-5 flex flex-col gap-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-black/50">🏆 Gagnant du concours</p>
                      <p className="text-2xl font-black text-[#0A0A0A]">
                        🎉 {gagnant.prenom ?? gagnant.nom ?? 'Gagnant'}
                      </p>
                      {gagnant.email && (
                        <p className="text-sm text-black/60">{gagnant.email}</p>
                      )}
                    </div>

                    {gagnant.email && (
                      emailSent
                        ? <p className="text-sm font-semibold text-green-600 text-center py-1">📧 Email envoyé au gagnant !</p>
                        : (
                          <button
                            onClick={envoyerEmailGagnant}
                            disabled={emailLoading}
                            className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm py-3 rounded-xl transition-colors min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-60"
                          >
                            {emailLoading
                              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              : '📧 Envoyer un email au gagnant'}
                          </button>
                        )
                    )}

                    {errorMsg && (
                      <p className="text-xs text-red-500 font-semibold text-center">⚠ {errorMsg}</p>
                    )}

                    <button
                      onClick={() => setPhase('done')}
                      className="w-full border border-[#E0E0E0] text-[#3D3D3D] hover:text-[#FF6B00] hover:border-[#FF6B00] font-bold text-sm py-3 rounded-xl transition-colors min-h-[48px]"
                    >
                      Fermer ✕
                    </button>
                  </div>
                )}

              </div>
            )}

          </div>
        </ModalPortal>
      )}
    </>
  )
}
