import assert from 'node:assert/strict';
import { createSourceOverview } from '../src/source-overview.js';
import { summarizeChannels, peakOf } from '../src/waveform-view.js';

const paths = [], gradients = [];
let paints = 0, clears = 0, vertices = [];
const ctx = {
  setTransform() {}, clearRect() { clears++; },
  createLinearGradient() { const stops = []; gradients.push(stops); return { addColorStop: (t, color) => stops.push([t, color]) }; },
  beginPath() { vertices = []; }, moveTo(x, y) { vertices.push([x, y]); },
  lineTo(x, y) { vertices.push([x, y]); }, closePath() {},
  fill() { paints++; paths.push(vertices); }
};
const canvas = { clientWidth: 10, clientHeight: 16, getContext: () => ctx };
const left = new Float32Array([0, .25, -.5, 0, 0, 0, 0, 1]);
const right = new Float32Array([0, .125, -.25, 0, 0, 0, 0, .5]);
const originalLeft = left.slice(), originalRight = right.slice();
const peaks = summarizeChannels([left, right], 8);
const originals = peaks.map(p => [p.slice(), p.minimum.slice(), p.maximum.slice()]);
const colors = [new Float32Array([150, 8000]), new Float32Array([150, 8000])];
const paint = createSourceOverview(canvas);
const source = { peaks, colors, referencePeak: peakOf(peaks) };
assert.equal(paint({ ...source, colors: null }), true);
assert.equal(paints, 0, 'pending color analysis must not show old-style waveform');
assert.equal(paint(source), true);
assert.equal(paints, 2);
assert.equal(canvas.width, 10);
assert.equal(canvas.height, 16);
assert(paths.flat(2).every(Number.isFinite));
const top = paths[0], bottom = paths[1];
assert(top.slice(0, 10).some(([x, y]) => x > 8 && y === 1), 'last-sample transient remains visible');
assert(top.slice(10).some(([, y]) => y > 4), 'signed negative peaks are retained');
assert.equal(Math.max(...top.map(([, y]) => Math.abs(y - 4))), 3);
assert.equal(Math.max(...bottom.map(([, y]) => Math.abs(y - 12))), 1.5, 'shared visual scale preserves stereo ratio');
const clearCount = clears;
for (let i = 0; i < 120; i++) assert.equal(paint(source), false);
assert.equal(clears, clearCount, 'idle/playback/viewport-only paints reuse the raster');
const oldScale = globalThis.devicePixelRatio;
globalThis.devicePixelRatio = 2;
assert.equal(paint(source), true); assert.equal(canvas.width, 20);
canvas.clientWidth = 20;
assert.equal(paint(source), true); assert.equal(canvas.width, 40);
assert.equal(paint({ ...source, colors: colors.map(c => c.slice()) }), true);
assert.equal(paint({ ...source, referencePeak: .5 }), true);
assert.equal(paint({ ...source, peaks: summarizeChannels([right, left]) }), true);
assert.equal(paint({ peaks: [], colors: null, referencePeak: 1 }), true);
assert.equal(paint({ peaks: [], colors: null, referencePeak: 1 }), true, 'a new source identity invalidates the raster');
assert.deepEqual(left, originalLeft); assert.deepEqual(right, originalRight);
for (let i = 0; i < peaks.length; i++) assert.deepEqual([peaks[i], peaks[i].minimum, peaks[i].maximum].map(a => Array.from(a)), originals[i].map(a => Array.from(a)));
if (oldScale === undefined) delete globalThis.devicePixelRatio; else globalThis.devicePixelRatio = oldScale;
assert(gradients.every(stops => stops.length >= 2 && stops.length <= 256));
console.log('PASS source overview: full-source signed peaks, final transient, stereo ratio, no PCM writes, pending/empty clearing, source/color/size/DPR invalidation and 120 cached draws');
