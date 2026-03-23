'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useAuth } from '@/app/context/AuthContext'

/* ── QR scanner (browser-only) ───────────────────────────────────────────── */
const QrScanner = dynamic(() => import('./QrScanner'), {
  ssr:     false,
  loading: () => (
    <div className="flex items-center justify-center h-[300px] bg-black rounded-2xl">
      <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function labelRemise(type_remise, valeur) {
  switch (type_remise) {
    case 'pourcentage':    return `${valeur}% de remise`
    case 'montant_fixe':   return `${valeur}€ de remise`
    case 'cadeau':         return 'Cadeau offert'
    case 'produit_offert': return 'Produit offert'
    case 'service_offert': return 'Service offert'
    case 'concours':       return 'Concours'
    case 'atelier':        return 'Atelier'
    default:               return type_remise
  }
}

function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function vibrate(pattern) {
  try { navigator.vibrate?.(pattern) } catch {}
}

/* ── Composant principal ─────────────────────────────────────────────────── */

export default function ValiderPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [mode,       setMode]       = useState('scanner') // 'scanner' | 'manual'
  const [verifying,  setVerifying]  = useState(false)
  const [result,     setResult]     = useState(null)      // voir structure ci-dessous
  const [digits,     setDigits]     = useState(['','','','','',''])
  const [scannerKey, setScannerKey] = useState(0)         // force re-mount du scanner

  const inputRefs = useRef([])

  /* ── Auth guard ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  /* ── Vérification côté serveur ─────────────────────────────────────────── */
  const verifyBon = useCallback(async (params) => {
    if (verifying) return
    setVerifying(true)

    try {
      const res = await fetch('/api/valider-bon', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(params),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        vibrate([100, 50, 100])
        setResult({ type: 'success', data })
      } else if (res.status === 409) {
        vibrate([50, 30, 50, 30, 50])
        setResult({ type: 'already_used', utilise_at: data.utilise_at })
      } else if (res.status === 403 && data.error?.includes('autre commerce')) {
        vibrate(200)
        setResult({ type: 'wrong_commerce' })
      } else if (res.status === 410) {
        vibrate(200)
        setResult({ type: 'expired', msg: data.error })
      } else if (res.status === 425) {
        vibrate([100, 100, 100])
        setResult({ type: 'not_yet', date_debut: data.date_debut })
      } else {
        vibrate(200)
        setResult({ type: 'invalid' })
      }
    } catch {
      vibrate(200)
      setResult({ type: 'invalid' })
    } finally {
      setVerifying(false)
    }
  }, [verifying])

  /* ── Détection QR ───────────────────────────────────────────────────────── */
  const handleQrDetected = useCallback((text) => {
    // Extraire le reservation_id depuis bonmoment.app/bon/[id] ou /bon/[id]
    const match = text.match(/\/bon\/([a-zA-Z0-9-]+)/)
    if (match) {
      verifyBon({ reservation_id: match[1] })
    } else {
      // URL inattendue — tenter de traiter comme un code brut
      vibrate(200)
      setResult({ type: 'invalid' })
    }
  }, [verifyBon])

  /* ── Saisie manuelle ────────────────────────────────────────────────────── */
  function handleDigitChange(index, value) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next  = [...digits]
    next[index] = digit
    setDigits(next)
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    if (next.every(d => d !== '')) {
      verifyBon({ code_validation: next.join('') })
    }
  }

  function handleDigitKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  /* ── Reset pour client suivant ──────────────────────────────────────────── */
  function reset() {
    setResult(null)
    setDigits(['','','','','',''])
    setScannerKey(k => k + 1)
    setMode('scanner')
  }

  /* ── Switch de mode ─────────────────────────────────────────────────────── */
  function switchToManual() {
    setMode('manual')
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }

  /* ── Chargement ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user) return null

  /* ── Écran de résultat plein écran ─────────────────────────────────────── */
  if (result) {
    return <ResultScreen result={result} onBack={reset} />
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <style>{`
        @keyframes scanLine {
          0%   { top: 4px; }
          50%  { top: calc(100% - 4px); }
          100% { top: 4px; }
        }
      `}</style>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#EBEBEB] px-5 py-3 flex items-center gap-3 sticky top-0 z-20">
        <Link
          href="/commercant/dashboard"
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#F5F5F5] text-[#3D3D3D]/60 hover:text-[#FF6B00] transition-colors text-lg"
          aria-label="Retour"
        >
          ←
        </Link>
        <Image src="/LOGO.png" alt="BONMOMENT" width={600} height={300} unoptimized priority className="w-[90px] h-auto" />
        <span className="ml-2 text-sm font-black text-[#0A0A0A]">Vérifier un bon</span>
      </header>

      <div className="flex-1 w-full max-w-lg mx-auto px-4 py-5 flex flex-col gap-5">

        {/* ── Onglets ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-1.5 flex gap-1 shadow-sm">
          <button
            onClick={() => setMode('scanner')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all min-h-[44px] ${
              mode === 'scanner'
                ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-200'
                : 'text-[#3D3D3D]/60 hover:text-[#FF6B00]'
            }`}
          >
            📸 Scanner QR
          </button>
          <button
            onClick={switchToManual}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all min-h-[44px] ${
              mode === 'manual'
                ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-200'
                : 'text-[#3D3D3D]/60 hover:text-[#FF6B00]'
            }`}
          >
            🔢 Code manuel
          </button>
        </div>

        {/* ── Onglet Scanner ──────────────────────────────────────────────── */}
        {mode === 'scanner' && (
          <div className="flex flex-col gap-4">
            <p className="text-center text-sm font-semibold text-[#3D3D3D]">
              Scanne le QR code du client
            </p>

            {verifying ? (
              <div className="flex flex-col items-center justify-center h-[300px] bg-black rounded-2xl gap-4">
                <span className="w-10 h-10 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                <p className="text-white font-semibold text-sm">Vérification…</p>
              </div>
            ) : (
              <QrScanner
                key={scannerKey}
                onDetect={handleQrDetected}
                active={mode === 'scanner' && !result && !verifying}
              />
            )}

            <button
              onClick={switchToManual}
              className="text-center text-sm text-[#FF6B00] font-semibold hover:underline min-h-[44px] flex items-center justify-center"
            >
              Saisir le code manuellement →
            </button>
          </div>
        )}

        {/* ── Onglet Code manuel ──────────────────────────────────────────── */}
        {mode === 'manual' && (
          <div className="flex flex-col gap-6">
            <p className="text-center text-sm font-semibold text-[#3D3D3D]">
              Entre le code à 6 chiffres du client
            </p>

            {/* Champs 6 chiffres */}
            <div className="flex gap-2 justify-center">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleDigitKeyDown(i, e)}
                  onFocus={e => e.target.select()}
                  disabled={verifying}
                  className={`w-12 h-14 text-center text-[32px] font-bold border-2 rounded-2xl transition-colors outline-none select-all
                    ${d ? 'border-[#FF6B00] bg-[#FFF0E0]' : 'border-[#E0E0E0] bg-white'}
                    focus:border-[#FF6B00]
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={{ fontFamily: 'Courier New, monospace' }}
                />
              ))}
            </div>

            {verifying && (
              <div className="flex flex-col items-center gap-2">
                <span className="w-6 h-6 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[#3D3D3D]/60 font-semibold">Vérification…</p>
              </div>
            )}

            <button
              onClick={() => { setMode('scanner'); setScannerKey(k => k + 1) }}
              className="text-center text-sm text-[#FF6B00] font-semibold hover:underline min-h-[44px] flex items-center justify-center"
            >
              Scanner un QR code →
            </button>
          </div>
        )}

      </div>
    </main>
  )
}

/* ── Écran de résultat plein écran ─────────────────────────────────────────── */

function ResultScreen({ result, onBack }) {
  const timerRef = useRef(null)

  /* Auto-retour après 3s pour succès et not_yet */
  useEffect(() => {
    if (result.type === 'success' || result.type === 'not_yet') {
      timerRef.current = setTimeout(onBack, 3000)
    }
    return () => clearTimeout(timerRef.current)
  }, [result.type, onBack])

  const config = {
    success:       { bg: '#22C55E', icon: '✓',  title: 'Bon validé !',                           iconAnim: 'popIn' },
    already_used:  { bg: '#FF6B00', icon: '⚠',  title: 'Ce bon a déjà été utilisé',              iconAnim: 'shake' },
    invalid:       { bg: '#EF4444', icon: '✕',  title: 'Code invalide',                           iconAnim: 'popIn' },
    wrong_commerce:{ bg: '#EF4444', icon: '✕',  title: 'Ce bon appartient à un autre commerce',  iconAnim: 'popIn' },
    expired:       { bg: '#6B7280', icon: '⌛', title: result.msg ?? 'Ce bon est périmé',         iconAnim: 'popIn' },
    not_yet:       { bg: '#FF6B00', icon: '📅', title: 'Ce bon n\'est pas encore valable',        iconAnim: 'popIn' },
  }[result.type] ?? { bg: '#EF4444', icon: '✕', title: 'Erreur', iconAnim: 'popIn' }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8 gap-6"
      style={{ backgroundColor: config.bg }}
    >
      <style>{`
        @keyframes popIn {
          0%   { transform: scale(0);   opacity: 0; }
          70%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-10px); }
          40%     { transform: translateX(10px); }
          60%     { transform: translateX(-10px); }
          80%     { transform: translateX(10px); }
        }
        .anim-pop  { animation: popIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .anim-shake { animation: shake 0.5s ease-in-out forwards; }
      `}</style>

      {/* Icône animée */}
      <div className={`text-[96px] leading-none text-white ${
        config.iconAnim === 'popIn' ? 'anim-pop' : 'anim-shake'
      }`}>
        {config.icon}
      </div>

      {/* Titre */}
      <h1
        className="text-[32px] font-black text-white text-center leading-tight"
        style={{ fontFamily: 'Montserrat, sans-serif' }}
      >
        {config.title}
      </h1>

      {/* Détails selon le type */}
      {result.type === 'success' && result.data && (
        <div className="flex flex-col items-center gap-1 text-white/90 text-center">
          {result.data.client?.prenom && (
            <p className="text-lg font-semibold">Client : {result.data.client.prenom}</p>
          )}
          <p className="text-base font-bold">{result.data.offre?.titre}</p>
          {result.data.offre?.type_remise && (
            <p className="text-sm opacity-80">
              {labelRemise(result.data.offre.type_remise, result.data.offre.valeur)}
            </p>
          )}
        </div>
      )}

      {result.type === 'already_used' && result.utilise_at && (
        <p className="text-white/90 text-base font-semibold text-center">
          Validé le {formatDateTime(result.utilise_at)}
        </p>
      )}

      {result.type === 'invalid' && (
        <p className="text-white/80 text-sm text-center">
          Vérifie le code avec le client et réessaie
        </p>
      )}

      {result.type === 'not_yet' && result.date_debut && (
        <p className="text-white/90 text-base font-semibold text-center">
          Actif à partir du {formatDateTime(result.date_debut)}
        </p>
      )}

      {/* Countdown pour succès et not_yet */}
      {(result.type === 'success' || result.type === 'not_yet') && (
        <CountdownDots totalMs={3000} />
      )}

      {/* Bouton retour */}
      <button
        onClick={onBack}
        className="mt-2 bg-white/20 hover:bg-white/30 text-white font-bold text-base px-8 py-3 rounded-2xl transition-colors min-h-[52px]"
      >
        {result.type === 'success' ? '← Client suivant' : '← Réessayer'}
      </button>
    </div>
  )
}

/* ── Indicateur de countdown (3 points qui disparaissent) ─────────────────── */

function CountdownDots({ totalMs }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const id    = setInterval(() => {
      setElapsed(Date.now() - start)
    }, 50)
    return () => clearInterval(id)
  }, [])

  const pct  = Math.min(elapsed / totalMs, 1)
  const secs = Math.max(0, Math.ceil((totalMs - elapsed) / 1000))

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-48 h-1.5 bg-white/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-none"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <p className="text-white/70 text-sm">Retour automatique dans {secs}s</p>
    </div>
  )
}
