'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('🚨 Erreur sur /commercant/inscription:', error)
    console.error('Message:', error?.message)
    console.error('Stack:', error?.stack)
    console.error('Digest:', error?.digest)
  }, [error])

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h2>Oups, quelque chose s&apos;est mal passé</h2>
      <button onClick={reset}>Réessayer</button>
      {' · '}
      <a href="/">Retour à l&apos;accueil</a>
    </div>
  )
}
