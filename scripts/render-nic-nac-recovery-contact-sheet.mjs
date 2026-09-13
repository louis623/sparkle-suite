import { config as loadEnv } from 'dotenv'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

loadEnv({ path: '.env.local', quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Supabase production credentials are required.')

const supabase = createClient(url, key, { auth: { persistSession: false } })
const outputDirectory = path.resolve(
  process.env.NIC_NAC_CONTACT_SHEET_DIR || 'artifacts/nic-nac-recovery-2026-09-13',
)
const listedAfter = process.env.NIC_NAC_CONTACT_SHEET_AFTER || '2026-09-11T00:00:00-04:00'
const listedBefore = process.env.NIC_NAC_CONTACT_SHEET_BEFORE || '2026-09-12T00:00:00-04:00'

const tileWidth = 360
const imageHeight = 300
const labelHeight = 92
const tileHeight = imageHeight + labelHeight
const gap = 16
const columns = 4

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

async function download(source, imagePath) {
  if (imagePath) return readFile(imagePath)
  if (!source) return null
  const match = /^data:[^;]+;base64,(.+)$/i.exec(source)
  if (match) return Buffer.from(match[1], 'base64')
  const response = await fetch(source)
  if (!response.ok) throw new Error(`Photo download failed with ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function renderTile(photo, itemNumber, designName) {
  let image
  try {
    const bytes = await download(photo.imageUrl, photo.imagePath)
    image = bytes
      ? await sharp(bytes)
          .rotate()
          .resize(tileWidth, imageHeight, {
            fit: 'contain',
            background: { r: 248, g: 246, b: 249, alpha: 1 },
          })
          .png()
          .toBuffer()
      : null
  } catch (error) {
    image = null
    photo.error = error instanceof Error ? error.message : String(error)
  }

  const role = photo.kind === 'current'
    ? 'CURRENT PUBLIC PHOTO'
    : photo.kind === 'proposed'
      ? 'PROPOSED GUARDED CROP'
      : `SOURCE ${photo.declaredRole ?? 'unknown'} / visual ${photo.visualRole ?? 'unknown'}`
  const status = photo.error ? `ERROR: ${photo.error}` : `photo ${photo.photoId ?? 'public'}`
  const label = Buffer.from(`
    <svg width="${tileWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="12" y="22" font-family="Arial" font-size="17" font-weight="700" fill="#170728">${escapeXml(itemNumber)} — ${escapeXml(designName)}</text>
      <text x="12" y="47" font-family="Arial" font-size="14" font-weight="700" fill="${photo.kind === 'current' ? '#a4004f' : photo.kind === 'proposed' ? '#087b52' : '#42305c'}">${escapeXml(role)}</text>
      <text x="12" y="70" font-family="Arial" font-size="12" fill="#62566d">${escapeXml(status)}</text>
    </svg>
  `)

  return sharp({
    create: {
      width: tileWidth,
      height: tileHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      image
        ? { input: image, top: 0, left: 0 }
        : {
            input: Buffer.from(`<svg width="${tileWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eee8f0"/><text x="20" y="150" font-family="Arial" font-size="18" fill="#7b6e80">Image unavailable</text></svg>`),
            top: 0,
            left: 0,
          },
      { input: label, top: imageHeight, left: 0 },
    ])
    .png()
    .toBuffer()
}

const { data: listings, error: listingError } = await supabase
  .from('trade_listings')
  .select('id,design_id,status,listing_photo_url,uses_canonical_photo,listed_at,design:jewelry_designs(id,item_number,design_name,canonical_photo_url)')
  .in('status', ['available', 'pending_trade'])
  .gte('listed_at', listedAfter)
  .lt('listed_at', listedBefore)
  .order('listed_at', { ascending: true })
if (listingError) throw listingError

const listingIds = (listings ?? []).map((listing) => listing.id)
const designIds = (listings ?? []).map((listing) => listing.design_id).filter(Boolean)
const sessionFilters = [
  ...(designIds.length > 0 ? [`created_design_id.in.(${designIds.join(',')})`] : []),
  ...(listingIds.length > 0 ? [`created_listing_ids.ov.{${listingIds.join(',')}}`] : []),
]
const { data: sessions, error: sessionError } = await supabase
  .from('trade_board_intake_sessions')
  .select('id,created_listing_ids,created_design_id,trade_board_intake_photos(id,declared_role,visual_role,image_url,created_at)')
  .or(sessionFilters.join(','))
if (sessionError) throw sessionError

const sessionByListing = new Map()
for (const session of sessions ?? []) {
  for (const listingId of session.created_listing_ids ?? []) sessionByListing.set(listingId, session)
}

let proposedByListing = new Map()
try {
  const dryRun = JSON.parse(await readFile(path.join(outputDirectory, 'dry-run-report.json'), 'utf8'))
  proposedByListing = new Map(
    (dryRun.outcomes ?? [])
      .filter((outcome) => outcome.proposedCropPath)
      .map((outcome) => [outcome.listingId, outcome.proposedCropPath]),
  )
} catch {
  // The source/current contact sheet is still useful before crop replay runs.
}

const tiles = []
const manifest = []
for (const listing of listings ?? []) {
  const design = Array.isArray(listing.design) ? listing.design[0] : listing.design
  const session = sessionByListing.get(listing.id) ||
    (sessions ?? []).find((candidate) => candidate.created_design_id === listing.design_id)
  const photos = [
    {
      kind: 'current',
      imageUrl: listing.listing_photo_url ||
        (listing.uses_canonical_photo ? design?.canonical_photo_url : null),
    },
    ...(session?.trade_board_intake_photos ?? []).map((photo) => ({
      kind: 'source',
      photoId: photo.id,
      declaredRole: photo.declared_role,
      visualRole: photo.visual_role,
      imageUrl: photo.image_url,
      createdAt: photo.created_at,
    })),
    ...(proposedByListing.has(listing.id)
      ? [{
          kind: 'proposed',
          imagePath: proposedByListing.get(listing.id),
        }]
      : []),
  ]
  manifest.push({
    listingId: listing.id,
    designId: listing.design_id,
    itemNumber: design?.item_number ?? null,
    designName: design?.design_name ?? null,
    sourcePhotos: photos.filter((photo) => photo.kind === 'source').map(({ imageUrl, ...photo }) => photo),
  })
  for (const photo of photos) {
    tiles.push(await renderTile(photo, design?.item_number, design?.design_name))
  }
}

const rows = Math.ceil(tiles.length / columns)
const sheetWidth = columns * tileWidth + (columns + 1) * gap
const sheetHeight = rows * tileHeight + (rows + 1) * gap
const sheet = await sharp({
  create: {
    width: sheetWidth,
    height: sheetHeight,
    channels: 4,
    background: { r: 237, g: 232, b: 240, alpha: 1 },
  },
})
  .composite(tiles.map((tile, index) => ({
    input: tile,
    left: gap + (index % columns) * (tileWidth + gap),
    top: gap + Math.floor(index / columns) * (tileHeight + gap),
  })))
  .png()
  .toBuffer()

await mkdir(outputDirectory, { recursive: true })
const sheetPath = path.join(outputDirectory, 'contact-sheet.png')
const manifestPath = path.join(outputDirectory, 'manifest.json')
await writeFile(sheetPath, sheet)
const pagePaths = []
const rowsPerPage = 4
const tilesPerPage = columns * rowsPerPage
for (let start = 0; start < tiles.length; start += tilesPerPage) {
  const pageTiles = tiles.slice(start, start + tilesPerPage)
  const pageRows = Math.ceil(pageTiles.length / columns)
  const page = await sharp({
    create: {
      width: sheetWidth,
      height: pageRows * tileHeight + (pageRows + 1) * gap,
      channels: 4,
      background: { r: 237, g: 232, b: 240, alpha: 1 },
    },
  })
    .composite(pageTiles.map((tile, index) => ({
      input: tile,
      left: gap + (index % columns) * (tileWidth + gap),
      top: gap + Math.floor(index / columns) * (tileHeight + gap),
    })))
    .png()
    .toBuffer()
  const pagePath = path.join(outputDirectory, `contact-sheet-page-${pagePaths.length + 1}.png`)
  await writeFile(pagePath, page)
  pagePaths.push(pagePath)
}
await writeFile(manifestPath, `${JSON.stringify({ listedAfter, listedBefore, listings: manifest }, null, 2)}\n`)
process.stdout.write(`${JSON.stringify({ sheetPath, pagePaths, manifestPath, listingCount: manifest.length, tileCount: tiles.length })}\n`)
