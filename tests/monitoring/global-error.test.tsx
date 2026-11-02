import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import DefaultGlobalError from 'next/dist/client/components/builtin/global-error'
import GlobalError from '@/app/global-error'

it.each([undefined, 'synthetic-digest'])('keeps the pinned Next fallback unchanged (digest %s)', digest => {
  const error = Object.assign(new Error('synthetic'), { digest })
  expect(renderToStaticMarkup(createElement(GlobalError, { error })))
    .toBe(renderToStaticMarkup(createElement(DefaultGlobalError, { error })))
})
