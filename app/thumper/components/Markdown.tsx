'use client'

import { Fragment, type ReactNode } from 'react'

// Tiny inline markdown renderer for assistant messages. Handles **bold**,
// *italic*, [text](url), bare URLs, and `- ` / `\d+. ` lists. No deps, no
// dangerouslySetInnerHTML. URL allowlist gates every <a href> render.

const SAFE_SCHEMES = ['http:', 'https:', 'mailto:']

export function isSafeUrl(href: string): boolean {
  if (!href || typeof href !== 'string') return false
  const trimmed = href.trim()
  // For protocol-relative ('//host') treat as http(s)-equivalent
  if (trimmed.startsWith('//')) return true
  // Try parse with a base; if URL constructor accepts it, check protocol.
  try {
    const u = new URL(trimmed, 'https://example.invalid')
    // Reject if the resolved URL points at our base host (means it parsed as
    // a relative path) UNLESS the original input also parses standalone.
    if (u.origin === 'https://example.invalid' && !/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
      // Bare relative path — treat as unsafe for assistant output.
      return false
    }
    return SAFE_SCHEMES.includes(u.protocol)
  } catch {
    return false
  }
}

export function Markdown({ text }: { text: string }) {
  const blocks = parseBlocks(text)
  return (
    <>
      {blocks.map((block, i) => {
        if (block.kind === 'ul') {
          return (
            <ul key={i} className="thumper-md-ul">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          )
        }
        if (block.kind === 'ol') {
          return (
            <ol key={i} className="thumper-md-ol">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ol>
          )
        }
        return (
          <p key={i} className="thumper-md-p">
            {renderInline(block.text)}
          </p>
        )
      })}
    </>
  )
}

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }

function parseBlocks(text: string): Block[] {
  const out: Block[] = []
  const blocks = text.split(/\n\s*\n/)
  for (const raw of blocks) {
    const lines = raw.split(/\r?\n/).filter((l) => l.length > 0)
    if (lines.length === 0) continue

    if (lines.every((l) => /^[-*]\s+/.test(l))) {
      out.push({ kind: 'ul', items: lines.map((l) => l.replace(/^[-*]\s+/, '')) })
      continue
    }
    if (lines.every((l) => /^\d+\.\s+/.test(l))) {
      out.push({ kind: 'ol', items: lines.map((l) => l.replace(/^\d+\.\s+/, '')) })
      continue
    }
    out.push({ kind: 'p', text: lines.join('\n') })
  }
  return out
}

// Inline pass: alternates between **bold**, *italic*, [text](url), and bare URLs.
// We tokenize once with a global regex and rebuild a ReactNode array.
const INLINE_RE =
  /(\*\*([^*]+)\*\*)|(\*([^*\s][^*]*?[^*\s]|[^*\s])\*)|(\[([^\]]+)\]\(([^)\s]+)\))|(\bhttps?:\/\/[^\s)]+)/g

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  // Reset regex state because it's a module-level RegExp with /g.
  INLINE_RE.lastIndex = 0
  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(text.slice(lastIndex, match.index))
    }
    if (match[1]) {
      out.push(<strong key={`b${key++}`}>{match[2]}</strong>)
    } else if (match[3]) {
      out.push(<em key={`i${key++}`}>{match[4]}</em>)
    } else if (match[5]) {
      const label = match[6]
      const href = match[7]
      out.push(renderLink(href, label, `l${key++}`))
    } else if (match[8]) {
      out.push(renderLink(match[8], match[8], `a${key++}`))
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    out.push(text.slice(lastIndex))
  }
  return out.length === 0 ? [text] : out
}

function renderLink(href: string, label: string, key: string): ReactNode {
  if (!isSafeUrl(href)) {
    // Inert text — render label so the user still sees the intent.
    return <Fragment key={key}>{label}</Fragment>
  }
  return (
    <a key={key} href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  )
}
