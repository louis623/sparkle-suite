/** First script frame only: never attribute an extension/third-party failure to a later app frame. */
export function clientErrorSource(stack: string, filename?: string, line?: number, column?: number) {
  if (filename) return { url: filename, line: line ?? 0, column: column ?? 0 }
  const first = stack.split('\n').find(value => /(?:https?:\/\/|(?:chrome|moz|safari)-extension:\/\/|file:\/\/)/.test(value))
  const match = first?.match(/((?:https?|chrome-extension|moz-extension|safari-extension|file):\/\/[^\s)]+?):(\d+):(\d+)/)
  return match ? { url: match[1], line: Number(match[2]), column: Number(match[3]) } : null
}

export function sameOriginScript(source: { url: string; line: number; column: number } | null, origin: string) {
  if (!source) return null
  try {
    const url = new URL(source.url, origin)
    if (url.origin !== origin || url.search || url.hash || url.username || url.password ||
        !/^\/(?:_next\/static\/chunks|amethyst)\/.+\.js$/.test(url.pathname) ||
        !Number.isSafeInteger(source.line) || source.line < 1 ||
        !Number.isSafeInteger(source.column) || source.column < 0) return null
    return { url: url.href, file: url.pathname, line: source.line, column: source.column }
  } catch { return null }
}
