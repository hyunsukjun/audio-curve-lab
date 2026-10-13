import {sourcePositionAtProgress} from './transform-core.js?v=20261003-01';

// Invert the same source-time mapping used by the worklet's seek operation.
// Multiple visits choose the output time closest to the current playhead.
export function findSourceSeek({sourceDuration,curve,direction=1,outputDuration,target,current=0}){
  if(!(sourceDuration>0&&outputDuration>0))return null;
  const position=p=>sourcePositionAtProgress(sourceDuration,curve,direction,p,outputDuration);
  target=Math.max(0,Math.min(sourceDuration,target));current=Math.max(0,Math.min(1,current));
  const tolerance=.0005;
  if(Math.abs(position(current)-target)<=tolerance)return current;
  let best=null,previous=position(0);const steps=1024;
  const consider=p=>{if(Math.abs(position(p)-target)<=tolerance&&(best===null||Math.abs(p-current)<Math.abs(best-current)))best=p;};
  for(let i=1;i<=steps;i++){
    const lo=(i-1)/steps,hi=i/steps,next=position(hi);
    if(target>=Math.min(previous,next)-tolerance&&target<=Math.max(previous,next)+tolerance){
      if(Math.abs(next-previous)<1e-10)consider(Math.max(lo,Math.min(hi,current)));
      else {
        let a=lo,b=hi;const rising=next>previous;
        for(let j=0;j<24;j++){const m=(a+b)/2;if((position(m)<target)===rising)a=m;else b=m;}
        consider((a+b)/2);
      }
    }
    previous=next;
  }
  return best;
}
