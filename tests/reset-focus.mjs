import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const start=source.indexOf('// Keep keyboard navigation inside the modal');
const end=source.indexOf('cancelResetButton.addEventListener',start);
assert(start>=0&&end>start);
const document={activeElement:null};
const cancelResetButton={focus(){document.activeElement=this}};
const confirmResetButton={focus(){document.activeElement=this}};
const resetDialog={hidden:false}; let handler;
vm.runInNewContext(source.slice(start,end),{document,cancelResetButton,confirmResetButton,resetDialog,window:{addEventListener:(type,fn)=>handler=fn}});
for(const shiftKey of [false,true]) {
 for(const [current,expected] of [[cancelResetButton,confirmResetButton],[confirmResetButton,cancelResetButton],[{},shiftKey?confirmResetButton:cancelResetButton]]) {
 document.activeElement=current; let prevented=false;
 handler({key:'Tab',shiftKey,preventDefault(){prevented=true},stopPropagation(){}});
 assert(prevented);assert.equal(document.activeElement,expected);
 }
}
resetDialog.hidden=true; document.activeElement=cancelResetButton;
handler({key:'Tab',preventDefault(){throw Error('closed modal consumed Tab')}});
assert.equal(document.activeElement,cancelResetButton);
resetDialog.hidden=false;
handler({key:'Escape',preventDefault(){throw Error('non-Tab consumed')}});
console.log('Reset focus: forward/reverse/wrapped/outside/closed/non-Tab pass');
