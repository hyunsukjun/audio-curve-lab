import assert from 'node:assert/strict';
import {aiffToWav, inspectAiff, readAudioFile} from '../src/audio-import.js';
function fixture(rate,bits,channels) {
 const width=bits/8, frames=8, dataBytes=frames*channels*width;
 const b=new ArrayBuffer(54+dataBytes),v=new DataView(b),u=new Uint8Array(b);
 const tag=(at,s)=>{for(let i=0;i<4;i++)u[at+i]=s.charCodeAt(i);};
 tag(0,'FORM');v.setUint32(4,b.byteLength-8);tag(8,'AIFF');tag(12,'COMM');v.setUint32(16,18);
 v.setUint16(20,channels);v.setUint32(22,frames);v.setUint16(26,bits);
 const e=Math.floor(Math.log2(rate));v.setUint16(28,e+16383);v.setBigUint64(30,BigInt(rate)<<BigInt(63-e));
 tag(38,'SSND');v.setUint32(42,dataBytes+8);
 const limit=2**(bits-1),values=[-limit,-1,0,1,limit-1,limit/2,-limit/2,17];
 const expected=[];
 for(let i=0;i<frames*channels;i++){
  const value=values[(i+(i%channels))%values.length];expected.push(value);
  for(let k=0;k<width;k++)u[54+i*width+k]=(value>>((width-1-k)*8))&255;
 }
 return {b,expected,frames};
}
let passed=0;
for(const rate of [44100,48000,88200,96000])for(const bits of [16,24])for(const channels of [1,2]){
 const {b,expected,frames}=fixture(rate,bits,channels),original=b.slice(0);
 const w=await aiffToWav(b),v=new DataView(w);assert.equal(v.getUint32(24,true),rate);
 assert.equal(v.getUint16(22,true),channels);assert.equal(v.getUint16(34,true),bits);
 assert.equal(v.getUint32(40,true),frames*channels*bits/8);
 for(let i=0;i<expected.length;i++){
  const p=44+i*bits/8;const n=bits===16?v.getInt16(p,true):(v.getUint8(p)|v.getUint8(p+1)<<8|v.getInt8(p+2)<<16);
  assert.equal(n,expected[i]);
 }
 assert.deepEqual(b,original);assert.equal(await aiffToWav(w),w);
 assert.deepEqual(await readAudioFile(new Blob([b])),w);passed++;
}
const base=fixture(48000,24,2).b;
for(const change of [v=>v.setUint32(4,0xffffffff),v=>v.setUint16(20,8),v=>v.setUint32(22,0xffffffff),v=>v.setUint32(22,0),v=>v.setUint16(26,32),v=>v.setUint16(28,0x7fff),v=>v.setUint32(30,0),v=>v.setUint32(46,0xffffffff)]){
 const b=base.slice(0);change(new DataView(b));assert.throws(()=>inspectAiff(b),/AIFF:/);passed++;
}
assert.throws(()=>inspectAiff(base.slice(0,20)),/AIFF:/);passed++;
const aifc=base.slice(0);new Uint8Array(aifc).set([65,73,70,67],8);assert.throws(()=>inspectAiff(aifc),/AIFF-C/);passed++;
assert.throws(()=>inspectAiff(base,1e12),/working limit/);passed++;
let read=false;await assert.rejects(readAudioFile({size:129*1024*1024,slice:()=>new Blob([base.slice(0,12)]),arrayBuffer:()=>{read=true;return base;}}),/128 MiB/);assert.equal(read,false);passed++;
console.log(`AIFF import: ${passed} checks passed (16 PCM format combinations, malformed/oversized admission checks).`);
