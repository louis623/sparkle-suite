const fs = require('node:fs');
const sharp = require('sharp');
exports.startFilmstrip = async function(cdp, prefix) {
  await cdp.send('Performance.enable');
  await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.screenshot',transferMode:'ReturnAsStream'});
  return async function finish() {
    const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
    await cdp.send('Tracing.end');const {stream}=await complete;let trace='';
    for(;;){const chunk=await cdp.send('IO.read',{handle:stream});trace+=chunk.data;if(chunk.eof)break;}
    await cdp.send('IO.close',{handle:stream});
    fs.writeFileSync(prefix+'-trace.json',trace);
    const frames=JSON.parse(trace).traceEvents.filter(e=>e.name==='Screenshot'&&e.args?.snapshot);
    if(!frames.length)return;
    const {metrics}=await cdp.send('Performance.getMetrics');
    const navigation=metrics.find(m=>m.name==='NavigationStart')?.value;
    const first=navigation?navigation*1e6:frames[0].ts,last=frames.at(-1);
    const chosen=[...new Set([0,.25,.5,.75,1,1.5,2,2.5,3,4,6].filter(t=>first+t*1e6<=last.ts).map(t=>frames.find(e=>e.ts>=first+t*1e6)).concat(last))];
    const overlays=[];
    for(let i=0;i<chosen.length;i++){
      const e=chosen[i],input=Buffer.from(e.args.snapshot,'base64');
      overlays.push({input:await sharp(input).resize({width:240,height:200,fit:'contain',background:'#eee'}).png().toBuffer(),left:i*240,top:25});
      overlays.push({input:Buffer.from(`<svg width="240" height="25"><text x="8" y="18" font-size="14">${((e.ts-first)/1e6).toFixed(2)}s</text></svg>`),left:i*240,top:0});
    }
    await sharp({create:{width:chosen.length*240,height:225,channels:3,background:'white'}}).composite(overlays).png().toFile(prefix+'-filmstrip.png');
  };
};
