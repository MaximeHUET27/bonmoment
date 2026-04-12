'use client'

import Link from 'next/link'
import Image from 'next/image'

/**
 * Carte d'infos d'un commerce : photo, nom, note Google, adresse, téléphone, horaires, lien Maps.
 * Props :
 *   commerce    = { nom, photo_url, note_google, adresse, ville, telephone, horaires }
 *   commerceId  = string | undefined — si fourni, le nom devient un lien vers /commercant/[id]
 */

const JOURS_EN_FR = {
  'Monday': 'Lundi', 'Tuesday': 'Mardi', 'Wednesday': 'Mercredi',
  'Thursday': 'Jeudi', 'Friday': 'Vendredi', 'Saturday': 'Samedi', 'Sunday': 'Dimanche',
}
function tradJour(str) {
  if (!str) return str
  return str.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/, d => JOURS_EN_FR[d] || d)
}

/* Google weekdayDescriptions : index 0 = Lundi … 6 = Dimanche */
function getTodayIndex() {
  const js = new Date().getDay() // 0=Dim…6=Sam
  return js === 0 ? 6 : js - 1  // → 0=Lun…6=Dim
}

export default function CommerceInfoCard({ commerce, commerceId }) {
  if (!commerce) return null

  const mapsUrl = commerce.adresse
    ? `https://maps.google.com/?q=${encodeURIComponent(`${commerce.adresse}, ${commerce.ville || ''}`)}`
    : null

  // Gère les deux formats de stockage :
  // - tableau brut ["Lundi: 9h-18h", …]   (inscription via Places API legacy)
  // - { weekdayDescriptions: […] }          (cron via Places API v2)
  const descriptions = Array.isArray(commerce.horaires)
    ? commerce.horaires
    : commerce.horaires?.weekdayDescriptions
  const todayIdx = getTodayIndex()

  return (
    <div className="w-full rounded-2xl border border-[#F0F0F0] overflow-hidden">

      {/* Photo */}
      <div className="w-full h-36 bg-[#FFF0E0] flex items-center justify-center overflow-hidden">
        {commerce.photo_url ? (
          <Image src={commerce.photo_url} alt={commerce.nom} width={500} height={144} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">🏪</span>
        )}
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">

        {/* Nom + note Google */}
        <div className="flex items-center gap-2 flex-wrap">
          {commerceId ? (
            <Link
              href={`/commercant/${commerceId}`}
              className="font-black text-[#0A0A0A] text-base leading-tight hover:underline underline-offset-2 hover:text-[#FF6B00] transition-colors"
            >
              {commerce.nom}
            </Link>
          ) : (
            <p className="font-black text-[#0A0A0A] text-base leading-tight">{commerce.nom}</p>
          )}
          {commerce.note_google != null && (
            <span className="text-xs font-bold text-[#FBBF24]">⭐ {commerce.note_google}</span>
          )}
        </div>

        {/* Adresse */}
        {commerce.adresse && (
          <p className="text-xs text-[#3D3D3D]/70 leading-snug">
            📍 {commerce.adresse}{commerce.ville ? `, ${commerce.ville}` : ''}
          </p>
        )}

        {/* Téléphone */}
        {commerce.telephone && (
          <a
            href={`tel:${commerce.telephone}`}
            className="text-xs font-semibold text-[#FF6B00] hover:underline"
          >
            📞 {commerce.telephone}
          </a>
        )}

        {/* Horaires */}
        {descriptions && descriptions.length > 0 && (
          <div className="flex flex-col gap-0.5 mt-1">
            {descriptions.map((desc, i) => (
              <p
                key={i}
                className={`text-[11px] leading-snug ${
                  i === todayIdx
                    ? 'font-bold text-[#0A0A0A]'
                    : 'text-[#3D3D3D]/55'
                }`}
              >
                {i === todayIdx && <span className="text-[#FF6B00] mr-1">▶</span>}
                {tradJour(desc)}
              </p>
            ))}
          </div>
        )}

        {/* Bouton S'y rendre */}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 border-2 border-[#FF6B00] text-[#FF6B00] font-bold text-sm py-3 rounded-2xl hover:bg-[#FFF0E0] transition-colors min-h-[44px] mt-1"
          >
            📍 S&apos;y rendre
          </a>
        )}

      </div>
    </div>
  )
}
