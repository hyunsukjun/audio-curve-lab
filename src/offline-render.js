import {
  TRANSFORM_CONSTANTS,
  centsFromNorm,
  createSeededRandom,
  effectiveSpeedAt,
  estimateOutputDuration,
  grainEnvelope,
  grainMixScale,
  grainStart,
  initialPlaybackDirection,
  panFromNorm,
  readCubic,
  smoothingForBlock,
  speedDirection,
  transformCanUseDirect,
  valueAt
} from "./transform-core.js?v=20260926-04";

function encodeWav(left, right, sampleRate) {
  const length = left.length;
  const bytes = 44 + (length * 4);
  const view = new DataView(new ArrayBuffer(bytes));
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i += 1) view.setUint8(offset + i, string.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, bytes - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length * 4, true);

  let offset = 44;
  for (let i = 0; i < length; i += 1) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, l < 0 ? l * 32768 : l * 32767, true);
    view.setInt16(offset + 2, r < 0 ? r * 32768 : r * 32767, true);
    offset += 4;
  }
  return new Blob([view], { type: "audio/wav" });
}

export async function renderOffline({ audioBuffer, curves, settings, signal, onProgress }) {
  const sourceRate = audioBuffer.sampleRate;
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;
  const sourceDuration = audioBuffer.duration;
  const globalDirection = settings.globalDirection < 0 ? -1 : 1;
  const requestedDuration = estimateOutputDuration(sourceDuration, curves.stretch);
  const maxDuration = 180;
  const outputDuration = Math.min(requestedDuration, maxDuration);
  const outLength = Math.max(1, Math.ceil(outputDuration * sourceRate));
  const outL = new Float32Array(outLength);
  const outR = new Float32Array(outLength);
  const directMode = transformCanUseDirect(curves.stretch, curves.pitch);
  let lastProgress = 0;
  let lastYield = performance.now();

  if (directMode) {
    let smoothGain = 0;
    let smoothPan = panFromNorm(valueAt(curves.pan, 0));
    const initialDirection = initialPlaybackDirection(curves.stretch, globalDirection);
    let sourceFrame = initialDirection < 0 ? left.length - 3 : 0;
    for (let i = 0; i < outLength; i += 1) {
      if (signal?.aborted) throw new DOMException("Render cancelled", "AbortError");
      const norm = outLength > 1 ? Math.min(1, i / (outLength - 1)) : 0;
      const speed = effectiveSpeedAt(curves.stretch, norm, globalDirection);
      const pan = panFromNorm(valueAt(curves.pan, norm));
      smoothGain += (settings.outputGain - smoothGain) * TRANSFORM_CONSTANTS.gainSmoothing;
      smoothPan += (pan - smoothPan) * TRANSFORM_CONSTANTS.panSmoothing;
      const panAngle = (smoothPan + 1) * Math.PI * 0.25;
      const leftPan = Math.cos(panAngle) * 1.41421356237;
      const rightPan = Math.sin(panAngle) * 1.41421356237;
      outL[i] = Math.tanh(readCubic(left, sourceFrame) * smoothGain * leftPan);
      outR[i] = Math.tanh(readCubic(right, sourceFrame) * smoothGain * rightPan);
      sourceFrame = Math.max(0, Math.min(left.length - 3, sourceFrame + speed));

      const progress = i / outLength;
      const now = performance.now();
      if (progress - lastProgress > 0.01 || now - lastYield > 60) {
        lastProgress = progress;
        onProgress?.(progress);
        lastYield = now;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    onProgress?.(1);
    return {
      left: outL,
      right: outR,
      sampleRate: sourceRate,
      duration: outLength / sourceRate,
      blob: encodeWav(outL, outR, sourceRate),
      truncated: requestedDuration > maxDuration
    };
  }

  const grainSamples = Math.max(TRANSFORM_CONSTANTS.minGrainSamples, Math.round((settings.grainSizeMs / 1000) * sourceRate));
  const density = Math.max(2, settings.density);
  const hop = Math.max(TRANSFORM_CONSTANTS.minHopSamples, Math.round(grainSamples / density));
  const randomSamples = settings.randomness * grainSamples * TRANSFORM_CONSTANTS.jitterFactor;
  const speedSmoothing = smoothingForBlock(TRANSFORM_CONSTANTS.speedSmoothing, hop);
  const rateSmoothing = smoothingForBlock(TRANSFORM_CONSTANTS.rateSmoothing, hop);
  const gainSmoothing = smoothingForBlock(TRANSFORM_CONSTANTS.gainSmoothing, hop);
  const panSmoothing = smoothingForBlock(TRANSFORM_CONSTANTS.panSmoothing, hop);
  const nextRandom = createSeededRandom();
  const initialDirection = initialPlaybackDirection(curves.stretch, globalDirection);
  let lastReadDirection = initialDirection;
  let sourceFrame = initialDirection < 0 ? left.length - 3 : 0;
  let smoothSpeed = effectiveSpeedAt(curves.stretch, 0, globalDirection);
  let smoothRate = Math.pow(2, centsFromNorm(valueAt(curves.pitch, 0)) / 1200);
  let smoothGain = 0;
  let smoothPan = panFromNorm(valueAt(curves.pan, 0));

  for (let outPos = 0; outPos < outLength; outPos += hop) {
    if (signal?.aborted) {
      throw new DOMException("Render cancelled", "AbortError");
    }

    const norm = Math.min(1, outPos / Math.max(1, outLength - 1));
    const speed = effectiveSpeedAt(curves.stretch, norm, globalDirection);
    const cents = centsFromNorm(valueAt(curves.pitch, norm));
    const pan = panFromNorm(valueAt(curves.pan, norm));
    const rate = Math.pow(2, cents / 1200);
    smoothSpeed += (speed - smoothSpeed) * speedSmoothing;
    smoothRate += (rate - smoothRate) * rateSmoothing;
    smoothGain += (settings.outputGain - smoothGain) * gainSmoothing;
    smoothPan += (pan - smoothPan) * panSmoothing;
    const center = sourceFrame;
    const jitter = (nextRandom() - 0.5) * randomSamples;
    lastReadDirection = speedDirection(smoothSpeed, lastReadDirection);
    const grainRate = smoothRate * lastReadDirection;
    const startSource = grainStart(center, grainSamples, grainRate, left.length, jitter);
    const panAngle = (smoothPan + 1) * Math.PI * 0.25;
    const leftPan = Math.cos(panAngle) * 1.41421356237;
    const rightPan = Math.sin(panAngle) * 1.41421356237;
    const grainScale = grainMixScale(smoothGain, density);

    for (let i = 0; i < grainSamples; i += 1) {
      const write = outPos + i;
      if (write >= outLength) break;
      const phase = i / Math.max(1, grainSamples - 1);
      const env = grainEnvelope(phase);
      const read = startSource + (i * grainRate);
      outL[write] += readCubic(left, read) * env * leftPan * grainScale;
      outR[write] += readCubic(right, read) * env * rightPan * grainScale;
    }

    sourceFrame = Math.max(0, Math.min(left.length - 3, sourceFrame + (hop * smoothSpeed)));
    const progress = outPos / outLength;
    const now = performance.now();
    if (progress - lastProgress > 0.01 || now - lastYield > 60) {
      lastProgress = progress;
      onProgress?.(progress);
      lastYield = now;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  let peak = 0;
  for (let i = 0; i < outLength; i += 1) {
    peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i]));
  }
  const normalise = peak > 0 ? Math.min(1.0, 0.92 / peak) : 1;
  for (let i = 0; i < outLength; i += 1) {
    outL[i] = Math.tanh(outL[i] * normalise);
    outR[i] = Math.tanh(outR[i] * normalise);
  }

  onProgress?.(1);
  return {
    left: outL,
    right: outR,
    sampleRate: sourceRate,
    duration: outLength / sourceRate,
    blob: encodeWav(outL, outR, sourceRate),
    truncated: requestedDuration > maxDuration
  };
}
