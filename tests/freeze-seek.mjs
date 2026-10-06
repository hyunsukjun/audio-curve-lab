import assert from 'node:assert/strict';
globalThis.sampleRate=48000;
globalThis.AudioWorkletProcessor=class{constructor(){this.port={postMessage(){}}}};
let Processor;globalThis.registerProcessor=(_,p)=>Processor=p;
await import('../src/transform-worklet.js');
const flat=y=>[{x:0,y},{x:1,y}],neutral=flat(.5);
const source=Float32Array.from({length:48000},(_,i)=>.3*Math.sin(i*.043)+.1*Math.sin(i*.113));
function make(curve,direction=1){const p=new Processor();send(p,{type:'buffer',left:source,right:source,sampleRate:48000});send(p,{type:'curves',stretchCurve:curve,pitchCurve:neutral,panCurve:neutral});send(p,{type:'settings',settings:{globalDirection:direction}});return p;}
function send(p,data){p.port.onmessage({data});}
function block(p){const out=[new Float32Array(1024),new Float32Array(1024)];p.process([],[out]);return out;}
const cases=[['all freeze',flat(.5),.5,1],['forward to freeze',[{x:0,y:.75},{x:.3,y:.5},{x:1,y:.5}],.6,1],['reverse to freeze',[{x:0,y:.25},{x:.3,y:.5},{x:1,y:.5}],.6,-1]];
for(const [name,curve,target,expected]of cases)for(const globalDirection of [1,-1]){
 const a=make(curve,globalDirection),b=make(curve,globalDirection);
 // Reach a reverse grain using public processor messages before returning to the target curve.
 send(b,{type:'curves',stretchCurve:flat(.25),pitchCurve:flat(.6),panCurve:neutral});send(b,{type:'play'});block(b);
 send(b,{type:'curves',stretchCurve:curve,pitchCurve:neutral,panCurve:neutral});
 for(const p of[a,b]){send(p,{type:'seek',progress:target});send(p,{type:'play'});}
 const x=block(a),y=block(b);
 assert.equal(a.lastReadDirection,expected*globalDirection,name+' fresh direction');
 assert.equal(b.lastReadDirection,expected*globalDirection,name+' stale direction');
 assert.deepEqual(x,y,name+' seek depends on previous playback');
 console.log('PASS',name,globalDirection);
}
