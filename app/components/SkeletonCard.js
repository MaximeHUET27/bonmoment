export default function SkeletonCard() {
  return (
    <div
      className="bg-white rounded-[12px] shadow-sm overflow-hidden animate-pulse flex flex-row h-[155px] sm:h-[165px]"
      style={{ border: '1px solid #F0F0F0' }}
    >
      {/* Photo placeholder (côté gauche) */}
      <div className="w-[100px] sm:w-[130px] shrink-0 bg-[#E8E8E8]" />

      {/* Infos (côté droit) */}
      <div className="flex-1 flex flex-col gap-[4px] px-[8px] py-[6px] sm:px-[10px] min-w-0">

        {/* Barre timer */}
        <div className="h-[22px] bg-[#F0F0F0] rounded-[8px]" />

        {/* Badge + titre */}
        <div className="flex items-start gap-1.5 mt-[2px]">
          <div className="w-10 h-5 bg-[#E0E0E0] rounded-[8px] shrink-0" />
          <div className="h-5 bg-[#E0E0E0] rounded flex-1" />
        </div>

        {/* Nom commerce */}
        <div className="h-4 w-3/4 bg-[#E0E0E0] rounded" />

        {/* Ville */}
        <div className="h-3 w-1/2 bg-[#E0E0E0] rounded" />

        {/* CTA */}
        <div className="mt-auto h-[30px] bg-[#E0E0E0] rounded-full" />

      </div>
    </div>
  )
}
