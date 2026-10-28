import { toneColor } from './source-colors.js';
import { visualGain } from './waveform-view.js';

// A display-only raster of the whole working source. Viewport shading lives in
// CSS, so panning, selection and playback never rebuild this waveform.
export function createSourceOverview(canvas) {
  const ctx = canvas.getContext('2d');
  let cached = null;
  return function paint({ peaks, colors, referencePeak }) {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const scale = globalThis.devicePixelRatio || 1;
    if (cached && cached.peaks === peaks && cached.colors === colors &&
        cached.referencePeak === referencePeak && cached.width === width &&
        cached.height === height && cached.scale === scale) return false;
    cached = { peaks, colors, referencePeak, width, height, scale };
    canvas.width = Math.max(1, Math.floor(width * scale));
    canvas.height = Math.max(1, Math.floor(height * scale));
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);
    // Match the detailed waveform: wait for this source's colors, with no
    // temporary old-style waveform or previous file's raster.
    if (!peaks.length || !colors) return true;
    const columns = canvas.width;
    const laneHeight = height / 2;
    const amplitude = Math.max(0, laneHeight / 2 - 1);
    const gain = visualGain(referencePeak);
    for (let channel = 0; channel < 2; channel++) {
      const lane = peaks[channel] || peaks[0];
      const spectrum = colors[channel] || colors[0];
      if (!lane?.length || !spectrum?.length) continue;
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      const stops = Math.min(256, Math.max(2, spectrum.length));
      for (let i = 0; i < stops; i++) {
        const t = i / (stops - 1);
        gradient.addColorStop(t, toneColor(spectrum[Math.min(spectrum.length - 1, Math.floor(t * spectrum.length))]));
      }
      ctx.fillStyle = gradient;
      const middle = laneHeight * (channel + .5);
      const upper = new Float32Array(columns), lower = new Float32Array(columns);
      // Signed min/max, including the final bucket. Do not smooth transients or
      // resample/change PCM just to make the navigation picture look fuller.
      for (let x = 0; x < columns; x++) {
        const start = Math.floor(x / columns * lane.length);
        const end = Math.min(lane.length, Math.max(start + 1, Math.ceil((x + 1) / columns * lane.length)));
        let lo = 0, hi = 0;
        for (let i = start; i < end; i++) {
          lo = Math.min(lo, lane.minimum?.[i] ?? -lane[i]);
          hi = Math.max(hi, lane.maximum?.[i] ?? lane[i]);
        }
        upper[x] = middle - Math.min(amplitude, hi * gain * amplitude);
        lower[x] = middle - Math.max(-amplitude, lo * gain * amplitude);
      }
      ctx.beginPath();
      for (let x = 0; x < columns; x++) {
        const px = (x + .5) * width / columns;
        if (x) ctx.lineTo(px, upper[x]); else ctx.moveTo(px, upper[x]);
      }
      for (let x = columns - 1; x >= 0; x--) ctx.lineTo((x + .5) * width / columns, lower[x]);
      ctx.closePath();
      ctx.fill();
    }
    return true;
  };
}
