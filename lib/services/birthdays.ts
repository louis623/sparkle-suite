import { errors } from '@/lib/services/errors'

export type BirthdayMonthDay = {
  month: number
  day: number
}

export function normalizeBirthday(
  value: string | null | undefined,
): BirthdayMonthDay | null {
  const normalized = value?.trim() ?? ''
  if (!normalized) return null

  const match = /^(\d{2})-(\d{2})$/.exec(normalized)
  if (!match) {
    throw errors.INVALID_INPUT(
      'birthday must use MM-DD',
      'Birthday must use month and day in MM-DD format. Do not include a year.',
    )
  }

  const month = Number(match[1])
  const day = Number(match[2])
  const candidate = new Date(Date.UTC(2024, month - 1, day))
  if (
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw errors.INVALID_INPUT(
      'birthday must be a calendar date',
      'Birthday must be a real month and day.',
    )
  }

  return { month, day }
}

export function formatBirthday(
  month: number | null | undefined,
  day: number | null | undefined,
) {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return null
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
