'use client'
import Link from 'next/link'
export default function Error({ error, reset }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h2>Oups, quelque chose s&apos;est mal passé</h2>
      <button onClick={reset}>Réessayer</button>
      {' · '}
      <Link href="/">Retour à l&apos;accueil</Link>
    </div>
  )
}
