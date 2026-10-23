/** Rebuild the two approved Thanksgiving plates from original-pixel pieces.
 * node scripts/card-qr/plate-sources/compose-thanksgiving.cjs [gobble-and-fizz|pie-please]
 * No generation, duplicated landscape, anisotropic resize, or runtime provider calls.
 */
const sharp=require('sharp');const fs=require('fs/promises');const path=require('path');
const root=path.resolve(__dirname,'../../..');
const {createHash}=require('crypto');
const svg=(w,h,b)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${b}</svg>`);
async function cut(source,body,box){return sharp(source).ensureAlpha().composite([{input:svg(1280,720,body),blend:'dest-in'}]).png().toBuffer().then(b=>sharp(b).extract(box).png().toBuffer());}
async function main(){
 const gobble=path.join(root,'public/amethyst/skins/gobble-and-fizz/hero-poster.webp');
 const pie=path.join(root,'public/amethyst/skins/pie-please/hero-poster-v4.webp');
 for(const [file,hash] of [[gobble,'a78c049be1137a38b40e0a4e131be568d602b2e7d03690abd6f31b322f2f9372'],[pie,'dd0fe24624eca6e540e8e33949cbb85e7a224ce5cfcaaba711b59196aa49e27c']]){
  if(createHash('sha256').update(await fs.readFile(file)).digest('hex')!==hash)throw Error('Approved hero changed: '+file);
 }
 const birdPath='M559 477 L566 453 L587 436 L591 423 L608 410 L624 400 L653 384 L683 381 L703 368 L731 355 L764 357 L789 374 L809 389 L844 386 L858 399 L886 411 L905 434 L913 464 L922 477 L927 509 L920 528 L903 539 L903 572 L934 567 L949 541 L957 510 L936 489 L922 458 L907 422 L881 397 L858 366 L847 335 L840 298 L821 281 L805 269 L792 270 L780 260 L766 245 L756 223 L742 206 L737 184 L739 163 L747 142 L761 128 L790 115 L820 116 L835 89 L847 66 L866 62 L878 40 L901 38 L916 24 L938 24 L953 15 L976 17 L992 16 L1017 21 L1033 25 L1050 22 L1074 29 L1086 37 L1110 38 L1121 48 L1139 55 L1152 71 L1174 80 L1184 101 L1200 115 L1207 138 L1221 156 L1225 177 L1237 194 L1242 218 L1239 239 L1246 263 L1241 281 L1239 307 L1224 329 L1214 348 L1201 364 L1182 370 L1171 399 L1176 430 L1174 457 L1165 476 L1152 491 L1127 507 L1100 523 L1086 553 L1083 573 L1104 582 L1098 592 L1073 596 L1062 589 L1044 592 L1021 591 L1014 580 L1028 573 L1043 555 L1052 521 L1027 506 L1011 506 L1006 548 L998 574 L985 589 L961 596 L941 599 L922 595 L909 608 L891 614 L864 615 L851 610 L849 597 L808 611 L767 618 L710 620 L651 610 L636 617 L615 616 L605 607 L611 590 L591 571 L581 542 L575 515 L561 510 Z';
 const bubbles=[ [597,166,13],[615,257,27],[667,312,19],[736,285,18],[615,365,15],[785,334,11] ].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="white"/>`).join('');
 const turkey=await cut(gobble,`<path d="${birdPath}" fill="white"/>${bubbles}`,{left:550,top:10,width:700,height:625});
 const lantern=await cut(gobble,'<path d="M542 198L554 211L566 218L570 237L591 251L598 275L595 401L610 426L593 450L508 451L487 432L498 406L497 273L509 247L528 232L534 212Z" fill="white"/>',{left:480,top:190,width:140,height:270});
 const wood=await sharp(gobble).extract({left:0,top:644,width:1280,height:76}).resize(1080,64).ensureAlpha().composite([{input:svg(1080,64,'<defs><linearGradient id="a" x2="0" y2="1"><stop stop-color="white" stop-opacity="0"/><stop offset=".5" stop-color="white"/></linearGradient></defs><rect width="1080" height="64" fill="url(#a)"/>'),blend:'dest-in'}]).png().toBuffer();
 const piePath='M462 414L478 398L507 389L534 391L545 405L573 391L613 382L652 376L684 368L695 352L716 341L739 334L757 326L782 319L803 309L830 304L850 297L877 294L906 288L932 281L958 278L985 272L1013 272L1038 264L1070 264L1107 267L1135 263L1151 262L1177 265L1206 263L1240 265L1280 262V720H836L788 708L743 691L694 669L648 645L607 618L571 589L542 558L519 530L499 493L486 458L469 444Z';
 const pieArt=await cut(pie,`<path d="${piePath}" fill="white"/><path d="M939 406C940 361 969 330 1004 327C1014 307 1039 299 1066 292C1087 277 1118 279 1139 250C1145 271 1161 286 1178 301C1202 309 1227 326 1235 350C1254 363 1267 383 1280 395V500H939Z" fill="white"/>`,{left:450,top:245,width:830,height:475});
 const foliage=await cut(pie,'<path d="M697 0H1280V136L1256 130L1234 144L1204 138L1173 150L1143 143L1114 169L1087 164L1066 185L1039 173L1022 191L996 183L980 202L958 190L946 166L922 170L911 145L887 148L870 124L847 115L829 91L809 96L788 74L766 81L749 62L727 64L711 40L689 37Z" fill="white"/>',{left:680,top:0,width:600,height:210});
 const cloth=await sharp(pie).extract({left:0,top:524,width:450,height:196}).resize(450,196).ensureAlpha().composite([{input:svg(450,196,'<defs><linearGradient id="a" x2="0" y2="1"><stop stop-color="white" stop-opacity="0"/><stop offset=".7" stop-color="white"/></linearGradient></defs><rect width="450" height="196" fill="url(#a)"/>'),blend:'dest-in'}]).png().toBuffer();
 const canopyRaw=await sharp(gobble).extract({left:560,top:0,width:270,height:110}).ensureAlpha().raw().toBuffer();
 for(let y=0;y<110;y++)for(let x=0;x<270;x++){const i=(y*270+x)*4;canopyRaw[i+3]=Math.round(255*Math.min(1,x/28,(269-x)/28,(109-y)/40));}
 const canopy=await sharp(canopyRaw,{raw:{width:270,height:110,channels:4}}).png().toBuffer();
 const clothRaw=await sharp(cloth).ensureAlpha().raw().toBuffer();
 for(let y=0;y<196;y++)for(let x=0;x<450;x++){const i=(y*450+x)*4;clothRaw[i+3]=Math.round(clothRaw[i+3]*Math.min(1,(449-x)/150));}
 const softCloth=await sharp(clothRaw,{raw:{width:450,height:196,channels:4}}).png().toBuffer();
 const configs=[
 {skin:'gobble-and-fizz',sky:'<defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="#442039"/><stop offset=".6" stop-color="#321829"/><stop offset=".82" stop-color="#4d2831"/><stop offset="1" stop-color="#663a2c"/></linearGradient><radialGradient id="l"><stop stop-color="#e3a257" stop-opacity=".3"/><stop offset="1" stop-color="#e3a257" stop-opacity="0"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#s)"/><ellipse cx="150" cy="120" rx="400" ry="360" fill="url(#l)"/>',pieces:{subject:turkey,top:lantern,floor:wood},layers:[{buffer:wood,x:0,y:1856,w:1080},{buffer:turkey,x:330,y:1545,w:420},{buffer:lantern,x:72,y:8,w:115}]},
 {skin:'pie-please',sky:'<defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="#f9e8cd"/><stop offset=".55" stop-color="#f4e6d1"/><stop offset=".8" stop-color="#ead4b4"/><stop offset="1" stop-color="#ae7046"/></linearGradient><radialGradient id="l"><stop stop-color="#fffdf0" stop-opacity=".9"/><stop offset="1" stop-color="#fffdf0" stop-opacity="0"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#s)"/><ellipse cx="0" cy="320" rx="700" ry="800" fill="url(#l)"/>',pieces:{subject:pieArt,top:foliage,side:cloth},layers:[{buffer:cloth,x:0,y:1724,w:450},{buffer:pieArt,x:430,y:1548,w:650},{buffer:foliage,x:570,y:0,w:510}]},
 ];
 configs[0].pieces.side=canopy;
 configs[0].layers.push({buffer:canopy,x:0,y:0,w:450});
 configs[0].layers.push(configs[0].layers.splice(2,1)[0]);
 configs[1].pieces.side=softCloth;
 configs[1].layers[0].buffer=softCloth;
 for(const c of configs.filter(c=>!process.argv[2]||c.skin===process.argv[2])){
  const dir=path.join(__dirname,c.skin);await fs.mkdir(dir,{recursive:true});
  for(const [name,b] of Object.entries(c.pieces))await fs.writeFile(path.join(dir,name+'.png'),b);
  const layers=[];for(const l of c.layers){
   const name=Object.entries(c.pieces).find(([,b])=>b===l.buffer)?.[0];
   if(!name)throw Error('Untracked composition piece');
   layers.push({input:await sharp(path.join(dir,name+'.png')).resize(l.w).png().toBuffer(),left:l.x,top:l.y});
  }
  const output=path.join(root,'public/amethyst/skins',c.skin,'flyer/plate.webp');
  await fs.mkdir(path.dirname(output),{recursive:true});
  await sharp(svg(1080,1920,c.sky)).composite(layers).webp({quality:94,effort:6}).toFile(output);
  console.log(c.skin+': 1080 x 1920 original-art plate written');
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
