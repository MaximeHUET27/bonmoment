'use client'
export default function Error({ error, reset }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h2>Oups, quelque chose s&apos;est mal passé</h2>
      <button onClick={reset}>Réessayer</button>
      {' · '}
      <a href="/">Retour à l&apos;accueil</a>
    </div>
  )
}
