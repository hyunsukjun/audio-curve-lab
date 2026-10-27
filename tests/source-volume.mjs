import assert from 'node:assert/strict';
import {initialEdit,lengthOf,materialize,setFade,deleteRange,fadeGain} from '../src/output-edit-core.js';
import {VOLUME_MAX_GAIN,VOLUME_MAX_POINTS,volumeGainAt,sourceVolumeReader,volumeNorm,gainFromVolumeNorm,putVolumePoint,eraseVolumePoint,resetSourceVolume} from '../src/source-volume.js';
import {renderOffline} from '../src/offline-render.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as core from '../src/output-edit-core.js';
import * as volume from '../src/source-volume.js';
import * as volumeView from '../src/source-volume-view.js';
import {canvasAxisWidth} from '../src/canvas-grid.js';
const read=async s=>{const out=[new Float32Array(lengthOf(s)),new Float32Array(lengthOf(s))];await materialize(s,out);return out;};
const curves={stretch:[{x:0,y:.75},{x:1,y:.75}],pitch:[{x:0,y:.5},{x:1,y:.5}],pan:[{x:0,y:.5},{x:1,y:.5}]};
const settings={globalDirection:1,outputGain:.95,grainSizeMs:140,density:5.5,randomness:.02};
// Independent dB-space oracle: displayed straight segments and applied gain agree.
for(const [dbA,dbB] of [[6,-6],[0,-24],[-48,6],[-12,-12]]){
  const points=[{frame:100,gain:10**(dbA/20)},{frame:900,gain:10**(dbB/20)}],reader=sourceVolumeReader(points);
  for(const t of [0,.125,.25,.5,.75,.875,1]){
    const frame=100+800*t,expected=10**((dbA+(dbB-dbA)*t)/20);
    assert(Math.abs(volumeGainAt(points,frame)-expected)<1e-12);
    assert(Math.abs(reader(frame)-expected)<1e-12);
  }
}
assert(Math.abs(volumeGainAt([{frame:0,gain:VOLUME_MAX_GAIN},{frame:100,gain:10**(-6/20)}],50)-1)<1e-12,'+6 to -6 has a 0dB midpoint');
for(const points of [[{frame:0,gain:0},{frame:100,gain:1}],[{frame:0,gain:1},{frame:100,gain:0}]]){
  assert.equal(volumeGainAt(points,0),points[0].gain);assert.equal(volumeGainAt(points,100),points[1].gain);
  assert(Math.abs(volumeGainAt(points,50)-10**(-30/20))<1e-12,'mute uses the existing -60dB display anchor between points');
  assert(volumeGainAt(points,points[0].gain===0?.0001:99.9999)<.001001,'mute-edge finite-floor step stays at -60dB or below');
}
let linePath=[],currentPath=[];
const drawContext={save(){},restore(){},beginPath(){currentPath=[];},rect(){},clip(){},fillRect(){},moveTo(x,y){currentPath.push([x,y]);},lineTo(x,y){currentPath.push([x,y]);},stroke(){if(this.strokeStyle==='#8fc5f5')linePath=currentPath.slice();},arc(){},fill(){},fillText(){},measureText:()=>({width:100})};
volumeView.paintSourceVolume(drawContext,{volume:[{frame:0,gain:VOLUME_MAX_GAIN},{frame:400,gain:.1},{frame:800,gain:1}],rate:48000},801,{start:100,end:700},{left:64,width:600,top:24,bottom:237},{visible:true,editing:false,selected:-1});
assert.equal(linePath.length,3,'zoomed graph connects view edges and visible control point directly');
assert.deepEqual(linePath.map(p=>p[0]),[64,364,664]);
for(const [i,db] of [[0,-.5],[1,-20],[2,-5]])assert(Math.abs(linePath[i][1]-(237-(db+60)/66*213))<1e-10);
console.log('PASS straight dB segments, geometric midpoint, finite-floor mute anchors and zoomed direct Canvas vertices');
for(const rate of [44100,48000,96000]){
  const n=Math.round(rate*.12),left=Float32Array.from({length:n},(_,i)=>.1*Math.cos(i*.03)),right=left.map(x=>-x*.5),original=left.slice();
  const base=initialEdit(left,right,rate);assert.deepEqual((await read(base))[0],original);
  let s=putVolumePoint(base,n,0,VOLUME_MAX_GAIN);s=putVolumePoint(s,n,n-1,0);s=putVolumePoint(s,n,Math.floor(n/2),.5);
  const samples=await read(s),gain=sourceVolumeReader(s.volume);
  for(let i=0;i<n;i++){
    assert(Math.abs(gain(i)-volumeGainAt(s.volume,i))<1e-12);
    assert.equal(samples[0][i],Math.fround(original[i]*volumeGainAt(s.volume,i)));
    assert(Math.abs(samples[0][i]+samples[1][i]*2)<1e-7);
  }
  assert(samples[0].at(-1)===0);assert.deepEqual(left,original);
  const faded=setFade(setFade(s,'fadeIn',100),'fadeOut',200),f=await read(faded);
  for(let i=0;i<n;i++)assert.equal(f[0][i],Math.fround(original[i]*(fadeGain(i,n,100,200)*volumeGainAt(s.volume,i))));
  assert.deepEqual((await read(resetSourceVolume(s)))[0],original,'reset and Undo basis do not multiply gain twice');
  const cut=deleteRange(s,Math.round(n*.3),Math.round(n*.6)),out=await read(cut),j=Math.min(Math.round(rate*.005),Math.round(n*.3),n-Math.round(n*.6)),removed=Math.round(n*.6)-Math.round(n*.3)+j;
  for(let i=Math.round(n*.3)+2;i<lengthOf(cut);i++)assert(Math.abs(volumeGainAt(cut.volume,i)-volumeGainAt(s.volume,i+removed))<1e-10,'retained right automation follows deleted source time');
  assert.equal(cut.volume[0].frame,0);assert.equal(cut.volume.at(-1).frame,lengthOf(cut)-1);
  for(const [a,b] of [[0,Math.round(n*.2)],[Math.round(n*.7),n],[0,n],[1,n-1]]){
    const d=deleteRange(s,a,b);const pcm=await read(d);assert(pcm.every(c=>c.every(Number.isFinite)));if(lengthOf(d))assert(d.volume.every(p=>p.frame>=0&&p.frame<lengthOf(d)));
  }
  const audio={sampleRate:rate,numberOfChannels:2,duration:n/rate,getChannelData:c=>samples[c]};
  const rendered=await renderOffline({audioBuffer:audio,curves,settings});
  const pcm=await renderOffline({audioBuffer:audio,curves,settings,pcmOnly:true});
  assert.deepEqual(rendered.left,pcm.left);assert.deepEqual(rendered.right,pcm.right);assert.equal(rendered.sampleRate,48000);
  const bytes=new DataView(await rendered.blob.arrayBuffer());assert.equal(bytes.getUint32(24,true),48000);assert.equal(bytes.getUint16(22,true),2);assert.equal(bytes.getUint16(34,true),24);
  assert.deepEqual(left,original);
}
for(const gain of [0,.002,.1,1,VOLUME_MAX_GAIN])assert(Math.abs(gainFromVolumeNorm(volumeNorm(gain))-gain)<1e-10);
assert.equal(gainFromVolumeNorm(0),0,'bottom is mute, not a -60dB residual');
let bounded=initialEdit(new Float32Array(600),new Float32Array(600));
for(let i=1;i<600;i++)bounded=putVolumePoint(bounded,600,i,999);
assert.equal(bounded.volume.length,VOLUME_MAX_POINTS);assert(bounded.volume.every(p=>p.gain<=VOLUME_MAX_GAIN));
assert.equal(eraseVolumePoint(bounded,0),bounded);assert.equal(eraseVolumePoint(bounded,bounded.volume.length-1),bounded);
assert.equal(putVolumePoint(bounded,600,NaN,1),bounded);
console.log('PASS source gain at native rates, unity identity, +6/mute, linked stereo, multiplicative fades, retained-time delete rebasing, reset, bounds and WAV PCM parity');

globalThis.sampleRate=48000;
globalThis.AudioWorkletProcessor=class{constructor(){this.port={postMessage(){}};}};
let Processor;globalThis.registerProcessor=(_,p)=>Processor=p;await import('../src/transform-worklet.js');
const signal=Float32Array.from({length:4800},(_,i)=>.3*Math.sin(i*.09));
let wet=initialEdit(signal,signal.map(x=>-x*.7));wet=putVolumePoint(wet,4800,0,VOLUME_MAX_GAIN);wet=putVolumePoint(wet,4800,2400,.25);wet=putVolumePoint(wet,4800,4799,0);wet=setFade(wet,'fadeIn',240);
const working=await read(wet),preview=new Processor(),send=data=>preview.port.onmessage({data});
send({type:'buffer',left:working[0],right:working[1],sampleRate:48000});send({type:'curves',stretchCurve:curves.stretch,pitchCurve:curves.pitch,panCurve:curves.pan});send({type:'settings',settings});send({type:'play',token:1});
const observed=[new Float32Array(4800),new Float32Array(4800)];
for(let base=0;base<4800+128;base+=128){const block=[new Float32Array(128),new Float32Array(128)];preview.process([],[block]);if(base<4800)for(let c=0;c<2;c++)observed[c].set(block[c].subarray(0,Math.min(128,4800-base)),base);}
const exported=await renderOffline({audioBuffer:{sampleRate:48000,numberOfChannels:2,duration:.1,getChannelData:c=>working[c]},curves,settings});
for(let i=0;i<4800;i++){assert(Math.abs(observed[0][i]-exported.left[i])<1e-6);assert(Math.abs(observed[1][i]-exported.right[i])<1e-6);}
console.log('PASS new source-volume working PCM through actual realtime worklet and WAV renderer (neutral transform, <1e-6 sample error)');

// Exercise actual source-editor handlers, including one-gesture/one-Undo and failure.
const elements=new Map(),keys={};
function el(id){if(!elements.has(id))elements.set(id,{id,attrs:{},listeners:{},setAttribute(k,v){this.attrs[k]=v;},getBoundingClientRect:()=>({left:0,top:0,width:872,height:256}),addEventListener(k,f){this.listeners[k]=f},focus(){},setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){},contains:()=>true,matches:()=>false});return elements.get(id);}
const sandbox={...core,...volume,...volumeView,canvasAxisWidth,document:{getElementById:el},window:{addEventListener:(k,f)=>keys[k]=f}};
vm.createContext(sandbox);vm.runInContext(readFileSync(new URL('../src/source-editor.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function'),sandbox);
let current,fail=false,stops=0,seeks=0;
const make=(c,n,rate)=>{if(fail)throw Error('allocation');const data=Array.from({length:c},()=>new Float32Array(n));return{length:n,sampleRate:rate,numberOfChannels:c,getChannelData:c=>data[c]};};
const editor=sandbox.createSourceEditor({createBuffer:make,apply:b=>current=b,stop(){stops++;},busyChanged(){},repaint(){},primePlayback(){},play(){},seek(){seeks++;return true;}});
const original=make(2,4800,48000);original.getChannelData(0).fill(.1);original.getChannelData(1).fill(.05);editor.load(original);
const target=el('sourceWaveCanvas');
const event=(frame,gain,mods={})=>({button:0,clientX:64+frame/4800*800,clientY:237-volumeNorm(gain)*213,pointerId:1,currentTarget:target,preventDefault(){},...mods});
const pointer=(type,frame,gain,mods={})=>target.listeners[type]({...event(frame,gain,mods),type});
const key=(key,extra={})=>keys.keydown({target,key,code:key,preventDefault(){},stopImmediatePropagation(){},...extra});
key('Meta',{metaKey:true});assert(editor.volumeView.editing);assert.equal(stops,0,'showing volume has no playback effect');
pointer('pointerdown',2400,.5,{metaKey:true});assert.equal(editor.state.volume.length,3);assert.equal(current,undefined,'drag never publishes partial PCM');
pointer('pointermove',2880,.25,{metaKey:true});await pointer('pointerup',2880,.25,{metaKey:true});
assert.equal(editor.state.volume.length,3);assert.equal(editor.state.volume[1].frame,2880);assert.equal(editor.cursor,0);assert.equal(seeks,0);
assert.equal(current.length,4800);assert(Math.abs(current.getChannelData(0)[2880]-.025)<1e-7);
keys.keyup({key:'Meta'});assert(!editor.volumeView.editing);assert(editor.volumeView.visible);
await el('editUndo').onclick();assert.equal(editor.state.volume.length,0);await el('editRedo').onclick();assert.equal(editor.state.volume[1].frame,2880);
pointer('pointerdown',2880,.25,{metaKey:true});pointer('pointermove',3600,.1,{metaKey:true});key('Escape');assert.equal(editor.state.volume[1].frame,2880);
pointer('pointerdown',2880,.25,{metaKey:true});pointer('pointermove',3600,.1,{metaKey:true});keys.blur();assert.equal(editor.state.volume[1].frame,2880);assert(!editor.volumeView.editing);
pointer('pointerdown',2880,.25,{metaKey:true});pointer('pointermove',3600,.1,{metaKey:true});await pointer('pointercancel',3600,.1);assert.equal(editor.state.volume[1].frame,2880);
const retained=current;fail=true;await el('editVolumeReset').onclick();assert.equal(current,retained);assert.equal(editor.state.volume[1].frame,2880);fail=false;
await pointer('pointerdown',2880,.25,{metaKey:true,altKey:true});assert.equal(editor.state.volume.length,2);assert.equal(seeks,0);
await el('editUndo').onclick();assert.equal(editor.state.volume.length,3);
await el('editVolumeReset').onclick();assert.equal(editor.state.volume.length,0);assert.equal(current.getChannelData(0)[2880],Math.fround(.1));
keys.keyup({key:'Meta'});el('editVolume').onclick();assert(editor.volumeView.editing);key('Enter');await new Promise(r=>setTimeout(r,30));key('ArrowDown');await new Promise(r=>setTimeout(r,30));assert(editor.state.volume[0].gain<1);
editor.load(original);assert.equal(editor.state.volume.length,0);assert(!editor.volumeView.editing);assert(el('editUndo').disabled);
console.log('PASS actual Command/pencil handlers, atomic commit, no audition seek, Undo/Redo, erase/reset, Escape/blur/cancel restoration, allocation rollback, keyboard/toggle and file-replacement reset');
