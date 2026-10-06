import assert from 'node:assert/strict';
import {renderOffline} from '../src/offline-render.js';
const rate=48000;globalThis.sampleRate=rate;
globalThis.AudioWorkletProcessor=class{constructor(){this.port={postMessage:m=>this.messages.push(m)};this.messages=[];}};
let Processor;globalThis.registerProcessor=(_,p)=>Processor=p;await import('../src/transform-worklet.js');
const flat=y=>[{x:0,y},{x:1,y}],neutral=flat(.5);
const left=Float32Array.from({length:4800},(_,i)=>.25*Math.sin(i*.09)),right=Float32Array.from(left,v=>-v*.7);
const buffer={sampleRate:rate,duration:.1,numberOfChannels:2,getChannelData:c=>c?right:left};
const settings={grainSizeMs:140,density:5.5,randomness:.02,outputGain:.95,globalDirection:1};
const send=(p,data)=>p.port.onmessage({data});
function collect(p){const n=Math.ceil(p.outputDurationFrames()),out=[new Float32Array(n),new Float32Array(n)];for(let i=0;i<n+128;i+=128){const block=[new Float32Array(128),new Float32Array(128)];p.process([],[block]);if(i<n)for(let c=0;c<2;c++)out[c].set(block[c].subarray(0,Math.min(128,n-i)),i);}return out;}
for(const speed of[-2,-1,-.021,-.019,0,.019,.021,1,2])for(const pitch of[-2400,0,2400]){
 const curves={stretch:flat((speed+2)/4),pitch:flat((pitch+2400)/4800),pan:neutral};
 const p=new Processor();send(p,{type:'buffer',left,right,sampleRate:rate});send(p,{type:'curves',stretchCurve:curves.stretch,pitchCurve:curves.pitch,panCurve:neutral});send(p,{type:'settings',settings});send(p,{type:'play',token:1});const a=collect(p);assert.equal(p.settings.playing,false);assert.equal(p.messages.filter(m=>m.type==='ended').length,1);send(p,{type:'play',token:2});const b=collect(p);assert.deepEqual(a,b,'natural replay');
 send(p,{type:'stop',reset:true});send(p,{type:'play',token:3});assert.deepEqual(a,collect(p),'stop replay');
 const r=await renderOffline({audioBuffer:buffer,curves,settings});assert.equal(r.left.length,a[0].length);
 for(const channel of[...a,r.left,r.right])for(const x of channel)assert(Number.isFinite(x)&&Math.abs(x)<=1);
 console.log('PASS speed',speed,'pitch',pitch,'frames',r.left.length);
}
