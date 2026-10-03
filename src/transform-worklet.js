import {
  TRANSFORM_CONSTANTS,
  alignedGrainStart,
  centsFromNorm,
  coherentGrainScale,
  createSeededRandom,
  effectiveSpeedAt,
  estimateOutputDuration,
  grainEnvelope,
  grainMixScale,
  grainOverlapCorrection,
  grainStart,
  initialPlaybackDirection,
  panFromNorm,
  readCubic,
  sourcePositionAtProgress,
  speedDirection,
  transformCanUseDirect,
  valueAt
} from "./transform-core.js?v=20261003-01";

class AudioTransformProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.left = null;
    this.right = null;
    this.sampleRateSource = sampleRate;
    this.duration = 0;
    this.sourceFrame = 0;
    this.outputFrame = 0;
    this.outputDuration = 0;
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
    this.lastReadDirection = 1;
    this.nextRandom = createSeededRandom();
    this.directMode = true;
    this.stretchCurve = [{ x: 0, y: 0.75 }, { x: 1, y: 0.75 }];
    this.pitchCurve = [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }];
    this.panCurve = [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }];
    this.settings = {
      grainSizeMs: 140,
      density: 5.5,
      randomness: 0.02,
      outputGain: 0.95,
      globalDirection: 1,
      playing: false
    };

    this.port.onmessage = (event) => {
      const data = event.data;
      if (data.type === "buffer") {
        this.left = data.left;
        this.right = data.right || data.left;
        this.sampleRateSource = data.sampleRate;
        this.duration = this.left.length / this.sampleRateSource;
        this.outputFrame = 0;
        this.updateOutputDuration();
        this.sourceFrame = this.initialSourceFrame();
        this.positionFramesUntilUpdate = 0;
        this.grains = [];
        this.grainClock = 0;
        this.nextRandom = createSeededRandom();
      } else if (data.type === "curves") {
        this.stretchCurve = data.stretchCurve;
        this.pitchCurve = data.pitchCurve;
        this.panCurve = data.panCurve || this.panCurve;
        this.directMode = transformCanUseDirect(this.stretchCurve, this.pitchCurve);
        this.updateOutputDuration();
      } else if (data.type === "settings") {
        Object.assign(this.settings, data.settings);
        this.updateOutputDuration();
      } else if (data.type === "play") {
        this.token = data.token ?? this.token;
        if (this.outputFrame >= this.outputDurationFrames()) {
          this.outputFrame = 0;
        }
        if (this.outputFrame === 0) {
          this.sourceFrame = this.initialSourceFrame();
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
          this.outputFrame = 0;
          this.sourceFrame = this.initialSourceFrame();
        }
        this.positionFramesUntilUpdate = 0;
        this.port.postMessage({ type: "stopped", seconds: 0, token: this.token });
      } else if (data.type === "seek") {
        this.token = data.token ?? this.token;
        const fallbackProgress = this.outputDuration > 0 ? (data.seconds || 0) / this.outputDuration : 0;
        const progress = Math.max(0, Math.min(1, data.progress ?? fallbackProgress));
        this.outputFrame = progress * this.outputDurationFrames();
        this.sourceFrame = sourcePositionAtProgress(
          this.duration,
          this.stretchCurve,
          this.settings.globalDirection,
          progress,
          this.outputDuration
        ) * this.sampleRateSource;
        this.positionFramesUntilUpdate = 0;
        this.grains = [];
        this.nextGrain = 0;
        this.grainClock = 0;
        this.nextRandom = createSeededRandom();
        this.resetControlState();
      }
    };
  }

  updateOutputDuration() {
    this.outputDuration = Math.min(180, estimateOutputDuration(this.duration || 0, this.stretchCurve));
  }

  outputDurationFrames() {
    return Math.max(1, this.outputDuration * sampleRate);
  }

  initialSourceFrame() {
    if (!this.left?.length) return 0;
    const direction = initialPlaybackDirection(this.stretchCurve, this.settings.globalDirection);
    this.lastReadDirection = direction;
    return direction < 0 ? this.left.length - 3 : 0;
  }

  resetControlState() {
    if (!this.left?.length) return;
    const norm = Math.min(1, this.outputFrame / this.outputDurationFrames());
    const cents = centsFromNorm(valueAt(this.pitchCurve, norm));
    this.smoothSpeed = effectiveSpeedAt(this.stretchCurve, norm, this.settings.globalDirection);
    this.smoothRate = Math.pow(2, cents / 1200);
    this.smoothPan = panFromNorm(valueAt(this.panCurve, norm));
    this.smoothGain = 0;
  }

  spawnGrain(grainSamples, rate, sourceFrame, randomSamples, freeze) {
    const jitter = freeze ? (this.nextRandom() - 0.5) * randomSamples : 0;
    const nominal = grainStart(sourceFrame, grainSamples, rate, this.left.length, jitter);
    const previous = this.grains[this.grains.length - 1];
    const start = !freeze && previous && !previous.freeze
      ? alignedGrainStart(this.left, this.right, nominal, rate, grainSamples, previous.pos, previous.rate, Math.round(this.sampleRateSource * 0.01))
      : nominal;
    this.grains.push({
      pos: start,
      age: 0,
      length: grainSamples,
      rate,
      freeze
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
      let grainEnvelopeSum = 0;
      let freezeEnvelopeSum = 0;

      if (this.left && this.settings.playing) {
        const norm = Math.min(1, this.outputFrame / this.outputDurationFrames());
        const pitchNorm = valueAt(this.pitchCurve, norm);
        const panNorm = valueAt(this.panCurve, norm);
        const speed = effectiveSpeedAt(this.stretchCurve, norm, this.settings.globalDirection);
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
          this.lastReadDirection = speedDirection(this.smoothSpeed, this.lastReadDirection);
          const grainRate = this.smoothRate * this.lastReadDirection * (this.sampleRateSource / sampleRate);
          const freeze = Math.abs(this.smoothSpeed) <= TRANSFORM_CONSTANTS.freezeThreshold;
          this.spawnGrain(grainSamples, grainRate, this.sourceFrame, randomSamples, freeze);
          this.nextGrain += interval;
        }
        this.nextGrain -= 1;

        for (let g = this.grains.length - 1; g >= 0; g -= 1) {
          const grain = this.grains[g];
          if (grain.age >= grain.length) {
            this.grains.splice(g, 1);
            continue;
          }
          const phase = grain.age / Math.max(1, grain.length - 1);
          const env = grainEnvelope(phase);
          const grainScale = grain.freeze ? grainMixScale(this.smoothGain, density) : 1;
          l += readCubic(this.left, grain.pos) * env * grainScale;
          r += readCubic(this.right, grain.pos) * env * grainScale;
          grainEnvelopeSum += env;
          if (grain.freeze) freezeEnvelopeSum += env;
          grain.pos += grain.rate;
          grain.age += 1;
        }

        const freezePart = grainEnvelopeSum > 1e-6 ? freezeEnvelopeSum / grainEnvelopeSum : 0;
        const scale = ((1 - freezePart) * coherentGrainScale(this.smoothGain, grainEnvelopeSum))
          + (freezePart * grainOverlapCorrection(grainEnvelopeSum, density));
        l *= scale;
        r *= scale;
        }
        const panAngle = (this.smoothPan + 1) * Math.PI * 0.25;
        const leftPan = Math.cos(panAngle);
        const rightPan = Math.sin(panAngle);
        l *= leftPan * 1.41421356237;
        r *= rightPan * 1.41421356237;
        this.sourceFrame = Math.max(
          0,
          Math.min(this.left.length - 3, this.sourceFrame + (this.smoothSpeed * (this.sampleRateSource / sampleRate)))
        );
        this.outputFrame += 1;
        if (this.outputFrame >= this.outputDurationFrames()) {
          this.outputFrame = this.outputDurationFrames();
          this.settings.playing = false;
          this.port.postMessage({ type: "ended", token: this.token });
        }

        if (this.positionFramesUntilUpdate <= 0) {
          this.port.postMessage({
            type: "position",
            seconds: this.outputFrame / sampleRate,
            sourceSeconds: this.sourceFrame / this.sampleRateSource,
            duration: this.outputDuration,
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
