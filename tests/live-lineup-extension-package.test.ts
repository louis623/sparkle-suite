import { deflateRawSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { inspectZip, verifyPackage } from '../scripts/verify-live-lineup-extension-package.mjs'

function crc32(buffer: Buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function zip(entries: Array<{ name: string; body: string; deflate?: boolean }>) {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const name = Buffer.from(entry.name)
    const body = Buffer.from(entry.body)
    const compressed = entry.deflate ? deflateRawSync(body) : body
    const method = entry.deflate ? 8 : 0
    const crc = crc32(body)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x800, 6)
    local.writeUInt16LE(method, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(body.length, 22)
    local.writeUInt16LE(name.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(0x314, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x800, 8)
    central.writeUInt16LE(method, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(body.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(0x81a40000, 38)
    central.writeUInt32LE(offset, 42)
    locals.push(local, name, compressed)
    centrals.push(central, name)
    offset += local.length + name.length + compressed.length
  }
  const central = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(central.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, central, eocd])
}

const manifest = JSON.stringify({
  manifest_version: 3,
  version: '2.0.0',
  permissions: ['storage', 'alarms'],
  host_permissions: [
    'https://myoffice.bombparty.com/*',
    'https://www.yoursparklesuite.com/*',
  ],
  background: { service_worker: 'background.js' },
  action: { default_popup: 'popup.html', default_icon: { 16: 'icons/icon16.png' } },
  content_scripts: [{ matches: ['https://myoffice.bombparty.com/*'], js: ['content.js'] }],
})
const files = [
  { name: 'background.js', body: 'worker', deflate: true },
  { name: 'content.js', body: 'scraper' },
  { name: 'icons/icon16.png', body: 'png' },
  { name: 'icons/icon48.png', body: 'png48' },
  { name: 'icons/icon128.png', body: 'png128' },
  { name: 'manifest.json', body: manifest },
  { name: 'popup.css', body: 'popup styles' },
  { name: 'popup.html', body: '<!doctype html>' },
  { name: 'popup.js', body: 'popup behavior' },
  { name: 'publisher-client.js', body: 'publisher client' },
  { name: 'queue-filter.js', body: 'queue filter' },
  { name: 'queue-parser.js', body: 'queue parser' },
]
const inventory = readFileSync(
  resolve(process.cwd(), 'tests/manifests/sparkle-live-lineup-extension-package.txt'),
  'utf8',
)
const reviewedSources = new Map(files.map(file => [file.name, Buffer.from(file.body)]))
const verify = (packageFiles = files, options: { inventory?: string; sources?: Map<string, Buffer>; version?: string } = {}) =>
  verifyPackage({
    zip: zip(packageFiles),
    approvedInventory: options.inventory ?? inventory,
    reviewedSources: options.sources ?? reviewedSources,
    expectedVersion: options.version ?? '2.0.0',
  })

describe('deterministic Live Lineup extension ZIP verifier', () => {
  it('accepts an exact allowlisted MV3 package and returns release evidence', () => {
    const result = verify()
    expect(result).toMatchObject({ manifestVersion: '2.0.0', inventory: files.map(file => file.name).sort() })
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(result.manifestReferences).toEqual(['background.js', 'content.js', 'icons/icon16.png', 'popup.html'])
  })

  it('rejects both unexpected files and an incomplete approved inventory', () => {
    expect(() => verify([...files, { name: '.env', body: 'secret' }]))
      .toThrow(/unexpected=.*\.env/)
    expect(() => verify(files, { inventory: inventory.replace('background.js\n', '') }))
      .toThrow(/unexpected=.*background\.js/)
  })

  it('rejects missing manifest references even when the allowlist matches the archive', () => {
    const broken = files.filter(file => file.name !== 'background.js')
    expect(() => verifyPackage({
      zip: zip(broken),
      approvedInventory: broken.map(file => file.name).join('\n'),
      reviewedSources: new Map(broken.map(file => [file.name, Buffer.from(file.body)])),
      expectedVersion: '2.0.0',
    }))
      .toThrow(/manifest references missing files.*background\.js/)
  })

  it('binds every packaged byte and the version to the reviewed source', () => {
    const changed = files.map(file => file.name === 'content.js' ? { ...file, body: 'tampered scraper' } : file)
    expect(() => verify(changed)).toThrow(/content\.js differs from the reviewed source bytes/)
    expect(() => verify(files, { version: '2.0.1' })).toThrow(/does not match the approved version/)
    const incompleteSources = new Map(reviewedSources)
    incompleteSources.delete('queue-parser.js')
    expect(() => verify(files, { sources: incompleteSources })).toThrow(/source inventory differs/)
  })

  it('requires the exact approved permissions and hosts', () => {
    const parsed = JSON.parse(manifest)
    const withExtraPermission = JSON.stringify({ ...parsed, permissions: [...parsed.permissions, 'tabs'] })
    const permissionFiles = files.map(file => file.name === 'manifest.json' ? { ...file, body: withExtraPermission } : file)
    const permissionSources = new Map(permissionFiles.map(file => [file.name, Buffer.from(file.body)]))
    expect(() => verify(permissionFiles, { sources: permissionSources })).toThrow(/permissions differ/)

    const withExtraHost = JSON.stringify({ ...parsed, host_permissions: [...parsed.host_permissions, 'https://example.com/*'] })
    const hostFiles = files.map(file => file.name === 'manifest.json' ? { ...file, body: withExtraHost } : file)
    const hostSources = new Map(hostFiles.map(file => [file.name, Buffer.from(file.body)]))
    expect(() => verify(hostFiles, { sources: hostSources })).toThrow(/host permissions differ/)
  })

  it.each(['../escape.js', '/absolute.js', 'folder\\windows.js', './relative.js'])(
    'rejects non-canonical archive entry %s', name => {
      expect(() => inspectZip(zip([{ name, body: 'bad' }]))).toThrow(/entry path/)
    },
  )

  it('rejects case-insensitive duplicates and corrupted entry data', () => {
    expect(() => inspectZip(zip([{ name: 'A.js', body: 'a' }, { name: 'a.js', body: 'b' }]))).toThrow(/duplicates/)
    const corrupted = zip([{ name: 'file.js', body: 'safe' }])
    corrupted[31 + 'file.js'.length] ^= 0xff
    expect(() => inspectZip(corrupted)).toThrow(/CRC/)
  })

  it('rejects symbolic links, encryption, and unsupported compression', () => {
    const symlink = zip([{ name: 'link.js', body: 'target' }])
    const symlinkCentral = symlink.readUInt32LE(symlink.length - 6)
    symlink.writeUInt32LE(0xa1ff0000, symlinkCentral + 38)
    expect(() => inspectZip(symlink)).toThrow(/symbolic link/)

    const encrypted = zip([{ name: 'secret.js', body: 'ciphertext' }])
    const encryptedCentral = encrypted.readUInt32LE(encrypted.length - 6)
    encrypted.writeUInt16LE(0x801, 6)
    encrypted.writeUInt16LE(0x801, encryptedCentral + 8)
    expect(() => inspectZip(encrypted)).toThrow(/encrypted/)

    const exotic = zip([{ name: 'exotic.js', body: 'data' }])
    const exoticCentral = exotic.readUInt32LE(exotic.length - 6)
    exotic.writeUInt16LE(12, 8)
    exotic.writeUInt16LE(12, exoticCentral + 10)
    expect(() => inspectZip(exotic)).toThrow(/unsupported compression/)
  })

  it('rejects data descriptors, contradictory local metadata, and undeclared local bytes', () => {
    const descriptor = zip([{ name: 'file.js', body: 'safe' }])
    const descriptorCentral = descriptor.readUInt32LE(descriptor.length - 6)
    descriptor.writeUInt16LE(0x808, 6)
    descriptor.writeUInt16LE(0x808, descriptorCentral + 8)
    expect(() => inspectZip(descriptor)).toThrow(/data descriptor/)

    const contradictory = zip([{ name: 'file.js', body: 'safe' }])
    contradictory.writeUInt32LE(999, 18)
    expect(() => inspectZip(contradictory)).toThrow(/headers disagree/)

    const prefixed = Buffer.concat([Buffer.from('junk'), zip([{ name: 'file.js', body: 'safe' }])])
    const eocd = prefixed.length - 22
    const centralOffset = prefixed.readUInt32LE(eocd + 16) + 4
    prefixed.writeUInt32LE(centralOffset, eocd + 16)
    prefixed.writeUInt32LE(4, centralOffset + 42)
    expect(() => inspectZip(prefixed)).toThrow(/undeclared data/)
  })
})
