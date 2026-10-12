import fs from 'node:fs'
import sharp from 'sharp'
import jsQR from 'jsqr'
import QRCode from 'qrcode'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { MARKS3, type Mark } from './marks-cube.mts'
const OUT = process.env.QRICON_OUT ?? '/tmp/qricon-v3-review'
const URL = 'https://www.yoursparklesuite.com/q/2pWSNJ'
const MARGIN = 4
function qrSvg(url: string, dark: string, mark: Mark, px: number) {
  const sym = QRCode.create(url, { errorCorrectionLevel: 'H' }); const n = sym.modules.size; const cells = n + MARGIN * 2; const c = cells / 2
  const D = n * 0.2; const rc = D / 2 + 0.55; const rects: string[] = []
  for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) { if (!sym.modules.get(r, q)) continue; const x = q + MARGIN, y = r + MARGIN
    const nx = Math.max(x, Math.min(c, x + 1)), ny = Math.max(y, Math.min(c, y + 1)); if ((nx - c) ** 2 + (ny - c) ** 2 < rc ** 2) continue; rects.push(`M${x} ${y}h1v1h-1z`) }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${cells} ${cells}"><rect width="${cells}" height="${cells}" fill="#fff"/><path fill="${dark}" shape-rendering="crispEdges" d="${rects.join('')}"/>${badge(mark, dark, c, D)}</svg>`
}
function badge(mark: Mark, dark: string, c: number, D: number) {
  const r = D / 2, ring = D * 0.047, s = D * mark.iconScale, g = mark.draw(dark)
  return `<circle cx="${c}" cy="${c}" r="${r}" fill="#fff"/><circle cx="${c}" cy="${c}" r="${r - ring / 2}" fill="none" stroke="${dark}" stroke-width="${ring}"/><svg x="${c - s / 2}" y="${c - s / 2}" width="${s}" height="${s}" viewBox="${g.vb}" overflow="visible">${g.inner}</svg>`
}
const png = (svg: string) => sharp(Buffer.from(svg)).png().toBuffer()
async function dec(buf: Buffer) { const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null }
const themes = ['amethyst', 'gnome_garden', 'gilded_autumn', 'sparkle_suite_morganite']
const results: Record<string, unknown> = {}
for (const m of MARKS3) {
  const dark = resolveCardQrPalette({ templateId: 'match-site', appearancePreset: m.id === 'gnome' ? 'gnome_garden' : 'amethyst' }).qrDark
  const checks: Record<string, unknown> = {}
  for (const t of themes) {
    const d = resolveCardQrPalette({ templateId: 'match-site', appearancePreset: t }).qrDark
    const full = await png(qrSvg(URL, d, m, 640))
    const small = await sharp(full).resize(180).jpeg({ quality: 60 }).toBuffer()
    checks[t] = { full: (await dec(full)) === URL, small180jpg: (await dec(small)) === URL }
    fs.writeFileSync(`${OUT}/out/${m.id}-${t}-qr.png`, full)
  }
  results[m.id] = checks
  const g = m.draw(dark)
  const big = await png(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" viewBox="0 0 100 100">${badge(m, dark, 50, 96)}</svg>`)
  const qr = await png(qrSvg(URL, dark, m, 420))
  const chip = (px: number) => png(`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 64 64"><rect x="1" y="1" width="62" height="62" rx="15" fill="#fff6fa" stroke="#ee2c9b" stroke-width="2"/><svg x="13.4" y="13.4" width="37.2" height="37.2" viewBox="${g.vb}">${g.inner}</svg></svg>`)
  const W = 1400, H = 640
  const font = 'DM Sans'
  const label = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fbf5f2"/>
   <text x="40" y="58" font-family="Playfair Display" font-size="38" fill="#402924">${m.label}</text>
   <text x="40" y="92" font-family="${font}" font-size="18" fill="${m.status === 'LOCKED' ? '#c81c7c' : '#775d57'}" font-weight="700">${m.status === 'LOCKED' ? 'LOCKED (Louis)' : 'CANDIDATE, for review'}  ·  ${m.source}</text>
   <text x="250" y="${H - 28}" text-anchor="middle" font-family="${font}" font-size="16" fill="#775d57">Mark (badge)</text>
   <text x="720" y="${H - 28}" text-anchor="middle" font-family="${font}" font-size="16" fill="#775d57">Inside a QR (scans: ${Object.values(checks).every((v: any) => v.full && v.small180jpg) ? 'yes, 4 themes, full + 180px JPG' : 'CHECK'})</text>
   <text x="1180" y="${H - 28}" text-anchor="middle" font-family="${font}" font-size="16" fill="#775d57">Tool chip (actual + 2x)</text></svg>`
  const base = await sharp(Buffer.from(label)).png().toBuffer()
  await sharp(base).composite([
    { input: big, left: 40, top: 130 }, { input: qr, left: 510, top: 130 },
    { input: await chip(64), left: 1060, top: 250 }, { input: await chip(128), left: 1150, top: 218 },
  ]).png().toFile(`${OUT}/${m.id}.png`)
}
fs.writeFileSync(`${OUT}/decode-cube.json`, JSON.stringify(results, null, 1))
console.log(JSON.stringify(results))
