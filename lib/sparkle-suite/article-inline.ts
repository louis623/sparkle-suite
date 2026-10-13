export type ArticleInlinePart =
  | { type: 'text' | 'strong'; text: string }
  | { type: 'link'; text: string; href: string }

/** Only the source draft's bold emphasis and http(s) links; never interpret HTML. */
export function articleInlineParts(text: string): ArticleInlinePart[] {
  const parts: ArticleInlinePart[] = []
  let cursor = 0
  for (const match of text.matchAll(/\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g)) {
    const start = match.index!
    if (start > cursor) parts.push({ type: 'text', text: text.slice(cursor, start) })
    parts.push(match[1] ? { type: 'strong', text: match[1] } : { type: 'link', text: match[2], href: match[3] })
    cursor = start + match[0].length
  }
  if (cursor < text.length) parts.push({ type: 'text', text: text.slice(cursor) })
  return parts
}
