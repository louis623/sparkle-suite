// Re-encode approved source pixels only; artwork and composition stay intact.
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
const sources = [
  'gilded-autumn/hero-poster.webp','gobble-and-fizz/hero-poster.webp','pie-please/hero-poster-v4.webp',
  'pearl-rose/hero-poster.webp','fall-owl/hero-poster.webp','rose-champagne/hero-poster.webp','midnight-rose/hero-poster.webp',
  'neon-butterfly/kelly-studio-desktop.webp','neon-butterfly/kelly-studio-mobile.webp',
  'gnome-garden/forest.webp','gnome-garden/forest-mobile.webp',
  'halloween-pumpkin-witch/hero-desktop.webp','halloween-pumpkin-witch/hero-mobile.webp',
];
const manifest = {};
for(const source of sources){
  const sourcePath='public/amethyst/skins/'+source;
  const stem=source.replace('.webp','');
  const sizes={};
  for(const width of source.startsWith('gnome-garden/') ? [360,720,1440] : [720,1440]){
    const target=stem+`-delivery-${width}.webp`;
    const result=await sharp(sourcePath).resize({width,withoutEnlargement:true}).webp({quality:width===360?68:width===720?64:72}).toFile('public/amethyst/skins/'+target);
    sizes[width]={url:'/amethyst/skins/'+target,bytes:result.size};
  }
  manifest['/amethyst/skins/'+source]=sizes;
}
await writeFile('public/amethyst/hero-delivery.json',JSON.stringify(manifest,null,2)+'\n');
await writeFile('public/amethyst/hero-delivery.js', `// Generated from approved scene art by prepare-hero-delivery.mjs.\n(function(){const images=${JSON.stringify(manifest)};window.sparkleHeroPoster=function(image,source){const sizes=images[source];if(sizes){image.srcset=sizes[720].url+' 720w, '+sizes[1440].url+' 1440w';image.sizes='100vw';image.src=sizes[1440].url;}else image.src=source;};})();\n`);
