import {
  TRANSFORM_CONSTANTS,
  centsFromNorm,
  createSeededRandom,
  grainEnvelope,
  grainStart,
  panFromNorm,
  readCubic,
  speedFromNorm,
  transformIsNeutral,
  valueAt
} from "./transform-core.js?v=20260926-02";

class AudioTransformProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.left = null;
    this.right = null;
    this.sampleRateSource = sampleRate;
    this.duration = 0;
    this.sourceFrame = 0;
    this.outputTime = 0;
    this.nextGrain = 0;
    this.grains = [];
    this.grainClock = 0;
    this.token = 0;
    this.positionFramesUntilUpdate = 0;
    this.positionUpdateInterval = Math.max(1, Math.round(sampleRate / 30));
    this.smoothSpeed = 1;
    this.smoothRate = 1;
    this.smoothGain = 0;
    this.smoothPan = 0;
    this.nextRandom = createSeededRandom();
    this.directMode = true;
    this.stretchCurve = [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }];
    this.pitchCurve = [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }];
    this.panCurve = [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }];
    this.settings = {
      grainSizeMs: 140,
      density: 5.5,
      randomness: 0.02,
      outputGain: 0.95,
      playing: false
    };

    this.port.onmessage = (event) => {
      const data = event.data;
      if (data.type === "buffer") {
        this.left = data.left;
        this.right = data.right || data.left;
        this.sampleRateSource = data.sampleRate;
        this.duration = this.left.length / this.sampleRateSource;
        this.sourceFrame = 0;
        this.outputTime = 0;
        this.positionFramesUntilUpdate = 0;
        this.grains = [];
        this.grainClock = 0;
        this.nextRandom = createSeededRandom();
      } else if (data.type === "curves") {
        this.stretchCurve = data.stretchCurve;
        this.pitchCurve = data.pitchCurve;
        this.panCurve = data.panCurve || this.panCurve;
        this.directMode = transformIsNeutral(this.stretchCurve, this.pitchCurve);
      } else if (data.type === "settings") {
        Object.assign(this.settings, data.settings);
      } else if (data.type === "play") {
        this.token = data.token ?? this.token;
        if (this.sourceFrame >= this.left.length - 3) {
          this.sourceFrame = 0;
        }
        this.settings.playing = true;
        this.positionFramesUntilUpdate = 0;
        this.grains = [];
        this.nextGrain = 0;
        this.grainClock = 0;
        this.nextRandom = createSeededRandom();
        this.resetControlState();
      } else if (data.type === "stop") {
        this.token = data.token ?? this.token;
        this.settings.playing = false;
        this.grains = [];
        this.nextGrain = 0;
        this.grainClock = 0;
        if (data.reset) {
          this.sourceFrame = 0;
          this.outputTime = 0;
        }
        this.positionFramesUntilUpdate = 0;
        this.port.postMessage({ type: "stopped", seconds: this.sourceFrame / this.sampleRateSource, token: this.token });
      } else if (data.type === "seek") {
        this.token = data.token ?? this.token;
        this.sourceFrame = Math.max(0, Math.min(this.left.length - 3, (data.seconds || 0) * this.sampleRateSource));
        this.outputTime = this.sourceFrame / this.sampleRateSource;
        this.positionFramesUntilUpdate = 0;
        this.grains = [];
        this.nextGrain = 0;
        this.grainClock = 0;
        this.nextRandom = createSeededRandom();
        this.resetControlState();
      }
    };
  }

  resetControlState() {
    if (!this.left?.length) return;
    const norm = Math.min(1, this.sourceFrame / Math.max(1, this.left.length - 1));
    const cents = centsFromNorm(valueAt(this.pitchCurve, norm));
    this.smoothSpeed = speedFromNorm(valueAt(this.stretchCurve, norm));
    this.smoothRate = Math.pow(2, cents / 1200);
    this.smoothPan = panFromNorm(valueAt(this.panCurve, norm));
    this.smoothGain = 0;
  }

  spawnGrain(grainSamples, rate, sourceFrame, randomSamples) {
    const jitter = (this.nextRandom() - 0.5) * randomSamples;
    this.grains.push({
      pos: grainStart(sourceFrame, grainSamples, rate, this.left.length, jitter),
      age: 0,
      length: grainSamples,
      rate
    });
    if (this.grains.length > 96) this.grains.splice(0, this.grains.length - 96);
  }

  process(_, outputs) {
    const out = outputs[0];
    const outL = out[0];
    const outR = out[1] || out[0];

    for (let i = 0; i < outL.length; i += 1) {
      let l = 0;
      let r = 0;

      if (this.left && this.settings.playing) {
        const norm = this.left.length > 1 ? Math.min(1, this.sourceFrame / (this.left.length - 1)) : 0;
        const speedNorm = valueAt(this.stretchCurve, norm);
        const pitchNorm = valueAt(this.pitchCurve, norm);
        const panNorm = valueAt(this.panCurve, norm);
        const speed = speedFromNorm(speedNorm);
        const cents = centsFromNorm(pitchNorm);
        const pan = panFromNorm(panNorm);
        const rate = Math.pow(2, cents / 1200);
        this.smoothSpeed += (speed - this.smoothSpeed) * TRANSFORM_CONSTANTS.speedSmoothing;
        this.smoothRate += (rate - this.smoothRate) * TRANSFORM_CONSTANTS.rateSmoothing;
        this.smoothGain += (this.settings.outputGain - this.smoothGain) * TRANSFORM_CONSTANTS.gainSmoothing;
        this.smoothPan += (pan - this.smoothPan) * TRANSFORM_CONSTANTS.panSmoothing;

        if (this.directMode) {
          l = readCubic(this.left, this.sourceFrame) * this.smoothGain;
          r = readCubic(this.right, this.sourceFrame) * this.smoothGain;
          this.grains = [];
          this.nextGrain = 0;
        } else {
        const grainSamples = Math.max(TRANSFORM_CONSTANTS.minGrainSamples, Math.round((this.settings.grainSizeMs / 1000) * sampleRate));
        const density = Math.max(2, this.settings.density);
        const interval = Math.max(TRANSFORM_CONSTANTS.minHopSamples, Math.round(grainSamples / density));
        const randomSamples = this.settings.randomness * grainSamples * TRANSFORM_CONSTANTS.jitterFactor;

        while (this.nextGrain <= 0) {
          this.spawnGrain(grainSamples, this.smoothRate * (this.sampleRateSource / sampleRate), this.sourceFrame, randomSamples);
          this.nextGrain += interval;
        }
        this.nextGrain -= 1;

        for (let g = this.grains.length - 1; g >= 0; g -= 1) {
          const grain = this.grains[g];
          const phase = grain.age / grain.length;
          if (phase >= 1) {
            this.grains.splice(g, 1);
            continue;
          }
          const env = grainEnvelope(phase);
          l += readCubic(this.left, grain.pos) * env;
          r += readCubic(this.right, grain.pos) * env;
          grain.pos += grain.rate;
          grain.age += 1;
        }

        const scale = this.smoothGain / Math.sqrt(Math.max(1, this.grains.length * 0.8));
        l *= scale;
        r *= scale;
        }
        const panAngle = (this.smoothPan + 1) * Math.PI * 0.25;
        const leftPan = Math.cos(panAngle);
        const rightPan = Math.sin(panAngle);
        l *= leftPan * 1.41421356237;
        r *= rightPan * 1.41421356237;
        this.sourceFrame += Math.max(0.03125, this.smoothSpeed) * (this.sampleRateSource / sampleRate);
        if (this.sourceFrame >= this.left.length - 3) {
          this.sourceFrame = this.left.length - 3;
          this.settings.playing = false;
          this.port.postMessage({ type: "ended", token: this.token });
        }

        if (this.positionFramesUntilUpdate <= 0) {
          this.port.postMessage({
            type: "position",
            seconds: this.sourceFrame / this.sampleRateSource,
            speed,
            cents,
            pan: this.smoothPan,
            token: this.token
          });
          this.positionFramesUntilUpdate = this.positionUpdateInterval;
        }
        this.positionFramesUntilUpdate -= 1;
      }

      outL[i] = Math.tanh(l);
      outR[i] = Math.tanh(r);
    }

    return true;
  }
}

registerProcessor("audio-transform-processor", AudioTransformProcessor);
