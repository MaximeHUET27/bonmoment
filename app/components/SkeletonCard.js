export default function SkeletonCard() {
  return (
    <>
      <style>{`
        @keyframes bm-shimmer {
          0%   { background-position: -200% 0 }
          100% { background-position:  200% 0 }
        }
        .bm-shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: bm-shimmer 1.5s infinite;
          border-radius: inherit;
          pointer-events: none;
        }
      `}</style>

      <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-sm overflow-hidden animate-pulse bm-shimmer relative">

        {/* Header : countdown + stock */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#F5F5F5]">
          <div className="h-4 w-24 bg-[#E0E0E0] rounded" />
          <div className="h-4 w-16 bg-[#E0E0E0] rounded" />
        </div>

        <div className="px-4 py-5 flex flex-col gap-3">
          {/* Badge remise */}
          <div className="bg-[#F5F5F5] rounded-2xl h-16" />

          {/* Titre */}
          <div className="h-4 bg-[#E0E0E0] rounded mx-auto w-3/4" />

          {/* Nom commerce */}
          <div className="h-4 w-28 bg-[#E0E0E0] rounded mx-auto" />

          {/* Ville */}
          <div className="h-3 w-20 bg-[#E0E0E0] rounded mx-auto" />

          {/* Bouton CTA */}
          <div className="h-12 bg-[#E0E0E0] rounded-full mt-1" />
        </div>

      </div>
    </>
  )
}
