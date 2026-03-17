'use client'

/**
 * TutorialOffre — steps 4-6 of merchant onboarding tutorial.
 *
 * Props:
 *   substep       — 0-4 within step 4 (4A-4E), or 'apercu' (5), 'publier' (6)
 *   onAdvance     — called to move to next substep / step
 *   onSkip        — called when user skips tutorial entirely
 *   onApplySugg   — called with suggestion text when user clicks a chip
 *   suggestions   — string[] from suggestions-offres.json (category-specific)
 *   success       — true when form was submitted successfully (triggers confetti)
 *   onFinish      — called when user exits the celebration screen
 */

import { useMemo } from 'react'
import TutorialTooltip from './TutorialTooltip'

const CONFETTI_COLORS = ['#FF6B00', '#FFD700', '#FF4444', '#00C853', '#2196F3', '#E91E63', '#9C27B0']

function Confettis() {
  const items = useMemo(() =>
    Array.from({ length: 48 }, (_, i) => ({
      id:    i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left:  `${(i * 31 + 7) % 100}%`,
      delay: `${(i * 0.06) % 1.2}s`,
      size:  `${6 + (i % 6)}px`,
      dur:   `${1.4 + (i % 5) * 0.25}s`,
      shape: i % 3 === 0 ? '50%' : '2px',
    }))
  , [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[70]" aria-hidden>
      <style>{`
        @keyframes tutConfettiFall {
          0%   { transform: translateY(-10px) rotate(0deg);    opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg);  opacity: 0; }
        }
      `}</style>
      {items.map(c => (
        <div
          key={c.id}
          className="absolute top-0"
          style={{
            left:            c.left,
            width:           c.size,
            height:          c.size,
            borderRadius:    c.shape,
            backgroundColor: c.color,
            animation:       `tutConfettiFall ${c.dur} ${c.delay} ease-in forwards`,
          }}
        />
      ))}
    </div>
  )
}

/* ── Contenu par sous-étape ─────────────────────────────────────────────── */

const SUBSTEP_CONTENT = [
  {
    // 4A
    emoji:     '🎯',
    title:     'Choisis le type d\'offre',
    body:      'Remise en %, montant fixe, cadeau, concours… Choisis ce qui correspond le mieux à ta promo du moment.',
    nextLabel: 'Suivant →',
  },
  {
    // 4B
    emoji:     '✍️',
    title:     'Décris ton offre en une phrase',
    body:      'Sois précis et accrocheur. Tes clients voient directement ce qu\'ils gagnent. Pas plus de 150 caractères.',
    nextLabel: 'Suivant →',
  },
  {
    // 4C
    emoji:     '🎟️',
    title:     'Combien de clients peuvent en profiter ?',
    body:      'Fixe un nombre de bons pour créer l\'urgence (ex : 10 bons), ou choisis "Illimité" si tu veux toucher tout le monde.',
    nextLabel: 'Suivant →',
  },
  {
    // 4D
    emoji:     '⏰',
    title:     'Quand est-ce valable ?',
    body:      'Choisis la plage horaire de ton offre. Une durée courte (2-4h) crée de l\'urgence et améliore la visibilité.',
    nextLabel: 'Suivant →',
  },
  {
    // 4E — suggestions
    emoji:     '💡',
    title:     'Besoin d\'inspiration ?',
    body:      'Voici des idées d\'offres adaptées à ton commerce. Clique pour pré-remplir la description.',
    nextLabel: 'Voir l\'aperçu →',
  },
]

/* ── Composant principal ────────────────────────────────────────────────── */

export default function TutorialOffre({
  substep,
  onAdvance,
  onSkip,
  onApplySugg,
  suggestions = [],
  success,
  onFinish,
}) {
  /* ── Écran de célébration (step 6) ── */
  if (success) {
    return (
      <>
        <Confettis />
        <div
          className="fixed inset-0 z-[65] flex flex-col items-center justify-center bg-black/70 px-6 text-center"
          style={{ animation: 'tutoFadeIn 0.4s ease forwards' }}
        >
          <style>{`
            @keyframes tutoFadeIn {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes tutoBounce {
              0%,100% { transform: scale(1); }
              50%     { transform: scale(1.2); }
            }
          `}</style>
          <div className="bg-white rounded-3xl px-8 py-10 flex flex-col items-center gap-5 max-w-sm w-full shadow-2xl relative z-[66]">
            <div className="text-6xl" style={{ animation: 'tutoBounce 0.6s 0.3s ease both' }}>🎉</div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-2xl font-black text-[#0A0A0A]">Ton offre est en ligne !</p>
              <p className="text-sm text-[#3D3D3D]/60 leading-relaxed text-center">
                Félicitations, tu viens de publier ta première offre BONMOMENT.
                Tes clients la voient déjà ! 🚀
              </p>
            </div>
            <div className="bg-[#FFF0E0] rounded-2xl px-4 py-3 w-full">
              <p className="text-xs font-black text-[#FF6B00] uppercase tracking-widest mb-1">
                Prochaine étape
              </p>
              <p className="text-sm text-[#0A0A0A] font-semibold">
                Imprime ton QR code vitrine et place-le à l'entrée pour attirer les clients.
              </p>
            </div>
            <button
              onClick={onFinish}
              className="w-full bg-[#FF6B00] text-white font-black text-sm py-4 rounded-2xl min-h-[52px]"
            >
              Aller à mon tableau de bord →
            </button>
          </div>
        </div>
      </>
    )
  }

  /* ── Étapes 4A-4E ── */
  if (typeof substep === 'number' && substep >= 0 && substep <= 4) {
    const cfg = SUBSTEP_CONTENT[substep]
    const isLastSubstep = substep === 4

    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40 pointer-events-none" aria-hidden />
        <TutorialTooltip
          step={4}
          total={6}
          emoji={cfg.emoji}
          title={cfg.title}
          body={cfg.body}
          nextLabel={cfg.nextLabel}
          onNext={onAdvance}
          onSkip={onSkip}
          suggestions={isLastSubstep ? suggestions : undefined}
          onSuggestion={isLastSubstep ? onApplySugg : undefined}
        />
      </>
    )
  }

  /* ── Étape 5 : Aperçu ── */
  if (substep === 'apercu') {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40 pointer-events-none" aria-hidden />
        <TutorialTooltip
          step={5}
          total={6}
          emoji="👀"
          title="Voilà ce que verront tes clients"
          body="L'aperçu se met à jour en temps réel. Vérifie que tout est correct, puis publie !"
          nextLabel="Publier mon offre 🚀"
          onNext={onAdvance}
          onSkip={onSkip}
        />
      </>
    )
  }

  /* ── Étape 6 : Prêt à publier ── */
  if (substep === 'publier') {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40 pointer-events-none" aria-hidden />
        <TutorialTooltip
          step={6}
          total={6}
          emoji="🚀"
          title="Prêt à publier !"
          body="Appuie sur le bouton orange en bas pour mettre ton offre en ligne. Tes clients seront notifiés instantanément."
          nextLabel="C'est parti !"
          onNext={onAdvance}
          onSkip={onSkip}
        />
      </>
    )
  }

  return null
}
