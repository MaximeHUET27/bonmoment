import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { createClient } from '@/lib/supabase/server'

const ISSUER_ID    = process.env.GOOGLE_WALLET_ISSUER_ID
const SA_EMAIL     = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const SA_KEY       = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')

function formatBadge(offre) {
  if (!offre) return 'Offre'
  if (offre.type_remise === 'pourcentage')    return `-${offre.valeur}%`
  if (offre.type_remise === 'montant_fixe')   return `-${offre.valeur}\u20ac`
  if (offre.type_remise === 'montant')        return `-${offre.valeur}\u20ac`
  if (offre.type_remise === 'cadeau')         return 'Cadeau'
  if (offre.type_remise === 'produit_offert') return 'Produit offert'
  if (offre.type_remise === 'service_offert') return 'Service offert'
  if (offre.type_remise === 'concours')       return 'Concours'
  if (offre.type_remise === 'atelier')        return 'Évènement'
  if (offre.type_remise === 'fidelite')       return 'Fidélité'
  return 'Offre'
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const reservationId    = searchParams.get('reservation_id')

  if (!reservationId) {
    return NextResponse.json({ error: 'reservation_id requis' }, { status: 400 })
  }
  if (!ISSUER_ID || !SA_EMAIL || !SA_KEY) {
    return NextResponse.json({ error: 'Configuration Google Wallet manquante' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: resa, error } = await supabase
    .from('reservations')
    .select(`
      id,
      code_validation,
      user_id,
      offres (
        id,
        titre,
        type_remise,
        valeur,
        date_fin,
        commerces ( nom, adresse, ville )
      )
    `)
    .eq('id', reservationId)
    .eq('user_id', user.id)
    .single()

  if (error || !resa) {
    return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
  }

  const offre   = resa.offres
  const commerce = offre?.commerces
  const badge   = formatBadge(offre)
  const code    = String(resa.code_validation ?? '000000').padStart(6, '0')
  const qrUrl   = `https://bonmoment.app/bon/${resa.id}`

  const classId  = `${ISSUER_ID}.bonmoment_generic`
  const objectId = `${ISSUER_ID}.bon_${resa.id.replace(/-/g, '_')}`

  const textModules = [
    { id: 'offre', header: 'Offre', body: offre?.titre || '' },
  ]
  if (commerce?.adresse) {
    textModules.push({
      id: 'adresse',
      header: 'Adresse',
      body: `${commerce.adresse}${commerce.ville ? `, ${commerce.ville}` : ''}`,
    })
  }

  const walletObject = {
    id: objectId,
    classId,
    genericType: 'GENERIC_TYPE_UNSPECIFIED',
    hexBackgroundColor: '#FF6B00',
    cardTitle:  { defaultValue: { language: 'fr', value: 'BONMOMENT' } },
    subheader:  { defaultValue: { language: 'fr', value: commerce?.nom || '' } },
    header:     { defaultValue: { language: 'fr', value: badge } },
    barcode: {
      type: 'QR_CODE',
      value: qrUrl,
      alternateText: code,
    },
    textModulesData: textModules,
  }

  if (offre?.date_fin) {
    walletObject.validTimeInterval = {
      end: { date: new Date(offre.date_fin).toISOString() },
    }
  }

  const payload = {
    iss: SA_EMAIL,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    payload: {
      genericClasses: [{ id: classId, issuerName: 'BONMOMENT' }],
      genericObjects: [walletObject],
    },
  }

  const token = jwt.sign(payload, SA_KEY, { algorithm: 'RS256' })

  return NextResponse.json({ url: `https://pay.google.com/gp/v/save/${token}` })
}
