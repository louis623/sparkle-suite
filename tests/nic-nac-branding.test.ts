import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { NicNacMark } from '@/app/_components/nic-nac-mark'
import { EmptyGreeting } from '@/app/nic-nac/components/EmptyGreeting'
import { RequiredSetupLiveQueuePanel } from '@/app/nic-nac/components/RequiredSetupLiveQueuePanel'
import { RequiredSetupLookPicker } from '@/app/nic-nac/components/RequiredSetupLookPicker'
import { RequiredSetupPreviewPanel } from '@/app/nic-nac/components/RequiredSetupPreviewPanel'
import { InputRow } from '@/app/nic-nac/components/InputRow'
import { ThinkingIndicator } from '@/app/nic-nac/components/ThinkingIndicator'
import { NicNacHeader } from '@/app/nic-nac/components/NicNacHeader'

describe('Nic-Nac branding copy', () => {
  it('renders the rep-facing assistant name across the shell copy', () => {
    const greetingHtml = renderToStaticMarkup(createElement(EmptyGreeting))
    const inputHtml = renderToStaticMarkup(
      createElement(InputRow, {
        value: '',
        onChange: () => {},
        onSubmit: () => {},
        attachments: [],
        onPickFiles: () => {},
        onRemoveAttachment: () => {},
      }),
    )
    const thinkingHtml = renderToStaticMarkup(
      createElement(ThinkingIndicator, {
        showGlyph: true,
      }),
    )
    const headerHtml = renderToStaticMarkup(
      createElement(NicNacHeader, {
        closeLabel: 'Close Nic-Nac',
        onClose: () => {},
      }),
    )

    expect(greetingHtml).toContain("Hey, I&#x27;m Nic-Nac. How can I help?")
    expect(inputHtml).toContain('placeholder="Ask Nic-Nac…')
    expect(thinkingHtml).toContain('Nic-Nac is thinking…')
    expect(headerHtml).toContain('Nic-Nac')
    expect(headerHtml).not.toContain('NIC-NAC')
    expect(headerHtml).toContain('aria-label="Close Nic-Nac"')
  })

  it('uses guided copy without prompt chips during required setup', () => {
    const greetingHtml = renderToStaticMarkup(
      createElement(EmptyGreeting, { mode: 'required_setup' }),
    )
    expect(greetingHtml).toContain('Welcome to your new Sparkle Suite.')
    expect(greetingHtml).toContain('We&#x27;re happy to have you.')
    expect(greetingHtml).toContain('I&#x27;m Nic-Nac, your built-in live show assistant.')
    expect(greetingHtml).toContain('Sparkle Suite Workspace')
    expect(greetingHtml).toContain('customer-facing website ready!')
    expect(greetingHtml).toContain('What should I call you?')
    expect(greetingHtml).not.toContain('What&#x27;s on your mind?')
  })

  it('renders customer-facing site Look choices for required setup', () => {
    const html = renderToStaticMarkup(
      createElement(RequiredSetupLookPicker, {
        onChoose: () => {},
      }),
    )

    expect(html).toContain('Customer-facing site theme')
    expect(html).toContain('Choose the Look for your public site')
    expect(html).toContain('This only changes the public customer-facing Amethyst site.')
    expect(html).toContain('Sparkle Suite/Morganite')
    expect(html).toContain('Black Diamond')
    expect(html).toContain('Rose Gold')
    expect(html).toContain('Choose this customer-site Look')
    expect(html).toContain('SS-01')
    expect(html).toContain('BD-01')
    expect(html).not.toContain('Sparkle Suite/Morganite is ready')
    expect(html).not.toContain('Locked theme')
    expect(html).not.toContain('Continue with Morganite')
  })

  it('renders required Live Queue setup as an operational setup panel', () => {
    const html = renderToStaticMarkup(
      createElement(RequiredSetupLiveQueuePanel, {
        syncCode: 'MHF-7342',
        onSend: () => {},
      }),
    )

    expect(html).toContain('Set up Live Queue')
    expect(html).toContain('Secret Rep ID Number')
    expect(html).not.toContain('MHF-7342')
    expect(html).toContain('Creating a key is not connection proof')
    expect(html).toContain('upgraded Sparkle Suite extension')
    expect(html).toContain(
      'https://chromewebstore.google.com/detail/sparkle-suite-live-queue/kmodgfffflplfdlkkhadgimmobplhoih',
    )
    expect(html).toContain('Extension connection setup')
    expect(html).toContain('Computer name')
    expect(html).toContain('Create private connection key')
    expect(readFileSync(resolve(process.cwd(), 'app/nic-nac/components/LiveLineupPublisherControls.tsx'), 'utf8'))
      .toContain('Eight usable extension connections already exist.')
    expect(html).toContain('Bomb Party Party Orders tab')
    expect(html).toContain('review and confirm that tab and the parties for your show')
    expect(html).toContain('Verify connection and continue')
    expect(html).toContain('I need help with Live Queue setup')
    expect(html).not.toContain('search')
    expect(html).not.toContain('064632')
    expect(html).not.toContain('orientation')
    expect(html).not.toContain('LiveQ')
  })

  it('renders final preview approval with an exact customer-facing website link', () => {
    const html = renderToStaticMarkup(
      createElement(RequiredSetupPreviewPanel, {
        previewHref: '/amethyst/Homepage.html?c=rep-1',
        onApprove: () => {},
      }),
    )

    expect(html).toContain('Preview your customer-facing website')
    expect(html).toContain('href="/amethyst/Homepage.html?c=rep-1"')
    expect(html).toContain('Open preview')
    expect(html).toContain('Approve preview and unlock workspace')
    expect(html).not.toContain('look around the edges')
    expect(html).not.toContain('dashboard')
  })

  it('keeps Nic-Nac and rep message text compact and bold for workspace use', () => {
    const bubbleCss = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/Bubble.module.css'),
      'utf8',
    )
    const streamingCss = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/StreamingBubble.module.css'),
      'utf8',
    )
    const greetingCss = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/EmptyGreeting.module.css'),
      'utf8',
    )
    const tokensCss = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/nic-nac-tokens.css'),
      'utf8',
    )

    expect(bubbleCss).toContain('.nicNac')
    expect(bubbleCss).toContain('font-size: 13px')
    expect(bubbleCss).toContain('font-weight: 700')
    expect(bubbleCss).toContain('color: var(--nic-nac-speaker-nic-nac)')
    expect(streamingCss).toContain('font-size: 13px')
    expect(streamingCss).toContain('font-weight: 700')
    expect(streamingCss).toContain('color: var(--nic-nac-speaker-nic-nac)')
    expect(greetingCss).toContain('font-size: 13px')
    expect(greetingCss).toContain('font-weight: 700')
    expect(bubbleCss).toContain('.rep')
    expect(bubbleCss).toMatch(/\.rep\s*\{[^}]*font-size: 13px/s)
    expect(bubbleCss).toMatch(/\.rep\s*\{[^}]*font-weight: 700/s)
    expect(bubbleCss).toMatch(/\.rep\s*\{[^}]*line-height: 1\.45/s)
    expect(bubbleCss).toMatch(/\.rep\s*\{[^}]*color: var\(--nic-nac-speaker-rep\)/s)
    expect(tokensCss).toContain('--nic-nac-speaker-nic-nac: #402924')
    expect(tokensCss).toContain('--nic-nac-speaker-rep: #36221D')
    expect(tokensCss).toContain('--nic-nac-surface-rep-message: #F6EDE8')
    expect(tokensCss).not.toContain('#285C59')
  })

  it('keeps Nic-Nac headers and the shared chat composer easy to read', () => {
    const requiredSetupHome = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/RequiredSetupHome.tsx'),
      'utf8',
    )
    const requiredSetupCss = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/RequiredSetupHome.module.css'),
      'utf8',
    )
    const headerCss = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/NicNacHeader.module.css'),
      'utf8',
    )
    const inputCss = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/InputRow.module.css'),
      'utf8',
    )

    expect(requiredSetupHome).toContain('<p>Nic-Nac</p>')
    expect(requiredSetupHome).toContain('<NicNacGlyph size={40} />')
    expect(requiredSetupHome).not.toContain('Required setup resumes automatically')
    expect(requiredSetupHome).not.toContain('chatStatus')
    expect(requiredSetupCss).toMatch(/\.chatHeader p\s*\{[^}]*font-size: 0\.86rem/s)
    expect(requiredSetupCss).toMatch(/\.chatHeader p\s*\{[^}]*font-weight: 900/s)
    expect(requiredSetupCss).toMatch(/\.chatHeader p\s*\{[^}]*text-transform: none/s)
    expect(requiredSetupCss).not.toContain('.chatStatus')
    expect(headerCss).toContain('min-height: 56px')
    expect(headerCss).toMatch(/\.title\s*\{[^}]*font-size: 14px/s)
    expect(headerCss).toMatch(/\.closeBtn\s*\{[^}]*width: 40px/s)
    expect(headerCss).toMatch(/\.newBtn\s*\{[^}]*min-height: 32px/s)
    expect(headerCss).toMatch(/\.newBtn\s*\{[^}]*border-radius: 999px/s)
    expect(headerCss).not.toContain('.refreshBtn')
    expect(inputCss).toMatch(/\.textarea\s*\{[^}]*font-size: 12px/s)
    expect(inputCss).toMatch(/\.textarea\s*\{[^}]*font-weight: 700/s)
    expect(inputCss).toMatch(/\.iconBtn\s*\{[^}]*width: 42px/s)
    expect(inputCss).toMatch(/\.send\s*\{[^}]*width: 42px/s)
  })

  it('contains required setup chat scrolling inside the Nic-Nac card', () => {
    const requiredSetupCss = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/RequiredSetupHome.module.css'),
      'utf8',
    )
    const chatHistoryCss = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/ChatHistory.module.css'),
      'utf8',
    )

    expect(requiredSetupCss).toMatch(/\.root\s*\{[^}]*min-height: var\(--nic-nac-app-height, 100dvh\)/s)
    expect(requiredSetupCss).toMatch(/\.root\s*\{[^}]*overflow: hidden/s)
    expect(requiredSetupCss).toMatch(/\.chatPanel\s*\{[^}]*height: calc\(var\(--nic-nac-app-height, 100dvh\) - 2rem\)/s)
    expect(requiredSetupCss).toMatch(/\.chatPanel\s*\{[^}]*min-height: 0/s)
    expect(requiredSetupCss).toMatch(/\.chatPanel\s*\{[^}]*overflow: hidden/s)
    expect(requiredSetupCss).toMatch(/\.chatBody\s*\{[^}]*min-height: 0/s)
    expect(requiredSetupCss).toMatch(/\.chatBody\s*\{[^}]*overflow: hidden/s)
    expect(chatHistoryCss).toMatch(/\.scroll\s*\{[^}]*overflow-y: auto/s)
  })

  it('uses the approved bright pink circle with a white N for every shared Nic-Nac mark', () => {
    const markHtml = renderToStaticMarkup(createElement(NicNacMark, { size: 34 }))
    const markCss = readFileSync(
      resolve(process.cwd(), 'app/_components/nic-nac-mark.module.css'),
      'utf8',
    )

    expect(markHtml).toContain('N')
    expect(markHtml).toContain('width:34px')
    expect(markHtml).toContain('height:34px')
    expect(markCss).toContain('background: #ee2c9b')
    expect(markCss).toContain('color: #ffffff')
    expect(markCss).toContain('border-radius: 999px')
    expect(markCss).toContain('font-family: "DM Sans"')
    expect(markCss).not.toContain('var(--nic-nac-accent')
    expect(markCss).not.toContain('var(--nic-nac-text-on-accent')
    expect(markCss).not.toContain('box-shadow')
  })

  it('does not let required setup header text styling override the shared Nic-Nac mark', () => {
    const requiredSetupHome = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/RequiredSetupHome.tsx',
      ),
      'utf8',
    )
    const requiredSetupCss = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/RequiredSetupHome.module.css',
      ),
      'utf8',
    )

    expect(requiredSetupHome).not.toContain('className={styles.chatStatus}')
    expect(requiredSetupCss).not.toContain('.chatStatus')
    expect(requiredSetupCss).not.toContain('.chatHeader span')
  })

  it('keeps required setup styling on the production Sparkle Suite palette', () => {
    const css = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/RequiredSetupHome.module.css',
      ),
      'utf8',
    )

    expect(css).toContain('#402924')
    expect(css).toContain('#ee2c9b')
    expect(css).toContain('Playfair Display')
    expect(css).toContain('DM Sans')
    expect(css).not.toContain(
      'linear-gradient(135deg, #fff8fb 0%, #f8efe9 42%, #402924 82%, #36221d 100%)',
    )
    expect(css).not.toMatch(/background:[^;}]*#402924[^;}]*#36221d[^;}]*;/)
  })
})
