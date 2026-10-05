export const WAV_SAMPLE_RATE = 48000;
const TAPS = 96;
const HALF = TAPS / 2;
const BLOCK_FRAMES = 8192;

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

function makeKernel(sourceRate) {
  // Exact rational phases for common audio rates; bound memory for unusual rates.
  const phaseCount = Math.min(1024, WAV_SAMPLE_RATE / gcd(sourceRate, WAV_SAMPLE_RATE));
  const cutoff = 0.94 * Math.min(1, WAV_SAMPLE_RATE / sourceRate);
  const coefficients = new Float64Array(phaseCount * TAPS);
  for (let phase = 0; phase < phaseCount; phase += 1) {
    const fraction = phase / phaseCount;
    let sum = 0;
    for (let tap = 0; tap < TAPS; tap += 1) {
      const distance = tap - HALF + 1 - fraction;
      const angle = Math.PI * cutoff * distance;
      const sinc = Math.abs(angle) < 1e-12 ? 1 : Math.sin(angle) / angle;
      const window = 0.42 + 0.5 * Math.cos(Math.PI * distance / HALF)
        + 0.08 * Math.cos(2 * Math.PI * distance / HALF);
      const value = cutoff * sinc * window;
      coefficients[phase * TAPS + tap] = value;
      sum += value;
    }
    for (let tap = 0; tap < TAPS; tap += 1) coefficients[phase * TAPS + tap] /= sum;
  }
  return { phaseCount, coefficients };
}

// Resample the completed DSP output. Keep source-rate DSP and Preview untouched.
// A centered, DC-normalized Blackman-windowed sinc compensates filter delay.
export async function prepareWavChannels(left, right, sourceRate, signal) {
  if (signal?.aborted) throw new DOMException("Render cancelled", "AbortError");
  if (!left.length || left.length !== right.length || !Number.isInteger(sourceRate) || sourceRate <= 0) {
    throw new Error("Invalid stereo output for WAV conversion");
  }
  if (sourceRate === WAV_SAMPLE_RATE) return { left, right, sampleRate: WAV_SAMPLE_RATE };

  const frameCount = Math.max(1, Math.round(left.length * WAV_SAMPLE_RATE / sourceRate));
  const outL = new Float32Array(frameCount);
  const outR = new Float32Array(frameCount);
  const { phaseCount, coefficients } = makeKernel(sourceRate);
  const ratio = sourceRate / WAV_SAMPLE_RATE;
  for (let start = 0; start < frameCount; start += BLOCK_FRAMES) {
    if (signal?.aborted) throw new DOMException("Render cancelled", "AbortError");
    const end = Math.min(frameCount, start + BLOCK_FRAMES);
    for (let frame = start; frame < end; frame += 1) {
      const position = frame * ratio;
      let center = Math.floor(position);
      let phase = Math.round((position - center) * phaseCount);
      if (phase === phaseCount) { center += 1; phase = 0; }
      const first = center - HALF + 1;
      const kernelStart = phase * TAPS;
      let l = 0;
      let r = 0;
      for (let tap = 0; tap < TAPS; tap += 1) {
        const index = Math.max(0, Math.min(left.length - 1, first + tap));
        const weight = coefficients[kernelStart + tap];
        l += left[index] * weight;
        r += right[index] * weight;
      }
      outL[frame] = l;
      outR[frame] = r;
    }
    // Yield between blocks so cancellation and browser UI remain responsive.
    if (end < frameCount) await new Promise(resolve => setTimeout(resolve, 0));
  }
  if (signal?.aborted) throw new DOMException("Render cancelled", "AbortError");
  return { left: outL, right: outR, sampleRate: WAV_SAMPLE_RATE };
}
