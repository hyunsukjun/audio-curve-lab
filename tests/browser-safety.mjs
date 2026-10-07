import assert from 'node:assert/strict';
import { screenY, curveY, checkFileSize, checkPCM, preflightWav, MAX_FILE_BYTES, MAX_PCM_BYTES } from '../src/browser-safety.js';
import { panFromNorm } from '../src/transform-core.js';
for (const name of ['pan','pitch','stretch']) for (const y of [0,.25,.5,.75,1]) assert.equal(curveY(name,screenY(name,y)),y);
assert.equal(panFromNorm(curveY('pan',0)),-1);
assert.equal(panFromNorm(curveY('pan',1)),1);
checkFileSize(MAX_FILE_BYTES); assert.throws(()=>checkFileSize(MAX_FILE_BYTES+1));
checkPCM(MAX_PCM_BYTES/8,2); assert.throws(()=>checkPCM(MAX_PCM_BYTES/8+1,2));
function wav(seconds, channels=2) {
 const h=Buffer.alloc(44); h.write('RIFF'); h.writeUInt32LE(36+seconds*48000*channels*2,4); h.write('WAVEfmt ',8); h.writeUInt32LE(16,16); h.writeUInt16LE(1,20); h.writeUInt16LE(channels,22); h.writeUInt32LE(48000,24); h.writeUInt32LE(48000*channels*2,28); h.writeUInt16LE(channels*2,32); h.writeUInt16LE(16,34); h.write('data',36); h.writeUInt32LE(seconds*48000*channels*2,40);
 const reads=[];
 return {size:44+seconds*48000*channels*2, reads, slice(a,b){ reads.push([a,b]); assert.ok(b<=44,'must not read PCM'); return new Blob([h.subarray(a,b)]); }};
}
const accepted=wav(180); await preflightWav(accepted,96000);
const rejected=wav(600); await assert.rejects(preflightWav(rejected,96000),/192 MiB/);
await preflightWav(new Blob(['not wav']),48000);
const broken=wav(1); broken.size=44; await assert.rejects(preflightWav(broken,48000),/Incomplete/);
console.log('PASS: Pan display/input round trip, L/R, byte/PCM boundaries, header-only WAV guard, invalid and unknown files');
