'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const FavorisContext = createContext(null)

export function FavorisProvider({ children }) {
  const { user, supabase } = useAuth()
  const [favoriIds, setFavoriIds] = useState(new Set())

  /* Chargement initial + re-chargement quand le user change */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!user || !supabase) { setFavoriIds(new Set()); return }
    supabase
      .from('users')
      .select('commerces_abonnes')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setFavoriIds(new Set(data?.commerces_abonnes || [])))
  }, [user, supabase])

  function isFavori(commerceId) {
    return !!commerceId && favoriIds.has(commerceId)
  }

  /**
   * Toggle favori en base + mise à jour optimiste du contexte.
   * @returns {boolean} nouveau statut (true = maintenant favori)
   */
  async function toggleFavori(commerceId) {
    if (!user || !supabase || !commerceId) return false
    const wasOn = favoriIds.has(commerceId)

    /* Optimistic update */
    setFavoriIds(prev => {
      const next = new Set(prev)
      if (wasOn) next.delete(commerceId)
      else next.add(commerceId)
      return next
    })

    const { data: current } = await supabase
      .from('users').select('commerces_abonnes').eq('id', user.id).single()
    const existant = current?.commerces_abonnes || []
    const next = wasOn
      ? existant.filter(id => id !== commerceId)
      : [...existant, commerceId]
    await supabase.from('users').update({ commerces_abonnes: next }).eq('id', user.id)

    return !wasOn
  }

  return (
    <FavorisContext.Provider value={{ isFavori, toggleFavori, favoriIds }}>
      {children}
    </FavorisContext.Provider>
  )
}

export function useFavoris() {
  const ctx = useContext(FavorisContext)
  if (!ctx) throw new Error('useFavoris doit être utilisé dans FavorisProvider')
  return ctx
}
