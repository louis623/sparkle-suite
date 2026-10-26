// Classic dependencies fetch concurrently in execution order. Theme controllers
// wait for React's commit instead of forcing the entire page to hydrate at once.
export const homepageRuntimeLoader = `(function(){
var started=false;
function start(){
 if(started)return;started=true;
 var afterHomepage=false;
 function append(source){
  var script=document.createElement("script");script.async=false;
  Array.from(source.attributes).forEach(function(a){if(a.name!=="type"&&a.name!=="data-runtime-src")script.setAttribute(a.name,a.value)});
  script.src=source.getAttribute("data-runtime-src");script.fetchPriority="low";document.head.appendChild(script);
 }
 document.querySelectorAll("script[data-runtime-src]").forEach(function(source){
  var src=source.getAttribute("data-runtime-src");
  if(afterHomepage&&window.SPARKLE_FIRST_PAINT){
   var preload=document.createElement("link");preload.rel="preload";preload.as="script";preload.href=src;preload.fetchPriority="low";document.head.appendChild(preload);
   window.addEventListener("sparkle:homepage-hydrated",function(){append(source)},{once:true});
  }else append(source);
  if(src.indexOf("/compiled/homepage.js")!==-1)afterHomepage=true;
 });
}
if(window.sparkleAfterHomepageStyles)window.sparkleAfterHomepageStyles(start);
else if(window.sparkleAfterHeroPaint)window.sparkleAfterHeroPaint(start);
else if(document.hidden)start();
else requestAnimationFrame(function(){setTimeout(start,0)});
})();`
