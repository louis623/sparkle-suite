// Offline deterministic rebuild of the owner-approved plates. No generation/API calls.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../../../..');
async function main() {
  const flyer = path.join(root, 'public/amethyst/skins/sunset-beach/flyer/plate.webp');
  await fs.mkdir(path.dirname(flyer), {recursive:true});
  await sharp(path.join(__dirname,'flyer-source.png')).resize(1080,1920,{fit:'cover'}).webp({quality:96}).toFile(flyer);
  const scrim = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1125" height="675"><defs><linearGradient id="r" x2="0" y2="1"><stop stop-color="#42172b" stop-opacity=".38"/><stop offset=".55" stop-color="#42172b" stop-opacity=".55"/><stop offset=".9" stop-color="#42172b" stop-opacity="0"/></linearGradient></defs><rect width="1125" height="675" fill="url(#r)"/></svg>');
  await sharp(path.join(__dirname,'card-source.png')).resize(1125,675,{fit:'cover'}).composite([{input:scrim}]).withMetadata({density:300}).jpeg({quality:95,chromaSubsampling:'4:4:4'}).toFile(path.join(root,'lib/workspace/card-qr/card-plates/sunset-beach.jpg'));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
