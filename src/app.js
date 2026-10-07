import { MAX_OUTPUT_SECONDS } from "./output-policy.js?v=20261007-5min1";
import { screenY, curveY, checkFileSize, checkPCM, preflightWav } from "./browser-safety.js?v=20261007-1";
import {
  centsFromNorm,
  effectiveSpeedAt,
  estimateOutputDuration,
  initialPlaybackDirection,
  panFromNorm,
  sourcePositionAtProgress,
  speedFromNorm,
  valueAt
} from "./transform-core.js?v=20261003-01";
import { OutputMeterAnalyzer } from "./output-meter.js?v=20260929-04";

const fileInput = document.getElementById("fileInput");
const durationNotice = document.getElementById("durationNotice");
const fileNotice = document.getElementById("fileNotice");
const saveWavLink = document.getElementById("saveWavLink");
const fileStatus = document.getElementById("fileStatus");
const timeStatus = document.getElementById("timeStatus");
const sourceWaveCanvas = document.getElementById("sourceWaveCanvas");
const sourceWaveCtx = sourceWaveCanvas.getContext("2d");
const outputWaveCanvas = document.getElementById("outputWaveCanvas");
const outputWaveCtx = outputWaveCanvas.getContext("2d");
const sourceReadout = document.getElementById("sourceReadout");
const playButton = document.getElementById("playButton");
const stopButton = document.getElementById("stopButton");
const downloadButton = document.getElementById("downloadButton");
const clearCurveButton = document.getElementById("clearCurveButton");
const resetButton = document.getElementById("resetButton");
const canvas = document.getElementById("waveCanvas");
const ctx = canvas.getContext("2d");
const curveFrame = canvas.parentElement;
const stretchMode = document.getElementById("stretchMode");
const pitchMode = document.getElementById("pitchMode");
const panMode = document.getElementById("panMode");
const stretchReadout = document.getElementById("stretchReadout");
const pitchReadout = document.getElementById("pitchReadout");
const panReadout = document.getElementById("panReadout");
const downloadReadout = document.getElementById("downloadReadout");
const modeReadout = document.getElementById("modeReadout");
const pointsReadout = document.getElementById("pointsReadout");
const penTool = document.getElementById("penTool");
const eraserTool = document.getElementById("eraserTool");
const resetDialog = document.getElementById("resetDialog");
const cancelResetButton = document.getElementById("cancelResetButton");
const confirmResetButton = document.getElementById("confirmResetButton");
const meterRows = Array.from(document.querySelectorAll("[data-meter-channel]"));
const meterClipButton = document.getElementById("meterClipButton");
const eraseModifier = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgentData?.platform || "")
  ? "metaKey"
  : "ctrlKey";

const transformSettings = {
  grainSizeMs: 140,
  density: 5.5,
  randomness: 0.02,
  outputGain: 0.95,
  globalDirection: 1
};

const largeFileSeconds = MAX_OUTPUT_SECONDS;

const curveColors = {
  stretch: "#6de0c0",
  pitch: "#eb6f75",
  pan: "#b887f4"
};

let audioContext;
let audioSetupPromise = null;
let node;
let outputMeter;
let workletBufferLoaded = false;
let buffer;
let waveform = [];
let outputWaveform = [];
let outputWaveformDirty = true;
let seekingDisabled = true;
let outputHoverProgress = null;
let activeCurve = "stretch";
let selectedTool = "pen";
let selectedPoint = null;
let hoverPoint = null;
let dragging = false;
let playheadSeconds = 0;
let sourcePlayheadSeconds = 0;
let currentSpeed = 1;
let currentCents = 0;
let currentPan = 0;
let downloadUrl = null;
let renderAbortController = null;
let isPlaying = false;
let playbackToken = 0;
let renderOffline = null;
let canvasCssWidth = 1;
let canvasCssHeight = 1;
let outputDirectionGradient = null;
let isWaveSeeking = false;
let meterAnimationFrame = 0;
let meterLastFrameTime = performance.now();
let meterClipLatched = false;
const meterDisplay = meterRows.map(() => ({
  peak: 0,
  rms: 0,
  hold: 0,
  holdUntil: 0
}));
const waveformHeight = 96;
const parameterScaleWidth = 54;
const plotRightPadding = 8;

const curves = {
  stretch: [{ x: 0, y: 0.75 }, { x: 1, y: 0.75 }],
  pitch: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }],
  pan: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }]
};

const defaultCurves = {
  stretch: () => [{ x: 0, y: 0.75 }, { x: 1, y: 0.75 }],
  pitch: () => [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }],
  pan: () => [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }]
};

const editedCurves = {
  stretch: false,
  pitch: false,
  pan: false
};

const curveLabels = {
  stretch: "Speed",
  pitch: "Pitch",
  pan: "Pan"
};

function resizeCanvas() {
  const frameRect = canvas.parentElement.getBoundingClientRect();
  const targetWidth = Math.max(1, Math.floor(frameRect.width - 2));
  canvas.style.width = `${targetWidth}px`;
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvasCssWidth = Math.max(1, rect.width);
  canvasCssHeight = Math.max(1, rect.height);
  const nextWidth = Math.max(1, Math.floor(canvasCssWidth * scale));
  const nextHeight = Math.max(1, Math.floor(canvasCssHeight * scale));
  if (canvas.width !== nextWidth) canvas.width = nextWidth;
  if (canvas.height !== nextHeight) canvas.height = nextHeight;
  sourceWaveCanvas.style.width = `${targetWidth}px`;
  outputWaveCanvas.style.width = `${targetWidth}px`;
  const waveScale = window.devicePixelRatio || 1;
  const waveWidth = Math.max(1, Math.floor(canvasCssWidth * waveScale));
  const waveHeight = Math.max(1, Math.floor(waveformHeight * waveScale));
  if (sourceWaveCanvas.width !== waveWidth) sourceWaveCanvas.width = waveWidth;
  if (sourceWaveCanvas.height !== waveHeight) sourceWaveCanvas.height = waveHeight;
  if (outputWaveCanvas.width !== waveWidth) outputWaveCanvas.width = waveWidth;
  if (outputWaveCanvas.height !== waveHeight) outputWaveCanvas.height = waveHeight;
  outputDirectionGradient = null;
  draw();
}

function formatTime(seconds) {
  return `${seconds.toFixed(2)} s`;
}

function formatClock(seconds) {
  const safeSeconds = Math.max(0, seconds || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds - (minutes * 60);
  return `${String(minutes).padStart(2, "0")}:${remaining.toFixed(2).padStart(5, "0")}`;
}

function linearToDb(value) {
  return value > 0.000001 ? 20 * Math.log10(value) : -Infinity;
}

function meterPosition(value) {
  const db = linearToDb(value);
  return Math.max(0, Math.min(1, (db + 60) / 60));
}

function smoothMeterValue(current, target, elapsedMs, attackMs, releaseMs) {
  const time = target > current ? attackMs : releaseMs;
  const amount = 1 - Math.exp(-elapsedMs / Math.max(1, time));
  return current + ((target - current) * amount);
}

function updateMeterDisplay(now) {
  const elapsedMs = Math.min(100, Math.max(0, now - meterLastFrameTime));
  meterLastFrameTime = now;
  const measuredChannels = outputMeter?.read() || [];

  meterRows.forEach((row, index) => {
    const measured = measuredChannels[index] || { peak: 0, rms: 0, clipped: false };
    const display = meterDisplay[index];
    display.peak = smoothMeterValue(display.peak, measured.peak, elapsedMs, 18, 320);
    display.rms = smoothMeterValue(display.rms, measured.rms, elapsedMs, 45, 420);

    if (measured.peak >= display.hold) {
      display.hold = measured.peak;
      display.holdUntil = now + 1000;
    } else if (now > display.holdUntil) {
      display.hold = smoothMeterValue(display.hold, measured.peak, elapsedMs, 0, 700);
    }

    if (measured.clipped) meterClipLatched = true;
    row.querySelector(".meterRms").style.transform = `scaleX(${meterPosition(display.rms)})`;
    row.querySelector(".meterPeak").style.transform = `scaleX(${meterPosition(display.peak)})`;
    row.querySelector(".meterHold").style.left = `${meterPosition(display.hold) * 100}%`;
    const peakDb = linearToDb(display.peak);
    row.querySelector(".meterValue").textContent = Number.isFinite(peakDb) ? `${peakDb.toFixed(1)}` : "-∞";
  });

  meterClipButton.classList.toggle("clipped", meterClipLatched);
  meterClipButton.setAttribute("aria-pressed", String(meterClipLatched));
  meterAnimationFrame = requestAnimationFrame(updateMeterDisplay);
}

function startMeterAnimation() {
  if (meterAnimationFrame) return;
  meterLastFrameTime = performance.now();
  meterAnimationFrame = requestAnimationFrame(updateMeterDisplay);
}

function formatPan(value) {
  if (Math.abs(value) < 0.02) return "center";
  return value < 0 ? `L ${Math.round(Math.abs(value) * 100)}` : `R ${Math.round(value * 100)}`;
}

function getPlaybackDuration() {
  if (!buffer) return 0;
  return Math.min(largeFileSeconds, estimateOutputDuration(buffer.duration, curves.stretch));
}

function resetCurrentReadouts() {
  currentSpeed = effectiveSpeedAt(curves.stretch, 0, transformSettings.globalDirection);
  currentCents = centsFromNorm(valueAt(curves.pitch, 0));
  currentPan = panFromNorm(valueAt(curves.pan, 0));
}

function formatPointValue(curveName, point) {
  if (curveName === "stretch") return `${speedFromNorm(point.y).toFixed(2)}x`;
  if (curveName === "pitch") {
    const cents = Math.round(centsFromNorm(point.y));
    return `${cents > 0 ? "+" : ""}${cents} cents`;
  }
  return formatPan(panFromNorm(point.y));
}

function sortCurve(curve) {
  curve.sort((a, b) => a.x - b.x);
}

function sendCurves() {
  markDownloadStale();
  if (activeCurve === "stretch") outputWaveformDirty = true;
  if (!node) return;
  node.port.postMessage({
    type: "curves",
    stretchCurve: curves.stretch,
    pitchCurve: curves.pitch,
    panCurve: curves.pan
  });
}

function sendSettings() {
  markDownloadStale();
  if (!node) return;
  node.port.postMessage({
    type: "settings",
    settings: transformSettings
  });
}

function updateDurationNotice() {
  const duration = buffer ? estimateOutputDuration(buffer.duration, curves.stretch) : 0;
  if (duration <= MAX_OUTPUT_SECONDS && fileNotice.textContent.startsWith("Estimated output exceeds")) fileNotice.textContent = "";
  durationNotice.textContent = duration > MAX_OUTPUT_SECONDS
    ? `Estimated output ${formatClock(duration)} exceeds the 5-minute limit. Shorten the source excerpt or increase Speed. Preview stops at 05:00; WAV will not be saved until the output fits.`
    : "";
}

function markDownloadStale() {
  if (!buffer) return;
  updateDurationNotice();
  if (fileNotice.textContent.startsWith("WAV ready.")) fileNotice.textContent = "";
  clearDownload();
  downloadReadout.textContent = estimateOutputDuration(buffer.duration, curves.stretch) > largeFileSeconds
    ? "export limit: 5 min output" : "needs export";
}

function clearDownload() {
  saveWavLink.hidden = true;
  saveWavLink.removeAttribute("href");
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = null;
}

function setTransportBusy(isBusy) {
  playButton.disabled = isBusy || !buffer;
  stopButton.disabled = isBusy || !buffer;
  downloadButton.disabled = isBusy || !buffer;
  fileInput.disabled = isBusy;
  setSeekingDisabled(isBusy || !buffer);
}

function setRenderBusy(isBusy) {
  playButton.disabled = isBusy || !buffer;
  stopButton.disabled = isBusy || !buffer;
  fileInput.disabled = isBusy;
  downloadButton.disabled = !buffer;
  setSeekingDisabled(isBusy || !buffer);
}

function setSeekingDisabled(disabled) {
  seekingDisabled = disabled;
  outputWaveCanvas.setAttribute("aria-disabled", String(disabled));
}

function nextPlaybackToken() {
  playbackToken += 1;
  return playbackToken;
}

function isCurrentPlaybackMessage(data) {
  return data.token == null || data.token === playbackToken;
}

async function playAudio() {
  if (!buffer) return;
  if (isPlaying) return;
  try {
    await ensureAudio();
    if (isPlaying) return;
    const duration = getPlaybackDuration();
    node.port.postMessage({
      type: "seek",
      progress: duration > 0 ? playheadSeconds / duration : 0,
      token: playbackToken
    });
    node.port.postMessage({ type: "play", token: nextPlaybackToken() });
    isPlaying = true;
    playButton.textContent = "Playing";
  } catch (error) {
    console.error(error);
    fileStatus.textContent = error.message;
  }
}

function stopAudio() {
  if (!buffer) return;
  node?.port.postMessage({ type: "stop", reset: true, token: nextPlaybackToken() });
  isPlaying = false;
  playheadSeconds = 0;
  sourcePlayheadSeconds = 0;
  resetCurrentReadouts();
  playButton.textContent = "Play";
  draw();
}

function forceStopAudio() {
  if (!buffer) return;
  node?.port.postMessage({ type: "stop", reset: true, token: nextPlaybackToken() });
  isPlaying = false;
  playheadSeconds = 0;
  sourcePlayheadSeconds = 0;
  resetCurrentReadouts();
  playButton.textContent = "Play";
  draw();
}

function toggleAudio() {
  if (isPlaying) stopAudio();
  else playAudio();
}

function getSettings() {
  return { ...transformSettings };
}

async function getOfflineRenderer() {
  if (!renderOffline) {
    const module = await import("./offline-render.js?v=20261007-5min1");
    renderOffline = module.renderOffline;
  }
  return renderOffline;
}

async function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("Web Audio is not available in this browser.");
    }
    audioContext = new AudioContextClass();
  }
  if (audioContext.state !== "running") await audioContext.resume();
}

function sendBufferToWorklet() {
  if (!node || !buffer) return;
  const left = new Float32Array(buffer.getChannelData(0));
  const right = new Float32Array(buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0));
  node.port.postMessage({ type: "buffer", left, right, sampleRate: buffer.sampleRate }, [left.buffer, right.buffer]);
  workletBufferLoaded = true;
}

function createAudioBuffer(channelCount, length, sampleRate) {
  if (typeof AudioBuffer !== "undefined") {
    return new AudioBuffer({ numberOfChannels: channelCount, length, sampleRate });
  }

  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineContext) {
    throw new Error("Web Audio is not available in this browser.");
  }
  return new OfflineContext(channelCount, length, sampleRate).createBuffer(channelCount, length, sampleRate);
}

function createGeneratedExampleBuffer() {
  const sampleRate = 48000;
  const durationSeconds = 8;
  const length = sampleRate * durationSeconds;
  const exampleBuffer = createAudioBuffer(2, length, sampleRate);
  const left = exampleBuffer.getChannelData(0);
  const right = exampleBuffer.getChannelData(1);
  const noiseBurstSeconds = 0.045833;
  const gapSeconds = 0.020833;
  const attackSeconds = 0.003;
  const decaySeconds = 0.014;
  const sustainLevel = 0.22;
  const releaseSeconds = 0.018;
  const gain = 0.32;
  const noiseFrames = Math.floor(noiseBurstSeconds * sampleRate);
  const gapFrames = Math.floor(gapSeconds * sampleRate);
  const cycleFrames = Math.max(1, noiseFrames + gapFrames);
  const attackFrames = Math.max(1, Math.floor(attackSeconds * sampleRate));
  const decayFrames = Math.max(1, Math.floor(decaySeconds * sampleRate));
  const releaseFrames = Math.max(1, Math.floor(releaseSeconds * sampleRate));
  let seed = 123456789;

  const nextNoise = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return (seed / 4294967295) * 2 - 1;
  };

  for (let i = 0; i < length; i += 1) {
    const cyclePosition = i % cycleFrames;
    if (cyclePosition >= noiseFrames) {
      continue;
    }

    let envelope = sustainLevel;
    if (cyclePosition < attackFrames) {
      envelope = cyclePosition / attackFrames;
    } else if (cyclePosition < attackFrames + decayFrames) {
      const decayPosition = (cyclePosition - attackFrames) / decayFrames;
      envelope = 1 - ((1 - sustainLevel) * decayPosition);
    }

    const releasePosition = (noiseFrames - cyclePosition) / releaseFrames;
    envelope *= Math.max(0, Math.min(1, releasePosition));
    const sample = nextNoise() * gain * envelope;
    left[i] = sample;
    right[i] = sample;
  }

  return exampleBuffer;
}

function loadGeneratedExample() {
  buffer = createGeneratedExampleBuffer();
  buildWaveform(buffer);
  workletBufferLoaded = false;
  clearDownload();
  downloadReadout.textContent = "ready";
  fileStatus.textContent = `White noise intervals - ${buffer.duration.toFixed(2)} s`;
  playheadSeconds = 0;
  sourcePlayheadSeconds = 0;
  resetCurrentReadouts();
  setTransportBusy(false);
  draw();
}

function getPlotBounds() {
  return {
    left: parameterScaleWidth,
    width: Math.max(1, canvasCssWidth - parameterScaleWidth - plotRightPadding),
    height: canvasCssHeight
  };
}

function getParameterTicks() {
  if (activeCurve === "pitch") {
    return [
      { y: 1, label: "+2400" },
      { y: 0.75, label: "+1200" },
      { y: 0.5, label: "0" },
      { y: 0.25, label: "-1200" },
      { y: 0, label: "-2400" }
    ];
  }
  if (activeCurve === "pan") {
    return [{ y: 1, label: "R" }, { y: 0.5, label: "C" }, { y: 0, label: "L" }];
  }
  return [
    { y: 1, label: "+2.0x" },
    { y: 0.75, label: "+1.0x" },
    { y: 0.5, label: "0.0x", emphasis: true },
    { y: 0.25, label: "-1.0x" },
    { y: 0, label: "-2.0x" }
  ];
}

function drawParameterScale() {
  const { left, width, height } = getPlotBounds();
  ctx.save();
  ctx.font = "600 11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(170, 188, 204, 0.78)";
  ctx.strokeStyle = "rgba(72, 111, 143, 0.28)";
  ctx.lineWidth = 1;
  for (const tick of getParameterTicks()) {
    const y = screenY(activeCurve, tick.y) * height;
    const textY = Math.max(9, Math.min(height - 7, y + 4));
    ctx.font = tick.emphasis
      ? "750 11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      : "600 11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = tick.emphasis ? "rgba(232, 240, 246, 0.96)" : "rgba(170, 188, 204, 0.78)";
    ctx.strokeStyle = tick.emphasis ? "rgba(95, 141, 177, 0.6)" : "rgba(72, 111, 143, 0.28)";
    ctx.lineWidth = tick.emphasis ? 1.6 : 1;
    ctx.fillText(tick.label, left - 9, textY);
    ctx.beginPath();
    ctx.moveTo(left - 5, y);
    ctx.lineTo(left + width, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(104, 145, 178, 0.62)";
  ctx.beginPath();
  ctx.moveTo(left, 0);
  ctx.lineTo(left, height);
  ctx.stroke();
  ctx.restore();
}

function drawCurve(curve, color, width, fillPoints, curveName) {
  const { left, width: w, height: h } = getPlotBounds();
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i <= w; i += 3) {
    const x = i / w;
    const y = valueAt(curve, x);
    const px = left + (x * w);
    const py = screenY(curveName, y) * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  if (fillPoints) {
    for (const point of curve) {
      ctx.beginPath();
      ctx.arc(left + (point.x * w), screenY(curveName, point.y) * h, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#06111c";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCurves() {
  const curveOrder = ["stretch", "pitch", "pan"];
  for (const name of curveOrder) {
    if (name === activeCurve) continue;
    if (!editedCurves[name]) continue;
    drawCurve(curves[name], curveColors[name], 2.1, false, name);
  }
  drawCurve(curves[activeCurve], curveColors[activeCurve], 4.8, true, activeCurve);
}

function roundedRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function getTooltipPoint() {
  if (dragging && selectedPoint != null) {
    return { curveName: activeCurve, point: curves[activeCurve][selectedPoint] };
  }
  if (hoverPoint?.curveName === activeCurve) {
    return { curveName: activeCurve, point: curves[activeCurve][hoverPoint.pointIndex] };
  }
  return null;
}

function drawPointTooltip(curveName, point) {
  if (!point) return;
  const { left, width: w, height: h } = getPlotBounds();
  const text = formatPointValue(curveName, point);
  const px = left + (point.x * w);
  const py = screenY(curveName, point.y) * h;
  const paddingX = 8;
  const boxHeight = 26;

  ctx.save();
  ctx.font = "650 13px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const boxWidth = Math.ceil(ctx.measureText(text).width + (paddingX * 2));
  const boxX = Math.max(left + 8, Math.min(left + w - boxWidth - 8, px - (boxWidth / 2)));
  let boxY = py - 36;
  if (boxY < 8) boxY = py + 14;

  roundedRectPath(boxX, boxY, boxWidth, boxHeight, 5);
  ctx.fillStyle = "rgba(7, 17, 28, 0.96)";
  ctx.fill();
  ctx.strokeStyle = curveColors[curveName];
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#e8f0f6";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, boxX + (boxWidth / 2), boxY + (boxHeight / 2) + 0.5);
  ctx.restore();
}

function buildOutputWaveform() {
  outputWaveformDirty = false;
  outputDirectionGradient = null;
  outputWaveform = waveform.map(() => []);
  if (!buffer || !waveform.length) return;
  const buckets = waveform[0].length;
  const duration = getPlaybackDuration();
  let sourceSeconds = initialPlaybackDirection(curves.stretch, transformSettings.globalDirection) < 0
    ? buffer.duration : 0;
  for (let i = 0; i < buckets; i += 1) {
    const previous = sourceSeconds;
    sourceSeconds = Math.max(0, Math.min(buffer.duration,
      sourceSeconds + (effectiveSpeedAt(curves.stretch, (i + 0.5) / buckets, transformSettings.globalDirection) * duration / buckets)));
    const from = Math.max(0, Math.min(buckets - 1, Math.floor(Math.min(previous, sourceSeconds) / buffer.duration * buckets)));
    const to = Math.max(0, Math.min(buckets - 1, Math.floor(Math.max(previous, sourceSeconds) / buffer.duration * buckets)));
    // Preserve transients that a fast or reverse read would skip between display columns.
    for (let channel = 0; channel < waveform.length; channel += 1) {
      let peak = 0;
      for (let j = from; j <= to; j += 1) peak = Math.max(peak, waveform[channel][j]);
      outputWaveform[channel].push(peak);
    }
  }
}

function getOutputDirectionGradient(left, width) {
  if (outputDirectionGradient) return outputDirectionGradient;
  const gradient = outputWaveCtx.createLinearGradient(left, 0, left + width, 0);
  const neutral = [151, 163, 175];
  const forward = [77, 167, 232];
  const reverse = [235, 100, 111];
  for (let i = 0; i <= 96; i += 1) {
    const progress = i / 96;
    const speed = effectiveSpeedAt(curves.stretch, progress, transformSettings.globalDirection);
    const strength = Math.min(1, Math.abs(speed) / 0.3);
    const target = speed < 0 ? reverse : forward;
    const color = neutral.map((value, channel) => Math.round(value + (target[channel] - value) * strength));
    gradient.addColorStop(progress, `rgba(${color.join(",")},0.92)`);
  }
  outputDirectionGradient = gradient;
  return gradient;
}

function drawWaveform(ctx, peaksByChannel, duration, color, title, hint, position, seekHint = false) {
  const scale = window.devicePixelRatio || 1;
  const { left, width } = getPlotBounds();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, canvasCssWidth, waveformHeight);
  ctx.fillStyle = "#0c1f31";
  ctx.fillRect(0, 0, canvasCssWidth, waveformHeight);
  ctx.strokeStyle = "rgba(79, 121, 155, 0.28)";
  ctx.lineWidth = 1;
  const divisions = width < 680 ? 4 : 10;
  for (let i = 0; i <= divisions; i += 1) {
    const x = left + (i / divisions * width);
    ctx.beginPath();
    ctx.moveTo(x, 21);
    ctx.lineTo(x, 77);
    ctx.stroke();
  }
  ctx.fillStyle = "#9bb4c9";
  ctx.font = "11px sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(title, 10, 12);
  const hintText = width > 550 ? hint : seekHint ? "CLICK TO SEEK" : "";
  if (hintText) {
    const hintX = Math.max(left + 112, 18 + ctx.measureText(title).width + 8);
    if (hintX + ctx.measureText(hintText).width < canvasCssWidth - (seekHint && canvasCssWidth > 720 ? 170 : 10)) {
      ctx.fillStyle = seekHint ? "#75c5f7" : "#9bb4c9";
      ctx.fillText(hintText, hintX, 12);
    }
  }
  if (buffer && peaksByChannel.length) {
    ctx.fillStyle = color;
    const stereo = peaksByChannel.length > 1;
    const laneCenters = stereo ? [39, 63] : [51];
    for (let channel = 0; channel < peaksByChannel.length; channel += 1) {
      const peaks = peaksByChannel[channel];
      const mid = laneCenters[channel];
      for (let x = 0; x < width; x += 1) {
        const index = Math.min(peaks.length - 1, Math.floor(x / width * peaks.length));
        const amplitude = Math.min(stereo ? 10 : 22, (peaks[index] || 0) * 45);
        ctx.fillRect(left + x, mid - amplitude, 1, Math.max(1, amplitude * 2));
      }
    }
    ctx.fillStyle = "#9bb4c9";
    ctx.fillText(stereo ? "L" : "MONO", 11, laneCenters[0]);
    if (stereo) ctx.fillText("R", 11, laneCenters[1]);
    for (let i = 0; i <= divisions; i += 1) {
      ctx.textAlign = i === 0 ? "left" : i === divisions ? "right" : "center";
      ctx.fillText(formatTime(duration * i / divisions), left + (i / divisions * width), 87);
    }
    ctx.textAlign = "start";
    const seekColor = outputHoverProgress !== null || isWaveSeeking ? "#b4e4ff" : "#75c5f7";
    // The hover guide previews a seek without changing playback or curve data.
    if (seekHint && !seekingDisabled && !isWaveSeeking && outputHoverProgress !== null) {
      const hoverX = left + outputHoverProgress * width;
      ctx.save();
      ctx.strokeStyle = seekColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(hoverX, 21);
      ctx.lineTo(hoverX, 77);
      ctx.stroke();
      ctx.restore();
    }
    const cursorX = left + Math.max(0, Math.min(1, position)) * width;
    ctx.strokeStyle = seekHint ? seekColor : "#e6edf1";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cursorX, 21);
    ctx.lineTo(cursorX, 77);
    ctx.stroke();
    if (seekHint) {
      ctx.fillStyle = seekColor;
      ctx.beginPath();
      ctx.moveTo(cursorX - 5, 21);
      ctx.lineTo(cursorX + 5, 21);
      ctx.lineTo(cursorX, 28);
      ctx.closePath();
      ctx.moveTo(cursorX - 5, 77);
      ctx.lineTo(cursorX + 5, 77);
      ctx.lineTo(cursorX, 70);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawSourceWaveform() {
  const position = buffer?.duration ? sourcePlayheadSeconds / buffer.duration : 0;
  drawWaveform(sourceWaveCtx, waveform, buffer?.duration || 0,
    "rgba(146, 171, 190, 0.86)", "ORIGINAL / SOURCE TIME", "SOURCE READ POSITION", position);
}

function drawOutputWaveform() {
  if (outputWaveformDirty) buildOutputWaveform();
  const { left, width } = getPlotBounds();
  const duration = getPlaybackDuration();
  const progress = duration > 0 ? Math.max(0, Math.min(1, playheadSeconds / duration)) : 0;
  drawWaveform(outputWaveCtx, outputWaveform, duration,
    getOutputDirectionGradient(left, width), "OUTPUT TIME", "CLICK / DRAG TO SEEK", progress, true);
  if (canvasCssWidth > 720) {
    outputWaveCtx.font = "10px sans-serif";
    outputWaveCtx.textAlign = "right";
    outputWaveCtx.fillStyle = "#4da7e8";
    outputWaveCtx.fillText("FORWARD", canvasCssWidth - 88, 12);
    outputWaveCtx.fillStyle = "#eb646f";
    outputWaveCtx.fillText("REVERSE", canvasCssWidth - 10, 12);
    outputWaveCtx.textAlign = "start";
  }
  if (buffer) {
    outputWaveCanvas.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
    outputWaveCanvas.setAttribute("aria-valuetext", `${formatClock(playheadSeconds)} of ${formatClock(duration)}`);
  }
}

function draw() {
  const scale = window.devicePixelRatio || 1;
  const canvasWidth = canvasCssWidth;
  const { left, width: w, height: h } = getPlotBounds();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, canvasWidth, h);
  ctx.fillStyle = "#0c1f31";
  ctx.fillRect(0, 0, canvasWidth, h);

  ctx.strokeStyle = "rgba(63, 101, 132, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 40; i += 1) {
    if (i % 4 === 0) continue;
    const x = left + ((i / 40) * w);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let i = 1; i < 8; i += 1) {
    if (i % 2 === 0) continue;
    const y = (i / 8) * h;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + w, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(79, 121, 155, 0.28)";
  for (let i = 0; i <= 10; i += 1) {
    const x = left + ((i / 10) * w);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let i = 1; i < 4; i += 1) {
    const y = (i / 4) * h;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + w, y);
    ctx.stroke();
  }

  drawParameterScale();
  drawCurves();

  if (buffer) {
    const duration = getPlaybackDuration();
    const progress = duration > 0 ? Math.max(0, Math.min(1, playheadSeconds / duration)) : 0;
    const x = left + (progress * w);
    ctx.strokeStyle = "rgba(226, 236, 244, 0.86)";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  const tooltip = getTooltipPoint();
  if (tooltip) drawPointTooltip(tooltip.curveName, tooltip.point);

  timeStatus.textContent = buffer
    ? `${formatClock(playheadSeconds)} / ${formatClock(getPlaybackDuration())}${estimateOutputDuration(buffer.duration, curves.stretch) > largeFileSeconds ? " · preview limit" : ""}`
    : "00:00.00 / 00:00.00";
  sourceReadout.textContent = formatTime(sourcePlayheadSeconds);
  stretchReadout.textContent = `${currentSpeed.toFixed(2)} x`;
  pitchReadout.textContent = `${Math.round(currentCents)} cents`;
  panReadout.textContent = formatPan(currentPan);
  modeReadout.textContent = curveLabels[activeCurve];
  pointsReadout.textContent = String(curves[activeCurve].length);
  drawSourceWaveform();
  drawOutputWaveform();
}

function buildWaveform(audioBuffer) {
  const buckets = 4000;
  waveform = Array.from({ length: Math.min(2, audioBuffer.numberOfChannels) }, (_, channelIndex) => {
    const channel = audioBuffer.getChannelData(channelIndex);
    const samplesPerBucket = Math.max(1, Math.floor(channel.length / buckets));
    const peaks = [];
    for (let i = 0; i < buckets; i += 1) {
      let peak = 0;
      const start = i * samplesPerBucket;
      for (let j = 0; j < samplesPerBucket; j += 1) {
        peak = Math.max(peak, Math.abs(channel[start + j] || 0));
      }
      peaks.push(peak);
    }
    return peaks;
  });
  outputWaveformDirty = true;
}

function decodeAudioFile(arrayBuffer) {
  const data = arrayBuffer;
  return new Promise((resolve, reject) => {
    const promise = audioContext.decodeAudioData(data, resolve, reject);
    if (promise?.then) promise.then(resolve).catch(reject);
  });
}

async function ensureAudio() {
  await ensureAudioContext();
  if (!node) {
    if (!audioSetupPromise) {
      audioSetupPromise = setupAudio().catch((error) => {
        audioContext = null;
        node = null;
        outputMeter = null;
        throw error;
      }).finally(() => {
        audioSetupPromise = null;
      });
    }
    await audioSetupPromise;
  }
  if (!workletBufferLoaded) sendBufferToWorklet();
}

async function setupAudio() {
  if (!audioContext) {
    await ensureAudioContext();
  }
  if (!audioContext.audioWorklet) {
    throw new Error("AudioWorklet is not available. Use a current Chrome, Edge, or Safari version over HTTPS.");
  }

  await audioContext.audioWorklet.addModule("src/transform-worklet.js?v=20261007-5min1");
    node = new AudioWorkletNode(audioContext, "audio-transform-processor", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2]
    });
    outputMeter = new OutputMeterAnalyzer(audioContext, { channelCount: 2 });
    node.connect(outputMeter.input);
    outputMeter.connect(audioContext.destination);
    startMeterAnimation();
    node.port.onmessage = (event) => {
      if (!isCurrentPlaybackMessage(event.data)) return;
      if (event.data.type === "position") {
        playheadSeconds = event.data.seconds;
        sourcePlayheadSeconds = event.data.sourceSeconds ?? event.data.seconds;
        currentSpeed = event.data.speed ?? event.data.stretch;
        currentCents = event.data.cents;
        currentPan = event.data.pan;
        draw();
      } else if (event.data.type === "ended") {
        playButton.textContent = "Play";
        isPlaying = false;
        playheadSeconds = 0;
        sourcePlayheadSeconds = 0;
        resetCurrentReadouts();
        node?.port.postMessage({ type: "seek", seconds: 0, token: playbackToken });
        draw();
      } else if (event.data.type === "stopped") {
        playButton.textContent = "Play";
        isPlaying = false;
        playheadSeconds = 0;
        sourcePlayheadSeconds = 0;
        resetCurrentReadouts();
        draw();
      }
    };
    sendBufferToWorklet();
    sendSettings();
    sendCurves();
}

async function loadAudioFile(file) {
  if (!file) return;
  fileNotice.textContent = "";
  try { checkFileSize(file.size); }
  catch (error) { fileNotice.textContent = error.message; return; }
  const previousStatus = fileStatus.textContent;
  const previousDownloadStatus = downloadReadout.textContent;
  if (renderAbortController) {
    renderAbortController.abort();
    renderAbortController = null;
  }
  setTransportBusy(true);
  fileStatus.textContent = `Loading ${file.name}...`;
  downloadReadout.textContent = "loading";
  playButton.textContent = "Play";
  isPlaying = false;
  node?.port.postMessage({ type: "stop", reset: true, token: nextPlaybackToken() });
  try {
    await ensureAudioContext();
    await preflightWav(file, audioContext.sampleRate);
    const data = await file.arrayBuffer();
    const candidate = await decodeAudioFile(data);
    checkPCM(candidate.length, candidate.numberOfChannels);
    buffer = candidate;
    buildWaveform(buffer);
    workletBufferLoaded = false;
    sendBufferToWorklet();
    fileNotice.textContent = "";
    updateDurationNotice();
    const longFileNote = buffer.duration > largeFileSeconds ? " - long file" : "";
    fileStatus.textContent = `${file.name} - ${buffer.duration.toFixed(2)} s${longFileNote}`;
    clearDownload();
    downloadReadout.textContent = estimateOutputDuration(buffer.duration, curves.stretch) > largeFileSeconds
      ? "export limit: 5 min output" : "ready";
    playheadSeconds = 0;
    sourcePlayheadSeconds = 0;
    resetCurrentReadouts();
    draw();
  } catch (error) {
    console.error(error);
    fileStatus.textContent = previousStatus;
    downloadReadout.textContent = previousDownloadStatus;
    fileNotice.textContent = `${error.message || "Could not load audio. Try WAV or MP3."} Previous audio remains available.`;
  } finally {
    setTransportBusy(false);
  }
}

fileInput.addEventListener("change", async () => {
  await loadAudioFile(fileInput.files?.[0]);
  fileInput.value = "";
});

playButton.addEventListener("click", playAudio);

stopButton.addEventListener("click", stopAudio);

function seekToProgress(progress) {
  if (!buffer || seekingDisabled) return;
  progress = Math.max(0, Math.min(1, progress));
  playheadSeconds = progress * getPlaybackDuration();
  sourcePlayheadSeconds = sourcePositionAtProgress(
    buffer.duration,
    curves.stretch,
    transformSettings.globalDirection,
    progress,
    getPlaybackDuration()
  );
  node?.port.postMessage({ type: "seek", progress, token: playbackToken });
  draw();
}

function seekFromWavePointer(event) {
  const rect = outputWaveCanvas.getBoundingClientRect();
  const { left, width } = getPlotBounds();
  seekToProgress((event.clientX - rect.left - left) / width);
}

outputWaveCanvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || seekingDisabled) return;
  event.preventDefault();
  isWaveSeeking = true;
  outputWaveCanvas.setPointerCapture(event.pointerId);
  seekFromWavePointer(event);
});

outputWaveCanvas.addEventListener("pointermove", (event) => {
  if (isWaveSeeking) seekFromWavePointer(event);
  else updateOutputHover(event);
});

function updateOutputHover(event) {
  const rect = outputWaveCanvas.getBoundingClientRect();
  const { left, width } = getPlotBounds();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  outputHoverProgress = !seekingDisabled && event.pointerType !== "touch"
    && x >= left && x <= left + width && y >= 0 && y <= rect.height
    ? (x - left) / width : null;
  drawOutputWaveform();
}

function endWaveSeek(event) {
  isWaveSeeking = false;
  if (outputWaveCanvas.hasPointerCapture(event.pointerId)) outputWaveCanvas.releasePointerCapture(event.pointerId);
  if (event.type === "pointercancel") {
    outputHoverProgress = null;
    drawOutputWaveform();
  } else updateOutputHover(event);
}

outputWaveCanvas.addEventListener("pointerenter", updateOutputHover);
outputWaveCanvas.addEventListener("pointerleave", () => {
  outputHoverProgress = null;
  drawOutputWaveform();
});
outputWaveCanvas.addEventListener("pointerup", endWaveSeek);
outputWaveCanvas.addEventListener("pointercancel", endWaveSeek);

outputWaveCanvas.addEventListener("keydown", (event) => {
  if (seekingDisabled) return;
  const duration = getPlaybackDuration();
  let nextSeconds = playheadSeconds;
  if (event.key === "ArrowLeft") nextSeconds -= event.shiftKey ? 0.1 : 1;
  else if (event.key === "ArrowRight") nextSeconds += event.shiftKey ? 0.1 : 1;
  else if (event.key === "Home") nextSeconds = 0;
  else if (event.key === "End") nextSeconds = duration;
  else return;
  event.preventDefault();
  seekToProgress(duration > 0 ? nextSeconds / duration : 0);
});

meterClipButton.addEventListener("click", () => {
  meterClipLatched = false;
  meterClipButton.classList.remove("clipped");
  meterClipButton.setAttribute("aria-pressed", "false");
});

downloadButton.addEventListener("click", async () => {
  if (!buffer) return;
  if (renderAbortController) {
    renderAbortController.abort();
    return;
  }

  if (isPlaying) {
    forceStopAudio();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  renderAbortController = new AbortController();
  setRenderBusy(true);
  downloadReadout.textContent = "creating 0%";
  downloadButton.textContent = "Cancel";
  clearDownload();

  try {
    const render = await getOfflineRenderer();
    const rendered = await render({
      includePCM: false,
      audioBuffer: buffer,
      curves,
      settings: getSettings(),
      signal: renderAbortController.signal,
      onProgress: (progress) => {
        downloadReadout.textContent = `creating ${Math.round(progress * 100)}%`;
      }
    });

    downloadUrl = URL.createObjectURL(rendered.blob);
    saveWavLink.href = downloadUrl;
    saveWavLink.hidden = false;
    // Keep a direct user-click save path when an automatic download is blocked.
    saveWavLink.click();
    fileNotice.textContent = "WAV ready. If saving did not start, click Save WAV. Browser download permissions may require approval.";
    downloadReadout.textContent = rendered.truncated
      ? `${rendered.duration.toFixed(1)} s, capped`
      : `${rendered.duration.toFixed(1)} s`;
  } catch (error) {
    if (error.name === "AbortError") {
      downloadReadout.textContent = "cancelled";
    } else if (error.code === "EXPORT_DURATION_LIMIT") {
      fileNotice.textContent = error.message;
      downloadReadout.textContent = "output exceeds 5 min";
    } else {
      console.error(error);
      downloadReadout.textContent = "export failed";
      fileNotice.textContent = "Could not create WAV. Try a shorter excerpt and stop playback/rendering in other Lab windows.";
    }
  } finally {
    renderAbortController = null;
    downloadButton.textContent = "Download WAV";
    setRenderBusy(false);
  }
});

function closeResetDialog() {
  resetDialog.hidden = true;
  resetButton.focus();
}

function applyResetAll() {
  forceStopAudio();
  curves.stretch = defaultCurves.stretch();
  curves.pitch = defaultCurves.pitch();
  curves.pan = defaultCurves.pan();
  editedCurves.stretch = false;
  editedCurves.pitch = false;
  editedCurves.pan = false;
  transformSettings.globalDirection = 1;
  outputWaveformDirty = true;
  resetCurrentReadouts();
  selectedPoint = null;
  hoverPoint = null;
  markDownloadStale();
  sendSettings();
  sendCurves();
  draw();
}

resetButton.addEventListener("click", () => {
  resetDialog.hidden = false;
  cancelResetButton.focus();
});

cancelResetButton.addEventListener("click", closeResetDialog);

confirmResetButton.addEventListener("click", () => {
  closeResetDialog();
  applyResetAll();
});

resetDialog.addEventListener("click", (event) => {
  if (event.target === resetDialog) closeResetDialog();
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || resetDialog.hidden) return;
  event.preventDefault();
  closeResetDialog();
});

clearCurveButton.addEventListener("click", () => {
  forceStopAudio();
  if (activeCurve === "stretch") outputWaveformDirty = true;
  curves[activeCurve] = defaultCurves[activeCurve]();
  editedCurves[activeCurve] = false;
  selectedPoint = null;
  hoverPoint = null;
  resetCurrentReadouts();
  markDownloadStale();
  sendCurves();
  draw();
});

function setActiveCurve(name) {
  activeCurve = name;
  selectedPoint = null;
  hoverPoint = null;
  stretchMode.classList.toggle("active", name === "stretch");
  pitchMode.classList.toggle("active", name === "pitch");
  panMode.classList.toggle("active", name === "pan");
  draw();
}

stretchMode.addEventListener("click", () => {
  setActiveCurve("stretch");
});

pitchMode.addEventListener("click", () => {
  setActiveCurve("pitch");
});

panMode.addEventListener("click", () => {
  setActiveCurve("pan");
});

sendSettings();

function pointerToPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const { left, width } = getPlotBounds();
  const canvasX = event.clientX - rect.left;
  const x = Math.max(0, Math.min(1, (canvasX - left) / width));
  const y = Math.max(0, Math.min(1, curveY(activeCurve, (event.clientY - rect.top) / rect.height)));
  return { x, y };
}

function findPointNearPointer(point) {
  const curve = curves[activeCurve];
  const xRadius = 10 / getPlotBounds().width;
  const yRadius = 10 / canvasCssHeight;
  let bestIndex = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < curve.length; i += 1) {
    const dx = (curve[i].x - point.x) / xRadius;
    const dy = (curve[i].y - point.y) / yRadius;
    const distance = Math.sqrt((dx * dx) + (dy * dy));
    if (distance <= 1 && distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function isErasing(event) {
  return selectedTool === "eraser" || Boolean(event?.[eraseModifier]);
}

function updateToolCursor(event) {
  const erasing = isErasing(event);
  canvas.classList.toggle("eraseMode", erasing);
  canvas.style.cursor = erasing ? "" : hoverPoint ? "pointer" : "crosshair";
}

function setTool(tool) {
  selectedTool = tool;
  penTool.classList.toggle("active", tool === "pen");
  eraserTool.classList.toggle("active", tool === "eraser");
  penTool.setAttribute("aria-pressed", String(tool === "pen"));
  eraserTool.setAttribute("aria-pressed", String(tool === "eraser"));
  selectedPoint = null;
  updateToolCursor();
  draw();
}

function setHoverPoint(pointIndex, event) {
  const nextHover = pointIndex >= 0 ? { curveName: activeCurve, pointIndex } : null;
  const changed = hoverPoint?.curveName !== nextHover?.curveName || hoverPoint?.pointIndex !== nextHover?.pointIndex;
  hoverPoint = nextHover;
  updateToolCursor(event);
  if (changed) draw();
}

penTool.addEventListener("click", () => setTool("pen"));
eraserTool.addEventListener("click", () => setTool("eraser"));

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  const p = pointerToPoint(event);
  const curve = curves[activeCurve];
  selectedPoint = findPointNearPointer(p);
  if (isErasing(event)) {
    event.preventDefault();
    if (selectedPoint > 0 && selectedPoint < curve.length - 1) {
      curve.splice(selectedPoint, 1);
      editedCurves[activeCurve] = true;
      sendCurves();
    }
    selectedPoint = null;
    hoverPoint = null;
    updateToolCursor(event);
    draw();
    return;
  }
  if (selectedPoint < 0) {
    curve.push(p);
    sortCurve(curve);
    selectedPoint = curve.indexOf(p);
  }
  hoverPoint = { curveName: activeCurve, pointIndex: selectedPoint };
  editedCurves[activeCurve] = true;
  dragging = true;
  canvas.setPointerCapture(event.pointerId);
  sendCurves();
  draw();
});

canvas.addEventListener("pointermove", (event) => {
  const p = pointerToPoint(event);
  if (!dragging || selectedPoint == null) {
    setHoverPoint(findPointNearPointer(p), event);
    return;
  }
  const curve = curves[activeCurve];
  const point = curve[selectedPoint];
  point.x = p.x;
  point.y = p.y;
  editedCurves[activeCurve] = true;
  sortCurve(curve);
  selectedPoint = curve.indexOf(point);
  hoverPoint = { curveName: activeCurve, pointIndex: selectedPoint };
  sendCurves();
  draw();
});

canvas.addEventListener("pointerup", (event) => {
  dragging = false;
  if (selectedPoint != null) hoverPoint = { curveName: activeCurve, pointIndex: selectedPoint };
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  updateToolCursor(event);
  draw();
});

canvas.addEventListener("pointerleave", () => {
  if (dragging) return;
  hoverPoint = null;
  updateToolCursor();
  draw();
});

canvas.addEventListener("pointerenter", updateToolCursor);

window.addEventListener("keydown", updateToolCursor);
window.addEventListener("keyup", updateToolCursor);
window.addEventListener("blur", () => updateToolCursor());

window.addEventListener("resize", resizeCanvas);
if ("ResizeObserver" in window) {
  const canvasResizeObserver = new ResizeObserver(resizeCanvas);
  canvasResizeObserver.observe(canvas);
}

window.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
  if (event.code !== "Space" || isTyping || !resetDialog.hidden) return;
  event.preventDefault();
  event.stopPropagation();
  if (event.repeat || !buffer || playButton.disabled) return;
  if (document.activeElement instanceof HTMLButtonElement) {
    document.activeElement.blur();
  }
  toggleAudio();
});

window.addEventListener("keyup", (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
  if (event.code !== "Space" || isTyping || !resetDialog.hidden) return;
  event.preventDefault();
  event.stopPropagation();
});

resizeCanvas();
loadGeneratedExample();
startMeterAnimation();
