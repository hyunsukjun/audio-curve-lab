import {
  centsFromNorm,
  effectiveSpeedAt,
  estimateOutputDuration,
  panFromNorm,
  sourcePositionAtProgress,
  speedFromNorm,
  valueAt
} from "./transform-core.js?v=20260926-05";

const fileInput = document.getElementById("fileInput");
const fileStatus = document.getElementById("fileStatus");
const timeStatus = document.getElementById("timeStatus");
const playButton = document.getElementById("playButton");
const stopButton = document.getElementById("stopButton");
const downloadButton = document.getElementById("downloadButton");
const clearCurveButton = document.getElementById("clearCurveButton");
const resetButton = document.getElementById("resetButton");
const canvas = document.getElementById("waveCanvas");
const ctx = canvas.getContext("2d");
const stretchMode = document.getElementById("stretchMode");
const pitchMode = document.getElementById("pitchMode");
const panMode = document.getElementById("panMode");
const playheadReadout = document.getElementById("playheadReadout");
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

const largeFileSeconds = 180;

const curveColors = {
  stretch: "#6de0c0",
  pitch: "#eb6f75",
  pan: "#b887f4"
};

let audioContext;
let audioSetupPromise = null;
let node;
let workletBufferLoaded = false;
let buffer;
let waveform = [];
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
let canvasBaseWidth = 0;
const canvasMinimumWidth = 1800;
const canvasBaseHeight = 620;
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
  const targetWidth = Math.max(frameRect.width, canvasBaseWidth, canvasMinimumWidth);
  canvasBaseWidth = targetWidth;
  canvas.style.width = `${Math.round(canvasBaseWidth)}px`;
  canvas.style.height = `${canvasBaseHeight}px`;
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvasCssWidth = Math.max(1, rect.width);
  canvasCssHeight = Math.max(1, rect.height);
  const nextWidth = Math.max(1, Math.floor(canvasCssWidth * scale));
  const nextHeight = Math.max(1, Math.floor(canvasCssHeight * scale));
  if (canvas.width !== nextWidth) canvas.width = nextWidth;
  if (canvas.height !== nextHeight) canvas.height = nextHeight;
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

function markDownloadStale() {
  if (!buffer) return;
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
  downloadReadout.textContent = "needs export";
}

function clearDownload() {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = null;
}

function setTransportBusy(isBusy) {
  playButton.disabled = isBusy || !buffer;
  stopButton.disabled = isBusy || !buffer;
  downloadButton.disabled = isBusy || !buffer;
  fileInput.disabled = isBusy;
}

function setRenderBusy(isBusy) {
  playButton.disabled = isBusy || !buffer;
  stopButton.disabled = isBusy || !buffer;
  fileInput.disabled = isBusy;
  downloadButton.disabled = !buffer;
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
    const module = await import("./offline-render.js?v=20260926-05");
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
    const y = (1 - tick.y) * height;
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

function drawCurve(curve, color, width, fillPoints) {
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
    const py = (1 - y) * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  if (fillPoints) {
    for (const point of curve) {
      ctx.beginPath();
      ctx.arc(left + (point.x * w), (1 - point.y) * h, 6, 0, Math.PI * 2);
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
    drawCurve(curves[name], curveColors[name], 2.1, false);
  }
  drawCurve(curves[activeCurve], curveColors[activeCurve], 4.8, true);
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
  const py = (1 - point.y) * h;
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

  if (waveform.length > 0) {
    ctx.fillStyle = "rgba(128, 158, 186, 0.48)";
    const midTop = h * 0.32;
    const midBottom = h * 0.70;
    const ampTop = h * 0.24;
    const ampBottom = h * 0.18;
    const step = Math.max(1, Math.floor(waveform.length / w));
    for (let x = 0; x < w; x += 1) {
      const sample = waveform[Math.min(waveform.length - 1, x * step)] || 0;
      ctx.fillRect(left + x, midTop - (sample * ampTop), 1, Math.max(1, sample * ampTop * 2));
      ctx.fillRect(left + x, midBottom - (sample * ampBottom), 1, Math.max(1, sample * ampBottom * 2));
    }
  }

  drawParameterScale();
  drawCurves();

  if (buffer) {
    const sourceDuration = buffer.duration;
    const x = left + (((sourceDuration > 0 ? sourcePlayheadSeconds / sourceDuration : 0)) * w);
    ctx.strokeStyle = "rgba(226, 236, 244, 0.86)";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  const tooltip = getTooltipPoint();
  if (tooltip) drawPointTooltip(tooltip.curveName, tooltip.point);

  playheadReadout.textContent = formatTime(sourcePlayheadSeconds);
  timeStatus.textContent = buffer
    ? `${formatClock(playheadSeconds)} / ${formatClock(getPlaybackDuration())}`
    : "00:00.00 / 00:00.00";
  stretchReadout.textContent = `${currentSpeed.toFixed(2)} x`;
  pitchReadout.textContent = `${Math.round(currentCents)} cents`;
  panReadout.textContent = formatPan(currentPan);
  modeReadout.textContent = curveLabels[activeCurve];
  pointsReadout.textContent = String(curves[activeCurve].length);
}

function buildWaveform(audioBuffer) {
  const channel = audioBuffer.getChannelData(0);
  const buckets = 4000;
  const samplesPerBucket = Math.max(1, Math.floor(channel.length / buckets));
  waveform = [];
  for (let i = 0; i < buckets; i += 1) {
    let peak = 0;
    const start = i * samplesPerBucket;
    for (let j = 0; j < samplesPerBucket; j += 1) {
      peak = Math.max(peak, Math.abs(channel[start + j] || 0));
    }
    waveform.push(peak);
  }
}

function decodeAudioFile(arrayBuffer) {
  const data = arrayBuffer.slice(0);
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

    await audioContext.audioWorklet.addModule("src/transform-worklet.js?v=20260926-05");
    node = new AudioWorkletNode(audioContext, "audio-transform-processor", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2]
    });
    node.connect(audioContext.destination);
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
    const data = await file.arrayBuffer();
    buffer = await decodeAudioFile(data);
    buildWaveform(buffer);
    workletBufferLoaded = false;
    sendBufferToWorklet();
    const longFileNote = buffer.duration > largeFileSeconds ? " - long file" : "";
    fileStatus.textContent = `${file.name} - ${buffer.duration.toFixed(2)} s${longFileNote}`;
    clearDownload();
    downloadReadout.textContent = buffer.duration > largeFileSeconds ? "export capped" : "ready";
    playheadSeconds = 0;
    sourcePlayheadSeconds = 0;
    resetCurrentReadouts();
    draw();
  } catch (error) {
    console.error(error);
    fileStatus.textContent = "Could not load audio. Try WAV, MP3, or M4A.";
    downloadReadout.textContent = "not ready";
    buffer = null;
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
      audioBuffer: buffer,
      curves,
      settings: getSettings(),
      signal: renderAbortController.signal,
      onProgress: (progress) => {
        downloadReadout.textContent = `creating ${Math.round(progress * 100)}%`;
      }
    });

    downloadUrl = URL.createObjectURL(rendered.blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "AudioCurveLab-export.wav";
    document.body.appendChild(link);
    link.click();
    link.remove();
    downloadReadout.textContent = rendered.truncated
      ? `${rendered.duration.toFixed(1)} s, capped`
      : `${rendered.duration.toFixed(1)} s`;
  } catch (error) {
    if (error.name === "AbortError") {
      downloadReadout.textContent = "cancelled";
    } else {
      console.error(error);
      downloadReadout.textContent = "export failed";
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
  const y = Math.max(0, Math.min(1, 1 - ((event.clientY - rect.top) / rect.height)));
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

canvas.addEventListener("dblclick", (event) => {
  if (!buffer) return;
  const p = pointerToPoint(event);
  playheadSeconds = p.x * getPlaybackDuration();
  sourcePlayheadSeconds = sourcePositionAtProgress(
    buffer.duration,
    curves.stretch,
    transformSettings.globalDirection,
    p.x
  );
  node?.port.postMessage({ type: "seek", progress: p.x, token: playbackToken });
  draw();
});

window.addEventListener("resize", resizeCanvas);
if ("ResizeObserver" in window) {
  const canvasResizeObserver = new ResizeObserver(resizeCanvas);
  canvasResizeObserver.observe(canvas);
}

window.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
  if (event.code !== "Space" || isTyping || event.repeat || !buffer) return;
  event.preventDefault();
  event.stopPropagation();
  if (document.activeElement instanceof HTMLButtonElement) {
    document.activeElement.blur();
  }
  toggleAudio();
});

window.addEventListener("keyup", (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
  if (event.code !== "Space" || isTyping) return;
  event.preventDefault();
  event.stopPropagation();
});

resizeCanvas();
loadGeneratedExample();
