// Runs immediately after the SSR root, before its first client paint.
// The server reserves the line height without publishing a guessed viewer zone.
export const earlyHomepageLocalTime = `(function(){
var zone,formatters=new Map();
try{zone=Intl.DateTimeFormat().resolvedOptions().timeZone}catch(e){}
window.sparkleFormatLocalTime=function(value,options,savedZone){
  var chosen=zone||savedZone||'UTC',label;
  try{var key=JSON.stringify([options,chosen]),formatter=formatters.get(key);if(!formatter){formatter=new Intl.DateTimeFormat(undefined,Object.assign({},options,{timeZone:chosen}));formatters.set(key,formatter)}label=formatter.format(new Date(value))}
  catch(e){label=new Intl.DateTimeFormat('en-US',Object.assign({},options,{timeZone:savedZone||'UTC'})).format(new Date(value))}
  return label+(zone?'':' (event time zone: '+(savedZone||'UTC')+')');
};
document.querySelectorAll('[data-sparkle-local-time]').forEach(function(el){
  var label=window.sparkleFormatLocalTime(el.dataset.timeValue,JSON.parse(el.dataset.timeOptions),el.dataset.timeZone);
  el.textContent=label;el.title=label;el.style.visibility='visible';
  if(el.parentElement.tagName==='TIME')el.parentElement.title=window.sparkleFormatLocalTime(el.dataset.timeValue,{dateStyle:'short',timeStyle:'medium'},el.dataset.timeZone);
});
if(window.SPARKLE_FIRST_PAINT)window.SPARKLE_FIRST_PAINT.serverClock=false;
})();`
