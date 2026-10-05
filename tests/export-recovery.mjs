import assert from 'node:assert/strict';
import {renderOffline} from '../src/offline-render.js';
const flat=y=>[{x:0,y},{x:1,y}];
const curves={stretch:flat(.75),pitch:flat(.5),pan:flat(.5)};
const settings={globalDirection:1,outputGain:.95,chainOrder:[]};
let reads=0;const inaccessible={duration:540,sampleRate:96000,numberOfChannels:2,getChannelData(){reads++;throw Error('PCM should not be read');}};
await assert.rejects(renderOffline({audioBuffer:inaccessible,curves,settings}),e=>e.code==='EXPORT_DURATION_LIMIT');assert.equal(reads,0);
const aborted=new AbortController();aborted.abort();await assert.rejects(renderOffline({audioBuffer:inaccessible,curves,settings,signal:aborted.signal}),{name:'AbortError'});assert.equal(reads,0);
const source=new Float32Array(48000*2);source[24000]=.3;const buffer={duration:2,sampleRate:48000,numberOfChannels:1,getChannelData:()=>source};
const args={audioBuffer:buffer,curves,settings};const baseline=new Uint8Array(await (await renderOffline(args)).blob.arrayBuffer());
for(let i=0;i<5;i++){
const controller=new AbortController();await assert.rejects(renderOffline({...args,signal:controller.signal,onProgress:p=>{if(p>0&&p<1)controller.abort();}}),{name:'AbortError'});
const recovered=new Uint8Array(await (await renderOffline(args)).blob.arrayBuffer());assert.deepEqual(recovered,baseline);
}
console.log('Limit and pre-abort avoid PCM reads; 5 cancel/re-render cycles reproduce clean WAV');
