/** Let the server hero reach the screen before enhancement work competes for CPU.
 * The deadline and input escape paths keep controls usable if the browser never
 * reports an image candidate (unsupported LCP observer, failed image, hidden tab).
 */
export const homepagePaintGate = `<script>(function(){
var ready=false,queue=[],observer,timer;
function finish(){if(ready)return;ready=true;clearTimeout(timer);if(observer)observer.disconnect();queue.splice(0).forEach(function(fn){setTimeout(fn,0)})}
window.sparkleAfterHeroPaint=function(fn){if(ready)setTimeout(fn,0);else queue.push(fn)};
try{observer=new PerformanceObserver(function(list){list.getEntries().forEach(function(entry){var hero=entry.element&&entry.element.closest&&entry.element.closest('.hp-hero');var poster=document.querySelector('link[rel="preload"][as="image"]');if(hero&&(!poster||entry.url||entry.element.tagName==='VIDEO'))finish()})});observer.observe({type:'largest-contentful-paint',buffered:true})}catch(e){}
function parsed(){if(document.hidden)finish();else timer=setTimeout(finish,1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',parsed,{once:true});else parsed();
document.addEventListener('pointerdown',finish,{once:true,capture:true});document.addEventListener('keydown',finish,{once:true,capture:true});
document.addEventListener('visibilitychange',function(){if(document.hidden)finish()});window.addEventListener('pagehide',finish,{once:true});
})();</script>`
