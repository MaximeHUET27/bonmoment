import SkeletonCard from '@/app/components/SkeletonCard'

export default function Loading() {
  return (
    <main className="min-h-screen bg-white flex flex-col animate-pulse">

      {/* Header logo placeholder */}
      <header className="px-6 pt-8 pb-6 text-center border-b border-[#F5F5F5]">
        <div className="w-[130px] h-8 bg-[#E0E0E0] rounded-xl mx-auto" />
      </header>

      <section className="px-4 pt-8 pb-4 w-full max-w-lg mx-auto flex flex-col gap-4">

        {/* Photo placeholder */}
        <div className="w-full h-48 rounded-2xl bg-[#F0F0F0]" />

        {/* Catégorie */}
        <div className="h-4 w-24 bg-[#E0E0E0] rounded" />

        {/* Nom commerce */}
        <div className="h-8 w-60 bg-[#E0E0E0] rounded-xl" />

        {/* Adresse */}
        <div className="h-4 w-48 bg-[#E0E0E0] rounded" />

        {/* Description */}
        <div className="flex flex-col gap-2 mt-2">
          <div className="h-4 w-full bg-[#E0E0E0] rounded" />
          <div className="h-4 w-5/6 bg-[#E0E0E0] rounded" />
        </div>

        {/* Titre "Bons plans en cours" */}
        <div className="h-5 w-48 bg-[#E0E0E0] rounded mt-4" />

        {/* 2 SkeletonCard */}
        <div className="flex flex-col gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>

      </section>
    </main>
  )
}
