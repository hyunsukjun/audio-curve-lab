export async function encodeWav(left, right, sampleRate, signal) {
  const checkAbort = () => {
    if (signal?.aborted) throw new DOMException("Render cancelled", "AbortError");
  };
  checkAbort();
  const length = left.length;
  const channelCount = 2;
  const bytesPerSample = 3;
  const blockAlign = channelCount * bytesPerSample;
  const dataBytes = length * blockAlign;
  const bytes = 44 + dataBytes;
  let view = new DataView(new ArrayBuffer(44));
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i += 1) view.setUint8(offset + i, string.charCodeAt(i));
  };
  const writeInt24 = (offset, value) => {
    const clamped = Math.max(-1, Math.min(1, value));
    const sample = Math.round(clamped < 0 ? clamped * 8388608 : clamped * 8388607);
    view.setUint8(offset, sample & 0xff);
    view.setUint8(offset + 1, (sample >> 8) & 0xff);
    view.setUint8(offset + 2, (sample >> 16) & 0xff);
  };

  writeString(0, "RIFF");
  view.setUint32(4, bytes - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 24, true);
  writeString(36, "data");
  view.setUint32(40, dataBytes, true);

  // Snapshot each bounded PCM block; never allocate one full WAV ArrayBuffer.
  const parts = [new Blob([view])];
  const blockFrames = 65536;
  for (let start = 0; start < length; start += blockFrames) {
    checkAbort();
    const end = Math.min(length, start + blockFrames);
    view = new DataView(new ArrayBuffer((end - start) * blockAlign));
    let offset = 0;
    for (let i = start; i < end; i += 1) {
      writeInt24(offset, left[i]);
      writeInt24(offset + bytesPerSample, right[i]);
      offset += blockAlign;
    }
    parts.push(new Blob([view]));
    // Also yield after the last block so a pending cancel wins over download.
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  checkAbort();
  return new Blob(parts, { type: "audio/wav" });
}
