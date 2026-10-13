// Encode browser-observed captures without recropping the header or hero.
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const sharp = require('sharp')

async function main() {
  const captureDir = process.argv[2]
  if (!captureDir) throw new Error('Pass the directory containing captures.json')
  const captures = JSON.parse(fs.readFileSync(path.join(captureDir, 'captures.json'), 'utf8'))
  const output = path.resolve('public/marketing')
  const manifest = {}
  for (const capture of captures) {
    const width = 960
    const height = Math.ceil(capture.height * width / capture.width / 2) * 2
    const basename = capture.id + '-site-preview'
    const poster = path.join(captureDir, capture.id + '-020.jpg')
    await sharp(poster).resize(width, height, { fit: 'fill' }).webp({ quality: 84 }).toFile(path.join(output, basename + '.webp'))
    const concat = capture.timings.map((duration, index) =>
      `file '${capture.id}-${String(index).padStart(3, '0')}.jpg'\nduration ${duration / 1000}`
    ).join('\n') + `\nfile '${capture.id}-${String(capture.frames - 1).padStart(3, '0')}.jpg'\n`
    const concatPath = path.join(captureDir, capture.id + '.txt')
    fs.writeFileSync(concatPath, concat)
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', concatPath,
      '-vf', `scale=${width}:${height},fps=12`, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      path.join(output, basename + '.mp4')], { stdio: 'inherit' })
    manifest[capture.id] = { poster: '/marketing/' + basename + '.webp', mp4: '/marketing/' + basename + '.mp4', width, height }
    console.log(capture.id, width, height, fs.statSync(path.join(output, basename + '.mp4')).size)
  }
  fs.writeFileSync('lib/sparkle-suite/portfolio-motion.ts', `/** Read-only recordings of real rep sites, October 6, 2026.\n * Each frame includes the full site header through the bottom of its hero.\n * Recordings are examples, not a claim about current live-show activity.\n */\nexport const portfolioMotion: Record<string, {poster:string;mp4:string;width:number;height:number}> = ${JSON.stringify(manifest, null, 2)}\n`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
