import {canvasAxisWidth, drawEditorGrid, frequencyTicks, frequencyLabel, spacedMarks, canvasLabelFont} from "./canvas-grid.js";
import { analyzeSourceColors } from "./source-colors.js";
import { canvasType } from "./canvas-typography.js?v=20261015-1";
import { createSourceEditor } from "./source-editor.js?v=20261018-axis64";
import { findSourceSeek } from "./source-seek.js?v=20261013-source8";
import { summarizeChannels, peakOf, paintWaveform, paintSourceCursors } from "./waveform-view.js?v=20261018-axis64";
let sourceEditor = null;
let sourceDisplayPeak = 1;
import { readAudioFile } from "./audio-import.js?v=20261011-aiff1";
import { MAX_OUTPUT_SECONDS } from "./output-policy.js?v=20261013-transport1";
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
const rewindButton = document.getElementById("rewindButton");
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
const waveformHeight = 128;
const parameterScaleWidth = canvasAxisWidth;
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

  const waveScale = window.devicePixelRatio || 1;
  const waveWidth = Math.max(1, Math.floor(canvasCssWidth * waveScale));
  const waveHeight = Math.max(1, Math.floor(waveformHeight * waveScale));
  if (sourceWaveCanvas.width !== waveWidth) sourceWaveCanvas.width = waveWidth;
  if (sourceWaveCanvas.height !== waveHeight) sourceWaveCanvas.height = waveHeight;
  const outputWidth = Math.max(1, Math.floor(outputWaveCanvas.getBoundingClientRect().width * waveScale));
  if (outputWaveCanvas.width !== outputWidth) outputWaveCanvas.width = outputWidth;
  outputWaveCanvas.height = Math.max(1,Math.floor(34*waveScale));
  draw();
}

function formatTime(seconds) {
  return `${seconds.toFixed(2)} s`;
}

function formatClock(seconds) {
  const hundredths = Math.round(Math.max(0, Number.isFinite(seconds) ? seconds : 0) * 100);
  const minutes = Math.floor(hundredths / 6000);
  const rest = (hundredths % 6000) / 100;
  return `${String(minutes).padStart(2, "0")}:${rest.toFixed(2).padStart(5, "0")}`;
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
    row.querySelector(".meterRms").style.clipPath = `inset(0 ${(1-meterPosition(display.rms))*100}% 0 0)`;
    row.querySelector(".meterPeak").style.clipPath = `inset(0 ${(1-meterPosition(display.peak))*100}% 0 0)`;
    row.querySelector(".meterHold").style.left = `${meterPosition(display.hold) * 100}%`;
    const peakDb = linearToDb(display.peak);
    row.setAttribute("aria-label", `${index === 0 ? "Left" : "Right"} output peak: ${Number.isFinite(peakDb) ? peakDb.toFixed(1) + " dBFS" : "silent"}`);
    row.querySelector(".meterHold").style.opacity = display.hold > 0.001 ? "1" : "0";
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
  if (curveName === "stretch") return `${speedFromNorm(point.y).toFixed(2)} x`;
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
  updateDurationNotice();
  if (fileNotice.textContent.startsWith("WAV ready.")) fileNotice.textContent = "";
  clearDownload();
  if (!buffer) { setExportStatus("empty audio"); return; }
  setExportStatus(estimateOutputDuration(buffer.duration, curves.stretch) > largeFileSeconds
    ? "export limit: 5 min output" : "needs export");
}

function clearDownload() {
  saveWavLink.hidden = true;
  saveWavLink.removeAttribute("href");
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = null;
}

function setTransportBusy(isBusy) {
  sourceEditor?.setAvailable(!isBusy);
  playButton.disabled = isBusy || !buffer;
  stopButton.disabled = isBusy || !buffer;
  rewindButton.disabled = isBusy || !buffer;
  downloadButton.disabled = isBusy || !buffer;
  fileInput.disabled = isBusy;
  setSeekingDisabled(isBusy || !buffer);
}

function setRenderBusy(isBusy) {
  sourceEditor?.setAvailable(!isBusy);
  playButton.disabled = isBusy || !buffer;
  stopButton.disabled = isBusy || !buffer;
  rewindButton.disabled = isBusy || !buffer;
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
  const requestToken = playbackToken;
  try {
    await ensureAudio();
    if (isPlaying || requestToken !== playbackToken || !buffer || playButton.disabled) return;
    const duration = getPlaybackDuration();
    node.port.postMessage({
      type: "seek",
      progress: duration > 0 ? playheadSeconds / duration : 0,
      token: playbackToken
    });
    node.port.postMessage({ type: "play", token: nextPlaybackToken() });
    isPlaying = true;
    playButton.textContent = "Playing";
    draw();
  } catch (error) {
    console.error(error);
    fileStatus.textContent = error.message;
  }
}

function stopAudio() {
  if (!buffer) return;
  // Invalidate pending initial Play even before the worklet exists.
  const pauseToken = nextPlaybackToken();
  node?.port.postMessage({ type: "stop", reset: false, token: pauseToken });
  isPlaying = false;
  playButton.textContent = "Play";
  draw();
}

function rewindAudio() {
  if (!buffer || seekingDisabled) return;
  // Also cancel a pending initial Play, while retaining active playback.
  if (!node) nextPlaybackToken();
  seekToProgress(0);
}

function forceStopAudio() {
  if (!buffer) return;
  const stopToken = nextPlaybackToken();
  node?.port.postMessage({ type: "stop", reset: true, token: stopToken });
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
    const module = await import("./offline-render.js?v=20261025-fade10");
    renderOffline = module.renderOffline;
  }
  return renderOffline;
}

async function ensureAudioContext({ resume = true } = {}) {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("Web Audio is not available in this browser.");
    }
    audioContext = new AudioContextClass();
  }
  if (resume && audioContext.state !== "running") await audioContext.resume();
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
  sourceDisplayPeak = peakOf(waveform);
  sourceEditor?.load(buffer);
  workletBufferLoaded = false;
  clearDownload();
  setExportStatus("ready");
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
  ctx.font = canvasType.tick;
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(185, 193, 203, 0.9)";
  ctx.strokeStyle = "rgba(139, 149, 162, 0.18)";
  ctx.lineWidth = 1;
  for (const tick of getParameterTicks()) {
    const y = screenY(activeCurve, tick.y) * height;
    const textY = Math.max(9, Math.min(height - 7, y + 4));
    ctx.font = tick.emphasis
      ? canvasType.majorTick
      : canvasType.tick;
    ctx.fillStyle = tick.emphasis ? "rgba(232, 240, 246, 0.96)" : "rgba(185, 193, 203, 0.9)";
    ctx.strokeStyle = tick.emphasis ? "rgba(160, 170, 182, 0.35)" : "rgba(139, 149, 162, 0.18)";
    ctx.lineWidth = tick.emphasis ? 1.6 : 1;
    ctx.fillText(tick.label, left - 9, textY);
    ctx.beginPath();
    ctx.moveTo(left - 5, y);
    ctx.lineTo(tick.emphasis ? left + width : left, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(160, 170, 182, 0.4)";
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
      ctx.strokeStyle = "#191c20";
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
    drawCurve(curves[name], curveColors[name], 1.5, false, name);
  }
  drawCurve(curves[activeCurve], curveColors[activeCurve], 2.8, true, activeCurve);
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
  ctx.font = canvasType.point;
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

let sourceViewCache=null;
let sourceColors=null,sourceRaster=null;
function drawSourceWaveform() {
  const state=sourceEditor?.state;
  const count=buffer?.length||0;
  const playbackFrame=sourcePlayheadSeconds*(buffer?.sampleRate||48000);
  if(isPlaying)sourceEditor?.followPlayback(playbackFrame);
  const range=sourceEditor?.viewport||{start:0,end:count};
  const span=Math.max(1,range.end-range.start),rate=buffer?.sampleRate||48000;
  let peaks=waveform;
  if(buffer&&(range.start>0||range.end<count)){
    const key=`${range.start}:${range.end}:${canvasCssWidth}`;
    if(sourceViewCache?.buffer!==buffer||sourceViewCache.key!==key){
      sourceViewCache={buffer,key,peaks:summarizeChannels([buffer.getChannelData(0).subarray(range.start,range.end),buffer.getChannelData(Math.min(1,buffer.numberOfChannels-1)).subarray(range.start,range.end)],Math.ceil(canvasCssWidth*(window.devicePixelRatio||1)*2))};
    }
    peaks=sourceViewCache.peaks;
  }else sourceViewCache=null;
  const rasterKey=`${range.start}:${range.end}:${canvasCssWidth}:${sourceWaveCanvas.width}:${sourceWaveCanvas.height}:${sourceDisplayPeak}`;
  if(!sourceRaster||sourceRaster.peaks!==peaks||sourceRaster.colors!==sourceColors||sourceRaster.key!==rasterKey){
    const image=document.createElement('canvas');image.width=sourceWaveCanvas.width;image.height=sourceWaveCanvas.height;
    const geom=paintWaveform(image.getContext('2d'),{width:canvasCssWidth,height:waveformHeight,
      peaks,duration:count?span/rate:0,timeOffset:range.start/rate,referencePeak:sourceDisplayPeak,
      colors:sourceColors,colorStart:range.start/Math.max(1,count),colorEnd:range.end/Math.max(1,count),
      title:'Edit Audio / Source Time',hint:'Click: start · Drag: select · + / −: zoom',position:-1});
    sourceRaster={key:rasterKey,peaks,colors:sourceColors,image,geom};
  }
  sourceWaveCtx.setTransform(1,0,0,1,0,0);sourceWaveCtx.clearRect(0,0,sourceWaveCanvas.width,sourceWaveCanvas.height);sourceWaveCtx.drawImage(sourceRaster.image,0,0);
  const dpr=window.devicePixelRatio||1;sourceWaveCtx.setTransform(dpr,0,0,dpr,0,0);
  const geom=sourceRaster.geom;
  const x=frame=>geom.left+(frame-range.start)/span*geom.width;
  sourceWaveCtx.save();sourceWaveCtx.beginPath();sourceWaveCtx.rect(geom.left,geom.top,geom.width,geom.bottom-geom.top);sourceWaveCtx.clip();
  const selection=sourceEditor?.selection;
  if(selection&&count){sourceWaveCtx.fillStyle='rgba(69,155,255,.28)';sourceWaveCtx.fillRect(x(selection[0]),geom.top,x(selection[1])-x(selection[0]),geom.bottom-geom.top);}
  const fadeIn=state?.fadeIn||0,fadeOut=state?.fadeOut||0;
  // Shade the attenuated (removed) area above the gain curve, not the retained signal.
  for(const [frames,out] of [[fadeIn,false],[fadeOut,true]]){
    if(!frames||!count)continue;
    const start=out?count-frames:0;
    sourceWaveCtx.beginPath();sourceWaveCtx.moveTo(x(start),geom.top);
    for(let i=0;i<=40;i++){
      const t=i/40,g=(1-Math.cos(Math.PI*(out?1-t:t)))/2;
      sourceWaveCtx.lineTo(x(start+frames*t),geom.bottom-g*(geom.bottom-geom.top));
    }
    sourceWaveCtx.lineTo(x(start+frames),geom.top);sourceWaveCtx.closePath();
    sourceWaveCtx.fillStyle='rgba(5,12,22,.58)';sourceWaveCtx.fill();
    sourceWaveCtx.strokeStyle='#b9dcff';sourceWaveCtx.lineWidth=1;sourceWaveCtx.stroke();
  }
  sourceWaveCtx.restore();
  paintSourceCursors(sourceWaveCtx,geom,range,isPlaying?null:(sourceEditor?.cursor||0),playbackFrame);
  for(const [id,frame] of [['fadeInHandle',fadeIn],['fadeOutHandle',count-fadeOut]]){
    const handle=document.getElementById(id);handle.hidden=!count||frame<range.start||frame>range.end;
    handle.style.left=`${Math.max(12,Math.min(canvasCssWidth-12,x(frame)))}px`;
  }
}

function drawOutputWaveform() {
  const duration=getPlaybackDuration(),progress=duration?Math.max(0,Math.min(1,playheadSeconds/duration)):0;
  const scale=window.devicePixelRatio||1,w=outputWaveCanvas.getBoundingClientRect().width,left=8,right=8,span=Math.max(1,w-left-right);
  outputWaveCtx.setTransform(scale,0,0,scale,0,0);outputWaveCtx.clearRect(0,0,w,34);
  outputWaveCtx.fillStyle='#8290a1';outputWaveCtx.fillRect(left,14,span,6);
  outputWaveCtx.fillStyle='#459bff';outputWaveCtx.fillRect(left,14,span*progress,6);
  if(outputHoverProgress!==null){outputWaveCtx.fillStyle='#8fbfff';outputWaveCtx.fillRect(left+span*outputHoverProgress,11,1,12);}
  outputWaveCtx.fillStyle='#fff';outputWaveCtx.fillRect(left+span*progress-1.5,10,3,14);
  outputWaveCanvas.setAttribute('aria-valuenow',String(Math.round(progress*100)));
  outputWaveCanvas.setAttribute('aria-valuetext',`${formatClock(playheadSeconds)} of ${formatClock(duration)}`);
}

function draw() {
  playButton.setAttribute("aria-pressed", String(isPlaying));
  const scale = window.devicePixelRatio || 1;
  const canvasWidth = canvasCssWidth;
  const { left, width: w, height: h } = getPlotBounds();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, canvasWidth, h);
  ctx.fillStyle = "#191c20";
  ctx.fillRect(0, 0, canvasWidth, h);

  // Audio-only visual trial: soften background grid without dimming curves or labels.
  ctx.save();
  ctx.globalAlpha *= 0.65;
  drawEditorGrid(ctx, left, 0, w, h);
  ctx.restore();

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
  // Stopped readouts follow the output playhead, not stale worklet telemetry.
  const valueProgress = buffer && getPlaybackDuration() > 0
    ? Math.max(0, Math.min(1, playheadSeconds / getPlaybackDuration())) : 0;
  const displaySpeed = isPlaying ? currentSpeed : effectiveSpeedAt(curves.stretch, valueProgress, transformSettings.globalDirection);
  const displayCents = isPlaying ? currentCents : centsFromNorm(valueAt(curves.pitch, valueProgress));
  const displayPan = isPlaying ? currentPan : panFromNorm(valueAt(curves.pan, valueProgress));
  stretchReadout.textContent = `${displaySpeed.toFixed(2)} x`;
  pitchReadout.textContent = `${Math.round(displayCents)} cents`;
  panReadout.textContent = formatPan(displayPan);
  modeReadout.textContent = curveLabels[activeCurve];
  pointsReadout.textContent = String(curves[activeCurve].length);
  drawSourceWaveform();
  drawOutputWaveform();
}

function buildWaveform(audioBuffer) {
  sourceColors=null;sourceRaster=null;
  analyzeSourceColors(audioBuffer,colors=>{if(buffer===audioBuffer){sourceColors=colors;drawSourceWaveform();}});
  waveform=audioBuffer?summarizeChannels([audioBuffer.getChannelData(0),audioBuffer.getChannelData(Math.min(1,audioBuffer.numberOfChannels-1))]):[];
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

  await audioContext.audioWorklet.addModule("src/transform-worklet.js?v=20261025-fade10");
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
        playheadSeconds = event.data.seconds ?? 0;
        sourcePlayheadSeconds = event.data.sourceSeconds ?? 0;
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
  setExportStatus("loading");
  playButton.textContent = "Play";
  isPlaying = false;
  const stopToken = nextPlaybackToken();
  node?.port.postMessage({ type: "stop", reset: true, token: stopToken });
  try {
    // Decoding does not require playback permission. Safari may keep resume pending
    // after the file chooser closes; only Play should wait for activation.
    await ensureAudioContext({ resume: false });
    await preflightWav(file, audioContext.sampleRate);
    const data = await readAudioFile(file, audioContext.sampleRate);
    const candidate = await decodeAudioFile(data);
    checkPCM(candidate.length, candidate.numberOfChannels);
    buffer = candidate;
    buildWaveform(buffer);
    sourceDisplayPeak = peakOf(waveform);
    sourceEditor?.load(buffer);
      workletBufferLoaded = false;
    sendBufferToWorklet();
    fileNotice.textContent = "";
    updateDurationNotice();
    const longFileNote = buffer.duration > largeFileSeconds ? " - long file" : "";
    fileStatus.textContent = `${file.name} - ${buffer.duration.toFixed(2)} s${longFileNote}`;
    clearDownload();
    setExportStatus(estimateOutputDuration(buffer.duration, curves.stretch) > largeFileSeconds
      ? "export limit: 5 min output" : "ready");
    playheadSeconds = 0;
    sourcePlayheadSeconds = 0;
    resetCurrentReadouts();
    draw();
  } catch (error) {
    console.error(error);
    fileStatus.textContent = previousStatus;
    setExportStatus(previousDownloadStatus);
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
rewindButton.addEventListener("click", rewindAudio);

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
  node?.port.postMessage({ type: "seek", progress, token: nextPlaybackToken() });
  draw();
}

function seekFromWavePointer(event) {
  const rect = outputWaveCanvas.getBoundingClientRect();
  const left=8,width=Math.max(1,rect.width-left-8);
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
  const left=8,width=Math.max(1,rect.width-left-8);
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
  setExportStatus("creating 0%");
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
        setExportStatus(`creating ${Math.round(progress * 100)}%`);
      }
    });

    downloadUrl = URL.createObjectURL(rendered.blob);
    saveWavLink.href = downloadUrl;
    saveWavLink.hidden = false;
    // Keep a direct user-click save path when an automatic download is blocked.
    saveWavLink.click();
    fileNotice.textContent = "WAV ready. If saving did not start, click Save WAV. Browser download permissions may require approval.";
    setExportStatus(rendered.truncated
      ? `${rendered.duration.toFixed(1)} s, capped`
      : `${rendered.duration.toFixed(1)} s`);
  } catch (error) {
    if (error.name === "AbortError") {
      setExportStatus("cancelled");
    } else if (error.code === "EXPORT_DURATION_LIMIT") {
      fileNotice.textContent = error.message;
      setExportStatus("output exceeds 5 min");
    } else {
      console.error(error);
      setExportStatus("export failed");
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

// Keep keyboard navigation inside the modal until it is dismissed.
window.addEventListener("keydown", (event) => {
  if (resetDialog.hidden || event.key !== "Tab") return;
  event.preventDefault();
  event.stopPropagation();
  const first = cancelResetButton;
  const last = confirmResetButton;
  const current = document.activeElement;
  (current === first ? last : current === last ? first : event.shiftKey ? last : first).focus();
}, true);

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
  stretchMode.setAttribute("aria-pressed", String(name === "stretch"));
  pitchMode.setAttribute("aria-pressed", String(name === "pitch"));
  panMode.setAttribute("aria-pressed", String(name === "pan"));
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
  canvasResizeObserver.observe(outputWaveCanvas);
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


// Source edits publish the same complete working buffer to Preview and Render.
sourceEditor = createSourceEditor({
  createBuffer: createAudioBuffer,
  stop: forceStopAudio,
  busyChanged: busy => {
    setTransportBusy(busy);
    if(busy)stopButton.disabled=false;
  },
  primePlayback: () => { ensureAudioContext().catch(console.error); },
  play: playAudio,
  getSeekAnchor:()=>getPlaybackDuration()?playheadSeconds/getPlaybackDuration():0,
  seek:(frame,current)=>{
    if(!buffer)return false;
    const progress=findSourceSeek({sourceDuration:buffer.duration,curve:curves.stretch,direction:transformSettings.globalDirection,outputDuration:getPlaybackDuration(),target:frame/buffer.sampleRate,current});
    seekToProgress(progress===null?current:progress);
    return progress!==null;
  },
  repaint: drawSourceWaveform,
  apply: candidate => {
    buffer=candidate;workletBufferLoaded=false;playheadSeconds=0;sourcePlayheadSeconds=0;
    buildWaveform(buffer);if(buffer)sendBufferToWorklet();
    markDownloadStale();resetCurrentReadouts();draw();
  }
});
sourceEditor.load(buffer);

// Idle readiness is conveyed by the Download control; retain actionable feedback.
function setExportStatus(message) {
  const output = document.getElementById("downloadReadout");
  output.textContent = message;
  output.parentElement.hidden = ["", "ready", "not ready", "needs export"].includes(message);
}
