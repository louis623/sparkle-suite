export function validDanceFloorBackHref(value: unknown): string | null {
  // Next has decoded the parameter once. Never decode it again.
  if (typeof value !== 'string' || value.length > 200 || !value.startsWith('/') ||
      value.startsWith('//') || /[\\\\\x00-\x1f\x7f]/.test(value)) return null
  try { return new URL(value, 'https://x.invalid').origin === 'https://x.invalid' ? value : null }
  catch { return null }
}

