import assert from "node:assert/strict";

import {
  centsFromNorm,
  estimateOutputDuration,
  grainEnvelope,
  grainMixScale,
  grainOverlapCorrection,
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

async function assert24BitStereoWav(rendered, label) {
  const wav = new DataView(await rendered.blob.arrayBuffer());
  const dataBytes = rendered.left.length * 2 * 3;
  assert.equal(wav.getUint16(20, true), 1, `${label}: WAV is not PCM`);
  assert.equal(wav.getUint16(22, true), 2, `${label}: WAV is not stereo`);
  assert.equal(wav.getUint32(24, true), rendered.sampleRate, `${label}: WAV sample rate changed`);
  assert.equal(wav.getUint32(28, true), rendered.sampleRate * 6, `${label}: WAV byte rate is invalid`);
  assert.equal(wav.getUint16(32, true), 6, `${label}: WAV block alignment is invalid`);
  assert.equal(wav.getUint16(34, true), 24, `${label}: WAV is not 24-bit PCM`);
  assert.equal(wav.getUint32(40, true), dataBytes, `${label}: WAV data size is invalid`);
  assert.equal(rendered.blob.size, 44 + dataBytes, `${label}: WAV file size is invalid`);
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
assert.equal(grainOverlapCorrection(0, 5.5), 0);
assert.ok(Math.abs(grainOverlapCorrection(5.5 * (2 / Math.PI), 5.5) - 1) < 1e-12);
assert.equal(grainOverlapCorrection(0.001, 5.5), 2);
assert.equal(grainOverlapCorrection(100, 5.5), 0.5);
assert.equal(estimateOutputDuration(8, neutralSpeed), 8);
assert.equal(estimateOutputDuration(8, [{ x: 0, y: 0.625 }, { x: 1, y: 0.625 }]), 16);
assert.ok(Math.abs(sourcePositionAtProgress(8, neutralSpeed, 1, 0.5) - 4) < 0.02);
assert.ok(Math.abs(sourcePositionAtProgress(8, neutralSpeed, -1, 0.5) - 4) < 0.02);
assert.ok(Math.abs(sourcePositionAtProgress(300, neutralSpeed, 1, 0.5, 180) - 90) < 0.02);
assert.ok(Math.abs(sourcePositionAtProgress(300, neutralSpeed, -1, 0.5, 180) - 210) < 0.02);
assert.ok(Math.abs(sourcePositionAtProgress(300, neutralSpeed, 1, 1, 180) - 180) < 0.02);
assert.ok(Math.abs(sourcePositionAtProgress(300, [{ x: 0, y: 0.625 }, { x: 1, y: 0.625 }], 1, 0.5, 180) - 45) < 0.02);
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
await assert24BitStereoWav(neutralRender, "neutral");

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

const qualityLength = sampleRate;
const qualitySignal = new Float32Array(qualityLength);
for (let i = 0; i < qualityLength; i += 1) {
  qualitySignal[i] = 0.3 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
}
const qualityBuffer = {
  sampleRate,
  duration: 1,
  numberOfChannels: 1,
  getChannelData() { return qualitySignal; }
};

function toneMetrics(signal, frequency) {
  const start = Math.round(0.2 * sampleRate);
  const end = Math.min(signal.length, Math.round(0.8 * sampleRate));
  let energy = 0;
  let sine = 0;
  let cosine = 0;
  for (let i = start; i < end; i += 1) {
    const value = signal[i];
    const phase = (2 * Math.PI * frequency * i) / sampleRate;
    energy += value * value;
    sine += value * Math.sin(phase);
    cosine += value * Math.cos(phase);
  }
  const count = end - start;
  return {
    rms: Math.sqrt(energy / count),
    toneFraction: (2 * ((sine * sine) + (cosine * cosine))) / (count * energy)
  };
}

globalThis.sampleRate = sampleRate;
globalThis.AudioWorkletProcessor = class {
  constructor() { this.port = { onmessage: null, postMessage() {} }; }
};
let WorkletProcessor;
globalThis.registerProcessor = (_name, processor) => { WorkletProcessor = processor; };
await import("../src/transform-worklet.js");

function previewSignal(curves) {
  const processor = new WorkletProcessor();
  processor.port.onmessage({ data: { type: "buffer", left: qualitySignal, right: qualitySignal, sampleRate } });
  processor.port.onmessage({ data: {
    type: "curves",
    stretchCurve: curves.stretch,
    pitchCurve: curves.pitch,
    panCurve: curves.pan
  } });
  processor.port.onmessage({ data: { type: "settings", settings } });
  processor.port.onmessage({ data: { type: "play", token: 1 } });
  const output = new Float32Array(Math.ceil(processor.outputDurationFrames()));
  for (let offset = 0; offset < output.length; offset += 128) {
    const block = [new Float32Array(128), new Float32Array(128)];
    processor.process([], [block]);
    output.set(block[0].subarray(0, Math.min(128, output.length - offset)), offset);
  }
  return output;
}

const gentleCases = [
  { name: "speed +1%", speed: 1.01, cents: 0, frequency: 440 },
  { name: "pitch +20 cents", speed: 1, cents: 20, frequency: 440 * Math.pow(2, 20 / 1200) }
];
const directQualityRender = await renderOffline({
  audioBuffer: qualityBuffer,
  curves: { stretch: neutralSpeed, pitch: neutral, pan: neutral },
  settings
});
const directReference = toneMetrics(directQualityRender.left, 440).rms;
for (const testCase of gentleCases) {
  const curves = {
    stretch: [{ x: 0, y: (testCase.speed + 2) / 4 }, { x: 1, y: (testCase.speed + 2) / 4 }],
    pitch: [{ x: 0, y: (testCase.cents + 2400) / 4800 }, { x: 1, y: (testCase.cents + 2400) / 4800 }],
    pan: neutral
  };
  const offline = await renderOffline({ audioBuffer: qualityBuffer, curves, settings });
  const rendered = toneMetrics(offline.left, testCase.frequency);
  const preview = toneMetrics(previewSignal(curves), testCase.frequency);
  assert.ok(rendered.toneFraction > 0.85, `${testCase.name}: Render has strong grain modulation`);
  assert.ok(preview.toneFraction > 0.85, `${testCase.name}: Preview has strong grain modulation`);
  assert.ok(Math.abs(preview.rms - rendered.rms) < 0.02, `${testCase.name}: Preview/Render level mismatch`);
  assert.ok(rendered.rms > directReference * 0.8, `${testCase.name}: Render level fell too far below direct playback`);
}

console.log("transform parity checks passed");
