import assert from 'node:assert/strict';
import {renderOffline} from '../src/offline-render.js';
import {MAX_OUTPUT_SECONDS} from '../src/output-policy.js';
import {writeFile} from 'node:fs/promises';
const flat=y=>[{x:0,y},{x:1,y}];
const settings={globalDirection:1,outputGain:.95,grainSizeMs:140,density:5.5,randomness:.02};
const results=[];
for(const [rate,seconds,speed] of [[44100,300,1],[48000,300,1],[96000,300,1],[48000,150,.5]]) {
 const source=Float32Array.from({length:rate*seconds},(_,i)=>.1*Math.sin(2*Math.PI*997*i/rate));
 const audioBuffer={duration:seconds,sampleRate:rate,numberOfChannels:2,getChannelData:()=>source};
 const curves={stretch:flat((speed+2)/4),pitch:flat(.5),pan:flat(.5)};
 const start=performance.now(); const r=await renderOffline({audioBuffer,curves,settings,includePCM:false});
 const header=new DataView(await r.blob.slice(0,44).arrayBuffer());
 assert.equal(r.duration,300);assert.equal(header.getUint32(24,true),48000);assert.equal(header.getUint16(34,true),24);assert.equal(header.getUint16(22,true),2);assert.equal(header.getUint32(40,true),300*48000*6);
 assert.equal(r.blob.size,86400044);
 if(rate===48000&&speed===1&&process.env.WAV_OUTPUT_PATH) await writeFile(process.env.WAV_OUTPUT_PATH,new Uint8Array(await r.blob.arrayBuffer()));
 results.push({rate,sourceSeconds:seconds,speed,outputSeconds:r.duration,bytes:r.blob.size,elapsedSeconds:(performance.now()-start)/1000,rssMiB:process.memoryUsage().rss/2**20});
 console.log(JSON.stringify(results.at(-1)));global.gc?.();
}
// Real worklet class duration and seek frame contract (without waiting 5 minutes).
globalThis.sampleRate=48000;globalThis.AudioWorkletProcessor=class{constructor(){this.port={postMessage(){}};}};
let Processor;globalThis.registerProcessor=(_,p)=>Processor=p;await import('../src/transform-worklet.js');
const p=new Processor();p.duration=600;p.stretchCurve=flat(.75);p.updateOutputDuration();assert.equal(p.outputDuration,MAX_OUTPUT_SECONDS);
console.log('PASS 5-minute WAV headers/lengths, slowed transform and worklet duration');
