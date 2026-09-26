import { describe, expect, it } from 'vitest'

import { parseTable } from '../chrome-extension/queue-parser.js'

function node(tag, attrs = {}, children = [], text = '') {
  const classes = String(attrs.class || '').split(/\s+/).filter(Boolean)
  const self = {
    tag,
    attrs,
    children,
    classes,
    text,
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null
    },
    get textContent() {
      if (this.children.length) return this.children.map(child => child.textContent).join('')
      return this.text
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null
    },
    querySelectorAll(selector) {
      const matches = []
      const visit = candidate => {
        if (matchesSelector(candidate, selector)) matches.push(candidate)
        for (const child of candidate.children) visit(child)
      }
      for (const child of this.children) visit(child)
      return matches
    },
  }
  for (const child of children) child.parent = self
  return self
}

function matchesSelector(candidate, selector) {
  return selector.split(',').map(part => part.trim()).some(part => matchesOne(candidate, part))
}

function matchesOne(candidate, selector) {
  const descendant = selector.match(/^(.*)\s+(\S+)$/)
  if (descendant) {
    if (!matchesSimple(candidate, descendant[2])) return false
    let parent = candidate.parent
    while (parent) {
      if (matchesSimple(parent, descendant[1])) return true
      parent = parent.parent
    }
    return false
  }
  return matchesSimple(candidate, selector)
}

function matchesSimple(candidate, selector) {
  const attr = selector.match(/^([a-z0-9]+)?(?:\.([a-z0-9_-]+))*?(?:\[([a-z0-9_-]+(?:="[^"]*")?)\])?$/i)
  if (!attr) return false
  const [, tag, , attrPart] = attr
  const classNames = [...selector.matchAll(/\.([a-z0-9_-]+)/gi)].map(match => match[1])
  if (tag && candidate.tag !== tag) return false
  if (classNames.some(name => !candidate.classes.includes(name))) return false
  if (attrPart) {
    const [name, rawValue] = attrPart.split('=')
    const expected = rawValue ? rawValue.replace(/^"|"$/g, '') : null
    const actual = candidate.getAttribute(name)
    if (expected == null) return actual != null
    return actual === expected
  }
  return true
}

function header(sortBy, label) {
  const span = node('span', {}, [], label)
  const content = node('div', { class: 'header-content' }, [span])
  const menu = node('div', { class: 'header-dropdown-menu' }, [], 'Ascending Descending')
  return node('th', sortBy ? { 'data-sort-by': sortBy, class: 'table-header-with-dropdown' } : { class: 'table-header-with-dropdown' }, [content, menu])
}

function checkbox(checked) {
  return node('input', { type: 'checkbox', class: 'checkbox-small', ...(checked ? { checked: 'checked' } : {}) }, [], '')
}

function orderCell(orderId) {
  return node('td', {}, [node('a', { href: `/orders/${orderId}` }, [], orderId)])
}

function partyCell(partyId) {
  return node('td', {}, [node('a', { href: `/parties/${partyId}` }, [], partyId)])
}

function dateCell(ms) {
  const cell = node('td', { class: 'order-date-cell', 'data-order-utc-ms': String(ms) }, [], 'Sep 17')
  return cell
}

function nameCell(name) {
  return node('td', {}, [], `  ${name}  `)
}

function lastNameCell() {
  return node('td', {}, [], 'Customer')
}

function statusCell() {
  return node('td', {}, [node('span', { class: 'status-badge' }, [], 'Paid')])
}

function revealCell(checked) {
  const box = checkbox(checked)
  box.checked = checked
  box.indeterminate = false
  return node('td', { class: 'text-center' }, [box])
}

function notesCell() {
  return node('td', {}, [], '')
}

function row({ orderId, partyId, name, orderedAt = 1, revealed = false, attrs = {} }) {
  return node('tr', { class: 'product product-row', ...attrs }, [
    orderCell(orderId),
    dateCell(orderedAt),
    nameCell(name),
    lastNameCell(),
    partyCell(partyId),
    statusCell(),
    revealCell(revealed),
    notesCell(),
  ])
}

function tableFrom(rowNodes, { busy = false, connected = true, headers } = {}) {
  const heading = headers || [
    header('OrderID', 'Order ID'),
    header('OrderDate', 'Order Date'),
    header('FirstName', 'First Name'),
    header('LastName', 'Last Name'),
    header('PartyID', 'Party ID'),
    header('PartyOrderStatusID', 'Status'),
    header('IsRevealed', 'Revealed'),
    header('Notes', 'Notes'),
  ]
  const thead = node('thead', {}, [node('tr', {}, heading)])
  const tbody = node('tbody', {}, rowNodes)
  const table = node('table', { id: 'party-order-table', class: 'table', ...(busy ? { 'aria-busy': 'true' } : {}) }, [thead, tbody])
  table.isConnected = connected
  return table
}

describe('Live Lineup Bomb Party queue parser', () => {
  it('detects a visible party when data-orderid and data-partyid are empty or missing', () => {
    const table = tableFrom([
      row({
        orderId: '9001',
        partyId: '1839712',
        name: 'Lindsey',
        attrs: { 'data-orderid': '', 'data-partyid': '' },
      }),
      row({
        orderId: '9002',
        partyId: '1839712',
        name: 'Casey',
        attrs: {},
      }),
    ])

    const snapshot = parseTable(table)
    expect(snapshot.parserState).toBe('ready')
    expect(snapshot.reason).toBeNull()
    expect(snapshot.entries.map(entry => entry.id)).toEqual(['1839712:9001', '1839712:9002'])
    expect(snapshot.entries.map(entry => entry.name)).toEqual(['Lindsey', 'Casey'])
  })

  it('still prefers data-orderid and data-partyid when those attributes are present', () => {
    const table = tableFrom([
      row({
        orderId: 'visible-order',
        partyId: 'visible-party',
        name: 'Reviewer',
        attrs: { 'data-orderid': 'attr-order', 'data-partyid': 'attr-party' },
      }),
    ])

    const snapshot = parseTable(table)
    expect(snapshot.parserState).toBe('ready')
    expect(snapshot.entries.map(entry => entry.id)).toEqual(['attr-party:attr-order'])
  })

  it('maps Party ID by header name even when that column is not at a fixed index', () => {
    const extra = header('HostNotes', 'Host')
    const headers = [
      extra,
      header('OrderID', 'Order ID'),
      header('OrderDate', 'Order Date'),
      header('FirstName', 'First Name'),
      header('LastName', 'Last Name'),
      header('PartyID', 'Party ID'),
      header('PartyOrderStatusID', 'Status'),
      header('IsRevealed', 'Revealed'),
      header('Notes', 'Notes'),
    ]
    const shifted = node('tr', { class: 'product product-row' }, [
      node('td', {}, [], 'host note'),
      orderCell('77'),
      dateCell(5),
      nameCell('Morgan'),
      lastNameCell(),
      partyCell('5550001'),
      statusCell(),
      revealCell(false),
      notesCell(),
    ])
    const snapshot = parseTable(tableFrom([shifted], { headers }))
    expect(snapshot.parserState).toBe('ready')
    expect(snapshot.entries).toEqual([
      { id: '5550001:77', name: 'Morgan', orderedAt: 5 },
    ])
  })

  it('maps Party ID from the visible header label when data-sort-by is absent', () => {
    const headers = [
      header('OrderID', 'Order ID'),
      header('OrderDate', 'Order Date'),
      header('FirstName', 'First Name'),
      header('LastName', 'Last Name'),
      header(null, 'Party ID'),
      header('PartyOrderStatusID', 'Status'),
      header('IsRevealed', 'Revealed'),
      header('Notes', 'Notes'),
    ]
    const snapshot = parseTable(tableFrom([
      row({ orderId: '12', partyId: '1839712', name: 'Alex', attrs: {} }),
    ], { headers }))
    expect(snapshot.parserState).toBe('ready')
    expect(snapshot.entries.map(entry => entry.id)).toEqual(['1839712:12'])
  })

  it('skips individual bad rows without invalidating the rest of the table', () => {
    const good = row({
      orderId: '100',
      partyId: '1839712',
      name: 'Keep Me',
      attrs: { 'data-orderid': '', 'data-partyid': '' },
    })
    const missingIdentity = node('tr', { class: 'product product-row' }, [
      node('td', {}, [], ''),
      dateCell(2),
      nameCell('Skip Me'),
      lastNameCell(),
      node('td', {}, [], ''),
      statusCell(),
      revealCell(false),
      notesCell(),
    ])
    const missingCheckbox = node('tr', { class: 'product product-row', 'data-orderid': '101', 'data-partyid': '1839712' }, [
      orderCell('101'),
      dateCell(3),
      nameCell('No Box'),
      lastNameCell(),
      partyCell('1839712'),
      statusCell(),
      node('td', { class: 'text-center' }, [], ''),
      notesCell(),
    ])
    const snapshot = parseTable(tableFrom([missingIdentity, good, missingCheckbox]))
    expect(snapshot.parserState).toBe('ready')
    expect(snapshot.entries.map(entry => entry.id)).toEqual(['1839712:100'])
    expect(snapshot.entries.map(entry => entry.name)).toEqual(['Keep Me'])
  })

  it('does not report ready-empty when visible rows cannot be identified', () => {
    const opaque = node('tr', { class: 'product product-row' }, [
      node('td', {}, [], ''),
      dateCell(1),
      nameCell('Hidden'),
      lastNameCell(),
      node('td', {}, [], ''),
      statusCell(),
      revealCell(false),
      notesCell(),
    ])
    const snapshot = parseTable(tableFrom([opaque]))
    expect(snapshot.parserState).toBe('invalid')
    expect(snapshot.reason).toBe('missing_order_identity')
    expect(snapshot.entries).toEqual([])
    expect(snapshot.revealedIds).toEqual([])
  })

  it('keeps attribute-backed rows working beside cell-text rows in one table', () => {
    const snapshot = parseTable(tableFrom([
      row({
        orderId: 'ignored',
        partyId: 'ignored',
        name: 'Attr',
        orderedAt: 10,
        attrs: { 'data-orderid': '1', 'data-partyid': '1839712' },
      }),
      row({
        orderId: '2',
        partyId: '1839712',
        name: 'Cell',
        orderedAt: 20,
        revealed: true,
        attrs: { 'data-orderid': '', 'data-partyid': '' },
      }),
    ]))
    expect(snapshot.parserState).toBe('ready')
    expect(snapshot.entries.map(entry => entry.id)).toEqual(['1839712:1'])
    expect(snapshot.revealedIds).toEqual(['1839712:2'])
    expect(snapshot.revealedEntries).toEqual([{ id: '1839712:2', orderedAt: 20 }])
  })
})
