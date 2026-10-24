/** Offline build of the two Louis-approved October 24 scenes; never generates art at runtime. */
const sharp=require('sharp');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../../..');
async function main(){
  const selected=process.argv[2];
  if(selected&&!['gobble-and-fizz','pie-please'].includes(selected))throw Error('Unknown Thanksgiving plate: '+selected);
  for(const skin of ['gobble-and-fizz','pie-please'].filter(s=>!selected||s===selected)){
    const dir=path.join(__dirname,skin);
    const meta=JSON.parse(await fs.readFile(path.join(dir,'approved-scene.json'),'utf8'));
    for(const {file,sha256} of meta.sources){
      const bytes=await fs.readFile(path.join(root,file));
      if(createHash('sha256').update(bytes).digest('hex')!==sha256)throw Error('Approved source changed: '+file);
    }
    const scene=path.join(dir,'scene.webp');
    const regions=[['top',0,600],['side',600,900],['floor',1500,420]];
    const layers=[];
    for(const [name,top,height] of regions){
      const file=path.join(dir,name+'.png');
      await sharp(scene).extract({left:0,top,width:1080,height}).png().toFile(file);
      layers.push({input:file,left:0,top});
    }
    const output=path.join(root,'public/amethyst/skins',skin,'flyer/plate.webp');
    await fs.mkdir(path.dirname(output),{recursive:true});
    await sharp({create:{width:1080,height:1920,channels:3,background:'#000'}}).composite(layers).removeAlpha().webp({lossless:true}).toFile(output);
    console.log(skin+': approved scene rebuilt from top / side / floor pieces');
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});
