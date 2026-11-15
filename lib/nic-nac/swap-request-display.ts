import type { JewelryType } from '@/lib/services/types'

const typeNames: Record<JewelryType, string> = { RG: 'Ring', NK: 'Necklace', ER: 'Earrings', BR: 'Bracelet', ST: 'Stack' }

export function offeredDimensions(type?: string | null, family?: string | null) {
  return [type ? typeNames[type as JewelryType] ?? type : null, family].filter(Boolean).join(' / ')
}

export function screeningLabel(status?: string | null) {
  return status === 'likely_match' ? 'Likely match' : status === 'mismatch' ? 'Mismatch' : 'Needs verification'
}

export function requestTiming(createdAt?: string, expiresAt?: string | null, now = Date.now()) {
  const age = Math.max(0, Math.floor((now - Date.parse(createdAt ?? '')) / 60_000))
  const days = Math.ceil((Date.parse(expiresAt ?? '') - now) / 86_400_000)
  return {
    age: Number.isFinite(age) ? (age === 0 ? 'Requested just now' : 'Requested ' + age + ' min ago') : null,
    expiry: days > 0 ? 'Photo expires in ' + days + (days === 1 ? ' day' : ' days') : null,
    expired: days <= 0,
  }
}

export function orderLabel(position?: number) {
  return position && position >= 1 ? (position === 1 ? 'First pending for this dancer' : 'Pending #' + position + ' for this dancer') : null
}

/** Friendly card-only age. Review dialog and alert timing retain their contract. */
export function requestCardAge(createdAt?: string, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(createdAt ?? '')) / 60_000))
  if (!Number.isFinite(minutes)) return null
  if (!minutes) return 'Requested just now'
  if (minutes < 60) return `Requested ${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `Requested ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  return `Requested ${Math.floor(hours / 24)} days ago`
}
