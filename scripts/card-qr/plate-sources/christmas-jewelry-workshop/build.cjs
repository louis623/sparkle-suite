const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '../../../..');
const artwork = path.join(__dirname, 'hero-approved.png');
const skin = path.join(root, 'public/amethyst/skins/christmas-jewelry-workshop');
const printRoot = path.join(root, 'lib/workspace/card-qr');
const card = path.join(printRoot, 'card-plates/christmas-jewelry-workshop.jpg');

async function main() {
  fs.mkdirSync(path.join(skin, 'flyer'), { recursive: true });
  await sharp(path.join(skin, 'hero-poster.webp')).resize({ width: 640 })
    .webp({ quality: 85 }).toFile(path.join(skin, 'hero-poster-phone.webp'));
  await sharp(path.join(__dirname, 'flyer-portrait-source.png')).resize(1080, 1920, { fit: 'cover' })
    .webp({ quality: 96 }).toFile(path.join(skin, 'flyer/plate.webp'));
  await sharp(artwork).resize(1125, 675, { fit: 'cover', position: 'centre' })
    .withMetadata({ density: 300 }).jpeg({ quality: 97, chromaSubsampling: '4:4:4' }).toFile(card);
  await sharp(card).resize({ width: 420 }).webp({ quality: 88 })
    .toFile(path.join(root, 'public/card-qr-themes/christmas-jewelry-workshop.webp'));
  await sharp(artwork).resize(480, 270).webp({ quality: 84 }).toFile(path.join(skin, 'thumb.webp'));

  const fonts = [
    ['cormorant-garamond/CormorantGaramond[wght].ttf', 'cormorant.ttf'],
    ['dm-sans/DMSans[opsz,wght].ttf', 'dm-sans.ttf'],
  ];
  const bundledFonts = path.join(skin, 'fonts');
  fs.mkdirSync(bundledFonts, { recursive: true });
  for (const [file, name] of fonts) {
    const source = path.join(printRoot, 'fonts', file);
    fs.copyFileSync(source, path.join(bundledFonts, name));
    const license = fs.readFileSync(path.join(path.dirname(source), 'OFL.txt'), 'utf8');
    fs.writeFileSync(path.join(bundledFonts, name + '.license.txt'), license.replace(/[ \t]+(?=\r?$)/gm, ''));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
