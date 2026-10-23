/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node media publication utility. */
/** Publish verified local capture bytes and a compact source manifest. No network. */
const fs = require('node:fs/promises')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const assert = require('node:assert/strict')
const community = ['amethyst', 'halloween_pumpkin_witch', 'halloween_pumpkin_cat', 'gilded_autumn', 'fall_owl_harvest_moon', 'gobble_and_fizz', 'pie_please', 'midnight_rose', 'pearl_rose', 'rose_champagne']
const reps = ['mile-high-fizz', 'go-for-the-bling', 'sparkly-butterflies']
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
async function main() {
  const root = process.cwd()
  const captureRoot = path.join(root, '.local/carousel-capture')
  const entries = []
  // Check the complete set before copying any candidate into public/.
  for (const id of [...community, ...reps]) {
    const directory = path.join(captureRoot, 'recordings', id)
    const receipt = JSON.parse(await fs.readFile(path.join(directory, 'receipt.json'), 'utf8'))
    const fixture = JSON.parse(await fs.readFile(path.join(captureRoot, `${id}.manifest.json`), 'utf8'))
    assert.equal(receipt.errors.length, 0, id + ': runtime errors')
    assert.equal(receipt.assetErrors?.length ?? 0, 0, id + ': asset errors')
    const input = path.join(directory, `${id}-classic-v2.mp4`)
    const bytes = await fs.readFile(input)
    assert.equal(digest(bytes), receipt.sha256, id + ': receipt no longer matches')
    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', input], { encoding: 'utf8' }))
    const video = probe.streams.find(stream => stream.codec_type === 'video')
    assert.ok(video && Number(probe.format.duration) >= 15, id + ': missing full dwell')
    assert.ok(!probe.streams.some(stream => stream.codec_type === 'audio'), id + ': must be silent')
    assert.equal(video.width, receipt.geometry.width)
    assert.equal(video.height, receipt.geometry.height)
    const folder = community.includes(id) ? 'community-sites-v2' : 'rep-sites-v2'
    entries.push({ id, input, receipt, fixture, bytes, video, duration: Number(probe.format.duration), folder })
  }
  const manifest = { capturedAt: '2026-10-23', method: 'Actual customer renderer, stationary viewport, native animation timing, safe local fixture', entries: [] }
  for (const entry of entries) {
    const { id, input, receipt, fixture, bytes, video, duration, folder } = entry
    const destination = path.join(root, 'public/marketing', folder)
    await fs.mkdir(destination, { recursive: true })
    await fs.writeFile(path.join(destination, `${id}.mp4`), bytes)
    // Use a representative real frame with the entrance subject fully visible.
    const posterTime = id === 'amethyst' ? 8 : id === 'halloween_pumpkin_witch' ? 6 : 3
    const posterPath = path.join(destination, `${id}.webp`)
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(posterTime), '-i', input, '-frames:v', '1', '-quality', '90', posterPath])
    manifest.entries.push({ id, preset: fixture.preset, sourceRevision: fixture.gitCommit, sourceFixture: `scripts/prepare-carousel-capture-fixtures.ts --theme ${id}`, payloadProvenance: fixture.payloadProvenance, sources: fixture.sources, removedControls: fixture.removedControls, captureOverrides: ['Hide native/diagnostic controls', 'Freeze computed hero height while extending viewport to its bottom', 'Restart native videos and CSS animations at original speed', 'Resolve local Next image URLs to original local image bytes'], width: video.width, height: video.height, durationSeconds: duration, capturedFrames: receipt.frames, encodedFrameRate: video.r_frame_rate, posterAtSeconds: posterTime, mp4: `/marketing/${folder}/${id}.mp4`, poster: `/marketing/${folder}/${id}.webp`, bytes: bytes.length, videoSha256: receipt.sha256, posterSha256: digest(await fs.readFile(posterPath)), runtimeErrors: receipt.errors, assetErrors: receipt.assetErrors ?? null })
  }
  const file = path.join(root, 'docs/sparkle-suite/qa/2026-10-23-carousel-capture-manifest.json')
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(manifest, null, 2) + '\n')
  console.log(JSON.stringify(manifest.entries.map(({ id, width, height, bytes, durationSeconds }) => ({ id, width, height, bytes, durationSeconds }))))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
