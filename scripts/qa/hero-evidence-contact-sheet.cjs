const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const [folder,mode]=process.argv.slice(2);
(async()=>{
 const rows=JSON.parse(fs.readFileSync(path.join(folder,mode+'-performance.json'))).filter(r=>r.run===1);
 const width=280,height=230,columns=4,overlays=[];
 for(let i=0;i<rows.length;i++){
  const r=rows[i],prefix=mode+'-'+r.theme.replaceAll('/','_')+'-1';
  const left=(i%columns)*width,top=Math.floor(i/columns)*height;
  overlays.push({input:await sharp(path.join(folder,prefix+'-settled.png')).resize({width,height:200,fit:'contain',background:'#eee'}).png().toBuffer(),left,top:top+30});
  overlays.push({input:Buffer.from(`<svg width="280" height="30"><rect width="280" height="30" fill="white"/><text x="6" y="20" font-size="12">${r.theme}</text></svg>`),left,top});
 }
 await sharp({create:{width:width*columns,height:height*Math.ceil(rows.length/columns),channels:3,background:'white'}}).composite(overlays).png().toFile(path.join(folder,mode+'-contact-sheet.png'));
 for(let start=0;start<rows.length;start+=6){
  const batch=rows.slice(start,start+6),panels=[];
  for(let i=0;i<batch.length;i++){
   const theme=batch[i].theme;
   panels.push({input:Buffer.from(`<svg width="1440" height="30"><rect width="1440" height="30" fill="white"/><text x="8" y="20" font-size="16">${theme}</text></svg>`),left:0,top:i*205});
   panels.push({input:await sharp(path.join(folder,`${mode}-${theme.replaceAll('/','_')}-1-filmstrip.png`)).resize({width:1440,height:175,fit:'contain',background:'white'}).png().toBuffer(),left:0,top:i*205+30});
  }
  await sharp({create:{width:1440,height:205*batch.length,channels:3,background:'white'}}).composite(panels).png().toFile(path.join(folder,`${mode}-filmstrip-sheet-${Math.floor(start/6)+1}.png`));
 }
 console.log(`${mode}: ${rows.length} settled screenshots`);
})().catch(e=>{console.error(e);process.exitCode=1});
