import { exportWav } from '../src/wav-export.js?v=20261006-stream-01';
import { prepareWavChannels } from './fixtures/pre-stream-wav-output.js';
import { encodeWav } from './fixtures/legacy-wav-encoder.js';
import { renderOffline } from '../src/offline-render.js?v=20261006-stream-01';
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const bytes=async b=>new Uint8Array(await b.arrayBuffer());
const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
export async function runStreamingTests(){
 const results=[];
 for(const rate of [44100,48000,88200,96000,32000]){
  for(const frames of [1,8191,8192,8193,17003]){
   const l=new Float32Array(frames),r=new Float32Array(frames);
   for(let i=0;i<frames;i++){l[i]=1.1*Math.sin(i*.171);r[i]=.9*Math.cos(i*.37);}
   const old=await prepareWavChannels(l,r,rate);
   const expected=await bytes(encodeWav(old.left,old.right,48000));
   const actual=await exportWav(l,r,rate);
   assert(same(await bytes(actual.blob),expected),`byte mismatch ${rate}/${frames}`);
   assert(!('left' in actual)&&actual.frameCount===old.left.length,'metadata');
   results.push(`parity ${rate}/${frames}`);
  }
 }
 for(const rate of [48000,96000]){
  for(const frames of [1,180000]){
   const a=new Float32Array(frames),c=new AbortController();
   setTimeout(()=>c.abort(),0);
   try{await exportWav(a,a,rate,c.signal);throw Error('abort missed');}catch(e){assert(e.name==='AbortError','cancel');}
   assert((await exportWav(a.subarray(0,1),a.subarray(0,1),rate)).blob.size===50,'recover');
   results.push(`cancel/recover ${rate}/${frames}`);
  }
 }
 const flat=y=>[{x:0,y},{x:1,y}];
 for(const rate of [44100,48000,96000]){
  const data=new Float32Array(rate);data[300]=.4;
  const audioBuffer={duration:1,sampleRate:rate,numberOfChannels:1,getChannelData:()=>data};
  const curves={stretch:flat(.75),pitch:flat(.5),pan:flat(.5),delayTime:flat(0),delayFeedback:flat(0),delayMix:flat(.5)};
  const settings={globalDirection:1,outputGain:.95,chainOrder:['delay'],delayEnabled:true};
  const full=await renderOffline({audioBuffer,curves,settings});
  const stream=await renderOffline({audioBuffer,curves,settings,includePCM:false});
  assert(same(await bytes(full.blob),await bytes(stream.blob)),'renderer parity');
  assert(full.duration===stream.duration&&!('left' in stream),`renderer metadata/tail: full=${full.duration} stream=${stream.duration} hasPCM=${'left' in stream}`);
  results.push(`render parity/tail ${rate} duration=${stream.duration}`);
 }
 return results;
}
