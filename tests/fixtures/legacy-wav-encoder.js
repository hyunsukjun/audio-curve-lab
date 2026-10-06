// Frozen pre-chunking encoder: byte-compatibility oracle.
export function encodeWav(left, right, sampleRate) {
  const length = left.length;
  const channelCount = 2;
  const bytesPerSample = 3;
  const blockAlign = channelCount * bytesPerSample;
  const dataBytes = length * blockAlign;
  const bytes = 44 + dataBytes;
  const view = new DataView(new ArrayBuffer(bytes));
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

  let offset = 44;
  for (let i = 0; i < length; i += 1) {
    writeInt24(offset, left[i]);
    writeInt24(offset + bytesPerSample, right[i]);
    offset += blockAlign;
  }
  return new Blob([view], { type: "audio/wav" });
}
