import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const pick=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const contextCode=pick('async function ensureAudioContext(', '\nfunction sendBufferToWorklet');
const loadCode=pick('async function loadAudioFile(', '\nfileInput.addEventListener');
let resumes=0,decoded=0,busy=[],rejectDecode=false;
const previous={length:10,numberOfChannels:1,duration:1};
const candidate={length:14400000,numberOfChannels:2,duration:300};
class AudioContext {constructor(){this.state='suspended';this.sampleRate=48000} resume(){resumes++;return new Promise(()=>{})}}
const text=(value='')=>({textContent:value});
const c={window:{AudioContext},audioContext:null,buffer:previous,renderAbortController:null,node:null,
 fileNotice:text(),fileStatus:text('previous'),downloadReadout:text('ready'),playButton:text('Play'),isPlaying:false,
 checkFileSize(){},setTransportBusy(x){busy.push(x)},nextPlaybackToken(){return 1},preflightWav:async()=>{},
 decodeAudioFile:async()=>{decoded++;if(rejectDecode)throw new Error('Invalid audio');return candidate},
 checkPCM(){},buildWaveform(){},sendBufferToWorklet(){},updateDurationNotice(){},clearDownload(){},
 largeFileSeconds:300,estimateOutputDuration:()=>300,curves:{stretch:[]},resetCurrentReadouts(){},draw(){},console:{error(){}}};
vm.createContext(c);vm.runInContext(contextCode+'\n'+loadCode,c);
const file={name:'test.wav',size:100,arrayBuffer:async()=>new ArrayBuffer(8)};
// A suspended AudioContext deliberately never resolves resume. Import must not await it.
await Promise.race([c.loadAudioFile(file),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Import blocked by pending audio resume')),200))]);
assert.equal(resumes,0);assert.equal(decoded,1);assert.equal(c.buffer,candidate);assert.deepEqual(busy,[true,false]);
rejectDecode=true;busy=[];await c.loadAudioFile(file);assert.equal(c.buffer,candidate);assert.deepEqual(busy,[true,false]);assert.match(c.fileNotice.textContent,/Previous audio remains available/);
// Playback still requests activation; calling it is enough to count the unresolved resume.
void c.ensureAudioContext();assert.equal(resumes,1);
console.log('PASS: import without playback gesture, failure recovery, playback activation retained');
