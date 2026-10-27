import {canvasType} from './canvas-typography.js?v=20261015-1';
import {volumeGainAt, volumeNorm, volumePoints, volumeLabel, gainFromVolumeNorm} from './source-volume.js?v=20261028-volume-line1';
export function volumeGeometry(rect) {
  return {left:64,width:Math.max(1,rect.width-72),top:24,bottom:Math.max(25,rect.height-19)};
}
export function volumePointer(event, rect, range) {
  const g=volumeGeometry(rect);
  return {frame:Math.round(range.start+Math.max(0,Math.min(1,(event.clientX-rect.left-g.left)/g.width))*(range.end-range.start)),
    gain:gainFromVolumeNorm(1-(event.clientY-rect.top-g.top)/(g.bottom-g.top))};
}
export function volumeHit(state, length, range, rect, event) {
  const g=volumeGeometry(rect),span=Math.max(1,range.end-range.start),points=volumePoints(state,length);
  let result=null,distance=12;
  points.forEach((p,i)=>{
    if(p.frame<range.start||p.frame>range.end)return;
    const d=Math.hypot(event.clientX-rect.left-g.left-(p.frame-range.start)/span*g.width,
      event.clientY-rect.top-g.bottom+volumeNorm(p.gain)*(g.bottom-g.top));
    if(d<distance){distance=d;result=i;}
  });
  return result;
}
export function paintSourceVolume(ctx, state, length, range, geom, view) {
  if(!view.visible||!length)return;
  const span=Math.max(1,range.end-range.start),h=geom.bottom-geom.top;
  const x=frame=>geom.left+(frame-range.start)/span*geom.width,y=gain=>geom.bottom-volumeNorm(gain)*h;
  ctx.save();ctx.beginPath();ctx.rect(geom.left,geom.top,geom.width,h);ctx.clip();
  if(view.editing){
    ctx.fillStyle='rgba(25,28,32,.65)';ctx.fillRect(geom.left,geom.top,geom.width,h);
    for(const db of [6,0,-12,-24,-48]){
      ctx.strokeStyle=db===0?'rgba(195,211,227,.38)':'rgba(159,174,191,.16)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(geom.left,y(10**(db/20)));ctx.lineTo(geom.left+geom.width,y(10**(db/20)));ctx.stroke();
    }
  }
  ctx.strokeStyle='#8fc5f5';ctx.lineWidth=view.editing?1.7:1.1;ctx.beginPath();
  const points=volumePoints(state,length);
  const anchors=[{frame:range.start,gain:volumeGainAt(state.volume,range.start)},
    ...points.filter(p=>p.frame>range.start&&p.frame<range.end),
    {frame:range.end,gain:volumeGainAt(state.volume,range.end)}];
  anchors.forEach((p,i)=>{if(i===0)ctx.moveTo(x(p.frame),y(p.gain));else ctx.lineTo(x(p.frame),y(p.gain));});
  ctx.stroke();
  if(view.editing)points.forEach((p,i)=>{
    if(p.frame<range.start||p.frame>range.end)return;
    ctx.beginPath();ctx.arc(x(p.frame),y(p.gain),i===view.selected?4.5:3.2,0,Math.PI*2);
    ctx.fillStyle=i===view.selected?'#edf4fb':'#8fc5f5';ctx.fill();
  });
  ctx.restore();
  if(!view.editing)return;
  ctx.save();ctx.font=canvasType.tick;ctx.textAlign='right';ctx.textBaseline='middle';
  ctx.fillStyle='#191c20';ctx.fillRect(0,geom.top,geom.left-2,h);ctx.fillStyle='#bec8d2';
  for(const db of [6,0,-12,-24,-48])ctx.fillText(`${db>0?'+':''}${db} dB`,geom.left-7,Math.max(geom.top+7,y(10**(db/20)))) ;
  ctx.fillText('−∞',geom.left-7,geom.bottom-6);
  const p=volumePoints(state,length)[view.selected];
  if(p){
    const label=`Volume · ${volumeLabel(p.gain)} · ${(p.frame/state.rate).toFixed(3)} s`;
    ctx.font=canvasType.hint;const tw=ctx.measureText(label).width;
    ctx.fillStyle='#242a31';ctx.fillRect(geom.left+8,geom.top+7,tw+14,22);
    ctx.fillStyle='#e1e8ef';ctx.textAlign='left';ctx.fillText(label,geom.left+15,geom.top+18);
  }
  ctx.restore();
}
