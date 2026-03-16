export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-sm overflow-hidden animate-pulse">

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

        {/* Catégorie + nom commerce */}
        <div className="flex gap-2 justify-center">
          <div className="h-4 w-16 bg-[#E0E0E0] rounded-full" />
          <div className="h-4 w-20 bg-[#E0E0E0] rounded" />
        </div>

        {/* Ville */}
        <div className="h-3 w-20 bg-[#E0E0E0] rounded mx-auto" />

        {/* Bouton CTA */}
        <div className="h-12 bg-[#E0E0E0] rounded-full mt-1" />
      </div>

    </div>
  )
}
