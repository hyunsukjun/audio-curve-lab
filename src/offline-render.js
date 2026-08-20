function valueAt(curve, x) {
  if (!curve || curve.length === 0) return 0;
  if (x <= curve[0].x) return curve[0].y;
  for (let i = 1; i < curve.length; i += 1) {
    const a = curve[i - 1];
    const b = curve[i];
    if (x <= b.x) {
      const t = (x - a.x) / Math.max(1e-6, b.x - a.x);
      const eased = t * t * (3 - (2 * t));
      return a.y + ((b.y - a.y) * eased);
    }
  }
  return curve[curve.length - 1].y;
}

function readCubic(buffer, pos) {
  if (!buffer || pos < 0 || pos >= buffer.length - 3) return 0;
  const i0 = Math.floor(pos);
  const frac = pos - i0;
  const xm1 = buffer[Math.max(0, i0 - 1)];
  const x0 = buffer[i0];
  const x1 = buffer[i0 + 1];
  const x2 = buffer[Math.min(buffer.length - 1, i0 + 2)];
  const a = (-0.5 * xm1) + (1.5 * x0) - (1.5 * x1) + (0.5 * x2);
  const b = xm1 - (2.5 * x0) + (2 * x1) - (0.5 * x2);
  const c = (-0.5 * xm1) + (0.5 * x1);
  return (((a * frac) + b) * frac + c) * frac + x0;
}

function speedFromNorm(y) {
  const minSpeed = 0.125;
  const maxSpeed = 4;
  const clamped = Math.max(0, Math.min(1, y));
  if (clamped < 0.5) {
    return minSpeed + ((clamped / 0.5) * (1 - minSpeed));
  }
  return 1 + (((clamped - 0.5) / 0.5) * (maxSpeed - 1));
}

function centsFromNorm(y) {
  return -2400 + (Math.max(0, Math.min(1, y)) * 4800);
}

function panFromNorm(y) {
  return Math.max(-1, Math.min(1, (Math.max(0, Math.min(1, y)) - 0.5) * 2));
}

function envelope(phase) {
  const sine = Math.sin(Math.PI * Math.max(0, Math.min(1, phase)));
  return sine * sine;
}

function createRng(seed = 0x12345678) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function applyEdgeFade(left, right, sampleRate) {
  const fadeSamples = Math.min(left.length, Math.max(1, Math.round(sampleRate * 0.005)));
  for (let i = 0; i < fadeSamples; i += 1) {
    const inGain = i / fadeSamples;
    const outGain = (fadeSamples - i) / fadeSamples;
    left[i] *= inGain;
    right[i] *= inGain;
    const tail = left.length - 1 - i;
    left[tail] *= outGain;
    right[tail] *= outGain;
  }
}

function estimateDuration(sourceDuration, speedCurve) {
  let sum = 0;
  const steps = 512;
  for (let i = 0; i < steps; i += 1) {
    sum += 1 / speedFromNorm(valueAt(speedCurve, (i + 0.5) / steps));
  }
  return sourceDuration * (sum / steps);
}

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
  const requestedDuration = estimateDuration(sourceDuration, curves.stretch);
  const maxDuration = 180;
  const outputDuration = Math.min(requestedDuration, maxDuration);
  const outLength = Math.max(1, Math.ceil(outputDuration * sourceRate));
  const outL = new Float32Array(outLength);
  const outR = new Float32Array(outLength);

  const baseGrainSamples = Math.max(128, Math.round((settings.grainSizeMs / 1000) * sourceRate));
  const baseDensity = Math.max(2, settings.density);
  const gain = settings.outputGain;
  const rng = createRng();
  let sourceTime = 0;
  let outPos = 0;
  let lastProgress = 0;
  let lastYield = performance.now();

  while (outPos < outLength && sourceTime < sourceDuration) {
    if (signal?.aborted) {
      throw new DOMException("Render cancelled", "AbortError");
    }

    const norm = Math.min(1, sourceTime / sourceDuration);
    const speed = speedFromNorm(valueAt(curves.stretch, norm));
    const cents = centsFromNorm(valueAt(curves.pitch, norm));
    const pan = panFromNorm(valueAt(curves.pan, norm));
    const rate = Math.pow(2, cents / 1200);
    const slowStress = Math.min(3, Math.max(0, (1 / Math.max(0.125, speed)) - 1));
    const pitchStress = Math.min(1, Math.abs(cents) / 2400);
    const grainSamples = clamp(
      Math.round(baseGrainSamples * (1 + (slowStress * 0.12) + (pitchStress * 0.18))),
      128,
      Math.round(sourceRate * 0.32)
    );
    const density = baseDensity * (1 + (slowStress * 0.28) + (pitchStress * 0.45));
    const hop = Math.max(16, Math.round(grainSamples / density));
    const randomSamples = settings.randomness * grainSamples * (1 - (pitchStress * 0.35));
    const center = sourceTime * sourceRate;
    const jitter = (rng() - 0.5) * randomSamples;
    const startSource = center + jitter;
    const panAngle = (pan + 1) * Math.PI * 0.25;
    const leftPan = Math.cos(panAngle) * 1.41421356237;
    const rightPan = Math.sin(panAngle) * 1.41421356237;

    for (let i = 0; i < grainSamples; i += 1) {
      const write = outPos + i;
      if (write >= outLength) break;
      const phase = i / grainSamples;
      const env = envelope(phase);
      const read = startSource + (i * rate);
      outL[write] += readCubic(left, read) * env * leftPan;
      outR[write] += readCubic(right, read) * env * rightPan;
    }

    sourceTime += (hop / sourceRate) * speed;
    outPos += hop;
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
  const normalise = peak > 0 ? Math.min(1.0, 0.92 / peak) * gain : 1;
  for (let i = 0; i < outLength; i += 1) {
    outL[i] = Math.max(-1, Math.min(1, outL[i] * normalise));
    outR[i] = Math.max(-1, Math.min(1, outR[i] * normalise));
  }
  applyEdgeFade(outL, outR, sourceRate);

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
