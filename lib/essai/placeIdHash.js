import { createHash } from 'crypto'

export function hashPlaceId(placeId) {
  return createHash('sha256').update(String(placeId)).digest('hex')
}
