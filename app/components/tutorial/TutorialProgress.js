'use client'

export default function TutorialProgress({ step, total = 6 }) {
  return (
    <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={step} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => {
        const done    = i + 1 < step
        const current = i + 1 === step
        return (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              done
                ? 'w-5 h-2 bg-[#FF6B00]'
                : current
                ? 'w-6 h-2.5 bg-[#FF6B00] shadow-sm shadow-orange-300'
                : 'w-2 h-2 bg-white/30'
            }`}
          />
        )
      })}
    </div>
  )
}
