import assert from 'node:assert/strict';
import {renderOffline} from '../src/offline-render.js';
const flat=y=>[{x:0,y},{x:1,y}];
const curves={stretch:flat(.75),pitch:flat(.5),pan:flat(.5)};
for(const duration of [300,301,540]){
const audioBuffer={duration,sampleRate:48000,numberOfChannels:1,getChannelData:()=>new Float32Array(duration*48000)};
const args={audioBuffer,curves,settings:{globalDirection:1,outputGain:.95,chainOrder:[]}};
if(duration>300)await assert.rejects(renderOffline(args),e=>e.code==='EXPORT_DURATION_LIMIT');
else assert.equal((await renderOffline(args)).duration,300);
}
console.log('300-second boundary accepted; 301/540-second exports rejected without truncation');

const fastInput=new Float32Array(240*48000);
const fast=await renderOffline({audioBuffer:{duration:240,sampleRate:48000,numberOfChannels:1,getChannelData:()=>fastInput},curves:{...curves,stretch:flat(1)},settings:{globalDirection:1,outputGain:.95}});
assert.equal(fast.duration,120);console.log('240-second source accepted when Speed gives 120-second output');
