import { toneColor } from "./source-colors.js";
import { canvasType } from "./canvas-typography.js?v=20261015-1";
// Display-only summaries and scaling. Never write into the audio channels.
export function summarizeChannels(channels, buckets=16000) {
  return channels.map(channel=>{
    const count=Math.min(buckets,channel.length),peaks=new Float32Array(count);
    peaks.minimum=new Float32Array(count);peaks.maximum=new Float32Array(count);
    for(let i=0;i<count;i++){
      const start=Math.floor(i*channel.length/count),end=Math.floor((i+1)*channel.length/count);
      let lo=0,hi=0;for(let j=start;j<end;j++){lo=Math.min(lo,channel[j]);hi=Math.max(hi,channel[j]);}peaks[i]=Math.max(-lo,hi);peaks.minimum[i]=lo;peaks.maximum[i]=hi;
    }
    return peaks;
  });
}
export function peakOf(peaks){let peak=0;for(const lane of peaks)for(const p of lane)peak=Math.max(peak,p);return peak;}
export function visualGain(referencePeak){return 1/Math.max(.00001,referencePeak);}
export function paintWaveform(ctx,{width,height=128,left=54,right=8,peaks=[],duration=0,referencePeak=1,color='#8bc9ff',title='',hint='',position=0,hover=null,timeOffset=0,colors=null,colorStart=0,colorEnd=1}) {
  const scale=globalThis.devicePixelRatio||1,w=Math.max(1,width-left-right),top=24,bottom=height-19;
  ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle='#191c20';ctx.fillRect(0,0,width,height);
  ctx.font=canvasType.tick;
  const timeLabel=i=>`${(timeOffset+duration*i).toFixed(duration<10?3:2)} s`;
  const labelWidth=Math.max(ctx.measureText(timeLabel(0)).width,ctx.measureText(timeLabel(1)).width);
  const divisions=Math.max(1,Math.min(w<680?4:10,Math.floor(w/(labelWidth+16))));ctx.strokeStyle='rgba(139,149,162,.18)';ctx.lineWidth=1;
  for(let i=0;i<=divisions;i++){const x=left+w*i/divisions;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();}
  ctx.fillStyle='#a9b1bb';ctx.font=canvasType.section;ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText(title,10,12);
  if(width>340){const g=ctx.createLinearGradient(width-66,0,width-8,0);g.addColorStop(0,toneColor(150));g.addColorStop(.5,toneColor(1100));g.addColorStop(1,toneColor(8000));ctx.fillStyle=g;ctx.fillRect(width-66,9,58,5);ctx.fillStyle='#a9b1bb';ctx.font=canvasType.hint;ctx.textAlign='right';ctx.fillText('Source tone',width-72,12);ctx.textAlign='left';}
  const hintX=Math.max(left+150,ctx.measureText(title).width+24);
  ctx.font=canvasType.hint;
  if(w>550 && hintX+ctx.measureText(hint).width<=width-right-150)ctx.fillText(hint,hintX,12);
  ctx.font=canvasType.channel;
  const gain=visualGain(referencePeak),laneHeight=(bottom-top)/2,amplitude=laneHeight*.44;
  for(let channel=0;channel<2;channel++){
    const lane=peaks[channel]||peaks[0],mid=top+laneHeight*(channel+.5);
    ctx.fillStyle='#a9b1bb';ctx.fillText(channel?'R':'L',12,mid);
    ctx.strokeStyle='rgba(146,171,190,.25)';ctx.beginPath();ctx.moveTo(left,mid);ctx.lineTo(left+w,mid);ctx.stroke();
    if(!lane?.length)continue;
    const spectrum=colors?.[channel]||colors?.[0];
    if(spectrum?.length){
      const gradient=ctx.createLinearGradient(left,0,left+w,0);
      const n=Math.min(256,Math.max(2,Math.ceil((colorEnd-colorStart)*spectrum.length)));
      for(let i=0;i<n;i++){const t=i/(n-1),index=Math.min(spectrum.length-1,Math.floor((colorStart+t*(colorEnd-colorStart))*spectrum.length));gradient.addColorStop(t,toneColor(spectrum[index]));}
      ctx.fillStyle=gradient;
    }else ctx.fillStyle=color;
    // Continuous signed min/max envelope, sampled at physical-pixel resolution.
    // Preserve transients rather than applying cosmetic amplitude smoothing.
    const columns=Math.max(1,Math.ceil(w*scale)),upper=new Float32Array(columns),lower=new Float32Array(columns);
    for(let x=0;x<columns;x++){
      const a=Math.floor(x/columns*lane.length),b=Math.min(lane.length,Math.max(a+1,Math.ceil((x+1)/columns*lane.length)));
      let lo=0,hi=0;for(let i=a;i<b;i++){lo=Math.min(lo,lane.minimum?.[i]??-lane[i]);hi=Math.max(hi,lane.maximum?.[i]??lane[i]);}
      upper[x]=mid-Math.min(amplitude,hi*gain*amplitude);lower[x]=mid-Math.max(-amplitude,lo*gain*amplitude);
    }
    ctx.beginPath();ctx.moveTo(left,mid);
    for(let x=0;x<columns;x++)ctx.lineTo(left+(x+.5)*w/columns,upper[x]);
    for(let x=columns-1;x>=0;x--)ctx.lineTo(left+(x+.5)*w/columns,lower[x]);
    ctx.closePath();ctx.fill();

  }
  ctx.fillStyle='#a9b1bb';ctx.font=canvasType.tick;
  for(let i=0;i<=divisions;i++){ctx.textAlign=i===0?'left':i===divisions?'right':'center';ctx.fillText(`${(timeOffset+duration*i/divisions).toFixed(duration<10?3:2)} s`,left+w*i/divisions,height-7);}
  ctx.textAlign='left';
  if(hover!==null){ctx.save();ctx.setLineDash([3,4]);ctx.strokeStyle='#b4e4ff';ctx.beginPath();ctx.moveTo(left+w*hover,top);ctx.lineTo(left+w*hover,bottom);ctx.stroke();ctx.restore();}
  if(peaks.length&&position>=0&&position<=1){ctx.strokeStyle='#e6edf1';ctx.lineWidth=1.25;ctx.beginPath();ctx.moveTo(left+w*Math.max(0,Math.min(1,position)),top);ctx.lineTo(left+w*Math.max(0,Math.min(1,position)),bottom);ctx.stroke();}
  return {left,width:w,top,bottom};
}

// Source edit cursor stays independent; the solid playhead uses engine source time.
export function paintSourceCursors(ctx,geom,range,editFrame,playFrame){
  const span=Math.max(1,range.end-range.start);
  ctx.save();
  for(const [frame,dash,color,width] of [[editFrame,[],'#ffffff',1.5],[playFrame,[],'#ffffff',1.5]]){
    if(!Number.isFinite(frame)||frame<range.start||frame>range.end)continue;
    const x=geom.left+(frame-range.start)/span*geom.width;
    ctx.setLineDash(dash);ctx.strokeStyle=color;ctx.lineWidth=width;
    ctx.beginPath();ctx.moveTo(x,geom.top);ctx.lineTo(x,geom.bottom);ctx.stroke();
  }
  ctx.restore();
}
