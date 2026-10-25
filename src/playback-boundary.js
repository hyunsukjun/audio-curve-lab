// Shared transport boundary contract: 10 ms, linear, after DSP/limiting.
export const BOUNDARY_SECONDS = 0.010;
export function boundaryGain(frame, length, rate) {
  const span = Math.max(1, Math.min(Math.round(rate * BOUNDARY_SECONDS), Math.floor((length - 1) / 2)));
  return Math.max(0, Math.min(1, frame / span, (length - 1 - frame) / span));
}
export function fadeOutput(channels, rate) {
  const length = channels[0]?.length || 0;
  const span = Math.min(length, Math.round(rate * BOUNDARY_SECONDS) + 1);
  for (const channel of channels) {
    for (let i = 0; i < span; i++) channel[i] *= boundaryGain(i, length, rate);
    for (let i = Math.max(span, length - span); i < length; i++) channel[i] *= boundaryGain(i, length, rate);
  }
  return channels;
}
export class PlaybackBoundary {
  constructor(rate) { this.span = Math.max(1, Math.round(rate * BOUNDARY_SECONDS)); this.start(); }
  start() { this.age = 0; this.attackSpan = this.span; this.gain = 0; this.releaseAge = null; this.done = false; }
  release() { if (this.releaseAge === null) { this.releaseAge = 0; this.releaseGain = this.gain; } }
  next(remaining = Infinity) {
    if (this.age === 0) this.attackSpan = Math.max(1, Math.min(this.span, Math.floor((remaining - 1) / 2)));
    const attack = Math.min(1, this.age++ / this.attackSpan);
    const end = Math.max(0, Math.min(1, (remaining - 1) / this.attackSpan));
    let gain = Math.min(attack, end);
    if (this.releaseAge !== null) {
      gain = Math.min(gain, this.releaseGain * Math.max(0, 1 - this.releaseAge++ / this.span));
      this.done = this.releaseAge > this.span;
    }
    return this.gain = gain;
  }
}
