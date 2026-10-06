import assert from 'node:assert/strict';
import {renderOffline} from '../src/offline-render.js';
globalThis.sampleRate=48000;
globalThis.AudioWorkletProcessor=class{constructor(){this.messages=[];this.port={postMessage:m=>this.messages.push(m)}}};
let Processor;globalThis.registerProcessor=(_,p)=>Processor=p;await import('../src/transform-worklet.js');
const flat=y=>[{x:0,y},{x:1,y}],neutral=flat(.5);
const left=Float32Array.from({length:24000},(_,i)=>.25*Math.sin(i*.057)+.08*Math.sin(i*.139));
const right=Float32Array.from({length:24000},(_,i)=>.2*Math.sin(i*.083));
const cases=[
 ['sign crossing',[{x:0,y:1},{x:.49,y:1},{x:.51,y:0},{x:1,y:0}]],
 ['reverse freeze forward',[{x:0,y:.25},{x:.3,y:.5},{x:.6,y:.5},{x:1,y:.75}]],
 ['narrow freeze',[{x:0,y:.75},{x:.499,y:.5},{x:.501,y:.5},{x:1,y:.25}]],
 ['multiple reversals',[{x:0,y:.75},{x:.2,y:.25},{x:.4,y:.75},{x:.6,y:.25},{x:.8,y:.75},{x:1,y:.25}]]
];
const send=(p,data)=>p.port.onmessage({data});
function make(curve,direction,pitch){const p=new Processor();send(p,{type:'buffer',left,right,sampleRate:48000});send(p,{type:'curves',stretchCurve:curve,pitchCurve:flat((pitch+2400)/4800),panCurve:neutral});send(p,{type:'settings',settings:{globalDirection:direction}});return p;}
function collect(p,n){const result=[new Float32Array(n),new Float32Array(n)];for(let offset=0;offset<n;offset+=128){const block=[new Float32Array(128),new Float32Array(128)];p.process([],[block]);for(let c=0;c<2;c++)result[c].set(block[c].subarray(0,Math.min(128,n-offset)),offset);}return result;}
let seekCases=0;
for(const[name,curve]of cases)for(const direction of[1,-1])for(const pitch of[-2400,0,2400]){
 const p=make(curve,direction,pitch);send(p,{type:'play',token:1});const n=Math.ceil(p.outputDurationFrames());const a=collect(p,n+128);assert.equal(p.settings.playing,false);assert.equal(p.messages.filter(m=>m.type==='ended').length,1);
 send(p,{type:'play',token:2});assert.deepEqual(collect(p,n+128),a,'natural replay '+name);
 const r=await renderOffline({audioBuffer:{sampleRate:48000,duration:.5,numberOfChannels:2,getChannelData:c=>c?right:left},curves:{stretch:curve,pitch:flat((pitch+2400)/4800),pan:neutral},settings:{grainSizeMs:140,density:5.5,randomness:.02,outputGain:.95,globalDirection:direction}});
 assert.equal(r.left.length,n);for(const ch of [...a,r.left,r.right])for(const x of ch)assert(Number.isFinite(x)&&Math.abs(x)<=1);
 for(const target of[0,.499,.5,.501,.75]){
  const fresh=make(curve,direction,pitch),dirty=make(curve,direction,pitch);
  send(dirty,{type:'play'});collect(dirty,Math.min(n,12000));
  // Active seek and stopped seek + Play must initialize the same target state.
  send(dirty,{type:'seek',progress:target});send(fresh,{type:'seek',progress:target});send(fresh,{type:'play'});
  assert.deepEqual(collect(dirty,2048),collect(fresh,2048),`${name} active/paused seek ${target}`);seekCases++;
 }
 console.log('PASS',name,direction,pitch,'frames',n);
}
console.log('PASS active/paused seek comparisons',seekCases);
