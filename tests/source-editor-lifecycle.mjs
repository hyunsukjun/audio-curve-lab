import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {canvasAxisWidth} from '../src/canvas-grid.js';
import * as core from '../src/output-edit-core.js';
const elements=new Map(), keys={};
function el(id){if(!elements.has(id))elements.set(id,{id,listeners:{},setAttribute(){},getBoundingClientRect:()=>({left:0,width:id==='editPan'?862:canvasAxisWidth+808}),addEventListener(k,f){this.listeners[k]=f},focus(){},setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){},contains:()=>true,matches:()=>false});return elements.get(id);}
const sandbox={...core,canvasAxisWidth,document:{getElementById:el},window:{addEventListener:(k,f)=>keys[k]=f}};
vm.createContext(sandbox);vm.runInContext(readFileSync(new URL('../src/source-editor.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function'),sandbox);
let current, fail=false,plays=0;
function make(c,n,rate){if(fail)throw Error('allocation');const data=Array.from({length:c},()=>new Float32Array(n));return{length:n,sampleRate:rate,duration:n/rate,numberOfChannels:c,getChannelData:c=>data[c]};}
const editor=sandbox.createSourceEditor({createBuffer:make,apply:b=>current=b,stop(){},busyChanged(){},repaint(){},primePlayback(){},play(){plays++;assert(current.length<48000)}});
const original=make(2,48000,48000);original.getChannelData(0).fill(.2);original.getChannelData(1).fill(.1);editor.load(original);
const target=el('sourceWaveCanvas');
const event=(x,t=target,type='pointerup')=>({button:0,clientX:x,pointerId:1,currentTarget:t,type,preventDefault(){}});
function select(a,b){target.listeners.pointerdown(event(a));target.listeners.pointermove(event(b));return target.listeners.pointerup(event(b));}
await select(canvasAxisWidth+160,canvasAxisWidth+320);const cutting=el('editDelete').onclick();keys.keydown({target,code:'Space',key:' ',preventDefault(){},stopImmediatePropagation(){}});await cutting;
assert.equal(current.length,38160);assert.equal(plays,1);assert.equal(original.getChannelData(0)[100],Math.fround(.2));
await el('editUndo').onclick();assert.equal(current.length,48000);await el('editRedo').onclick();assert.equal(current.length,38160);
const handle=el('fadeInHandle');const before=current;handle.listeners.pointerdown(event(canvasAxisWidth,handle));handle.listeners.pointermove(event(canvasAxisWidth+160,handle));assert.equal(current,before,'drag does not publish partial edit');await handle.listeners.pointerup(event(canvasAxisWidth+160,handle));assert.equal(current.getChannelData(0)[0],0);assert(editor.state.fadeIn>0);
const retained=current;fail=true;await el('editUndo').onclick();assert.equal(current,retained);assert.match(el('editStatus').textContent,/Previous audio retained/);fail=false;
await select(canvasAxisWidth,canvasAxisWidth+800);await el('editDelete').onclick();assert.equal(current,null);await el('editUndo').onclick();assert(current.length>0);
for(const rate of [44100,48000,96000]){editor.load(make(2,rate,rate));assert.equal(editor.state.rate,rate);assert(el('editUndo').disabled);}
console.log('PASS source editing: immediate availability, atomic delete, queued Space, Undo/Redo, fade release, allocation recovery, full deletion recovery, native rates');
editor.load(original);await select(canvasAxisWidth+160,canvasAxisWidth+320);const pendingEdit=el('editDelete').onclick();keys.keydown({target,code:'Space',key:' ',preventDefault(){},stopImmediatePropagation(){}});el('stopButton').listeners.click();await pendingEdit;assert.equal(plays,1,'Stop clears playback queued during an edit');
console.log('PASS Stop cancels queued edit playback');
// Editing cursor and zoom are UI-only; selection maps back into native source frames.
editor.load(original);await select(canvasAxisWidth+400,canvasAxisWidth+401);assert.equal(editor.cursor,24000);assert.equal(editor.selection,null);
const unchanged=current;el('editZoomIn').onclick();assert.equal(editor.viewport.end-editor.viewport.start,24000);assert.equal(editor.viewport.start,12000);assert.equal(current,unchanged);
await select(canvasAxisWidth+200,canvasAxisWidth+400);assert.deepEqual(Array.from(editor.selection),[18000,24000]);await el('editDelete').onclick();assert.equal(current.length,41760);assert.equal(editor.cursor,18000);assert(editor.viewport.end<=41760);
await el('editUndo').onclick();assert.equal(current.length,48000);
el('editPan').onkeydown({key:'End',preventDefault(){}});assert.equal(editor.viewport.end,48000);
const key=(key,extra={})=>keys.keydown({target,key,preventDefault(){},stopImmediatePropagation(){},...extra});
key('-');assert.equal(editor.viewport.start,0);assert.equal(editor.viewport.end,48000);
key('+',{ctrlKey:true});assert.equal(editor.viewport.end,48000,'browser zoom shortcut not captured');
key('+',{target:{matches:()=>true}});assert.equal(editor.viewport.end,48000,'typing is not captured');
for(let i=0;i<15;i++)key('+');assert(editor.viewport.end-editor.viewport.start>=32);
el('editZoomFit').onclick();assert.equal(editor.viewport.start,0);assert.equal(editor.viewport.end,48000);
assert.equal(plays,1,'source cursor and zoom do not trigger playback');
console.log('PASS click cursor, zoom anchor, zoomed frame-accurate deletion, pan bounds, Fit, keyboard guards, no playback');
// Playback follows source frames, not elapsed output time; edits remain anchored.
editor.load(original);await select(canvasAxisWidth+400,canvasAxisWidth+400);el('editZoomIn').onclick();el('editZoomIn').onclick();
const editAnchor=editor.cursor;
editor.followPlayback(1000);assert(editor.viewport.start<=1000&&editor.viewport.end>=1000);
editor.followPlayback(45000);assert(editor.viewport.start<=45000&&editor.viewport.end>=45000);
editor.followPlayback(2000);assert(editor.viewport.start<=2000&&editor.viewport.end>=2000);
const freezeView=editor.viewport;editor.followPlayback(2000);assert.deepEqual(editor.viewport,freezeView);
assert.equal(editor.cursor,editAnchor,'playback must not move the edit cursor');
console.log('PASS source playback viewport forward/reverse/freeze tracking; edit cursor preserved');
const seeks=[];
const linked=sandbox.createSourceEditor({createBuffer:make,apply(){},stop(){},busyChanged(){},repaint(){},primePlayback(){},play(){},getSeekAnchor:()=>.7,seek:(frame,anchor)=>{seeks.push([frame,anchor]);return true}});
linked.load(original);await select(canvasAxisWidth+400,canvasAxisWidth+400);assert.deepEqual(seeks,[[24000,.7]]);
await select(canvasAxisWidth+200,canvasAxisWidth+400);assert.equal(seeks.length,1,'range selection must not change playback start');
console.log('PASS click routes selected source frame and pre-stop output anchor; drag only selects');

linked.load(original);await select(canvasAxisWidth+160,canvasAxisWidth+480);
assert.deepEqual(Array.from(linked.selection),[9600,28800]);
el('editZoomIn').onclick();
assert.equal((linked.viewport.start+linked.viewport.end)/2,19200,'zoom centers selection midpoint');
el('editZoomIn').onclick();
assert.equal((linked.viewport.start+linked.viewport.end)/2,19200,'repeat zoom retains selection midpoint');
const nav=el('editPan');
nav.listeners.pointerdown(event(646.5,nav,'pointerdown'));
nav.listeners.pointerup(event(646.5,nav));
assert.equal((linked.viewport.start+linked.viewport.end)/2,36000,'overview maps 75 percent to 75 percent of full source');
assert.deepEqual(Array.from(linked.selection),[9600,28800],'overview does not alter selection');
el('editZoomOut').onclick();
assert.equal((linked.viewport.start+linked.viewport.end)/2,19200,'zoom returns to selected region center');
console.log('PASS selection-centered zoom and full-source overview navigation');
