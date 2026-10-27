// Pure scheduling/verdict helpers: no browser, network, or application access.
exports.dispatchScheduledTouches=async function({send,start,offsets,now=Date.now,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),lateToleranceMs=100}){
 const attempts=[];
 for(const offset of offsets){
  await wait(Math.max(0,start+offset-now()));
  const elapsed=now()-start;
  const attempt={offset,sentAt:elapsed,lateBy:Math.max(0,elapsed-offset)};attempts.push(attempt);
  try{
   await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:315,y:32}]});
   await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }catch(error){attempt.error=error.message||String(error);}
  attempt.finishedAt=now()-start;
 }
 return attempts;
};

exports.summarizeStartupInput=function(proof,attempts,{errors=[],consoleErrors=[],httpStatus=200,diagnosticOnly=false}={}){
 const events=proof.events||[],clicks=proof.clicks||[];
 // EventTiming.target may be null after hydration replaces a target. Never
 // discard that delay merely because the surviving DOM no longer identifies it.
 const afterPaint=Number.isFinite(proof.fcp)?events.filter(event=>event.at>=proof.fcp):[];
 const invalidReasons=[];
 if(!Number.isFinite(proof.fcp))invalidReasons.push('missing-first-contentful-paint');
 if(proof.eventTimingSupported!==true)invalidReasons.push('event-timing-unavailable');
 if(httpStatus!==200)invalidReasons.push('navigation-not-200');
 if(!attempts.length)invalidReasons.push('no-scheduled-input');
 if(attempts.some(attempt=>attempt.error))invalidReasons.push('input-dispatch-error');
 const incompleteReasons=[];
 if(attempts.some(attempt=>attempt.skipped||attempt.lateBy>100))incompleteReasons.push('scheduled-input-skipped');
 if(clicks.filter(click=>click.eventAt>=proof.fcp).length<3)incompleteReasons.push('fewer-than-three-post-paint-shop-clicks');
 const valid=!invalidReasons.length,complete=valid&&!incompleteReasons.length;
 const maxMs=events.length?Math.max(...events.map(event=>event.duration)):16;
 const postPaintMaxMs=afterPaint.length?Math.max(...afterPaint.map(event=>event.duration)):16;
 const meetsGates=postPaintMaxMs<=200&&proof.shopRetained===true&&proof.hydrated===true&&!errors.length&&!consoleErrors.length;
 const status=!valid?'invalid':!complete?'incomplete':diagnosticOnly?'diagnostic':meetsGates?'passed':'failed';
 return {valid,complete,status,diagnosticOnly,invalidReasons,incompleteReasons,maxMs,postPaintMaxMs,
  // Retained for existing report consumers; now conservatively includes every
  // recorded interaction after paint, not only surviving Shop DOM targets.
  visibleControlMaxMs:postPaintMaxMs,belowThreshold:!afterPaint.length,pass:status==='passed'};
};
