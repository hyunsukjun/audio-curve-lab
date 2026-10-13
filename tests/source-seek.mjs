import assert from 'node:assert/strict';
import {findSourceSeek} from '../src/source-seek.js';
import {sourcePositionAtProgress,estimateOutputDuration} from '../src/transform-core.js';
const flat=y=>[{x:0,y},{x:1,y}];
function seek(curve,target,current=0,direction=1,cap=300){return findSourceSeek({sourceDuration:8,curve,direction,outputDuration:Math.min(cap,estimateOutputDuration(8,curve)),target,current});}
assert(Math.abs(seek(flat(.75),3)-.375)<1e-5);
assert(Math.abs(seek(flat(.25),3)-.625)<1e-5);
assert(Math.abs(seek(flat(1),3)-.375)<1e-5);
assert(Math.abs(seek(flat(.75),3,0,-1)-.625)<1e-5);
assert.equal(seek(flat(.5),3),null);assert.equal(seek(flat(.5),0,.4),.4);
assert.equal(seek(flat(.75),6,0,1,4),null);
const curve=[{x:0,y:.75},{x:.49,y:.75},{x:.5,y:.25},{x:1,y:.25}];
const a=seek(curve,2,.1),b=seek(curve,2,.9);assert(a<b);
for(const p of [a,b])assert(Math.abs(sourcePositionAtProgress(8,curve,1,p)-2)<.0005);
console.log('PASS source-to-output seeking: forward, reverse, speed, repeated visits, freeze, unreachable capped source');
