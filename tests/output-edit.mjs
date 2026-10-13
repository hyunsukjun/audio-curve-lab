import assert from 'node:assert/strict';
import {initialEdit,lengthOf,deleteRange,setFade,materialize} from '../src/output-edit-core.js';
import {renderOffline} from '../src/offline-render.js';
const left=Float32Array.from({length:4800},(_,i)=>Math.sin(i*.07)*.2),right=Float32Array.from(left,x=>-x);
const initial=initialEdit(left,right),copy=left.slice();
async function read(state){const out=[new Float32Array(lengthOf(state)),new Float32Array(lengthOf(state))];await materialize(state,out);return out;}
assert.deepEqual((await read(initial))[0],left);
const cut=deleteRange(initial,1000,2000);assert.equal(lengthOf(cut),3560);
const [l,r]=await read(cut);assert.equal(l[759],left[759]);assert.equal(l[760],left[760]);assert.equal(l[999],left[2239]);assert.equal(l[1000],left[2240]);
for(let i=0;i<l.length;i++){assert(Math.abs(l[i]+r[i])<1e-7);assert(Math.abs(l[i])<=.200001);}
assert.equal(lengthOf(deleteRange(initial,0,1000)),3800);assert.equal(lengthOf(deleteRange(initial,4000,4800)),4000);
assert.equal(lengthOf(deleteRange(initial,0,4800)),0);assert.equal(deleteRange(initial,20,20),initial);
assert.equal(lengthOf(deleteRange(initial,1,4799)),1);
let fade=setFade(setFade(cut,'fadeIn',400),'fadeOut',600);const [fl]=await read(fade);assert.equal(fl[0],0);assert.equal(fl.at(-1),0);assert.equal(fl[500],l[500]);
assert.equal(setFade(fade,'fadeOut',999999).fadeOut,lengthOf(fade)-400);
const recut=deleteRange(fade,500,1500);assert(lengthOf(recut)>0);await read(recut);assert.deepEqual(left,copy);
assert.deepEqual((await read(initial))[0],copy,'Undo retains unmodified baseline');
const abort=new AbortController();abort.abort();await assert.rejects(materialize(initial,[new Float32Array(4800),new Float32Array(4800)],abort.signal),{name:'AbortError'});
const buffer={sampleRate:48000,duration:.1,numberOfChannels:2,getChannelData:c=>c?right:left};
const settings={globalDirection:1,outputGain:.8,grainSizeMs:80,density:4,randomness:0};
const curves={stretch:[{x:0,y:.75},{x:1,y:.75}],pitch:[{x:0,y:.5},{x:1,y:.5}],pan:[{x:0,y:.5},{x:1,y:.5}]};
const full=await renderOffline({audioBuffer:buffer,curves,settings});const only=await renderOffline({audioBuffer:buffer,curves,settings,pcmOnly:true});
assert.deepEqual(only.left,full.left);assert.deepEqual(only.right,full.right);assert.equal(only.sampleRate,48000);assert.equal(only.blob,undefined);
console.log('PASS: untouched baseline, interval deletion, short/full/edge deletion, stereo crossfade, fades, repeat edits, undo references, cancellation, PCM-only render parity');
// Source edit -> transform -> WAV: same path for 44.1/48/96 kHz decoded sources.
for(const rate of [44100,48000,96000]){
 const originalL=Float32Array.from({length:Math.round(rate*.12)},(_,i)=>.2*Math.sin(i*.03));
 const originalR=originalL.map(x=>x*.5), preserved=originalL.slice();
 let s=initialEdit(originalL,originalR,rate);s=deleteRange(s,Math.round(rate*.03),Math.round(rate*.05));s=setFade(s,'fadeIn',Math.round(rate*.01));
 const data=await read(s), edited={sampleRate:rate,numberOfChannels:2,duration:data[0].length/rate,getChannelData:c=>data[c]};
 const processed=await renderOffline({audioBuffer:edited,curves,settings});
 assert.equal(processed.sampleRate,48000);assert(Math.abs(processed.left.length/48000-edited.duration)<1/48000);
 assert(Math.abs(processed.left[0])<1/8388608, "resampled onset stays below one PCM24 step");assert.deepEqual(originalL,preserved);assert(processed.blob.size>44);
}
console.log('PASS edited native-rate source to transformed 48k WAV duration and original preservation');
