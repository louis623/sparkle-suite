import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ToolsOverview } from '@/app/_components/tools-overview'
import { ToolsExperience } from '@/app/_components/tools-experience'
import { metadata } from '@/app/tools/page'

describe('Suite marketing tools journey', () => {
  it('shows exactly the four approved Home tools and links each to a real detail section', () => {
    const overview = renderToStaticMarkup(createElement(ToolsOverview))
    const details = renderToStaticMarkup(createElement(ToolsExperience))
    expect([...overview.matchAll(/<h3>([^<]+)<\/h3>/g)].map(match => match[1]).slice(0,4)).toEqual(['Dance Floor','Live Lineup','Live Show Calendar','Team Management'])
    expect(overview.match(/<article /g)).toHaveLength(4)
    for(const match of overview.matchAll(/href="\/tools#([^"]+)"/g)) expect(details).toContain(`id="${match[1]}"`)
    expect(overview).toContain('href="/tools"')
    expect(overview).not.toContain('Nic-Nac')
  })
  it('preserves deep proof, groups onboarding under Team Management, and leaves Nic-Nac private', () => {
    const html = renderToStaticMarkup(createElement(ToolsExperience))
    const team = html.slice(html.indexOf('id="team-management"'),html.indexOf('id="nic-nac"'))
    expect(team).toContain('New Rep Onboarding')
    expect(team).toContain('six starting steps')
    expect(team).toContain('does not publish their team card')
    expect(html).toContain('Try the Live Lineup')
    expect(html).toContain('Nic-Nac is included for paying reps')
    expect(html).toContain('Customer email and SMS updates are coming soon.')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('<textarea')
    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('public-nic-nac')
    expect(html).toContain('No payment when you join the queue.')
    expect(metadata.alternates?.canonical).toBe('/tools')
  })
})
