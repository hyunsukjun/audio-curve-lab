// Source-frame gain automation, shared by editing, drawing and materialization.
export const VOLUME_MIN_DB = -60;
export const VOLUME_MAX_DB = 6;
export const VOLUME_MAX_GAIN = 10 ** (VOLUME_MAX_DB / 20);
export const VOLUME_MAX_POINTS = 512;
export const volumeDb = gain => gain > 0 ? 20 * Math.log10(gain) : -Infinity;
export const volumeLabel = gain => gain > 0 ? `${volumeDb(gain) > 0 ? '+' : ''}${volumeDb(gain).toFixed(1)} dB` : '−∞ dB';
export const volumeNorm = gain => gain <= 0 ? 0 : Math.max(0, Math.min(1, (volumeDb(gain) - VOLUME_MIN_DB) / (VOLUME_MAX_DB - VOLUME_MIN_DB)));
export const gainFromVolumeNorm = norm => norm <= 0 ? 0 : 10 ** ((VOLUME_MIN_DB + Math.min(1, norm) * (VOLUME_MAX_DB - VOLUME_MIN_DB)) / 20);
export const hasSourceVolume = state => !!state?.volume?.some(p => Math.abs(p.gain - 1) > 1e-10);
// Interpolate the same ordinate used by the dB graph. Keep exact point gains,
// including unity and mute; mute occupies the existing bottom (-60dB) anchor.
function interpolateVolume(a, b, normA, normB, t) {
  if (t <= 0 || a === b) return a;
  if (t >= 1) return b;
  return gainFromVolumeNorm(normA + (normB - normA) * t);
}
export function volumeGainAt(points, frame) {
  if (!points?.length) return 1;
  let lo = 0, hi = points.length - 1;
  if (frame <= points[0].frame) return points[0].gain;
  if (frame >= points[hi].frame) return points[hi].gain;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (points[mid].frame <= frame) lo = mid; else hi = mid; }
  const a = points[lo], b = points[hi], t = (frame - a.frame) / (b.frame - a.frame);
  return interpolateVolume(a.gain,b.gain,volumeNorm(a.gain),volumeNorm(b.gain),t);
}
export function volumePoints(state, length) {
  return state.volume?.length ? state.volume : length > 1 ? [{frame:0,gain:1},{frame:length-1,gain:1}] : [{frame:0,gain:1}];
}
export function putVolumePoint(state, length, frame, gain, index = null) {
  if (!length || !Number.isFinite(frame) || !Number.isFinite(gain)) return state;
  const points = volumePoints(state, length).map(p => ({...p}));
  frame = Math.max(0, Math.min(length - 1, Math.round(frame)));
  gain = Math.max(0, Math.min(VOLUME_MAX_GAIN, gain));
  if (index !== null) {
    if (!points[index]) return state;
    frame = index === 0 || index === points.length - 1 ? points[index].frame
      : Math.max(points[index-1].frame+1, Math.min(points[index+1].frame-1, frame));
    points[index] = {frame,gain};
  } else {
    const existing = points.findIndex(p => p.frame === frame);
    if (existing >= 0) points[existing] = {frame,gain};
    else { if (points.length >= VOLUME_MAX_POINTS) return state; points.push({frame,gain}); points.sort((a,b) => a.frame-b.frame); }
  }
  if (JSON.stringify(points) === JSON.stringify(state.volume)) return state;
  return {...state,volume:points};
}
export function eraseVolumePoint(state, index) {
  if (!state.volume || index <= 0 || index >= state.volume.length-1) return state;
  return {...state,volume:state.volume.filter((_,i) => i !== index)};
}
export function resetSourceVolume(state) { return state.volume?.length ? {...state,volume:[]} : state; }

// Keep automation attached to retained source time. The existing 5ms join has a
// continuous gain bridge; it is not a new output-time automation or crossfade.
export function volumeAfterDelete(state, length, start, end, join, nextLength) {
  if (!state.volume?.length || !nextLength) return [];
  const leftEnd = start - join, rightStart = end + join, removed = end - start + join;
  const points = state.volume.filter(p => p.frame < leftEnd).map(p => ({...p}));
  if (join && leftEnd < nextLength) points.push({frame:leftEnd,gain:volumeGainAt(state.volume,leftEnd)});
  if (start < nextLength) points.push({frame:start,gain:volumeGainAt(state.volume,rightStart)});
  for (const p of state.volume) if (p.frame >= rightStart) points.push({frame:p.frame-removed,gain:p.gain});
  points.push({frame:0,gain:volumeGainAt(state.volume,start === 0 ? rightStart : 0)});
  points.push({frame:nextLength-1,gain:volumeGainAt(state.volume,end === length ? start-1 : length-1)});
  const unique = new Map(points.filter(p => p.frame >= 0 && p.frame < nextLength).map(p => [p.frame,p]));
  return [...unique.values()].sort((a,b) => a.frame-b.frame);
}

// Materialization reads increasing frames: amortized O(1), no per-sample search.
export function sourceVolumeReader(points) {
  if (!points?.length) return () => 1;
  const norms = points.map(p => volumeNorm(p.gain));
  let index = 0;
  return frame => {
    while (index < points.length-2 && frame > points[index+1].frame) index++;
    const a = points[index], b = points[index+1];
    if (!b || frame <= a.frame) return a.gain;
    if (frame >= b.frame) return b.gain;
    return interpolateVolume(a.gain,b.gain,norms[index],norms[index+1],(frame-a.frame)/(b.frame-a.frame));
  };
}
