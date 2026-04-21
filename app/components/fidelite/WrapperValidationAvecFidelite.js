'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { commercePeutUtiliserFidelite, FIDELITE_ENABLED } from '@/app/lib/fidelite/helpers'
import { useFidelite } from '@/app/hooks/fidelite/useFidelite'

const supabase = createClient()

export default function WrapperValidationAvecFidelite({ ComposantOriginal, ...props }) {
  if (!FIDELITE_ENABLED) {
    return <ComposantOriginal {...props} fideliteActive={false} />
  }

  return <WrapperInterne ComposantOriginal={ComposantOriginal} {...props} />
}

function WrapperInterne({ ComposantOriginal, ...props }) {
  const { user } = useAuth()
  const { getProgramme } = useFidelite()

  const [commerce,  setCommerce]  = useState(null)
  const [programme, setProgramme] = useState(null)
  const [pret,      setPret]      = useState(false)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    async function charger() {
      const { data: com } = await supabase
        .from('commerces')
        .select('id, palier, abonnement_actif')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()

      if (cancelled) return
      setCommerce(com ?? null)

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

  const fideliteActive = pret && commercePeutUtiliserFidelite(commerce) && !!programme?.actif

  return (
    <ComposantOriginal
      {...props}
      fideliteActive={fideliteActive}
      commerceId={commerce?.id}
      programme={programme}
    />
  )
}
