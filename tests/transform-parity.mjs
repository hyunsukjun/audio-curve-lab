import assert from "node:assert/strict";

import {
  centsFromNorm,
  estimateOutputDuration,
  grainEnvelope,
  grainMixScale,
  grainStart,
  panFromNorm,
  sourcePositionAtProgress,
  speedFromNorm
} from "../src/transform-core.js";
import { renderOffline } from "../src/offline-render.js";

const sampleRate = 48000;
const duration = 0.25;
const length = Math.round(sampleRate * duration);
const left = new Float32Array(length);
const right = new Float32Array(length);

for (let i = 0; i < length; i += 1) {
  const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.4;
  left[i] = sample;
  right[i] = sample;
}

const audioBuffer = {
  sampleRate,
  duration,
  numberOfChannels: 2,
  getChannelData(channel) {
    return channel === 0 ? left : right;
  }
};

const neutralSpeed = [{ x: 0, y: 0.75 }, { x: 1, y: 0.75 }];
const neutral = [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }];
const settings = {
  grainSizeMs: 140,
  density: 5.5,
  randomness: 0.02,
  outputGain: 0.95,
  globalDirection: 1
};

function assertFiniteAndBounded(rendered, label) {
  let peak = 0;
  for (let i = 0; i < rendered.left.length; i += 1) {
    assert.ok(Number.isFinite(rendered.left[i]), `${label}: left contains a non-finite sample`);
    assert.ok(Number.isFinite(rendered.right[i]), `${label}: right contains a non-finite sample`);
    peak = Math.max(peak, Math.abs(rendered.left[i]), Math.abs(rendered.right[i]));
  }
  assert.ok(peak <= 1, `${label}: peak exceeds digital full scale`);
}

assert.equal(speedFromNorm(0), -2);
assert.equal(speedFromNorm(0.25), -1);
assert.equal(speedFromNorm(0.5), 0);
assert.equal(speedFromNorm(0.75), 1);
assert.equal(speedFromNorm(1), 2);
assert.equal(centsFromNorm(0), -2400);
assert.equal(centsFromNorm(0.5), 0);
assert.equal(centsFromNorm(1), 2400);
assert.equal(panFromNorm(0), -1);
assert.equal(panFromNorm(0.5), 0);
assert.equal(panFromNorm(1), 1);
assert.equal(grainEnvelope(0), 0);
assert.ok(Math.abs(grainEnvelope(1)) < 1e-12);
assert.equal(grainMixScale(0.95, 5.5), 0.95 / Math.sqrt(5.5 * 0.8));
assert.equal(estimateOutputDuration(8, neutralSpeed), 8);
assert.equal(estimateOutputDuration(8, [{ x: 0, y: 0.625 }, { x: 1, y: 0.625 }]), 16);
assert.ok(Math.abs(sourcePositionAtProgress(8, neutralSpeed, 1, 0.5) - 4) < 0.02);
assert.ok(Math.abs(sourcePositionAtProgress(8, neutralSpeed, -1, 0.5) - 4) < 0.02);
const reverseGrainStart = grainStart(6000, 256, -1, length, 0);
assert.ok(reverseGrainStart >= 255 && reverseGrainStart < length - 3);

const neutralRender = await renderOffline({
  audioBuffer,
  curves: { stretch: neutralSpeed, pitch: neutral, pan: neutral },
  settings
});

let smoothGain = 0;
for (let i = 0; i < neutralRender.left.length; i += 1) {
  smoothGain += (settings.outputGain - smoothGain) * 0.0015;
  const expectedSource = i < left.length - 3 ? left[i] : 0;
  const expected = Math.fround(Math.tanh(expectedSource * smoothGain));
  assert.ok(Math.abs(neutralRender.left[i] - expected) < 1e-7, "neutral render changed the direct signal path");
  assert.equal(neutralRender.left[i], neutralRender.right[i]);
}
assertFiniteAndBounded(neutralRender, "neutral");

const reverseRender = await renderOffline({
  audioBuffer,
  curves: { stretch: neutralSpeed, pitch: neutral, pan: neutral },
  settings: { ...settings, globalDirection: -1 }
});
assertFiniteAndBounded(reverseRender, "reverse");
assert.ok(Math.abs(reverseRender.left[100]) > 0, "reverse render did not read from the end of the source");

const freezeRender = await renderOffline({
  audioBuffer,
  curves: {
    stretch: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }],
    pitch: neutral,
    pan: neutral
  },
  settings
});
assertFiniteAndBounded(freezeRender, "freeze");
assert.ok(freezeRender.left.some((sample) => Math.abs(sample) > 1e-5), "freeze render is silent");

const transformedCurves = {
  stretch: [{ x: 0, y: 0.2 }, { x: 0.45, y: 0.8 }, { x: 1, y: 0.35 }],
  pitch: [{ x: 0, y: 0.1 }, { x: 0.5, y: 0.9 }, { x: 1, y: 0.5 }],
  pan: [{ x: 0, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0.5 }]
};
const renderA = await renderOffline({ audioBuffer, curves: transformedCurves, settings });
const renderB = await renderOffline({ audioBuffer, curves: transformedCurves, settings });
assert.deepEqual(renderA.left, renderB.left, "transformed render is not deterministic");
assert.deepEqual(renderA.right, renderB.right, "transformed render is not deterministic");
assertFiniteAndBounded(renderA, "transformed");

const extremeRender = await renderOffline({
  audioBuffer,
  curves: {
    stretch: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    pitch: [{ x: 0, y: 1 }, { x: 1, y: 0 }],
    pan: [{ x: 0, y: 0 }, { x: 1, y: 1 }]
  },
  settings
});
assertFiniteAndBounded(extremeRender, "extreme");

console.log("transform parity checks passed");
