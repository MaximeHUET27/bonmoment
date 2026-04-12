'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'

/* ── Icônes SVG inline ──────────────────────────────────────────────────── */

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="white"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
      />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 21 21" aria-hidden>
      <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
      <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  )
}

/* ── Spinner ────────────────────────────────────────────────────────────── */

function Spinner() {
  return (
    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
  )
}

/* ── Définition des providers actifs ────────────────────────────────────── */

const PROVIDERS = [
  {
    id: 'google',
    label: 'Continuer avec Google',
    icon: <GoogleIcon />,
    className: 'bg-white border-2 border-[#E0E0E0] hover:border-[#FF6B00] hover:bg-[#FFFBF8] text-[#0A0A0A]',
  },
  {
    id: 'facebook',
    label: 'Continuer avec Facebook',
    icon: <FacebookIcon />,
    className: 'bg-[#1877F2] hover:bg-[#166FE5] border-2 border-transparent text-white',
  },
  {
    id: 'azure',
    label: 'Continuer avec Microsoft',
    icon: <MicrosoftIcon />,
    className: 'bg-[#2F2F2F] hover:bg-[#1a1a1a] border-2 border-transparent text-white',
  },
]

/* ── Composant principal ────────────────────────────────────────────────── */

/**
 * @param {string}  redirectAfter - chemin de retour après connexion
 * @param {string}  [context]     - 'reserver' → affiche un message contextuel
 * @param {boolean} [showLegal]   - affiche le texte légal (défaut: true)
 */
export default function SignInPanel({
  redirectAfter = '/',
  context = null,
  showLegal = true,
}) {
  const { signIn } = useAuth()
  const [loadingId, setLoadingId] = useState(null)
  const [errorMsg, setErrorMsg]   = useState(null)

  async function handleSignIn(providerId) {
    setLoadingId(providerId)
    setErrorMsg(null)
    const { error } = await signIn(providerId, redirectAfter)
    if (error) {
      // Provider non configuré ou erreur réseau — la redirection n'a pas eu lieu
      console.error('[SignInPanel] signIn error:', error.message)
      setErrorMsg('Connexion impossible. Réessaie ou utilise un autre provider.')
      setLoadingId(null)
    }
    // Pas de reset loadingId en cas de succès : le redirect prend le dessus
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Message contextuel */}
      {context === 'reserver' && (
        <p className="text-center text-xs text-[#3D3D3D]/60 mb-1">
          Connecte-toi pour réserver ton bon gratuitement.
        </p>
      )}

      {/* Message d'erreur OAuth */}
      {errorMsg && (
        <p className="text-center text-xs font-semibold text-red-500 bg-red-50 rounded-xl px-3 py-2">
          {errorMsg}
        </p>
      )}

      {/* Boutons providers */}
      {PROVIDERS.map(({ id, label, icon, className }) => {
        const isLoading = loadingId === id
        const isDisabled = loadingId !== null

        return (
          <button
            key={id}
            onClick={() => handleSignIn(id)}
            disabled={isDisabled}
            className={`
              w-full flex items-center justify-center gap-3
              px-4 py-4 rounded-2xl font-bold text-sm
              transition-all duration-150 min-h-[52px] shadow-sm
              disabled:opacity-60 disabled:cursor-not-allowed
              ${className}
            `}
          >
            {isLoading ? (
              <>
                <Spinner />
                <span>Connexion en cours...</span>
              </>
            ) : (
              <>
                {icon}
                <span>{label}</span>
              </>
            )}
          </button>
        )
      })}

      {/* Mention légale */}
      {showLegal && (
        <p className="text-center text-[10px] text-[#3D3D3D]/40 leading-relaxed mt-1">
          En te connectant, tu acceptes nos{' '}
          <a
            href="/cgu"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-[#FF6B00] transition-colors"
          >
            CGU
          </a>{' '}
          et notre{' '}
          <a
            href="/confidentialite"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-[#FF6B00] transition-colors"
          >
            Politique de confidentialité
          </a>.
        </p>
      )}

    </div>
  )
}
