import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import UnsubscribePage from '@/app/amethyst/unsubscribe/page'

it('keeps the real unsubscribe form without presenting a fictional rep or stock listings', () => {
  const html = renderToStaticMarkup(React.createElement(UnsubscribePage))
  expect(html).toContain('Sparkle Suite')
  expect(html).toContain('action="/api/amethyst/customer-audience/unsubscribe"')
  expect(html).toContain('Unsubscribe from updates')
  expect(html).toContain('Phone number')
  expect(html).toContain('Email address')
  expect(html).toContain('Stop SMS updates')
  expect(html).toContain('Stop email updates')
  expect(html).not.toContain('Sparkle by Sasha')
  expect(html).not.toContain('Amethyst preview site')
  expect(html).not.toContain('Citrine Sun Pendant')
})
