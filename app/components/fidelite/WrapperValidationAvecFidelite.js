'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { commercePeutUtiliserFidelite, FIDELITE_ENABLED } from '@/app/lib/fidelite/helpers'
import { useFidelite } from '@/app/hooks/fidelite/useFidelite'
import ValidationFideliteTab from './ValidationFideliteTab'

const supabase = createClient()

export default function WrapperValidationAvecFidelite({ ComposantOriginal, ...props }) {
  // Kill switch ultime : aucune requête si feature désactivée
  if (!FIDELITE_ENABLED) {
    return <ComposantOriginal {...props} />
  }

  return <WrapperInterne ComposantOriginal={ComposantOriginal} {...props} />
}

// Composant interne séparé pour éviter les hooks conditionnels
function WrapperInterne({ ComposantOriginal, ...props }) {
  const { user } = useAuth()
  const { getProgramme } = useFidelite()

  const [commerce,  setCommerce]  = useState(null)
  const [programme, setProgramme] = useState(null)
  const [pret,      setPret]      = useState(false)
  const [onglet,    setOnglet]    = useState('qr')

  useEffect(() => {
    if (!user) return

    let cancelled = false

    async function charger() {
      // 1. Commerce du commerçant connecté
      const { data: com } = await supabase
        .from('commerces')
        .select('id, palier, abonnement_actif')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()

      if (cancelled) return
      setCommerce(com ?? null)

      // 2. Programme fidélité (seulement si le commerce est éligible)
      if (com && commercePeutUtiliserFidelite(com)) {
        try {
          const prog = await getProgramme(com.id)
          if (!cancelled) setProgramme(prog ?? null)
        } catch {
          if (!cancelled) setProgramme(null)
        }
      }

      if (!cancelled) setPret(true)
    }

    charger()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Transparent tant que le chargement n'est pas terminé
  if (!pret) {
    return <ComposantOriginal {...props} />
  }

  // Transparent si conditions fidélité non remplies
  if (!commercePeutUtiliserFidelite(commerce) || !programme?.actif) {
    return <ComposantOriginal {...props} />
  }

  // ── Fidélité active : onglets QR/Code + Téléphone ─────────────────────────
  return (
    <div className="w-full">
      {/* Onglets */}
      <div className="flex border-b border-gray-200 mb-0">
        <button
          onClick={() => setOnglet('qr')}
          className={[
            'flex-1 py-3 text-sm font-bold transition-colors',
            onglet === 'qr'
              ? 'text-orange-500 border-b-2 border-orange-500 bg-white'
              : 'text-gray-400 hover:text-gray-600',
          ].join(' ')}
        >
          QR / Code
        </button>
        <button
          onClick={() => setOnglet('telephone')}
          className={[
            'flex-1 py-3 text-sm font-bold transition-colors',
            onglet === 'telephone'
              ? 'text-orange-500 border-b-2 border-orange-500 bg-white'
              : 'text-gray-400 hover:text-gray-600',
          ].join(' ')}
        >
          📱 Téléphone
        </button>
      </div>

      {/* Contenu */}
      {onglet === 'qr' && <ComposantOriginal {...props} />}
      {onglet === 'telephone' && (
        <ValidationFideliteTab
          commerceId={commerce.id}
          programme={programme}
          onSuccess={props.onSuccess}
          onError={props.onError}
        />
      )}
    </div>
  )
}
