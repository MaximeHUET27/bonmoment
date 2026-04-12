'use client'

export default function AdminError({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-8">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md w-full text-center">
        <p className="text-sm font-bold text-red-600 mb-1">Une erreur est survenue</p>
        <p className="text-xs text-red-500 mb-4">{error?.message || 'Erreur inattendue'}</p>
        <button
          onClick={reset}
          className="bg-[#FF6B00] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#e05f00] transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
