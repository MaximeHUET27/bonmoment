export const GOOGLE_MAPS_LIBRARIES = ['places', 'marker']

export const GOOGLE_MAPS_LOADER_CONFIG = {
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY,
  libraries: GOOGLE_MAPS_LIBRARIES,
  language: 'fr',
  region: 'FR',
  version: 'weekly',
}
