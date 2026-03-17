'use client'

/**
 * Bouton et logique de tirage au sort pour les concours expirés.
 * Visible uniquement si : type_remise = 'concours' ET statut = 'expiree' ET gagnant_id IS NULL.
 */

import { useState, useEffect, useMemo } from 'react'

/* ── Confettis ── */
const CONFETTI_COLORS = ['#FF6B00', '#FFD700', '#FF4444', '#00C853', '#2196F3', '#E91E63', '#9C27B0']

function Confettis() {
  const items = useMemo(() =>
    Array.from({ length: 32 }, (_, i) => ({
      id:    i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left:  `${(i * 31) % 100}%`,
      delay: `${(i * 0.07) % 0.8}s`,
      size:  `${7 + (i % 5)}px`,
      dur:   `${1.2 + (i % 4) * 0.2}s`,
    }))
  , [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl" aria-hidden>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(120px) rotate(360deg); opacity: 0; }
        }
      `}</style>
      {items.map(c => (
        <div
          key={c.id}
          className="absolute top-0 rounded-sm"
          style={{
            left:            c.left,
            width:           c.size,
            height:          c.size,
            backgroundColor: c.color,
            animation:       `confettiFall ${c.dur} ${c.delay} ease-in forwards`,
          }}
        />
      ))}
    </div>
  )
}

/* ── Composant principal ────────────────────────────────────────────────── */

export default function TirageAuSort({ offre, nbParticipants }) {
  const [phase,    setPhase]    = useState('idle')  // idle | confirming | loading | result | done
  const [gagnant,  setGagnant]  = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  /* Si un gagnant existe déjà au montage → phase done */
  useEffect(() => {
    if (offre.gagnant_id) setPhase('done')
  }, [offre.gagnant_id])

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
        setPhase('result')
      } else {
        setErrorMsg(data.error ?? 'Erreur lors du tirage')
        setPhase('idle')
      }
    } catch {
      setErrorMsg('Erreur réseau')
      setPhase('idle')
    }
  }

  /* ── Phase : idle — bouton tirage ── */
  if (phase === 'idle') {
    return (
      <div className="mt-3 flex flex-col gap-2">
        {errorMsg && (
          <p className="text-xs text-red-500 font-semibold">⚠ {errorMsg}</p>
        )}
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
    )
  }

  /* ── Phase : confirming ── */
  if (phase === 'confirming') {
    return (
      <div className="mt-3 bg-[#0A0A0A] rounded-2xl px-4 py-4 flex flex-col gap-3">
        <p className="text-white text-sm font-bold leading-snug">
          Tu vas tirer au sort parmi{' '}
          {typeof nbParticipants === 'number'
            ? <><strong>{nbParticipants}</strong> participant{nbParticipants > 1 ? 's' : ''}</>
            : 'les participants'
          }.
          <br />
          <span className="text-white/60 font-normal">Cette action est irréversible.</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPhase('idle')}
            className="flex-1 border border-white/20 text-white/70 hover:text-white font-semibold text-sm py-2.5 rounded-xl transition-colors min-h-[44px]"
          >
            Annuler
          </button>
          <button
            onClick={lancerTirage}
            className="flex-1 bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm py-2.5 rounded-xl transition-colors min-h-[44px]"
          >
            Confirmer 🎰
          </button>
        </div>
      </div>
    )
  }

  /* ── Phase : loading ── */
  if (phase === 'loading') {
    return (
      <div className="mt-3 flex items-center justify-center gap-3 py-4">
        <span className="w-5 h-5 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-[#3D3D3D]/60 font-semibold">Tirage en cours…</span>
      </div>
    )
  }

  /* ── Phase : result — animation gagnant ── */
  if (phase === 'result' && gagnant) {
    return (
      <div className="relative mt-3 rounded-2xl overflow-hidden">
        <style>{`
          @keyframes fadeInScale {
            0%   { opacity: 0; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1); }
          }
          .anim-winner { animation: fadeInScale 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        `}</style>

        {/* Fond doré */}
        <div className="bg-gradient-to-br from-[#FFD700] to-[#FF8C00] px-5 py-5 flex flex-col gap-2 anim-winner">
          <Confettis />
          <p className="text-[11px] font-bold uppercase tracking-widest text-black/60 relative z-10">
            🏆 Gagnant du concours
          </p>
          <p className="text-2xl font-black text-[#0A0A0A] relative z-10">
            🎉 {gagnant.prenom ?? gagnant.nom ?? 'Gagnant'}
          </p>
          {gagnant.email && (
            <p className="text-sm text-black/60 relative z-10">{gagnant.email}</p>
          )}
          <p className="text-xs text-black/50 relative z-10 mt-1">
            Un email lui a été envoyé pour récupérer son lot.
          </p>
        </div>

        <button
          onClick={() => setPhase('done')}
          className="w-full bg-[#0A0A0A] text-white font-bold text-sm py-3 hover:bg-[#1A1A1A] transition-colors min-h-[44px]"
        >
          Fermer ✕
        </button>
      </div>
    )
  }

  /* ── Phase : done — afficher le gagnant stocké ── */
  if (phase === 'done') {
    const nom = gagnant?.prenom ?? gagnant?.nom ?? 'Gagnant tiré'
    return (
      <div className="mt-3 bg-gradient-to-br from-[#FFD700]/20 to-[#FF8C00]/10 border border-[#FFD700]/40 rounded-2xl px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">🏆</span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D3D3D]/50">Gagnant</p>
          <p className="text-base font-black text-[#0A0A0A]">{nom}</p>
        </div>
      </div>
    )
  }

  return null
}
