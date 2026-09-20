import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { transformSync } from 'esbuild'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  buildAmethystJoinBootstrapScript,
  defaultAmethystJoinTemplateData,
  type AmethystJoinTeamMember,
} from '@/lib/amethyst/join-template-data'
import { parseTeamPhotoFraming, teamPhotoFramingStyle } from '@/lib/amethyst/team-photo-framing'
import { applyBrittWithBlingJoin } from '@/lib/britt-with-bling/profile'

const source = readFileSync(resolve(process.cwd(), 'public/amethyst/join.jsx'), 'utf8')
const memberSetup = source.slice(source.indexOf('const FALLBACK_TEAM ='), source.indexOf('const FOOTER_LINKS ='))
const cardSource = source.slice(source.indexOf('function TeamCard('), source.indexOf('function SpotCard('))
const TeamCard = runInNewContext(
  transformSync(`${cardSource}\nTeamCard;`, { loader: 'jsx', target: 'es2020' }).code,
  {
    React, useState: React.useState, parseTeamPhotoFraming, teamPhotoFramingStyle,
    PinIcon: () => null, TeamConnect: () => null,
  },
) as React.ComponentType<{ member: AmethystJoinTeamMember; isLeader?: boolean }>

function runtimeMembers(members: AmethystJoinTeamMember[]) {
  const content = applyBrittWithBlingJoin({
    ...defaultAmethystJoinTemplateData,
    repName: 'Brittany', businessName: 'Britt With Bling',
    repImageUrl: 'https://example.test/originals/brittany-lead.jpg',
  }, members)
  const script = buildAmethystJoinBootstrapScript(content, 'black_diamond', { targeted: true })
  const payload = JSON.parse(script.match(/window\.AMETHYST_JOIN_TEMPLATE_DATA = (.+);/)![1])
  return runInNewContext(`${memberSetup}\nTEAM_MEMBERS;`, {
    CONTENT: payload, RUNTIME_CONTEXT: { targeted: true },
    runtimeText: (value: string) => value?.trim() || '',
    deriveInitials: (name: string, initials: string) => initials || name.slice(0, 1),
  }) as AmethystJoinTeamMember[]
}

describe('public team photo identity', () => {
  it('keeps every original photo and frame with its member through Brittany styling, bootstrap, reorder, and card rendering', () => {
    const members: AmethystJoinTeamMember[] = [
      { id: 'brittany-card', name: 'Brittany', business: 'Britt With Bling', state: 'Florida', socialLinks: {}, imageUrl: 'https://example.test/originals/brittany-card.jpg', imageClassName: 'ss-frame:31,22,1.08,0' },
      { id: 'amanda-one', name: 'Amanda', business: 'Amanda Sparkle', state: 'Texas', socialLinks: {}, imageUrl: 'https://example.test/originals/amanda-one.jpg', imageClassName: 'ss-frame:62,41,1.00,0 ss-fit:contain' },
      { id: 'amanda-two', name: 'Amanda', business: 'Other Boutique', state: 'Georgia', socialLinks: {}, imageUrl: 'https://example.test/originals/amanda-two.jpg', imageClassName: 'ss-frame:48,35,1.12,-3' },
      { id: 'no-photo', name: 'Casey', business: 'Casey Fizz', state: 'Ohio', socialLinks: {} },
    ]
    const originals = structuredClone(members)
    for (const order of [members, [...members].reverse()]) {
      const renderedMembers = runtimeMembers(order)
      expect(renderedMembers.map((member) => member.id)).toEqual(order.map((member) => member.id))
      for (const member of renderedMembers) {
        const original = originals.find((item) => item.id === member.id)!
        expect(member.name).toBe(original.name)
        expect(member.imageUrl).toBe(original.imageUrl)
        expect(member.imageClassName).toBe(original.imageClassName)
        const html = renderToStaticMarkup(React.createElement(TeamCard, { member }))
        expect(html).toContain(`data-team-member-id="${original.id}"`)
        expect(html).toContain(original.name)
        if (original.imageUrl) {
          expect(html).toContain(`src="${original.imageUrl}"`)
          for (const [property, value] of Object.entries(teamPhotoFramingStyle(parseTeamPhotoFraming(original.imageClassName)))) {
            expect(html).toContain(`${property}:${value}`)
          }
        } else {
          expect(html).not.toContain('<img')
        }
        for (const other of originals.filter((item) => item.id !== original.id && item.imageUrl)) {
          expect(html).not.toContain(other.imageUrl)
        }
      }
    }
    expect(members).toEqual(originals)
    expect(source).toContain('key={member.id || `${member.name}-${index}`}')
  })

  it('does not inject sample members into an empty targeted roster', () => {
    expect(runtimeMembers([])).toEqual([])
  })
})
