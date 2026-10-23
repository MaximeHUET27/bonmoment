/**
 * Page publique d'annulation — cible du lien "Je ne pourrai pas venir" des
 * emails de confirmation et de rappel. Pas de session requise (l'utilisateur
 * clique depuis son client mail) : le token HMAC signé par le serveur fait
 * office d'autorisation. Rendu avec les mêmes composants que le reste du
 * site (header, cartes, boutons) au lieu d'une page HTML autonome.
 *
 * Le chargement de cette page (GET) ne fait que lire l'état, jamais annuler
 * — l'annulation passe uniquement par la Server Action liée au <form>
 * ci-dessous, déclenchée par un vrai POST utilisateur. Un <form> natif est
 * utilisé plutôt qu'un fetch client : le lien vient d'un mail, parfois ouvert
 * dans une webview où le JS peut ne pas se charger.
 */

import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { verifierAnnulation } from '@/lib/emailLinks'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function chargerReservation(id) {
  const { data } = await admin
    .from('reservations')
    .select('id, user_id, statut, offres:offre_id ( commerces:commerce_id ( nom ) )')
    .eq('id', id)
    .maybeSingle()
  return data
}

function Chrome({ children }) {
  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <header className="w-full bg-white border-b border-[#EBEBEB] px-5 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link href="/">
          <Image src="/LOGO.png" alt="BONMOMENT" width={1425} height={157} priority sizes="220px" className="w-[110px] h-auto" />
        </Link>
        <Link href="/" className="bg-[#FF6B00] hover:bg-[#CC5500] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors min-h-[44px] flex items-center whitespace-nowrap">
          Accueil
        </Link>
      </header>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-sm px-7 py-10 text-center flex flex-col items-center gap-4">
          {children}
        </div>
      </div>
    </main>
  )
}

function Ecran({ emoji, titre, texte, children }) {
  return (
    <>
      <div className="text-5xl">{emoji}</div>
      <h1 className="text-2xl font-black text-[#0A0A0A]">{titre}</h1>
      {texte && <p className="text-sm text-[#3D3D3D]/70 leading-relaxed">{texte}</p>}
      {children}
      <Link href="/" className="text-xs text-[#3D3D3D]/50 hover:text-[#FF6B00] transition-colors mt-2">
        ← Retour sur BONMOMENT
      </Link>
    </>
  )
}

export default async function AnnulerPage({ searchParams }) {
  const sp = await searchParams
  const id     = sp?.r ?? ''
  const t      = sp?.t ?? ''
  const status = sp?.status ?? ''

  if (!verifierAnnulation(id, t)) {
    return (
      <Chrome>
        <Ecran emoji="🔗" titre="Lien invalide" texte="Ce lien d'annulation n'est pas valide ou a expiré." />
      </Chrome>
    )
  }

  const resa = await chargerReservation(id)
  if (!resa) {
    return (
      <Chrome>
        <Ecran emoji="🎟️" titre="Bon introuvable" texte="Ce bon n'existe plus." />
      </Chrome>
    )
  }

  const commerce = resa.offres?.commerces?.nom ?? 'le commerçant'

  if (status === 'success' && resa.statut === 'annulee') {
    return (
      <Chrome>
        <Ecran emoji="✅" titre="C'est annulé" texte={`Merci de l'avoir dit. Le bon chez ${commerce} est reparti pour quelqu'un d'autre.`} />
      </Chrome>
    )
  }

  if (resa.statut === 'annulee') {
    return (
      <Chrome>
        <Ecran emoji="✅" titre="Déjà annulé" texte={`Ton bon chez ${commerce} a déjà été libéré. Merci !`} />
      </Chrome>
    )
  }

  if (resa.statut !== 'reservee') {
    return (
      <Chrome>
        <Ecran emoji="🎟️" titre="Bon déjà utilisé" texte={`Ce bon a déjà été validé chez ${commerce}.`} />
      </Chrome>
    )
  }

  async function annuler(formData) {
    'use server'

    const id = formData.get('r')
    const t  = formData.get('t')
    if (!verifierAnnulation(id, t)) redirect(`/annuler?r=${id}&t=${t}`)

    const { data } = await admin
      .from('reservations')
      .select('id, user_id, statut')
      .eq('id', id)
      .maybeSingle()

    if (!data || data.statut !== 'reservee') redirect(`/annuler?r=${id}&t=${t}`)

    const { data: res } = await admin.rpc('annuler_bon', {
      p_reservation_id: id,
      p_user_id:        data.user_id,
    })
    const ok = Array.isArray(res) ? res[0]?.success === true : res?.success === true

    redirect(`/annuler?r=${id}&t=${t}${ok ? '&status=success' : ''}`)
  }

  return (
    <Chrome>
      <Ecran emoji="👋" titre="Tu ne pourras pas venir ?" texte={`Ton bon chez ${commerce} repartira aussitôt pour un autre habitant.`}>
        <form action={annuler} className="w-full mt-2">
          <input type="hidden" name="r" value={id} />
          <input type="hidden" name="t" value={t} />
          <button
            type="submit"
            className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm py-3.5 rounded-2xl transition-colors min-h-[44px]"
          >
            Confirmer l&apos;annulation
          </button>
        </form>
      </Ecran>
    </Chrome>
  )
}
