import { expect, it } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

// Opt-in integration test: hashes raw response bytes; no normalization can hide
// a metadata, asset URL, whitespace, or tenant-routing regression.
it.skipIf(!process.env.QA_PREVIEW_URL)('hashes every inventory rep homepage and custom domain against deployed Live', async () => {
  const preview = process.env.QA_PREVIEW_URL!
  const inventory = JSON.parse(readFileSync(process.env.QA_REP_INVENTORY!, 'utf8')) as {
    complete: boolean; reps: { slug: string; domains: string[] }[]
  }
  const rows: { slug: string; live: string; preview: string; status: number[]; hash: string[]; matches: boolean }[] = []
  const digest = (value: ArrayBuffer) => createHash('sha256').update(Buffer.from(value)).digest('hex')
  for (const rep of inventory.reps.filter(rep => rep.slug !== 'dudesfizzfest')) {
    const urls = [[`https://www.yoursparklesuite.com/${rep.slug}`, `${preview}/${rep.slug}`],
      ...rep.domains.map(domain => [`https://${domain}/`, `${preview}/customer-site/home?c=${encodeURIComponent(domain)}`])]
    for (const [liveUrl, previewUrl] of urls) {
      const responses = await Promise.all([fetch(liveUrl), fetch(previewUrl)])
      const hashes = await Promise.all(responses.map(async response => digest(await response.arrayBuffer())))
      rows.push({ slug: rep.slug, live: liveUrl, preview: previewUrl, status: responses.map(r => r.status), hash: hashes, matches: responses.every(r => r.status === 200) && hashes[0] === hashes[1] })
    }
  }
  if (process.env.QA_PARITY_OUTPUT) writeFileSync(process.env.QA_PARITY_OUTPUT, JSON.stringify({ inventoryComplete: inventory.complete, rows }, null, 2))
  expect(rows.length).toBeGreaterThan(0)
  expect(rows.filter(row => !row.matches)).toEqual([])
  expect(inventory.complete, 'A partial public roster cannot prove ALL real reps').toBe(true)
}, 180000)
