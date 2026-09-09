export function normalizeRepDisplayName(repDisplayName: string | undefined) {
  return (
    repDisplayName
      ?.replace(/[\u0000-\u001f\u007f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) ?? ''
  )
}

/**
 * Names in the private Workspace welcome are deliberately limited to the
 * profile's first natural name. A greeting should feel personal without
 * needlessly repeating the rep's full name.
 */
export function getRepGivenName(repDisplayName: string | undefined) {
  return normalizeRepDisplayName(repDisplayName).split(' ')[0]?.trim() ?? ''
}

export function buildPersonalizedRepGreeting(input: {
  latestUserText: string
  repDisplayName: string | undefined
}) {
  const text = input.latestUserText.trim()
  const greetingMatch = text.match(
    /^(hello|hi|hey|good morning|good afternoon|good evening)(?:[\s,]+(?:there|nic[- ]?nac))?[!.?]*$/i,
  )
  if (!greetingMatch) return null

  const givenName = getRepGivenName(input.repDisplayName)
  const greeting = greetingMatch[1]!.toLowerCase()
  const opening =
    greeting === 'good morning'
      ? 'Good morning'
      : greeting === 'good afternoon'
        ? 'Good afternoon'
        : greeting === 'good evening'
          ? 'Good evening'
          : greeting === 'hey'
            ? 'Hey'
            : 'Hello'

  return givenName
    ? `${opening}, ${givenName}! How can I help you today?`
    : `${opening}! How can I help you today?`
}
