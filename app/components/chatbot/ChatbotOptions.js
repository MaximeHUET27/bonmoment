'use client'

/**
 * Grille de boutons de choix pour le chatbot.
 * variant='category' → cartes larges avec bordure
 * variant='question'  → boutons fins plein texte
 */
export default function ChatbotOptions({ options, onSelect, variant = 'question' }) {
  if (!options || options.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt)}
          className={
            variant === 'category'
              ? 'w-full text-left px-4 py-3.5 rounded-2xl bg-white border-2 border-[#F0F0F0] hover:border-[#FF6B00] hover:text-[#FF6B00] text-sm font-bold text-[#0A0A0A] transition-colors min-h-[52px] active:scale-[0.98]'
              : 'w-full text-left px-4 py-3 rounded-xl border border-[#EBEBEB] bg-white hover:bg-[#FFF0E0] hover:border-[#FF6B00] text-sm text-[#0A0A0A] font-medium transition-colors min-h-[44px] active:scale-[0.98]'
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
