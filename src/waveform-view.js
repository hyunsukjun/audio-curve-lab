// Display-only summaries and scaling. Never write into the audio channels.
export function summarizeChannels(channels, buckets=4000) {
  return channels.map(channel=>{
    const count=Math.min(buckets,channel.length),peaks=new Float32Array(count);
    for(let i=0;i<count;i++){
      const start=Math.floor(i*channel.length/count),end=Math.floor((i+1)*channel.length/count);
      let peak=0;for(let j=start;j<end;j++)peak=Math.max(peak,Math.abs(channel[j]));peaks[i]=peak;
    }
    return peaks;
  });
}
export function peakOf(peaks){let peak=0;for(const lane of peaks)for(const p of lane)peak=Math.max(peak,p);return peak;}
export function visualGain(referencePeak){return 1/Math.max(.00001,referencePeak);}
export function paintWaveform(ctx,{width,height=128,left=54,right=8,peaks=[],duration=0,referencePeak=1,color='#8bc9ff',title='',hint='',position=0,hover=null,timeOffset=0}) {
  const scale=globalThis.devicePixelRatio||1,w=Math.max(1,width-left-right),top=24,bottom=height-19;
  ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle='#252c32';ctx.fillRect(0,0,width,height);
  const divisions=w<680?4:10;ctx.strokeStyle='rgba(139,149,162,.18)';ctx.lineWidth=1;
  for(let i=0;i<=divisions;i++){const x=left+w*i/divisions;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();}
  ctx.fillStyle='#a9b1bb';ctx.font='10px system-ui';ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText(title,10,12);
  if(w>550)ctx.fillText(hint,Math.max(left+150,ctx.measureText(title).width+24),12);
  const gain=visualGain(referencePeak),laneHeight=(bottom-top)/2,amplitude=laneHeight*.44;
  for(let channel=0;channel<2;channel++){
    const lane=peaks[channel]||peaks[0],mid=top+laneHeight*(channel+.5);
    ctx.fillStyle='#a9b1bb';ctx.fillText(channel?'R':'L',12,mid);
    ctx.strokeStyle='rgba(146,171,190,.25)';ctx.beginPath();ctx.moveTo(left,mid);ctx.lineTo(left+w,mid);ctx.stroke();
    if(!lane?.length)continue;ctx.fillStyle=color;
    for(let x=0;x<w;x++){
      // Take the max across all buckets covered by a screen column: retain narrow attacks.
      const a=Math.floor(x/w*lane.length),b=Math.min(lane.length,Math.max(a+1,Math.ceil((x+1)/w*lane.length)));
      let peak=0;for(let i=a;i<b;i++)peak=Math.max(peak,lane[i]);
      const h=Math.min(amplitude,peak*gain*amplitude);if(h>0)ctx.fillRect(left+x,mid-h,1,Math.max(.75,h*2));
    }
  }
  ctx.fillStyle='#a9b1bb';
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
