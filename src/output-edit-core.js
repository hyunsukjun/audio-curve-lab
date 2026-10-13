// Immutable PCM pieces: history keeps references, never full-buffer snapshots.
export const CROSSFADE_SECONDS = 0.005;
export const lengthOf = state => state.pieces.reduce((sum, p) => sum + p.end - p.start, 0);
export function initialEdit(left, right, rate = 48000) {
  if (left.length !== right.length || !left.length || !Number.isFinite(rate) || rate < 8000 || rate > 192000) throw new Error('Expected matched non-empty PCM at 8–192 kHz');
  return { pieces: [{ channels: [left, right], start: 0, end: left.length }], rate, fadeIn: 0, fadeOut: 0 };
}
export function slicePieces(pieces, start, end) {
  const result = []; let offset = 0;
  for (const p of pieces) {
    const size = p.end - p.start, a = Math.max(start, offset), b = Math.min(end, offset + size);
    if (b > a) result.push({ channels: p.channels, start: p.start + a - offset, end: p.start + b - offset });
    offset += size;
  }
  return result;
}
function flattenSmall(pieces, channel) {
  const out = new Float32Array(pieces.reduce((n,p)=>n+p.end-p.start,0)); let at=0;
  for (const p of pieces) { out.set(p.channels[channel].subarray(p.start,p.end),at); at+=p.end-p.start; }
  return out;
}
export function deleteRange(state, start, end) {
  const length = lengthOf(state);
  start = Math.max(0, Math.min(length, Math.round(start))); end = Math.max(0, Math.min(length, Math.round(end)));
  if (start > end) [start,end]=[end,start];
  if (start === end) return state;
  const join = Math.min(Math.round(state.rate * CROSSFADE_SECONDS), start, length-end);
  const pieces = slicePieces(state.pieces,0,start-join);
  if (join) {
    const channels=[0,1].map(channel=>{
      const a=flattenSmall(slicePieces(state.pieces,start-join,start),channel);
      const b=flattenSmall(slicePieces(state.pieces,end,end+join),channel);
      for(let i=0;i<join;i++) { const t=join===1?0.5:i/(join-1); const w=(1-Math.cos(Math.PI*t))/2; a[i]=a[i]*(1-w)+b[i]*w; }
      return a;
    });
    pieces.push({channels,start:0,end:join});
  }
  pieces.push(...slicePieces(state.pieces,end+join,length));
  const next={...state,pieces}; const n=lengthOf(next);
  next.fadeIn=Math.min(state.fadeIn,n); next.fadeOut=Math.min(state.fadeOut,n-next.fadeIn);
  return next;
}
export function setFade(state, side, frames) {
  const length=lengthOf(state), other=side==='fadeIn'?'fadeOut':'fadeIn';
  const value=Math.max(0,Math.min(Math.round(frames),length-state[other]));
  return value===state[side]?state:{...state,[side]:value};
}
export function fadeGain(i,length,fadeIn,fadeOut) {
  let gain=1;
  if(fadeIn>0 && i<fadeIn) gain*=fadeIn===1?0:(1-Math.cos(Math.PI*i/(fadeIn-1)))/2;
  if(fadeOut>0 && i>=length-fadeOut) gain*=fadeOut===1?0:(1-Math.cos(Math.PI*(length-1-i)/(fadeOut-1)))/2;
  return gain;
}
export async function materialize(state, channels, signal) {
  const length=lengthOf(state); let at=0;
  if(channels.length!==2 || channels.some(c=>c.length!==length)) throw new Error('Invalid edit output');
  for(const p of state.pieces) {
    for(let base=p.start;base<p.end;base+=32768) {
      if(signal?.aborted) throw new DOMException('Edit cancelled','AbortError');
      const end=Math.min(p.end,base+32768);
      for(let i=base;i<end;i++,at++) {const gain=fadeGain(at,length,state.fadeIn,state.fadeOut);channels[0][at]=p.channels[0][i]*gain;channels[1][at]=p.channels[1][i]*gain;}
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }
  if(signal?.aborted) throw new DOMException('Edit cancelled','AbortError');
}
