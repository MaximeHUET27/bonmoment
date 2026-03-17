'use client'

import TutorialProgress from './TutorialProgress'

/**
 * Bottom-sheet tooltip for tutorial steps.
 *
 * Props:
 *   step        — current global step (1-6)
 *   total       — total steps (default 6)
 *   emoji       — large emoji shown at top-left
 *   title       — bold heading
 *   body        — description text
 *   nextLabel   — label for the advance button (default: "Suivant →")
 *   onNext      — callback when advance button clicked
 *   onSkip      — callback when skip clicked (null = hide skip)
 *   suggestions — optional string[] to show as chips
 *   onSuggestion — optional callback(text) when chip clicked
 */
export default function TutorialTooltip({
  step,
  total = 6,
  emoji,
  title,
  body,
  nextLabel = 'Suivant →',
  onNext,
  onSkip,
  suggestions,
  onSuggestion,
}) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] pointer-events-auto"
      style={{ animation: 'tutoSlideUp 0.35s cubic-bezier(0.22,1,0.36,1) forwards' }}
    >
      <style>{`
        @keyframes tutoSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div className="bg-[#0A0A0A] text-white rounded-t-3xl px-5 pt-5 pb-6 shadow-2xl max-w-lg mx-auto w-full flex flex-col gap-4">

        {/* Top row: progress + skip */}
        <div className="flex items-center justify-between">
          <TutorialProgress step={step} total={total} />
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-white/40 hover:text-white/70 text-xs font-semibold transition-colors min-h-[32px] px-2"
            >
              Passer ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex items-start gap-3">
          {emoji && (
            <span className="text-3xl shrink-0 mt-0.5">{emoji}</span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-black text-white leading-snug">{title}</p>
            {body && (
              <p className="text-sm text-white/60 mt-1 leading-relaxed">{body}</p>
            )}
          </div>
        </div>

        {/* Suggestion chips */}
        {suggestions && suggestions.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">
              Idées pour toi
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSuggestion?.(s)}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-white/10 hover:bg-[#FF6B00] hover:text-white text-white/70 transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Next button */}
        <button
          onClick={onNext}
          className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm py-4 rounded-2xl transition-colors min-h-[52px] flex items-center justify-center"
        >
          {nextLabel}
        </button>

      </div>
    </div>
  )
}
