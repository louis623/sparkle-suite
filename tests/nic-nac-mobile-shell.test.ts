import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Nic-Nac mobile shell launcher', () => {
  it('keeps the closed launcher compact above mobile navigation and safe areas', () => {
    const css = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/NicNacMobileShell.module.css',
      ),
      'utf8',
    )

    expect(css).toMatch(/\.bubble\s*\{[^}]*width:\s*48px/s)
    expect(css).toMatch(/\.bubble\s*\{[^}]*height:\s*48px/s)
    expect(css).toContain(
      'bottom: calc(max(86px, env(safe-area-inset-bottom) + 82px) + var(--site-save-bar-block, 0px));',
    )
    expect(css).toContain(
      'right: max(14px, calc(env(safe-area-inset-right) + 14px));',
    )
    expect(css).toContain('@media (max-width: 879px)')
    expect(css).toContain("html[data-site-save-bar='open']")
    expect(css).toContain("html[data-site-field-focus='true']")
  })

  it('returns focus only after the mobile sheet closes, not on first mount', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/NicNacMobileShell.tsx',
      ),
      'utf8',
    )

    expect(source).toContain('const hasMountedRef = useRef(false)')
    expect(source).toContain('const wasOpenRef = useRef(open)')
    expect(source).toContain('if (!hasMountedRef.current) {')
    expect(source).toContain('if (wasOpenRef.current && !open && bubbleRef.current) {')
  })
})
