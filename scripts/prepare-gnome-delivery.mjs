// Resize approved source pixels; keep originals for desktop and print artwork.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const root='public/amethyst/skins/gnome-garden/';
const manifest=JSON.parse(await readFile('public/amethyst/hero-delivery.json','utf8'));
for(const [name,widths] of [['gnome',[96,192]],['lantern',[48,96]],['forest-mobile',[360]],['forest',[360]]]){
 for(const width of widths){
  const nameOut=`${name}-delivery-${width}.webp`;
  const result=await sharp(root+name+'.webp').resize({width,withoutEnlargement:true}).webp({quality:name.startsWith('forest')?68:80}).toFile(root+nameOut);
  console.log(nameOut,result.size);
  const entry=manifest['/amethyst/skins/gnome-garden/'+name+'.webp'];
  if(entry)entry[width]={url:'/amethyst/skins/gnome-garden/'+nameOut,bytes:result.size};
 }
}
await writeFile('public/amethyst/hero-delivery.json',JSON.stringify(manifest,null,2)+'\n');
