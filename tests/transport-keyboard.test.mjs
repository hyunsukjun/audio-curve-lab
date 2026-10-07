import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const firstSpace=source.indexOf('event.code !== "Space"');
const start=source.lastIndexOf('window.addEventListener("keydown"',firstSpace);
const up=source.indexOf('window.addEventListener("keyup"',start);
const end=source.indexOf('\n});',up)+4;
assert(start>=0 && up>start && end>up);
const hasDialog=source.includes('const resetDialog =');
function harness(){
 class HTMLInputElement{};class HTMLSelectElement{};class HTMLTextAreaElement{};
 class HTMLButtonElement{blur(){this.blurred=true;}}
 const handlers={},calls=[];
 const ctx={HTMLInputElement,HTMLSelectElement,HTMLTextAreaElement,HTMLButtonElement,
  window:{addEventListener:(type,cb)=>handlers[type]=cb},document:{activeElement:new HTMLButtonElement()},
  resetDialog:{hidden:true},buffer:{},playButton:{disabled:false},isPlaying:false,
  toggleAudio(){calls.push('toggle')},play(){calls.push('play')},playAudio(){calls.push('play')},stop(){calls.push('stop')},stopAudio(){calls.push('stop')}};
 vm.runInNewContext(source.slice(start,end),ctx);
 const send=(type='keydown',overrides={})=>{const event={code:'Space',target:ctx.document.activeElement,repeat:false,prevented:false,preventDefault(){this.prevented=true},stopPropagation(){},...overrides};handlers[type](event);return event;};
 return {ctx,calls,send};
}
test('one held gesture dispatches one transport command',()=>{const h=harness();h.send();for(let i=0;i<20;i++)assert(h.send('keydown',{repeat:true}).prevented);h.send('keyup');assert.equal(h.calls.length,1);assert(h.ctx.document.activeElement.blurred);h.send();assert.equal(h.calls.length,2)});
test('disabled Play and absent source cannot be bypassed by Space',()=>{for(const state of ['disabled','empty']){const h=harness();if(state==='disabled')h.ctx.playButton.disabled=true;else h.ctx.buffer=null;h.send();h.send('keyup');assert.equal(h.calls.length,0)}});
test('editable and select controls retain keydown and keyup defaults',()=>{const h=harness();for(const target of [new h.ctx.HTMLInputElement(),new h.ctx.HTMLSelectElement(),new h.ctx.HTMLTextAreaElement(),{isContentEditable:true}])for(const type of ['keydown','keyup'])assert.equal(h.send(type,{target}).prevented,false);assert.equal(h.calls.length,0)});
test('unrelated keys retain defaults',()=>{const h=harness();for(const type of ['keydown','keyup'])assert.equal(h.send(type,{code:'Enter'}).prevented,false);assert.equal(h.calls.length,0)});
if(hasDialog)test('open Reset dialog owns both Space events; closed dialog restores transport',()=>{const h=harness();h.ctx.resetDialog.hidden=false;for(const type of ['keydown','keyup'])assert.equal(h.send(type).prevented,false);assert.equal(h.calls.length,0);assert(!h.ctx.document.activeElement.blurred);h.ctx.resetDialog.hidden=true;h.send();assert.equal(h.calls.length,1)});
