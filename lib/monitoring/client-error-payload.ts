/** Allowlisted diagnostics only: arbitrary exception text may contain form values. */
export function sanitizeClientError(input: Record<string, unknown>) {
  const rawMessage = typeof input.message === 'string' ? input.message : ''
  const category = rawMessage.match(/\b(TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError|AggregateError)\b/)?.[0] ?? 'Error'
  const detail = [
    'Cannot read properties of undefined', 'Cannot read properties of null',
    'Maximum call stack size exceeded', 'Failed to fetch', 'Load failed',
    'ChunkLoadError', 'Minified React error', 'Script error',
  ].find(text => rawMessage.includes(text))
  const message = detail ? `${category}: ${detail}` : `${category}: [redacted]`
  // Only hashed Next build assets and numeric locations; no function names, URLs or source text.
  const stack = typeof input.stack === 'string'
    ? Array.from(input.stack.matchAll(/\/_next\/static\/(?:chunks|[a-zA-Z0-9_-]+)\/(?:[a-zA-Z0-9_-]+\/)*([a-f0-9-]{6,}(?:\.chunk)?\.js)(:\d+(?::\d+)?)?/g))
      .slice(0, 3).map(match => `/_next/static/chunks/${match[1]}${match[2] ?? ''}`).join('\n')
    : ''
  const rawPath = typeof input.path === 'string' ? input.path.split(/[?#]/, 1)[0] : '/'
  // Dynamic segments can contain names, email addresses or private identifiers.
  const safeSegments = new Set(['home', 'landing', 'join', 'rep', 'reps', 'sites', 'start', 'sign-in', 'auth', 'onboarding', 'nic-nac', 'dashboard', 'trade', 'calendar', 'shop', 'about', 'faq', 'pricing', 'control-center'])
  const path = rawPath.startsWith('/') && !rawPath.startsWith('//')
    ? '/' + rawPath.split('/').filter(Boolean).slice(0, 6).map(part => safeSegments.has(part) ? part : '[redacted]').join('/')
    : '/[redacted]'
  const userAgent = typeof input.userAgent === 'string'
    ? input.userAgent.match(/(?:Edg|Chrome|Firefox|Version|Safari)\/\d{1,3}(?!\d)/)?.[0] ?? 'Other'
    : 'Other'
  return { message, stack, path, userAgent }
}
