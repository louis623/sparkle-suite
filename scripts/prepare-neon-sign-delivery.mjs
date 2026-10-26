// Lossless web delivery of the approved transparent Kelly sign cutouts.
// Keep the PNG originals for source/print fidelity checks.
import sharp from 'sharp';
import { stat } from 'node:fs/promises';
const root='public/amethyst/skins/neon-butterfly/';
for(const tone of ['pink','gold','violet']){
 const source=root+`kelly-sign-${tone}.png`,target=root+`kelly-sign-${tone}.webp`;
 await sharp(source).webp({lossless:true,effort:6}).toFile(target);
 console.log(tone,(await stat(source)).size,(await stat(target)).size);
}
