// COMMON CANDIDATE: identical in all six Labs. No DSP or export policy here.
// AIFF PCM -> in-memory PCM WAV; keep the established browser resampler.
const FILE_LIMIT = 128 * 1024 * 1024;
const PCM_LIMIT = 192 * 1024 * 1024;
const fail = (reason) => { throw new Error(`AIFF: ${reason} Use a mono/stereo 16/24-bit PCM WAV or a shorter excerpt.`); };
const tag = (view, offset) => String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset, 4));

export function inspectAiff(bytes, targetRate = 48000) {
  const v = new DataView(bytes);
  if (v.byteLength < 4 || tag(v, 0) !== "FORM") return null;
  if (v.byteLength < 12) fail("Incomplete header.");
  const kind = tag(v, 8);
  if (kind === "AIFC") fail("AIFF-C is not supported by the portable importer yet.");
  if (kind !== "AIFF") return null;
  if (v.byteLength > FILE_LIMIT) fail("File exceeds 128 MiB.");
  const end = v.getUint32(4) + 8;
  if (end < 12 || end > v.byteLength) fail("Incomplete FORM data.");
  let comm = null, sound = null, chunks = 0;
  for (let at = 12; at < end;) {
    if (++chunks > 4096 || at + 8 > end) fail("Invalid chunk structure.");
    const id = tag(v, at), size = v.getUint32(at + 4), start = at + 8;
    const next = start + size + (size % 2);
    if (next > end) fail("Truncated chunk.");
    if (id === "COMM") {
      if (comm || size < 18) fail("Invalid or duplicate COMM chunk.");
      const channels = v.getUint16(start), frames = v.getUint32(start + 2), bits = v.getUint16(start + 6);
      const exponent = v.getUint16(start + 8);
      const hi = v.getUint32(start + 10), lo = v.getUint32(start + 14);
      const rate = (hi * 2 ** 32 + lo) * 2 ** (exponent - 16383 - 63);
      if (exponent & 0x8000 || exponent === 0 || exponent === 0x7fff || !(hi & 0x80000000)
          || !Number.isInteger(rate) || rate < 8000 || rate > 192000) fail("Unsupported sample rate.");
      if (![1, 2].includes(channels)) fail("Only mono/stereo AIFF is supported.");
      if (![16, 24].includes(bits)) fail("Only 16/24-bit PCM AIFF is supported.");
      if (!frames) fail("Empty audio.");
      if (!Number.isFinite(targetRate) || targetRate <= 0) fail("Invalid decoder sample rate.");
      if (Math.max(frames, Math.ceil(frames * targetRate / rate)) * channels * 4 > PCM_LIMIT) fail("Decoded audio exceeds the 192 MiB working limit.");
      comm = { channels, frames, bits, rate };
    }
    if (id === "SSND") {
      if (sound || size < 8) fail("Invalid or duplicate SSND chunk.");
      const offset = v.getUint32(start);
      if (offset > size - 8) fail("Invalid sound offset.");
      sound = { start: start + 8 + offset, bytes: size - 8 - offset };
    }
    at = next;
  }
  if (!comm || !sound) fail("Missing COMM or SSND chunk.");
  const dataBytes = comm.frames * comm.channels * comm.bits / 8;
  if (dataBytes > sound.bytes) fail("Sound data is shorter than the declared duration.");
  if (dataBytes + 44 > FILE_LIMIT) fail("Converted audio exceeds the working limit.");
  return { ...comm, start: sound.start, dataBytes };
}

export async function aiffToWav(bytes, targetRate = 48000) {
  const info = inspectAiff(bytes, targetRate);
  if (!info) return bytes; // WAV/MP3 and all other codecs retain their existing path.
  const { channels, frames, bits, rate, start, dataBytes } = info;
  const padding = dataBytes % 2;
  const result = new ArrayBuffer(44 + dataBytes + padding), v = new DataView(result);
  const out = new Uint8Array(result), input = new Uint8Array(bytes);
  const writeTag = (at, value) => { for (let i = 0; i < 4; i++) out[at + i] = value.charCodeAt(i); };
  writeTag(0, "RIFF"); v.setUint32(4, result.byteLength - 8, true); writeTag(8, "WAVE");
  writeTag(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, channels, true); v.setUint32(24, rate, true);
  const width = bits / 8, align = channels * width;
  v.setUint32(28, rate * align, true); v.setUint16(32, align, true); v.setUint16(34, bits, true);
  writeTag(36, "data"); v.setUint32(40, frames * align, true);
  // Yield between bounded batches; large files must not monopolize the UI thread.
  const batchBytes = Math.floor(262144 / width) * width;
  for (let base = 0; base < dataBytes; base += batchBytes) {
    const end = Math.min(base + batchBytes, dataBytes);
    for (let i = base; i < end; i += width) {
      for (let b = 0; b < width; b++) out[44 + i + b] = input[start + i + width - 1 - b];
    }
    if (end < dataBytes) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return result;
}

export async function readAudioFile(file, targetRate = 48000) {
  // Inspect before allocating a full input buffer. The caller's stricter limits remain.
  const head = new DataView(await file.slice(0, 12).arrayBuffer());
  const isForm = head.byteLength >= 4 && tag(head, 0) === "FORM";
  if (isForm && file.size > FILE_LIMIT) fail("File exceeds 128 MiB.");
  return aiffToWav(await file.arrayBuffer(), targetRate);
}
