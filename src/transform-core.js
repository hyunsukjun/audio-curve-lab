export const TRANSFORM_CONSTANTS = Object.freeze({
  minSpeed: 0.125,
  maxSpeed: 4,
  minGrainSamples: 128,
  minHopSamples: 24,
  jitterFactor: 0.75,
  speedSmoothing: 0.0008,
  rateSmoothing: 0.0008,
  gainSmoothing: 0.0015,
  panSmoothing: 0.0015,
  randomSeed: 0x4f1bbcdc
});

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function valueAt(curve, x) {
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

export function speedFromNorm(y) {
  const clamped = clamp(y, 0, 1);
  if (clamped < 0.5) {
    return TRANSFORM_CONSTANTS.minSpeed
      + ((clamped / 0.5) * (1 - TRANSFORM_CONSTANTS.minSpeed));
  }
  return 1 + (((clamped - 0.5) / 0.5) * (TRANSFORM_CONSTANTS.maxSpeed - 1));
}

export function centsFromNorm(y) {
  return -2400 + (clamp(y, 0, 1) * 4800);
}

export function panFromNorm(y) {
  return clamp((clamp(y, 0, 1) - 0.5) * 2, -1, 1);
}

export function grainEnvelope(phase) {
  return Math.sin(Math.PI * clamp(phase, 0, 1));
}

export function grainMixScale(gain, density) {
  return gain / Math.sqrt(Math.max(1, density * 0.8));
}

export function readCubic(buffer, pos) {
  if (!buffer || buffer.length === 0 || pos < 0 || pos >= buffer.length - 3) return 0;
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

export function curveIsNeutral(curve, neutralValue = 0.5, tolerance = 0.0001) {
  return Boolean(curve?.length)
    && curve.every((point) => Math.abs(point.y - neutralValue) < tolerance);
}

export function transformIsNeutral(stretchCurve, pitchCurve) {
  return curveIsNeutral(stretchCurve) && curveIsNeutral(pitchCurve);
}

export function grainStart(center, grainSamples, rate, bufferLength, jitter = 0) {
  const span = (grainSamples - 1) * rate;
  const maxStart = Math.max(0, bufferLength - 3 - span);
  return clamp(center + jitter - (span * 0.5), 0, maxStart);
}

export function smoothingForBlock(perSampleAmount, blockSize) {
  return 1 - Math.pow(1 - perSampleAmount, Math.max(1, blockSize));
}

export function createSeededRandom(seed = TRANSFORM_CONSTANTS.randomSeed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
