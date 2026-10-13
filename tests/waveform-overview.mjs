import assert from 'node:assert/strict';
import {summarizeChannels,peakOf,visualGain} from '../src/waveform-view.js';
import {createOutputOverview} from '../src/output-overview.js';
const input=new Float32Array(8001);input[8000]=.25;const copy=input.slice();const peaks=summarizeChannels([input,input.map(x=>x*.5)]);assert.equal(peakOf(peaks),.25);assert.equal(peaks[1].at(-1),.125);assert.equal(visualGain(.25),4);assert(Number.isFinite(visualGain(0)));assert.deepEqual(input,copy);
const tick=()=>new Promise(r=>setTimeout(r,10));let version=1,published=[],jobs=[];
const overview=createOutputOverview({delay:0,capture:()=>version,render:(v,signal)=>new Promise(resolve=>jobs.push({v,signal,resolve})),publish:v=>published.push(v),pending(){},failed:e=>{throw e}});
overview.invalidate();await tick();version=2;overview.invalidate();await tick();assert(jobs[0].signal.aborted);jobs[0].resolve(1);jobs[1].resolve(2);await tick();assert.deepEqual(published,[2]);overview.cancel();
console.log('PASS linked display gain, stereo ratio, last-sample visibility, immutable PCM, stale render cancellation');
// Deleting every sample must also revoke an older download recovery link.
const {readFileSync}=await import('node:fs');const vm=await import('node:vm');
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const start=app.indexOf('function markDownloadStale()');const fn=app.slice(start,app.indexOf('\nfunction clearDownload()',start));
let cleared=0;const context={outputOverview:null,buffer:null,updateDurationNotice(){},fileNotice:{textContent:'WAV ready.'},clearDownload(){cleared++},downloadReadout:{}};
vm.createContext(context);vm.runInContext(fn+';markDownloadStale();',context);assert.equal(cleared,1);assert.equal(context.downloadReadout.textContent,'empty audio');
console.log('PASS empty audio invalidates prior saved WAV recovery link');
