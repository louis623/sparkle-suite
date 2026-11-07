// Deterministic conversions of the selected hero and art-directed portrait.
// No image generation, network request, registration mutation, or API cost.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const source = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(source, '../../../..');
const assets = path.join(root, 'public/amethyst/skins/starlight-christmas-hollow');
await sharp(path.join(source, 'approved-hero.png')).resize(1280,720).webp({quality:88}).toFile(path.join(assets,'hero-poster.webp'));
await sharp(path.join(source, 'approved-hero.png')).resize(1125,675,{fit:'cover'}).jpeg({quality:95}).toFile(path.join(root,'lib/workspace/card-qr/card-plates/starlight-christmas-hollow.jpg'));
await sharp(path.join(source, 'flyer-portrait.png')).resize(1080,1920,{fit:'fill'}).webp({quality:90}).toFile(path.join(assets,'flyer/plate.webp'));
console.log('Rebuilt Starlight hero poster, business card plate, and portrait flyer plate.');
