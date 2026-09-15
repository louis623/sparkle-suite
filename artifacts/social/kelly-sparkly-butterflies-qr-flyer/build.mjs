import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const targetUrl = 'https://sparklybutterflies.com';
const width = 1080;
const height = 1920;

const outputPng = path.join(here, 'kelly-sparkly-butterflies-qr-flyer.png');
const outputJpg = path.join(here, 'kelly-sparkly-butterflies-qr-flyer.jpg');
const outputThumb = path.join(here, 'kelly-sparkly-butterflies-qr-flyer-thumbnail.jpg');
const validationPath = path.join(here, 'qr-validation.json');
const qrPath = path.join(here, 'sparklybutterflies-qr.png');

const asset = (name) =>
  path.join(repoRoot, 'public', 'amethyst', 'skins', 'neon-butterfly', name);

const escapeXml = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const qr = await QRCode.toBuffer(targetUrl, {
  type: 'png',
  errorCorrectionLevel: 'H',
  margin: 4,
  width: 468,
  color: {
    dark: '#17051BFF',
    light: '#FFFFFFFF',
  },
});
await fs.writeFile(qrPath, qr);

const background = await sharp(asset('kelly-studio-mobile.webp'))
  .resize(width, height, { fit: 'cover' })
  .modulate({ brightness: 0.76, saturation: 1.08 })
  .toBuffer();

const pinkSign = await sharp(asset('kelly-sign-pink.png'))
  .resize({ width: 180 })
  .toBuffer();
const violetSign = await sharp(asset('kelly-sign-violet.png'))
  .resize({ width: 170 })
  .toBuffer();
const goldSign = await sharp(asset('kelly-sign-gold.png'))
  .resize({ width: 190 })
  .toBuffer();

const sparkles = [
  [99, 120, 9], [936, 164, 6], [832, 406, 8], [181, 498, 5],
  [936, 630, 10], [119, 703, 5], [898, 1234, 7], [156, 1378, 9],
  [932, 1544, 5], [123, 1672, 7], [780, 1802, 8], [315, 1747, 4],
];

const sparkleMarkup = sparkles.map(([x, y, r], index) => {
  const color = index % 3 === 0 ? '#ffc24a' : index % 3 === 1 ? '#ff53dc' : '#f7ecff';
  return `<g opacity="${index % 2 ? '0.75' : '0.95'}" fill="${color}">
    <path d="M ${x} ${y - r * 2.1} L ${x + r * 0.45} ${y - r * 0.45} L ${x + r * 2.1} ${y} L ${x + r * 0.45} ${y + r * 0.45} L ${x} ${y + r * 2.1} L ${x - r * 0.45} ${y + r * 0.45} L ${x - r * 2.1} ${y} L ${x - r * 0.45} ${y - r * 0.45} Z"/>
  </g>`;
}).join('');

const overlay = Buffer.from(`
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#16031c" stop-opacity="0.25"/>
      <stop offset="0.43" stop-color="#16031c" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#0a020d" stop-opacity="0.82"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#300b39" stop-opacity="0.90"/>
      <stop offset="0.52" stop-color="#17051d" stop-opacity="0.92"/>
      <stop offset="1" stop-color="#3d0c39" stop-opacity="0.88"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff62e2"/>
      <stop offset="0.48" stop-color="#ffc24a"/>
      <stop offset="1" stop-color="#9a50ff"/>
    </linearGradient>
    <filter id="pinkGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#09000d" flood-opacity="0.85"/>
    </filter>
  </defs>

  <rect width="1080" height="1920" fill="url(#vignette)"/>
  <rect x="62" y="64" width="956" height="1792" rx="40" fill="none" stroke="url(#rim)" stroke-width="4" opacity="0.80"/>
  <rect x="73" y="75" width="934" height="1770" rx="32" fill="none" stroke="#fff8fc" stroke-width="1" opacity="0.24"/>
  ${sparkleMarkup}

  <g filter="url(#softShadow)">
    <rect x="132" y="130" width="816" height="520" rx="46" fill="url(#glass)" stroke="#ff76e6" stroke-width="2"/>
  </g>
  <text x="540" y="208" text-anchor="middle" fill="#ffc24a" font-family="Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="7">SPARKLY BUTTERFLIES</text>
  <line x1="306" y1="239" x2="774" y2="239" stroke="#ffc24a" stroke-width="2" opacity="0.72"/>
  <text x="540" y="342" text-anchor="middle" fill="#fff8fc" font-family="Georgia, serif" font-size="80" font-weight="700" letter-spacing="1" filter="url(#pinkGlow)">LET YOURSELF</text>
  <text x="540" y="448" text-anchor="middle" fill="#ff71df" font-family="Georgia, serif" font-size="112" font-style="italic" font-weight="700" filter="url(#pinkGlow)">sparkle</text>
  <text x="540" y="533" text-anchor="middle" fill="#fff8fc" font-family="Arial, sans-serif" font-size="33" font-weight="600">Kelly’s latest treasures are one scan away.</text>
  <text x="540" y="584" text-anchor="middle" fill="#ead7ed" font-family="Arial, sans-serif" font-size="27">New reveals, beautiful finds, and your next favorite piece.</text>

  <g filter="url(#softShadow)">
    <rect x="200" y="692" width="680" height="682" rx="52" fill="#fffdfd"/>
    <rect x="200" y="692" width="680" height="682" rx="52" fill="none" stroke="url(#rim)" stroke-width="10"/>
    <rect x="216" y="708" width="648" height="650" rx="40" fill="none" stroke="#300b39" stroke-width="3" opacity="0.24"/>
  </g>
  <rect x="341" y="731" width="398" height="58" rx="29" fill="#26062d"/>
  <text x="540" y="771" text-anchor="middle" fill="#fff8fc" font-family="Arial, sans-serif" font-size="27" font-weight="800" letter-spacing="4">SCAN TO SHOP</text>
  <rect x="294" y="818" width="492" height="492" rx="20" fill="#ffffff" stroke="#f2d7ed" stroke-width="3"/>
  <text x="540" y="1340" text-anchor="middle" fill="#4b124d" font-family="Arial, sans-serif" font-size="24" font-weight="700">Point your phone’s camera at the code</text>

  <g filter="url(#softShadow)">
    <rect x="132" y="1430" width="816" height="252" rx="38" fill="url(#glass)" stroke="#9f65ff" stroke-width="2"/>
  </g>
  <text x="540" y="1502" text-anchor="middle" fill="#ffc24a" font-family="Arial, sans-serif" font-size="25" font-weight="800" letter-spacing="3">SAVE IT FOR LATER</text>
  <text x="540" y="1561" text-anchor="middle" fill="#fff8fc" font-family="Arial, sans-serif" font-size="27" font-weight="600">Screenshot this flyer and open it in Photos.</text>
  <text x="540" y="1608" text-anchor="middle" fill="#fff8fc" font-family="Arial, sans-serif" font-size="27" font-weight="600">Then press and hold the QR code.</text>
  <text x="540" y="1768" text-anchor="middle" fill="#fff8fc" font-family="Arial, sans-serif" font-size="37" font-weight="900" letter-spacing="2">SPARKLYBUTTERFLIES.COM</text>
  <text x="540" y="1813" text-anchor="middle" fill="#ffc24a" font-family="Georgia, serif" font-size="26" font-style="italic">Shop with Kelly anytime</text>
</svg>`);

const composed = await sharp(background)
  .composite([
    { input: overlay, top: 0, left: 0 },
    { input: pinkSign, top: 492, left: 28 },
    { input: violetSign, top: 500, left: 882 },
    { input: goldSign, top: 1570, left: 786 },
    { input: qr, top: 830, left: 306 },
  ])
  .png({ compressionLevel: 9, palette: false })
  .toBuffer();

await fs.writeFile(outputPng, composed);
await sharp(composed).jpeg({ quality: 94, chromaSubsampling: '4:4:4' }).toFile(outputJpg);
await sharp(composed).resize(270, 480).jpeg({ quality: 90 }).toFile(outputThumb);

async function decodeQr(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height, {
    inversionAttempts: 'attemptBoth',
  });
  return decoded?.data ?? null;
}

const pngDecoded = await decodeQr(outputPng);
const jpgDecoded = await decodeQr(outputJpg);
const validation = {
  targetUrl,
  dimensions: { width, height },
  png: { decodedUrl: pngDecoded, valid: pngDecoded === targetUrl },
  jpg: { decodedUrl: jpgDecoded, valid: jpgDecoded === targetUrl },
};

await fs.writeFile(validationPath, `${JSON.stringify(validation, null, 2)}\n`);

if (!validation.png.valid || !validation.jpg.valid) {
  throw new Error(`QR validation failed: ${JSON.stringify(validation)}`);
}

console.log(JSON.stringify(validation, null, 2));
