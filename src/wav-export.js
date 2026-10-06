import { prepareWavChannels, WAV_SAMPLE_RATE } from "./wav-output.js?v=20261006-stream-01";
import { createWavWriter } from "./wav-encoder.js?v=20261006-stream-01";

// The sink snapshots Float32 blocks immediately, preserving Float32 rounding
// before PCM24 quantization without retaining the full converted stereo buffer.
export async function exportWav(left, right, sourceRate, signal) {
  if (signal?.aborted) throw new DOMException("Render cancelled", "AbortError");
  const frameCount = Math.max(1, Math.round(left.length * WAV_SAMPLE_RATE / sourceRate));
  const writer = createWavWriter(frameCount, WAV_SAMPLE_RATE, signal);
  const output = await prepareWavChannels(left, right, sourceRate, signal,
    (l, r) => writer.append(l, r));
  return { ...output, duration: output.frameCount / output.sampleRate, blob: writer.finish() };
}
