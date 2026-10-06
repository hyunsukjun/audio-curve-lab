import { encodeWav } from '../src/wav-encoder.js';
import { encodeWav as legacy } from './fixtures/legacy-wav-encoder.js';
const assert = (ok, message) => { if (!ok) throw new Error(message); };
export async function runEncoderTests() {
  const results=[];
  for (const frames of [0, 1, 65535, 65536, 65537, 131079]) {
    const left=Float32Array.from({length:frames},(_,i)=>Math.sin(i*.17)*1.2);
    const right=Float32Array.from({length:frames},(_,i)=>i%7===0?-1:Math.cos(i*.31));
    const a=new Uint8Array(await (await encodeWav(left,right,48000)).arrayBuffer());
    const b=new Uint8Array(await legacy(left,right,48000).arrayBuffer());
    assert(a.length===b.length && a.every((v,i)=>v===b[i]), `PCM/header mismatch ${frames}`);
    results.push(`byte parity ${frames} frames`);
  }
  const controller=new AbortController();controller.abort();
  const poison={get length(){throw new Error('read before abort');}};
  try {await encodeWav(poison,poison,48000,controller.signal);throw new Error('pre-abort accepted');}
  catch(e){assert(e.name==='AbortError','early abort');}
  results.push('pre-abort before input access');
  for(const frames of [65536, 65537, 48000*180]) {
    const data=new Float32Array(frames);
    const c=new AbortController();
    // Queued before encoding; must run at the first yield (including single final block).
    const timer=setTimeout(()=>c.abort(),0);
    try {await encodeWav(data,data,48000,c.signal);throw new Error('cancel accepted');}
    catch(e){assert(e.name==='AbortError',`cancel ${frames}`);}finally{clearTimeout(timer);}
    const recovery=await encodeWav(data.subarray(0,97),data.subarray(0,97),48000);
    const expected=new Uint8Array(await legacy(data.subarray(0,97),data.subarray(0,97),48000).arrayBuffer());
    const actual=new Uint8Array(await recovery.arrayBuffer());
    assert(actual.every((v,i)=>v===expected[i])&&actual.length===expected.length,'recovery');
    results.push(`cancel/recover ${frames} frames`);
  }
  return results;
}
