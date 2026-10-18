// Curve Lab canvas contract 2026-10-18. Presentation only; no curve snapping.
export const canvasLabelFont = '400 11px system-ui, -apple-system, sans-serif';
export function drawEditorGrid(ctx,left,top,width,height,{frequency=false}={}) {
  ctx.save(); ctx.lineWidth=1;
  // CSS pixels: matching physical density at the same browser zoom, any plot size.
  for(let axis=0;axis<2;axis++) {
    if(axis===1 && frequency) continue;
    const length=axis===0?width:height;
    for(let i=0;i*32<=length;i++) {
      const p=i*32;
      ctx.strokeStyle=i%4===0?'rgba(139,149,162,.18)':'rgba(139,149,162,.08)';
      ctx.beginPath();
      if(axis===0){ctx.moveTo(left+p,top);ctx.lineTo(left+p,top+height);}
      else {ctx.moveTo(left,top+p);ctx.lineTo(left+width,top+p);}
      ctx.stroke();
    }
  }
  ctx.restore();
}
export function frequencyTicks(min,max) {
  const marks=new Set([min,max]);
  for(let e=Math.floor(Math.log10(min));e<=Math.ceil(Math.log10(max));e++)
    for(const m of [1,2,5]){const hz=m*10**e;if(hz>min&&hz<max)marks.add(hz);}
  return [...marks].sort((a,b)=>b-a);
}
export function frequencyLabel(hz){return hz>=1000?`${Number((hz/1000).toFixed(2))} kHz`:`${hz} Hz`;}
export function spacedMarks(marks,minGap=24) {
  if(marks.length<3)return marks;
  const sorted=[...marks].sort((a,b)=>a.y-b.y),out=[sorted[0]],last=sorted.at(-1);
  for(const m of sorted.slice(1,-1))if(m.y-out.at(-1).y>=minGap&&last.y-m.y>=minGap)out.push(m);
  out.push(last);return out;
}
