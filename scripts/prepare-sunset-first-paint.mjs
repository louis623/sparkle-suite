import sharp from 'sharp';
const source='public/amethyst/skins/sunset-beach/hero-poster.webp';
const target='public/amethyst/skins/sunset-beach/hero-first-paint.avif';
// This is the existing opening frame, before the full-resolution movie starts.
await sharp(source).resize({width:720}).avif({quality:45,effort:6}).toFile(target);
