// Partytown's synchronous DOM bridge is answered inside its service worker.
// This exact static-asset path is not an application/database API.
exports.shouldBlockAppWrite=function(request,base){
 const url=new URL(request.url()),method=request.method();
 if(url.origin!==new URL(base).origin||['GET','HEAD','OPTIONS'].includes(method))return false;
 return !(method==='POST'&&/^\/amethyst\/analytics-worker\/\d+\.\d+\.\d+\/proxytown$/.test(url.pathname));
};
