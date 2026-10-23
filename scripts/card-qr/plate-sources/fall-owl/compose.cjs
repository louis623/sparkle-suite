/** Fall Owl plate: deterministic cutouts of the approved hero; no generated character.
 * Run from any directory: node scripts/card-qr/plate-sources/fall-owl/compose.cjs
 * Louis chose high-perch composition A on 2026-10-23.
 */
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../../../..');
const SOURCE_HASH = '8ccb49ca53ccc0e5da7e6e50fdc02ef6d20735f70f09cc994f156d2180af9693';
const { createHash } = require('node:crypto');
const source = path.join(ROOT, 'public/amethyst/skins/fall-owl/hero-poster.webp');
const svg = (w,h,body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);
const owlOutline = 'M714 99 L744 99 L770 86 L797 80 L825 65 L857 62 L879 50 L900 55 L929 40 L917 57 L943 51 L928 66 L947 67 L964 83 L978 108 L982 130 L980 159 L984 185 L978 211 L991 229 L1011 247 L1025 275 L1036 308 L1046 341 L1057 370 L1067 405 L1076 447 L1075 481 L1070 509 L1065 533 L1025 540 L984 537 L969 552 L941 552 L928 538 L903 537 L890 547 L860 547 L841 534 L815 539 L808 526 L823 511 L815 493 L790 465 L768 429 L752 391 L739 351 L732 315 L733 278 L742 244 L739 227 L729 207 L722 183 L724 153 L732 128 L744 116 Z';
const branchOutline = 'M690 581 L710 567 L731 568 L747 554 L768 555 L789 541 L810 539 L834 529 L855 535 L880 532 L903 522 L928 525 L955 514 L985 512 L1010 502 L1044 494 L1063 478 L1090 473 L1109 458 L1136 449 L1152 429 L1175 421 L1196 410 L1217 413 L1238 397 L1260 395 L1280 381 L1280 602 L1250 601 L1210 605 L1160 613 L1110 616 L1060 624 L1010 632 L960 634 L910 635 L860 634 L810 630 L770 622 L730 611 Z';
async function masked(body, box) {
  return sharp(source).ensureAlpha().composite([{input:svg(1280,720,body),blend:'dest-in'}]).png().toBuffer().then(b=>sharp(b).extract(box).png().toBuffer());
}

async function main() {
  const bytes = await fs.readFile(source);
  if (createHash('sha256').update(bytes).digest('hex') !== SOURCE_HASH) throw new Error('Approved Fall Owl hero changed; review before rebuilding.');
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== 1280 || metadata.height !== 720) throw new Error('Expected approved 1280 x 720 hero.');
  const owl = await masked('<path d="'+owlOutline+'" fill="white"/>',{left:700,top:35,width:385,height:530});
  const branch = await masked('<path d="'+branchOutline+'" fill="white"/>',{left:680,top:375,width:600,height:270});
  const moon = await masked('<circle cx="958" cy="218" r="209" fill="white"/>',{left:740,top:0,width:440,height:440});
  const leafRaw = await sharp(source).extract({left:470,top:0,width:260,height:95}).ensureAlpha().raw().toBuffer();
  for (let i=0;i<leafRaw.length;i+=4) leafRaw[i+3]=Math.max(0,Math.min(255,(leafRaw[i]-leafRaw[i+2]-35)*10));
  // Clip to the actual canopy too: warm sky and the source star are not leaves.
  const leaves = await sharp(leafRaw,{raw:{width:260,height:95,channels:4}}).composite([{input:svg(260,95,'<path d="M0 0H255L239 23L210 35L195 62L169 71L152 63L129 87L104 85L87 72L62 77L52 54L24 53L29 28L8 23Z" fill="white"/>'),blend:'dest-in'}]).png().toBuffer();
  const floor = await sharp(source).extract({left:0,top:350,width:680,height:275}).resize(1080,437).ensureAlpha().composite([{input:svg(1080,437,'<defs><linearGradient id="a" x2="0" y2="1"><stop stop-color="white" stop-opacity="0"/><stop offset=".23" stop-color="white"/></linearGradient></defs><rect width="1080" height="437" fill="url(#a)"/>'),blend:'dest-in'}]).png().toBuffer();
  const scale=.44, owlX=825, owlY=12, anchorX=owlX-700*scale, anchorY=owlY-35*scale;
  const topLayers=[];
  for (const [buffer,x,y,width] of [
    [moon,anchorX+740*scale,anchorY,Math.round(440*scale)],
    [branch,anchorX+680*scale,anchorY+375*scale,Math.round(600*scale)],
    [owl,owlX,owlY,Math.round(385*scale)],
  ]) {
    let input=await sharp(buffer).resize(width).png().toBuffer();
    const meta=await sharp(input).metadata();
    const left=Math.round(x), top=Math.max(0,Math.round(y));
    const cropTop=top-Math.round(y);
    const cropWidth=Math.min(meta.width,1080-left);
    if(cropTop || cropWidth!==meta.width) input=await sharp(input).extract({left:0,top:cropTop,width:cropWidth,height:meta.height-cropTop}).png().toBuffer();
    topLayers.push({input,left,top});
  }
  const top=await sharp({create:{width:1080,height:290,channels:4,background:'#00000000'}}).composite(topLayers).png().toBuffer();
  const side=await sharp(leaves).resize(450).png().toBuffer();
  for(const [name,buffer] of Object.entries({top,side,floor,owl})) await fs.writeFile(path.join(__dirname,name+'.png'),buffer);
  const sky = svg(1080,1920,'<defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="#2c1b30"/><stop offset=".62" stop-color="#3b2339"/><stop offset=".8" stop-color="#6f3943"/><stop offset="1" stop-color="#b16545"/></linearGradient><radialGradient id="g"><stop stop-color="#dc9b59" stop-opacity=".24"/><stop offset="1" stop-color="#dc9b59" stop-opacity="0"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#s)"/><ellipse cx="925" cy="180" rx="420" ry="430" fill="url(#g)"/>');
  // Compose saved top / side / floor pieces. No landscape cover crop, duplicate,
  // stretch-fill or generated owl. Open sky is a smooth palette field, not blurred art.
  const output=path.join(ROOT,'public/amethyst/skins/fall-owl/flyer/plate.webp');
  await fs.mkdir(path.dirname(output),{recursive:true});
  await sharp(sky).composite([
    {input:path.join(__dirname,'top.png'),left:0,top:0},
    {input:path.join(__dirname,'side.png'),left:20,top:0},
    {input:path.join(__dirname,'floor.png'),left:0,top:1483},
  ]).webp({quality:94,effort:6}).toFile(output);
  console.log('Fall Owl: 1080 x 1920; approved hero preserved; wrote '+output);
}
main().catch(error=>{console.error(error);process.exitCode=1});
