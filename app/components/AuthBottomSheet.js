'use client'

import SignInPanel from './SignInPanel'

/**
 * Panneau coulissant depuis le bas pour l'authentification.
 * Se déclenche au clic sur "Réserver mon bon" pour les non-connectés.
 *
 * @param {boolean} isOpen       - Affiche ou masque le panneau
 * @param {function} onClose     - Callback fermeture
 * @param {string}  redirectAfter - URL de retour après connexion OAuth
 */
export default function AuthBottomSheet({ isOpen, onClose, redirectAfter = '/' }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Fond sombre */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panneau */}
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-10 sm:pb-6 shadow-2xl">

        {/* Poignée mobile */}
        <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mb-6 sm:hidden" />

        {/* En-tête */}
        <div className="text-center mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] mb-1">
            BONMOMENT
          </p>
          <h2 className="text-xl font-black text-[#0A0A0A] leading-tight">
            Connecte-toi pour réserver ton bon 🎟️
          </h2>
        </div>

        {/* Boutons OAuth + mention légale */}
        <SignInPanel redirectAfter={redirectAfter} showLegal={true} />

        <button
          onClick={onClose}
          className="mt-4 w-full text-center text-xs text-[#3D3D3D]/40 hover:text-[#3D3D3D] transition-colors py-1"
        >
          Pas maintenant
        </button>
      </div>
    </div>
  )
}
