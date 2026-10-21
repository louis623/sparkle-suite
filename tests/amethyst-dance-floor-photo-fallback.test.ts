import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import React from 'react'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

function actualFunction(name: string, context: Record<string, unknown>) {
  const source = readFileSync('public/amethyst/trade.jsx', 'utf8')
  const ast = ts.createSourceFile('trade.jsx', source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JSX)
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name)
  if (!declaration) throw new Error(`Missing ${name}`)
  const script = ts.transpileModule(`${declaration.getText(ast)}\n${name};`, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
  }).outputText
  return runInNewContext(script, { React, ...context })
}

type Tree = { type?: unknown; props?: Record<string, any> }

function descendants(node: Tree): Tree[] {
  return [node, ...React.Children.toArray(node.props?.children).flatMap(child =>
    typeof child === 'object' && child !== null ? descendants(child as Tree) : [])]
}

function classes(node: Tree | undefined) {
  return String(node?.props?.className || '').split(/\s+/).filter(Boolean)
}

function frame(nodes: Tree[], frameClass: string) {
  return nodes.find(node => classes(node).includes(frameClass))
}

function placeholderShape(node: Tree | undefined) {
  const children = React.Children.toArray(node?.props?.children).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return child
    if (child && typeof child === 'object') {
      const element = child as Tree
      const type = typeof element.type === 'function' ? element.type.name : element.type
      return { type, props: element.props }
    }
    return null
  })
  return {
    className: node?.props?.className,
    ariaHidden: node?.props?.['aria-hidden'] ?? null,
    children,
  }
}

type Piece = {
  id: string
  name: string
  tier: string
  collection: string
  type: string
  material: string
  stone: string
  glyph: string
  quantityAvailable: number
  photoUrl: string | null
  note: string
}

function piece(photoUrl: string | null, name = 'Unicorn Rain Earrings'): Piece {
  return {
    id: 'unicorn-rain-earrings',
    name,
    tier: 'unicorn',
    collection: 'Unicorn Rain',
    type: 'Earrings',
    material: 'Shown in photo',
    stone: 'Shown in photo',
    glyph: 'U',
    quantityAvailable: 1,
    photoUrl,
    note: 'Shown in photo',
  }
}

function responsiveRepImage(src: string, options: { alt?: string; sizes?: string; widths?: number[]; eager?: boolean }) {
  return {
    src,
    alt: options.alt || '',
    sizes: options.sizes,
    decoding: 'async',
    loading: options.eager ? 'eager' : 'lazy',
  }
}

function SparkleMark() {
  return React.createElement('svg', { className: 'tp-sparkle-mark', 'aria-hidden': true, focusable: 'false' })
}

function displayCollectionLabel(value: unknown) {
  return value
}

function isSpecificDancerNote() {
  return false
}

function photoHarness() {
  let failedUrl = ''
  let ready = false
  const useState = (initial: string) => {
    if (!ready) {
      failedUrl = initial
      ready = true
    }
    return [failedUrl, (next: string) => { failedUrl = next }] as const
  }
  return { useState }
}

describe('Dance Floor photo fallback', () => {
  it('swaps a broken grid photo for the same placeholder a card with no photo uses', () => {
    const { useState } = photoHarness()
    const TradeCard = actualFunction('TradeCard', { useState, responsiveRepImage, SparkleMark, displayCollectionLabel })
    const render = (photoUrl: string | null, name?: string) => descendants(TradeCard({
      piece: piece(photoUrl, name),
      onTap: () => {},
      tierVisible: 'rare',
    }))

    const loaded = render('https://cdn.example.test/unicorn-rain-earrings.jpg')
    const loadedFrame = frame(loaded, 'tp-card-photo')
    const loadedImage = loaded.find(node => node.props?.className === 'tp-card-photo-img')
    expect(classes(loadedFrame)).toEqual(['tp-card-photo', 'slot', 'has-photo'])
    expect(loadedImage?.props).toMatchObject({
      src: 'https://cdn.example.test/unicorn-rain-earrings.jpg',
      alt: 'Unicorn Rain Earrings',
      loading: 'lazy',
      decoding: 'async',
      sizes: '(max-width: 700px) 46vw, 280px',
    })
    expect(loaded.some(node => node.props?.className === 'photo-glyph')).toBe(false)

    loadedImage?.props?.onError()
    const failed = render('https://cdn.example.test/unicorn-rain-earrings.jpg')
    const failedFrame = frame(failed, 'tp-card-photo')
    const failedPlaceholder = failed.find(node => node.props?.className === 'photo-glyph')
    const missing = render(null)
    const missingFrame = frame(missing, 'tp-card-photo')
    const missingPlaceholder = missing.find(node => node.props?.className === 'photo-glyph')

    expect(failed.some(node => node.type === 'img')).toBe(false)
    expect(classes(loadedFrame).every(className => classes(failedFrame).includes(className))).toBe(true)
    expect(classes(failedFrame)).toEqual(['tp-card-photo', 'slot', 'has-photo', 'photo-fallback'])
    expect(classes(missingFrame)).toEqual(['tp-card-photo', 'slot'])
    expect(placeholderShape(failedPlaceholder)).toEqual(placeholderShape(missingPlaceholder))
    const fallbackCss = readFileSync('public/amethyst/trade.css', 'utf8')
    const gridFallback = fallbackCss.slice(fallbackCss.indexOf('.tp-grid .tp-card-photo.has-photo.photo-fallback'))
    expect(gridFallback).toContain('background: linear-gradient(135deg, var(--bg-deep), var(--hp-bg-elevated));')
    expect(gridFallback).toContain('.tp-card-photo.has-photo.photo-fallback::after')
    expect(gridFallback).not.toMatch(/photo-fallback[^{]*\{[^}]*aspect-ratio/)
    expect(gridFallback).not.toContain('height: 84px')
    expect(gridFallback).not.toContain('168px')
    expect(failed.find(node => node.props?.className === 'tp-card-tier unicorn')?.props?.children).toBeTruthy()

    const unnamed = render('https://cdn.example.test/unnamed.jpg', '')
    expect(unnamed.find(node => node.props?.className === 'tp-card-photo-img')?.props?.alt).toBe('Dancer')

    const replaced = render('https://cdn.example.test/unicorn-rain-ring.jpg', 'Unicorn Rain Ring')
    expect(replaced.find(node => node.props?.className === 'tp-card-photo-img')?.props).toMatchObject({
      src: 'https://cdn.example.test/unicorn-rain-ring.jpg',
      alt: 'Unicorn Rain Ring',
    })
  })

  it('swaps a broken expanded photo for the same placeholder and keeps the dancer name on the image', () => {
    const { useState } = photoHarness()
    const ExpandedCard = actualFunction('ExpandedCard', {
      useState,
      responsiveRepImage,
      SparkleMark,
      displayCollectionLabel,
      isSpecificDancerNote,
      useTradeDialog: () => ({ current: null }),
    })
    const render = (photoUrl: string | null) => descendants(ExpandedCard({
      piece: piece(photoUrl),
      onClose: () => {},
      onWantThis: () => {},
    }))

    const loaded = render('https://cdn.example.test/unicorn-rain-earrings.jpg')
    const loadedImage = loaded.find(node => node.props?.className === 'tp-card-expand-photo-img')
    expect(classes(frame(loaded, 'tp-card-expand-photo'))).toEqual(['tp-card-expand-photo', 'slot', 'has-photo'])
    expect(loadedImage?.props).toMatchObject({
      alt: 'Unicorn Rain Earrings',
      loading: 'eager',
      sizes: '(max-width: 800px) 92vw, 640px',
    })
    expect(loaded.find(node => node.props?.id === 'trade-expanded-title')?.props?.children).toBe('Unicorn Rain Earrings')

    loadedImage?.props?.onError()
    const failed = render('https://cdn.example.test/unicorn-rain-earrings.jpg')
    const missing = render(null)
    expect(failed.some(node => node.type === 'img')).toBe(false)
    expect(frame(failed, 'tp-card-expand-photo')?.props?.className).toBe(frame(missing, 'tp-card-expand-photo')?.props?.className)
    expect(placeholderShape(failed.find(node => node.props?.className === 'photo-glyph'))).toEqual(
      placeholderShape(missing.find(node => node.props?.className === 'photo-glyph')),
    )
    expect(failed.find(node => node.props?.id === 'trade-expanded-title')?.props?.children).toBe('Unicorn Rain Earrings')
  })
})
