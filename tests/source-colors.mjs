import assert from 'node:assert/strict';
import {centroid} from '../src/source-color-worker.js';
import {summarizeChannels} from '../src/waveform-view.js';
const rate=48000,n=1024;
for(const hz of [187.5,1500,6000]){const s=Float32Array.from({length:n},(_,i)=>.5*Math.sin(2*Math.PI*hz*i/rate));const copy=s.slice();assert.ok(Math.abs(centroid(s,0,n,rate)-hz)<30);assert.deepEqual(s,copy);}
assert.equal(centroid(new Float32Array(n),0,n,rate),0);
const samples=new Float32Array([0,.9,0,-.7,0,0]),before=samples.slice(),p=summarizeChannels([samples],2)[0];assert.ok(Math.abs(p.maximum[0]-.9)<1e-6);assert.ok(Math.abs(p.minimum[1]+.7)<1e-6);assert.deepEqual(samples,before);
const start=performance.now();const test=Float32Array.from({length:1024*1024},(_,i)=>Math.sin(i*.1));for(let c=0;c<2;c++)for(let i=0;i<1024;i++)centroid(test,i*1024,1024,rate);
console.log(JSON.stringify({result:'pass',maxWorkerWindows:2048,computeMs:performance.now()-start,transferredBytes:2*1024*1024*4}));
