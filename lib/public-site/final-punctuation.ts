export function withFinalPunctuation(value: string) {
  const name = value.trim()
  return /[.!?]$/.test(name) ? name : `${name}.`
}
