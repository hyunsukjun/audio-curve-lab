import assert from 'node:assert/strict';
import {paintSourceCursors} from '../src/waveform-view.js';
const lines=[];let dash;
const ctx={save(){},restore(){},setLineDash(x){dash=x},beginPath(){},moveTo(x){lines.push({x,dash})},lineTo(){},stroke(){}};
const geom={left:54,width:800,top:24,bottom:109},range={start:48000,end:96000};
for(const [frame,x] of [[60000,254],[84000,654],[60000,254],[60000,254]]){
 lines.length=0;paintSourceCursors(ctx,geom,range,72000,frame);
 assert.equal(lines[0].x,454);assert.deepEqual(lines[0].dash,[3,4]);
 assert.equal(lines[1].x,x);assert.deepEqual(lines[1].dash,[]);
}
lines.length=0;paintSourceCursors(ctx,geom,range,0,120000);assert.equal(lines.length,0,'offscreen cursor must not stick to an edge');
console.log('PASS zoomed source playhead forward/reverse/freeze coordinates and offscreen handling');
