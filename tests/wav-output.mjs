import assert from 'node:assert/strict';
import { prepareWavChannels } from '../src/wav-output.js';
const left=new Float32Array([0,.2,-.2]),right=new Float32Array([0,-.1,.1]);
const result=await prepareWavChannels(left,right,48000);
assert.equal(result.left,left);assert.equal(result.right,right);assert.equal(result.sampleRate,48000);
await assert.rejects(prepareWavChannels(left,new Float32Array(1),48000),/Invalid stereo/);
await assert.rejects(prepareWavChannels(left,right,NaN),/Invalid stereo/);
const aborted=new AbortController();aborted.abort();
await assert.rejects(prepareWavChannels(left,right,48000,aborted.signal),{name:'AbortError'});
for (const rate of [44100, 48000, 88200, 96000]) {
  const data=new Float32Array(1001).fill(.25), r=await prepareWavChannels(data,data,rate);
  assert.equal(r.left.length,Math.round(1001*48000/rate));
  assert.ok(r.left.every(v=>Math.abs(v-.25)<1e-6),'constant gain');
}
for (const hz of [1000, 10000, 30000]) {
  const data=Float32Array.from({length:96000},(_,i)=>.2*Math.sin(2*Math.PI*hz*i/96000));
  const r=await prepareWavChannels(data,Float32Array.from(data,v=>-.5*v),96000);
  let power=0,error=0;
  for(let i=4800;i<43200;i++){power+=r.left[i]**2;error=Math.max(error,Math.abs(r.right[i]+r.left[i]*.5));}
  const gainDb=20*Math.log10(Math.sqrt(power/38400)/(.2/Math.sqrt(2)));
  assert.ok(hz<24000?Math.abs(gainDb)<.1:gainDb < -50,`frequency ${hz}: ${gainDb} dB`);
  assert.ok(error<1e-6);console.log({hz,gainDb,stereoError:error});
}
const during=new AbortController();
const converting=prepareWavChannels(new Float32Array(96000),new Float32Array(96000),96000,during.signal);
during.abort();await assert.rejects(converting,{name:'AbortError'});
console.log('WAV output: 48k identity, input validation, cancellation and resampling checks passed');
