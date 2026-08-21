import { renderOffline } from "./offline-render.js?v=20260821-15";

const fileInput = document.getElementById("fileInput");
const fileStatus = document.getElementById("fileStatus");
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

const transformSettings = {
  grainSizeMs: 140,
  density: 5.5,
  randomness: 0.02,
  outputGain: 0.95
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
let buffer;
let waveform = [];
let activeCurve = "stretch";
let selectedPoint = null;
let dragging = false;
let playheadSeconds = 0;
let currentSpeed = 1;
let currentCents = 0;
let currentPan = 0;
let downloadUrl = null;
let renderAbortController = null;
let isPlaying = false;
let playbackToken = 0;
let dragDepth = 0;

const curves = {
  stretch: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }],
  pitch: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }],
  pan: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }]
};

const defaultCurves = {
  stretch: () => [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }],
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
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(800, Math.floor(rect.width * scale));
  canvas.height = Math.max(360, Math.floor(rect.height * scale));
  draw();
}

function formatTime(seconds) {
  return `${seconds.toFixed(2)} s`;
}

function formatPan(value) {
  if (Math.abs(value) < 0.02) return "center";
  return value < 0 ? `L ${Math.round(Math.abs(value) * 100)}` : `R ${Math.round(value * 100)}`;
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
  playButton.textContent = "Play";
  draw();
}

function forceStopAudio() {
  if (!buffer) return;
  node?.port.postMessage({ type: "stop", reset: true, token: nextPlaybackToken() });
  isPlaying = false;
  playheadSeconds = 0;
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

function isAudioFile(file) {
  return file?.type?.startsWith("audio/") || /\.(aif|aiff|flac|m4a|mp3|ogg|wav)$/i.test(file?.name || "");
}

function valueAt(curve, x) {
  if (x <= curve[0].x) return curve[0].y;
  for (let i = 1; i < curve.length; i += 1) {
    const a = curve[i - 1];
    const b = curve[i];
    if (x <= b.x) {
      const t = (x - a.x) / Math.max(1e-6, b.x - a.x);
      const eased = t * t * (3 - (2 * t));
      return a.y + ((b.y - a.y) * eased);
    }
  }
  return curve[curve.length - 1].y;
}

function drawCurve(curve, color, width, fillPoints) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let i = 0; i <= w; i += 3) {
    const x = i / w;
    const y = valueAt(curve, x);
    const px = x * w;
    const py = (1 - y) * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  if (fillPoints) {
    for (const point of curve) {
      ctx.beginPath();
      ctx.arc(point.x * w, (1 - point.y) * h, 6 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#111316";
      ctx.lineWidth = 2 * (window.devicePixelRatio || 1);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCurves() {
  const scale = window.devicePixelRatio || 1;
  const curveOrder = ["stretch", "pitch", "pan"];
  for (const name of curveOrder) {
    if (name === activeCurve) continue;
    if (!editedCurves[name]) continue;
    drawCurve(curves[name], curveColors[name], 1.8 * scale, false);
  }
  drawCurve(curves[activeCurve], curveColors[activeCurve], 3 * scale, true);
}

function draw() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#bdc8aa";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(55, 65, 55, 0.36)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i += 1) {
    const x = (i / 10) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let i = 1; i < 4; i += 1) {
    const y = (i / 4) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  if (waveform.length > 0) {
    ctx.fillStyle = "rgba(108, 101, 72, 0.38)";
    const midTop = h * 0.32;
    const midBottom = h * 0.70;
    const ampTop = h * 0.24;
    const ampBottom = h * 0.18;
    const step = Math.max(1, Math.floor(waveform.length / w));
    for (let x = 0; x < w; x += 1) {
      const sample = waveform[Math.min(waveform.length - 1, x * step)] || 0;
      ctx.fillRect(x, midTop - (sample * ampTop), 1, Math.max(1, sample * ampTop * 2));
      ctx.fillRect(x, midBottom - (sample * ampBottom), 1, Math.max(1, sample * ampBottom * 2));
    }
  }

  drawCurves();

  if (buffer) {
    const x = (playheadSeconds / buffer.duration) * w;
    ctx.strokeStyle = "#d7bc52";
    ctx.lineWidth = 2 * (window.devicePixelRatio || 1);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  playheadReadout.textContent = formatTime(playheadSeconds);
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
  if (audioContext.state !== "running") await audioContext.resume();
}

async function setupAudio() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("Web Audio is not available in this browser.");
    }

    audioContext = new AudioContextClass();
    if (!audioContext.audioWorklet) {
      throw new Error("AudioWorklet is not available. Use a current Chrome, Edge, or Safari version over HTTPS.");
    }

    await audioContext.audioWorklet.addModule("src/transform-worklet.js?v=20260821-15");
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
        currentSpeed = event.data.speed ?? event.data.stretch;
        currentCents = event.data.cents;
        currentPan = event.data.pan;
        draw();
      } else if (event.data.type === "ended") {
        playButton.textContent = "Play";
        isPlaying = false;
        if (buffer) playheadSeconds = buffer.duration;
        draw();
      } else if (event.data.type === "stopped") {
        playButton.textContent = "Play";
        isPlaying = false;
        playheadSeconds = 0;
        draw();
      }
    };
    sendSettings();
    sendCurves();
  }
async function loadAudioFile(file) {
  if (!file) return;
  if (!isAudioFile(file)) {
    fileStatus.textContent = "Please drop an audio file.";
    return;
  }
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
    await ensureAudio();
    const data = await file.arrayBuffer();
    buffer = await decodeAudioFile(data);
    buildWaveform(buffer);
    const left = new Float32Array(buffer.getChannelData(0));
    const right = new Float32Array(buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0));
    node.port.postMessage({ type: "buffer", left, right, sampleRate: buffer.sampleRate }, [left.buffer, right.buffer]);
    const longFileNote = buffer.duration > largeFileSeconds ? " - long file" : "";
    fileStatus.textContent = `${file.name} - ${buffer.duration.toFixed(2)} s${longFileNote}`;
    clearDownload();
    downloadReadout.textContent = buffer.duration > largeFileSeconds ? "export capped" : "ready";
    playheadSeconds = 0;
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
    const rendered = await renderOffline({
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

resetButton.addEventListener("click", () => {
  curves.stretch = defaultCurves.stretch();
  curves.pitch = defaultCurves.pitch();
  curves.pan = defaultCurves.pan();
  editedCurves.stretch = false;
  editedCurves.pitch = false;
  editedCurves.pan = false;
  markDownloadStale();
  sendCurves();
  draw();
});

clearCurveButton.addEventListener("click", () => {
  curves[activeCurve] = defaultCurves[activeCurve]();
  editedCurves[activeCurve] = false;
  selectedPoint = null;
  markDownloadStale();
  sendCurves();
  draw();
});

function setActiveCurve(name) {
  activeCurve = name;
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
  const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, 1 - ((event.clientY - rect.top) / rect.height)));
  return { x, y };
}

canvas.addEventListener("pointerdown", (event) => {
  const p = pointerToPoint(event);
  const curve = curves[activeCurve];
  const hitRadius = 0.025;
  selectedPoint = curve.findIndex((point) => Math.abs(point.x - p.x) < hitRadius && Math.abs(point.y - p.y) < hitRadius);
  if (selectedPoint < 0) {
    curve.push(p);
    sortCurve(curve);
    selectedPoint = curve.indexOf(p);
  }
  editedCurves[activeCurve] = true;
  dragging = true;
  canvas.setPointerCapture(event.pointerId);
  sendCurves();
  draw();
});

canvas.addEventListener("pointermove", (event) => {
  if (!dragging || selectedPoint == null) return;
  const p = pointerToPoint(event);
  const curve = curves[activeCurve];
  const point = curve[selectedPoint];
  point.x = p.x;
  point.y = p.y;
  editedCurves[activeCurve] = true;
  sortCurve(curve);
  selectedPoint = curve.indexOf(point);
  sendCurves();
  draw();
});

canvas.addEventListener("pointerup", (event) => {
  dragging = false;
  canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener("dblclick", (event) => {
  if (!buffer || !node) return;
  const p = pointerToPoint(event);
  playheadSeconds = p.x * buffer.duration;
  node.port.postMessage({ type: "seek", seconds: playheadSeconds, token: playbackToken });
  draw();
});

window.addEventListener("resize", resizeCanvas);

window.addEventListener("dragenter", (event) => {
  event.preventDefault();
  dragDepth += 1;
  document.body.classList.add("draggingAudio");
});

window.addEventListener("dragover", (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
});

window.addEventListener("dragleave", (event) => {
  event.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) document.body.classList.remove("draggingAudio");
});

window.addEventListener("drop", async (event) => {
  event.preventDefault();
  dragDepth = 0;
  document.body.classList.remove("draggingAudio");
  await loadAudioFile(event.dataTransfer.files?.[0]);
});

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
