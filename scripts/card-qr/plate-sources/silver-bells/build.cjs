const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'../../../..');
async function main(){
 const skin=path.join(root,'public/amethyst/skins/silver-bells');
 fs.mkdirSync(path.join(skin,'flyer'),{recursive:true});
 await sharp(path.join(__dirname,'hero-approved.png')).webp({quality:96}).toFile(path.join(skin,'hero-poster.webp'));
 await sharp(path.join(__dirname,'hero-approved.png')).resize({width:640}).webp({quality:85}).toFile(path.join(skin,'hero-poster-phone.webp'));
 await sharp(path.join(__dirname,'flyer-portrait-source.png')).resize(1080,1920,{fit:'cover'}).webp({quality:96}).toFile(path.join(skin,'flyer/plate.webp'));
 await sharp(path.join(__dirname,'hero-approved.png')).resize(1125,675,{fit:'cover',position:'centre'}).withMetadata({density:300}).jpeg({quality:97,chromaSubsampling:'4:4:4'}).toFile(path.join(root,'lib/workspace/card-qr/card-plates/silver-bells.jpg'));
 await sharp(path.join(root,'lib/workspace/card-qr/card-plates/silver-bells.jpg')).resize({width:420}).webp({quality:88}).toFile(path.join(root,'public/card-qr-themes/silver-bells.webp'));
 const fonts=[['great-vibes/GreatVibes-Regular.ttf','great-vibes.ttf'],['cormorant-garamond/CormorantGaramond[wght].ttf','cormorant.ttf'],['dm-sans/DMSans[opsz,wght].ttf','dm-sans.ttf']];
 fs.mkdirSync(path.join(skin,'fonts'),{recursive:true});
 for(const [from,to] of fonts){fs.copyFileSync(path.join(root,'lib/workspace/card-qr/fonts',from),path.join(skin,'fonts',to));fs.copyFileSync(path.join(root,'lib/workspace/card-qr/fonts',path.dirname(from),'OFL.txt'),path.join(skin,'fonts',to+'.license.txt'));}
 console.log('Built Silver Bells poster, phone poster, flyer, card plate, thumbnail and bundled fonts.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
