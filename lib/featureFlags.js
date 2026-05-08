export function isMairieAssoEnabled() {
  return process.env.NEXT_PUBLIC_MAIRIE_ASSO_ENABLED === 'true';
}

export function isFideliteEnabled() {
  return process.env.NEXT_PUBLIC_FIDELITE_ENABLED === 'true';
}
