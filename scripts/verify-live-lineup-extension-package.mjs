#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_SIGNATURE = 0x02014b50
const LOCAL_SIGNATURE = 0x04034b50
const MAX_ARCHIVE_BYTES = 32 * 1024 * 1024
const MAX_ENTRY_BYTES = 8 * 1024 * 1024
const REQUIRED_PERMISSIONS = ['alarms', 'storage']
const REQUIRED_HOST_PERMISSIONS = [
  'https://myoffice.bombparty.com/*',
  'https://www.yoursparklesuite.com/*',
]

function fail(message) {
  throw new Error(`Unsafe extension package: ${message}`)
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function decodeName(bytes, flags) {
  if ((flags & 0x800) === 0 && bytes.some(byte => byte > 0x7f)) {
    fail('non-ASCII filenames must use the ZIP UTF-8 flag')
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

function validateEntryName(name) {
  if (!name || name.includes('\\') || name.includes('\0') || name.startsWith('/') || /^[A-Za-z]:/.test(name)) {
    fail(`invalid entry path ${JSON.stringify(name)}`)
  }
  if (name.endsWith('/') || name.startsWith('./') || name.split('/').some(part => !part || part === '.' || part === '..')) {
    fail(`non-canonical entry path ${JSON.stringify(name)}`)
  }
}

function findEocd(zip) {
  const floor = Math.max(0, zip.length - 65_557)
  for (let offset = zip.length - 22; offset >= floor; offset -= 1) {
    if (zip.readUInt32LE(offset) === EOCD_SIGNATURE) return offset
  }
  fail('end-of-central-directory record is missing')
}

export function inspectZip(zip) {
  assert.ok(Buffer.isBuffer(zip), 'ZIP input must be a Buffer')
  if (zip.length === 0 || zip.length > MAX_ARCHIVE_BYTES) fail('archive size is outside the 1-byte–32-MiB safety boundary')
  const eocd = findEocd(zip)
  const disk = zip.readUInt16LE(eocd + 4)
  const centralDisk = zip.readUInt16LE(eocd + 6)
  const diskEntries = zip.readUInt16LE(eocd + 8)
  const totalEntries = zip.readUInt16LE(eocd + 10)
  const centralSize = zip.readUInt32LE(eocd + 12)
  const centralOffset = zip.readUInt32LE(eocd + 16)
  const commentLength = zip.readUInt16LE(eocd + 20)
  if (disk !== 0 || centralDisk !== 0 || diskEntries !== totalEntries) fail('multi-disk ZIP archives are forbidden')
  if (totalEntries === 0 || totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    fail('empty and ZIP64 archives are forbidden')
  }
  if (eocd + 22 + commentLength !== zip.length || centralOffset + centralSize !== eocd) fail('ZIP directory bounds are inconsistent')

  const entries = new Map()
  const foldedNames = new Set()
  const localRanges = []
  let cursor = centralOffset
  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > eocd || zip.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) fail('central-directory entry is malformed')
    const flags = zip.readUInt16LE(cursor + 8)
    const method = zip.readUInt16LE(cursor + 10)
    const expectedCrc = zip.readUInt32LE(cursor + 16)
    const compressedSize = zip.readUInt32LE(cursor + 20)
    const uncompressedSize = zip.readUInt32LE(cursor + 24)
    const nameLength = zip.readUInt16LE(cursor + 28)
    const extraLength = zip.readUInt16LE(cursor + 30)
    const entryCommentLength = zip.readUInt16LE(cursor + 32)
    const entryDisk = zip.readUInt16LE(cursor + 34)
    const externalAttributes = zip.readUInt32LE(cursor + 38)
    const localOffset = zip.readUInt32LE(cursor + 42)
    const next = cursor + 46 + nameLength + extraLength + entryCommentLength
    if (next > eocd) fail('central-directory entry exceeds its declared bounds')
    const name = decodeName(zip.subarray(cursor + 46, cursor + 46 + nameLength), flags)
    validateEntryName(name)
    if ((flags & 1) !== 0) fail(`${name} is encrypted`)
    if ((flags & 0x8) !== 0) fail(`${name} uses an unsupported data descriptor`)
    if (![0, 8].includes(method)) fail(`${name} uses unsupported compression method ${method}`)
    if (entryDisk !== 0 || localOffset === 0xffffffff || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
      fail(`${name} uses unsupported multi-disk or ZIP64 metadata`)
    }
    if (uncompressedSize > MAX_ENTRY_BYTES) fail(`${name} exceeds the 8 MiB per-file limit`)
    const unixType = (externalAttributes >>> 16) & 0xf000
    if (unixType === 0xa000) fail(`${name} is a symbolic link`)
    const folded = name.toLocaleLowerCase('en-US')
    if (foldedNames.has(folded)) fail(`${name} duplicates another entry case-insensitively`)
    foldedNames.add(folded)

    if (localOffset + 30 > centralOffset || zip.readUInt32LE(localOffset) !== LOCAL_SIGNATURE) fail(`${name} has no valid local header`)
    const localFlags = zip.readUInt16LE(localOffset + 6)
    const localMethod = zip.readUInt16LE(localOffset + 8)
    const localCrc = zip.readUInt32LE(localOffset + 14)
    const localCompressedSize = zip.readUInt32LE(localOffset + 18)
    const localUncompressedSize = zip.readUInt32LE(localOffset + 22)
    const localNameLength = zip.readUInt16LE(localOffset + 26)
    const localExtraLength = zip.readUInt16LE(localOffset + 28)
    const localName = decodeName(zip.subarray(localOffset + 30, localOffset + 30 + localNameLength), localFlags)
    if (
      localName !== name || localMethod !== method || localFlags !== flags ||
      localCrc !== expectedCrc || localCompressedSize !== compressedSize || localUncompressedSize !== uncompressedSize
    ) fail(`${name} central and local headers disagree`)
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength
    const dataEnd = dataOffset + compressedSize
    if (dataEnd > centralOffset) fail(`${name} compressed data exceeds archive bounds`)
    localRanges.push({ start: localOffset, end: dataEnd, name })
    const compressed = zip.subarray(dataOffset, dataEnd)
    const data = method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed, { maxOutputLength: MAX_ENTRY_BYTES + 1 })
    if (data.length !== uncompressedSize || crc32(data) !== expectedCrc) fail(`${name} failed size or CRC verification`)
    entries.set(name, data)
    cursor = next
  }
  if (cursor !== eocd) fail('central directory contains undeclared trailing data')
  localRanges.sort((left, right) => left.start - right.start)
  let expectedOffset = 0
  for (const range of localRanges) {
    if (range.start !== expectedOffset) fail(`${range.name} leaves undeclared data before its local record`)
    expectedOffset = range.end
  }
  if (expectedOffset !== centralOffset) fail('local records do not exactly cover the archive data region')
  return entries
}

function normalizeReference(value, label) {
  if (typeof value !== 'string') fail(`${label} must be a file path string`)
  validateEntryName(value)
  if (/[*?{}]/.test(value)) fail(`${label} contains a wildcard; use an explicit approved inventory`)
  return value
}

export function collectManifestReferences(manifest) {
  const references = new Set()
  const add = (value, label) => {
    if (value !== undefined) references.add(normalizeReference(value, label))
  }
  const addIcons = (icons, label) => {
    if (icons === undefined) return
    if (!icons || typeof icons !== 'object' || Array.isArray(icons)) fail(`${label} must be an object`)
    for (const [size, value] of Object.entries(icons)) add(value, `${label}.${size}`)
  }
  addIcons(manifest.icons, 'icons')
  add(manifest.background?.service_worker, 'background.service_worker')
  add(manifest.action?.default_popup, 'action.default_popup')
  addIcons(manifest.action?.default_icon, 'action.default_icon')
  add(manifest.options_page, 'options_page')
  add(manifest.options_ui?.page, 'options_ui.page')
  add(manifest.side_panel?.default_path, 'side_panel.default_path')
  add(manifest.devtools_page, 'devtools_page')
  for (const [index, script] of (manifest.content_scripts ?? []).entries()) {
    for (const [fileIndex, value] of (script.js ?? []).entries()) add(value, `content_scripts.${index}.js.${fileIndex}`)
    for (const [fileIndex, value] of (script.css ?? []).entries()) add(value, `content_scripts.${index}.css.${fileIndex}`)
  }
  for (const [index, resource] of (manifest.web_accessible_resources ?? []).entries()) {
    for (const [fileIndex, value] of (resource.resources ?? []).entries()) add(value, `web_accessible_resources.${index}.resources.${fileIndex}`)
  }
  for (const [index, value] of (manifest.sandbox?.pages ?? []).entries()) add(value, `sandbox.pages.${index}`)
  return [...references].sort()
}

function parseInventory(text) {
  const inventory = text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'))
  if (inventory.length === 0) fail('approved inventory is empty')
  const folded = new Set()
  for (const name of inventory) {
    validateEntryName(name)
    const key = name.toLocaleLowerCase('en-US')
    if (folded.has(key)) fail(`approved inventory duplicates ${name}`)
    folded.add(key)
  }
  return [...inventory].sort()
}

function normalizedStringList(value, label) {
  if (!Array.isArray(value) || value.some(entry => typeof entry !== 'string')) fail(`${label} must be a string array`)
  return [...value].sort()
}

export function verifyPackage({ zip, approvedInventory, reviewedSources, expectedVersion }) {
  const entries = inspectZip(zip)
  const actual = [...entries.keys()].sort()
  const expected = parseInventory(approvedInventory)
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const missing = expected.filter(name => !entries.has(name))
    const unexpected = actual.filter(name => !expected.includes(name))
    fail(`inventory mismatch; missing=${JSON.stringify(missing)} unexpected=${JSON.stringify(unexpected)}`)
  }
  const manifestBytes = entries.get('manifest.json')
  if (!manifestBytes) fail('manifest.json must be at the ZIP root')
  let manifest
  try { manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes)) }
  catch { fail('manifest.json is not valid UTF-8 JSON') }
  if (manifest.manifest_version !== 3 || typeof manifest.version !== 'string' || !/^\d+(?:\.\d+){0,3}$/.test(manifest.version)) {
    fail('manifest must be MV3 with a valid Chrome version')
  }
  if (typeof expectedVersion !== 'string' || manifest.version !== expectedVersion) {
    fail(`manifest version ${manifest.version} does not match the approved version ${expectedVersion || '(missing)'}`)
  }
  if (JSON.stringify(normalizedStringList(manifest.permissions, 'permissions')) !== JSON.stringify(REQUIRED_PERMISSIONS)) {
    fail('manifest permissions differ from the approved Sparkle Suite permissions')
  }
  if (JSON.stringify(normalizedStringList(manifest.host_permissions, 'host_permissions')) !== JSON.stringify(REQUIRED_HOST_PERMISSIONS)) {
    fail('manifest host permissions differ from the approved Sparkle Suite hosts')
  }
  const references = collectManifestReferences(manifest)
  const missingReferences = references.filter(name => !entries.has(name))
  if (missingReferences.length) fail(`manifest references missing files: ${JSON.stringify(missingReferences)}`)
  if (!(reviewedSources instanceof Map)) fail('reviewed source bytes are required')
  const sourceNames = [...reviewedSources.keys()].sort()
  if (JSON.stringify(sourceNames) !== JSON.stringify(expected)) fail('reviewed source inventory differs from the approved inventory')
  const sourceSha256 = {}
  for (const name of expected) {
    const source = reviewedSources.get(name)
    if (!Buffer.isBuffer(source)) fail(`reviewed source ${name} is not a Buffer`)
    if (!entries.get(name).equals(source)) fail(`${name} differs from the reviewed source bytes`)
    sourceSha256[name] = createHash('sha256').update(source).digest('hex')
  }
  return {
    sha256: createHash('sha256').update(zip).digest('hex'),
    bytes: zip.length,
    manifestVersion: manifest.version,
    inventory: actual,
    manifestReferences: references,
    sourceSha256,
  }
}

function parseArguments(argv) {
  const values = new Map()
  for (const argument of argv) {
    const match = /^(--[a-z-]+)=(.+)$/.exec(argument)
    if (!match || values.has(match[1]) || !['--archive', '--inventory', '--source-dir', '--expected-version'].includes(match[1])) fail(`unsupported argument ${argument}`)
    values.set(match[1], match[2])
  }
  if (!values.has('--archive') || !values.has('--inventory') || !values.has('--source-dir') || !values.has('--expected-version')) {
    fail('use --archive=PATH --inventory=PATH --source-dir=PATH --expected-version=VERSION')
  }
  return values
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const options = parseArguments(process.argv.slice(2))
  const archivePath = resolve(options.get('--archive'))
  const inventoryPath = resolve(options.get('--inventory'))
  const sourceDir = resolve(options.get('--source-dir'))
  const approvedInventory = readFileSync(inventoryPath, 'utf8')
  const realSourceDir = realpathSync(sourceDir)
  const reviewedSources = new Map(parseInventory(approvedInventory).map(name => {
    const candidate = resolve(realSourceDir, name)
    if (!candidate.startsWith(`${realSourceDir}${sep}`) || lstatSync(candidate).isSymbolicLink()) {
      fail(`reviewed source ${name} is outside the source directory or is a symbolic link`)
    }
    const realCandidate = realpathSync(candidate)
    if (!realCandidate.startsWith(`${realSourceDir}${sep}`)) fail(`reviewed source ${name} resolves outside the source directory`)
    return [name, readFileSync(realCandidate)]
  }))
  const result = verifyPackage({
    zip: readFileSync(archivePath),
    approvedInventory,
    reviewedSources,
    expectedVersion: options.get('--expected-version'),
  })
  console.log(JSON.stringify({ archive: archivePath, inventoryFile: inventoryPath, sourceDir: realSourceDir, ...result }, null, 2))
}
