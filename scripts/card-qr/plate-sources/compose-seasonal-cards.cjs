/** Rebuild the cauldron and pie card fronts. The existing approved owl card is retained verbatim. */
const sharp=require('sharp');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../../..');
const manifest=require('./seasonal-cards/sources.json');
async function main(){
  for(const entry of manifest.sources){
    const bytes=await fs.readFile(path.join(root,entry.path));
    if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Source changed: '+entry.path);
  }
  const out=path.join(root,'lib/workspace/card-qr/card-plates');
  await fs.mkdir(out,{recursive:true});
  await sharp(path.join(__dirname,'seasonal-cards/cauldron-source.png')).resize(1125,675,{fit:'cover'}).withMetadata({density:300}).jpeg({quality:95,chromaSubsampling:'4:4:4'}).toFile(path.join(out,'gobble-and-fizz.jpg'));
  const scrim=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1125" height="675"><defs><linearGradient id="s"><stop stop-color="#fffaf2" stop-opacity=".75"/><stop offset=".72" stop-color="#fffaf2" stop-opacity=".62"/><stop offset="1" stop-color="#fffaf2" stop-opacity="0"/></linearGradient></defs><rect width="690" height="675" fill="url(#s)"/></svg>');
  await sharp(path.join(root,'public/amethyst/skins/pie-please/hero-poster-v4.webp')).resize(1125,675,{fit:'cover',position:'right'}).composite([{input:scrim}]).withMetadata({density:300}).jpeg({quality:95,chromaSubsampling:'4:4:4'}).toFile(path.join(out,'pie-please.jpg'));
  console.log('Seasonal card plates: 1125x675 at 300 DPI. Approved owl retained.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
