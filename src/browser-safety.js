// Display coordinates only; normalized curve values and DSP remain unchanged.
export const screenY = (name, value) => name === "pan" ? value : 1 - value;
export const curveY = (name, screen) => name === "pan" ? screen : 1 - screen;

// Provisional admission guards, not a device-memory guarantee.
export const MAX_FILE_BYTES = 128 * 1024 * 1024;
export const MAX_PCM_BYTES = 192 * 1024 * 1024;
export function checkFileSize(size) {
  if (size > MAX_FILE_BYTES) throw new Error("File exceeds 128 MiB. Open a shorter excerpt. Current audio is unchanged.");
}
export function checkPCM(frames, channels) {
  if (frames * channels * 4 > MAX_PCM_BYTES) throw new Error("Decoded audio exceeds the 192 MiB working limit. Open a shorter excerpt. Current audio is unchanged.");
}
// Read RIFF chunk headers only, never the audio payload. Unknown/compressed
// formats still need browser decode and a post-decode check.
export async function preflightWav(file, contextRate) {
  const head = new DataView(await file.slice(0, 12).arrayBuffer());
  const tag = (v, at) => String.fromCharCode(...new Uint8Array(v.buffer, at, 4));
  if (head.byteLength < 12 || tag(head, 0) !== "RIFF" || tag(head, 8) !== "WAVE") return;
  let offset = 12, format = null, dataBytes = null;
  for (let count = 0; offset + 8 <= file.size && count < 4096; count++) {
    const h = new DataView(await file.slice(offset, offset + 8).arrayBuffer());
    const id = tag(h, 0), size = h.getUint32(4, true);
    if (offset + 8 + size > file.size) throw new Error("Incomplete WAV file. Current audio is unchanged.");
    if (id === "fmt " && size >= 16) {
      const f = new DataView(await file.slice(offset + 8, offset + 24).arrayBuffer());
      format = { code: f.getUint16(0, true), channels: f.getUint16(2, true), rate: f.getUint32(4, true), align: f.getUint16(12, true) };
    }
    if (id === "data") dataBytes = size;
    if (format && dataBytes !== null) break;
    offset += 8 + size + (size % 2);
  }
  if (format && dataBytes !== null && [1, 3, 65534].includes(format.code) && format.rate && format.align) {
    checkPCM(Math.ceil(dataBytes / format.align / format.rate * contextRate), format.channels);
  }
}
