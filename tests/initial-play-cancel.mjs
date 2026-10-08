import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const pick=name=>{const match=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(match);return source.slice(match.index,source.indexOf('\n}',match.index)+2)};
const actions=['stopAudio','forceStopAudio','loadAudioFile'].filter(n=>source.includes('function '+n+'('));
for(const action of actions){
 let ready;const gate=new Promise(resolve=>ready=resolve),messages=[];
 const c={buffer:{duration:8},node:null,playbackToken:0,isPlaying:false,workletBufferLoaded:false,playheadSeconds:0,sourcePlayheadSeconds:0,isScrubbing:false,
 playButton:{disabled:false,textContent:'Play'},resetDialog:{hidden:true},spectrogram:{cancel(){},invalidate(){}},fileStatus:{},fileNotice:{},downloadReadout:{},readouts:{download:{}},renderAbortController:null, audioContext:{sampleRate:48000}, curves:{stretch:[]}, settings:()=>({durationSeconds:20}), checkFileSize(){}, preflightWav:async()=>{}, checkPCM(){}, updateDurationNotice(){}, estimateOutputDuration:()=>2, resetSourceWindowToMinimum(){}, sendSettings(){}, setBusy:x=>c.playButton.disabled=x,
 ensureAudio:async()=>{await gate;c.node={port:{postMessage:m=>messages.push(m)}}},ensureAudioContext:async()=>{},getPlaybackDuration:()=>8,
 setTransportBusy:x=>c.playButton.disabled=x,decodeAudioFile:async()=>({duration:2,numberOfChannels:1}),buildWaveform(){},sendBufferToWorklet(){},clearDownload(){},largeFileSeconds:300,resetCurrentReadouts(){},draw(){},console};
 vm.createContext(c);vm.runInContext(['nextPlaybackToken','playAudio',...actions].map(pick).join('\n'),c);
 const pending=c.playAudio();
 if(action==='loadAudioFile')await c.loadAudioFile({name:'replacement.wav',arrayBuffer:async()=>new ArrayBuffer(8)});else c[action]();
 if(action==='loadAudioFile')assert.equal(c.buffer.duration,2,'replacement fixture must decode successfully');
 ready();await pending;await new Promise(resolve=>setImmediate(resolve));
 assert.equal(messages.filter(m=>m.type==='play').length,0,`${action} must invalidate pending first Play before node creation`);
 assert.equal(c.isPlaying,false);
 await c.playAudio();await new Promise(resolve=>setImmediate(resolve));assert.equal(messages.filter(m=>m.type==='play').length,1,'explicit retry should play');
 console.log('PASS',action,'cancels pending initialization and permits explicit retry');
}
