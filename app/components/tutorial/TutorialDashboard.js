'use client'

/**
 * TutorialDashboard — steps 1-3 of merchant onboarding tutorial.
 *
 * Props:
 *   step          — current step (1, 2, or 3), null = hidden
 *   onAdvance     — called when user clicks "Suivant" / "Continuer"
 *   onSkip        — called when user skips
 */

import TutorialTooltip from './TutorialTooltip'

const STEPS = [
  {
    step:      1,
    emoji:     '🎉',
    title:     'Bienvenue dans ton espace commerçant !',
    body:      'Tu peux tout gérer depuis ici : créer des offres, vérifier les bons de tes clients et suivre tes résultats. Le guide te montre l\'essentiel en 3 minutes.',
    nextLabel: 'C\'est parti →',
  },
  {
    step:      2,
    emoji:     '✅',
    title:     'Valide les bons de tes clients',
    body:      'Quand un client te présente son bon, appuie sur ce bouton orange. Scanne le QR code ou entre le code à la main — c\'est validé en 2 secondes.',
    nextLabel: 'Compris →',
  },
  {
    step:      3,
    emoji:     '🚀',
    title:     'Crée ta première offre',
    body:      'Lance une promotion en moins d\'1 minute. Clique sur "Continuer" pour découvrir le formulaire pas à pas.',
    nextLabel: 'Créer mon offre →',
  },
]

export default function TutorialDashboard({ step, onAdvance, onSkip }) {
  if (!step || step < 1 || step > 3) return null

  const config = STEPS.find(s => s.step === step)
  if (!config) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 pointer-events-none"
        aria-hidden
      />
      <TutorialTooltip
        step={step}
        total={6}
        emoji={config.emoji}
        title={config.title}
        body={config.body}
        nextLabel={config.nextLabel}
        onNext={onAdvance}
        onSkip={onSkip}
      />
    </>
  )
}
