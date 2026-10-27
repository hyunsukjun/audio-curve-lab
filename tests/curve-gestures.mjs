import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {screenY,curveY} from '../src/browser-safety.js';

const code=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const pick=(source,name)=>{const at=source.indexOf(`function ${name}(`);assert(at>=0,name);return source.slice(at,source.indexOf('\n}',at)+2);};
const clone=value=>JSON.parse(JSON.stringify(value));
const ui=()=>{const classes=new Set();return {style:{},classList:{toggle(n,on){on?classes.add(n):classes.delete(n);},contains:n=>classes.has(n)},setAttribute(){},addEventListener(){}};};
function harness(source=code,platform='MacIntel'){
 const listeners={},keys={},captured=new Set(),sent=[];
 const canvas={...ui(),getBoundingClientRect:()=>({left:0,top:0,width:1064,height:500}),
  addEventListener:(type,fn)=>listeners[type]=fn,setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id)};
 const c={navigator:{platform},Math,Set,screenY,curveY,canvas,canvasCssHeight:500,
  getPlotBounds:()=>({left:64,width:1000,height:500}),
  curves:{stretch:[{x:0,y:.5},{x:.25,y:.3},{x:.6,y:.6},{x:1,y:.8}],pitch:[{x:0,y:.5},{x:1,y:.5}],pan:[{x:0,y:.5},{x:1,y:.5}]},
  editedCurves:{stretch:false,pitch:false,pan:false},activeCurve:'stretch',selectedTool:'pen',selectedPoint:null,hoverPoint:null,dragging:false,
  curvePointerId:null,verticalDrag:null,shiftHeld:false,penTool:ui(),eraserTool:ui(),stretchMode:ui(),pitchMode:ui(),panMode:ui(),
  draw(){},markDownloadStale(){c.stale=(c.stale||0)+1;},
  node:{port:{postMessage(m){sent.push(clone(m));}}},
  window:{addEventListener(type,fn){(keys[type]??=[]).push(fn);}}};
 const begin=source.indexOf('function pointerToPoint('),end=source.indexOf('window.addEventListener("resize", resizeCanvas)',begin);
 assert(begin>=0&&end>begin);
 vm.createContext(c);vm.runInContext(source.match(/const eraseModifier =[^;]+;/)[0]+'\n'+['sortCurve','sendCurves','setActiveCurve'].map(n=>pick(source,n)).join('\n')+'\n'+source.slice(begin,end),c);
 const event=(x,y,extra={})=>({button:0,pointerId:7,clientX:64+x*1000,clientY:screenY(c.activeCurve,y)*500,shiftKey:false,altKey:false,metaKey:false,ctrlKey:false,
  preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra});
 const pointer=(type,x,y,extra={})=>{const e=event(x,y,extra);listeners[type]?.(e);return e;};
 const key=(type,extra={})=>{const e=event(0,0,extra);for(const fn of keys[type]||[]){fn(e);if(e.stopped)break;}return e;};
 return {c,sent,captured,pointer,key,snapshot:()=>clone({curves:c.curves,edited:c.editedCurves})};
}
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-12,`${actual} != ${expected}`);

for(const name of ['stretch','pitch','pan']){
 const h=harness(),{c}=h;c.activeCurve=name;c.curves[name]=clone(c.curves.stretch);
 const before=h.snapshot(),xs=c.curves[name].map(p=>p.x);
 h.pointer('pointerdown',.25,.31,{shiftKey:true});assert.equal(h.sent.length,0);assert(!c.editedCurves[name]);assert(!c.stale);
 assert.equal(c.canvas.style.cursor,'ns-resize');assert.equal(c.getVerticalPoints().length,3);
 h.pointer('pointermove',.95,.41,{shiftKey:true});
 assert.deepEqual(c.curves[name].map(p=>p.x),xs);near(c.curves[name][0].y,.5);
 [.4,.7,.9].forEach((y,i)=>near(c.curves[name][i+1].y,y));
 for(const other of ['stretch','pitch','pan'].filter(n=>n!==name))assert.deepEqual(clone(c.curves[other]),before.curves[other]);
 assert.equal(h.sent.length,1);assert.equal(h.sent[0].type,'curves');assert.equal(c.stale,1);
 h.pointer('pointerup',.95,.41,{shiftKey:true});assert(!c.dragging);assert(!c.verticalDrag);assert.equal(h.captured.size,0);
}
console.log('PASS Speed/Pitch/Pan suffix membership, X preservation, equal Y delta, off-center grab and engine curve message');

{
 const {c,pointer,sent}=harness();pointer('pointerdown',.25,.3,{shiftKey:true});
 pointer('pointermove',.99,.95,{shiftKey:true});near(c.curves.stretch[1].y,.5);near(c.curves.stretch[2].y,.8);near(c.curves.stretch[3].y,1);
 pointer('pointermove',.01,1,{shiftKey:true});assert.equal(sent.length,1);
 pointer('pointermove',.99,.4,{shiftKey:true});[.4,.7,.9].forEach((y,i)=>near(c.curves.stretch[i+1].y,y));
 pointer('pointermove',.1,0,{shiftKey:true});[0,.3,.5].forEach((y,i)=>near(c.curves.stretch[i+1].y,y));
}
for(const index of [0,3]){
 const h=harness(),p=h.c.curves.stretch[index],before=h.snapshot();
 h.pointer('pointerdown',p.x,p.y,{shiftKey:true});h.pointer('pointermove',.5,p.y-.1,{shiftKey:true});
 assert.deepEqual(h.c.curves.stretch.map(p=>p.x),before.curves.stretch.map(p=>p.x));
 h.c.curves.stretch.forEach((p,i)=>near(p.y,before.curves.stretch[i].y-(i>=index?.1:0)));
}
{
 const h=harness();h.pointer('pointerdown',.25,.3,{shiftKey:true});const before=h.snapshot();
 h.pointer('pointermove',.9,.9,{shiftKey:true,pointerId:8});assert.deepEqual(h.snapshot(),before);
 h.pointer('pointerdown',.7,.2,{shiftKey:true,pointerId:8});assert.equal(h.c.verticalDrag.points.length,3);
}
console.log('PASS shared bounds without flattening, return from bounds, endpoints and unrelated pointer isolation');

for(const cancel of ['Escape','pointercancel','lostpointercapture','blur','mode','tool']){
 const h=harness(),before=h.snapshot();h.pointer('pointerdown',.25,.3,{shiftKey:true});h.pointer('pointermove',.8,.4,{shiftKey:true});
 if(cancel==='Escape'){const e=h.key('keydown',{key:'Escape',shiftKey:true});assert(e.prevented&&e.stopped);}
 else if(cancel==='blur')h.key('blur');
 else if(cancel==='mode')h.c.setActiveCurve('pitch');
 else if(cancel==='tool')h.c.setTool('eraser');
 else h.pointer(cancel,.8,.4,{shiftKey:true});
 assert.deepEqual(h.snapshot(),before,cancel);assert(!h.c.dragging);assert(!h.c.verticalDrag);assert.equal(h.captured.size,0);
 assert.equal(h.sent.length,2,cancel+' sends change and restoration only');
}
{
 const h=harness(),before=h.snapshot();h.pointer('pointerdown',.25,.3,{shiftKey:true});h.pointer('pointerup',.25,.3,{shiftKey:true});
 assert.deepEqual(h.snapshot(),before);assert.equal(h.sent.length,0);
 h.pointer('pointerdown',.4,.9,{shiftKey:true});assert.deepEqual(h.snapshot(),before);assert.equal(h.sent.length,0);
 h.pointer('pointerdown',.25,.3,{shiftKey:true});h.key('keyup',{key:'Shift'});h.pointer('pointermove',.9,.4);near(h.c.curves.stretch[1].x,.25);near(h.c.curves.stretch[1].y,.4);
}
console.log('PASS no-change Shift click/empty click, cancel restoration and fixed gesture after Shift release');

for(const platform of ['MacIntel','Win32']){
 const h=harness(code,platform),modifier=platform==='MacIntel'?{altKey:true}:{ctrlKey:true};
 h.pointer('pointerdown',.25,.3,modifier);assert.equal(h.c.curves.stretch.length,3);assert.equal(h.sent.length,1);
 for(const p of [h.c.curves.stretch[0],h.c.curves.stretch.at(-1)])h.pointer('pointerdown',p.x,p.y,modifier);
 h.pointer('pointerdown',.4,.9,modifier);assert.equal(h.c.curves.stretch.length,3);assert.equal(h.sent.length,1);
}
{
 const h=harness();h.pointer('pointerdown',.25,.3,{metaKey:true});h.pointer('pointerup',.25,.3,{metaKey:true});assert.equal(h.c.curves.stretch.length,4);
 h.pointer('pointerdown',.25,.3,{altKey:true,shiftKey:true});assert.equal(h.c.curves.stretch.length,3);assert(!h.c.verticalDrag);
 const e=harness();e.c.setTool('eraser');e.pointer('pointerdown',.25,.3,{shiftKey:true});assert.equal(e.c.curves.stretch.length,3);assert(!e.c.verticalDrag);
}
console.log('PASS Mac Option / PC Ctrl deletion, Command no longer erases, endpoint and eraser precedence');

function normalTrace(source){
 const h=harness(source);const rows=[];
 for(const [type,x,y] of [['pointerdown',.4,.7],['pointermove',.5,.65],['pointerup',.5,.65],['pointerdown',.5,.65],['pointermove',.7,.2],['pointerup',.7,.2]]){
  h.pointer(type,x,y);rows.push({model:h.snapshot(),sent:clone(h.sent)});
 }
 h.c.setTool('eraser');h.pointer('pointerdown',.7,.2);rows.push({model:h.snapshot(),sent:clone(h.sent)});
 return rows;
}
const currentTrace=normalTrace(code);assert.equal(currentTrace[0].model.curves.stretch.length,5);
assert.equal(currentTrace.at(-1).model.curves.stretch.length,4);
const baselineIndex=process.argv.indexOf('--baseline');
if(baselineIndex>=0){assert.deepEqual(currentTrace,normalTrace(readFileSync(process.argv[baselineIndex+1],'utf8')));console.log('PASS ordinary gestures: 7 baseline/current model and complete curve-message traces identical');}
else console.log('PASS ordinary point addition, free XY dragging, reordering and tool erasing retained');

{
 const arcs=[],points=[{x:0,y:.5},{x:1,y:.5}];
 const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(x,y,r){assert(r>0);arcs.push({x,y,r,stroke:this.lineWidth});}};
 const c={Math,Set,ctx,canvasCssWidth:1000,getPlotBounds:()=>({left:64,width:928,height:500}),screenY,valueAt:()=>.5,getVerticalPoints:()=>points};
 vm.createContext(c);vm.runInContext(pick(code,'drawCurve'),c);c.drawCurve(points,'#66d9bd',3,true,'stretch');
 assert.equal(arcs.length,4);assert.equal(arcs[0].r,6);assert.equal(arcs[2].r,6);
 assert(arcs[3].x+arcs[3].r+1.25/2<=1000,'right endpoint group ring stays inside canvas');
 c.canvasCssWidth=1;c.drawCurve(points,'#66d9bd',3,true,'stretch');
}
console.log('PASS group feedback keeps original point radius and right edge visible without invalid tiny-canvas arcs');
