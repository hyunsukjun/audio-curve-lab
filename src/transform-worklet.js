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
    this.smoothSpeed = 1;
    this.smoothRate = 1;
    this.smoothGain = 0;
    this.smoothPan = 0;
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
        this.grains = [];
        this.grainClock = 0;
      } else if (data.type === "curves") {
        this.stretchCurve = data.stretchCurve;
        this.pitchCurve = data.pitchCurve;
        this.panCurve = data.panCurve || this.panCurve;
      } else if (data.type === "settings") {
        Object.assign(this.settings, data.settings);
      } else if (data.type === "play") {
        this.token = data.token ?? this.token;
        if (this.sourceFrame >= this.left.length - 3) {
          this.sourceFrame = 0;
        }
        this.settings.playing = true;
        this.grains = [];
        this.nextGrain = 0;
        this.grainClock = 0;
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
        this.port.postMessage({ type: "stopped", seconds: this.sourceFrame / this.sampleRateSource, token: this.token });
      } else if (data.type === "seek") {
        this.token = data.token ?? this.token;
        this.sourceFrame = Math.max(0, Math.min(this.left.length - 3, (data.seconds || 0) * this.sampleRateSource));
        this.outputTime = this.sourceFrame / this.sampleRateSource;
        this.grains = [];
        this.nextGrain = 0;
        this.grainClock = 0;
      }
    };
  }

  valueAt(curve, x) {
    if (curve.length === 0) return 0;
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

  read(buffer, pos) {
    if (!buffer || buffer.length === 0) return 0;
    if (pos < 0 || pos >= buffer.length - 3) return 0;
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    const xm1 = buffer[Math.max(0, i0 - 1)];
    const x0 = buffer[i0];
    const x1 = buffer[i0 + 1];
    const x2 = buffer[Math.min(buffer.length - 1, i0 + 2)];
    const a = (-0.5 * xm1) + (1.5 * x0) - (1.5 * x1) + (0.5 * x2);
    const b = xm1 - (2.5 * x0) + (2 * x1) - (0.5 * x2);
    const c = (-0.5 * xm1) + (0.5 * x1);
    return (((a * frac) + b) * frac + c) * frac + x0;
  }

  envelope(phase) {
    return Math.sin(Math.PI * Math.max(0, Math.min(1, phase)));
  }

  speedFromNorm(y) {
    const minSpeed = 0.125;
    const maxSpeed = 4;
    const clamped = Math.max(0, Math.min(1, y));
    if (clamped < 0.5) {
      return minSpeed + ((clamped / 0.5) * (1 - minSpeed));
    }
    return 1 + (((clamped - 0.5) / 0.5) * (maxSpeed - 1));
  }

  isNeutral(speedNorm, pitchNorm, panNorm) {
    return Math.abs(speedNorm - 0.5) < 0.0001
      && Math.abs(pitchNorm - 0.5) < 0.0001
      && Math.abs(panNorm - 0.5) < 0.0001;
  }

  spawnGrain(grainSamples, rate, sourceFrame, randomSamples) {
    const jitter = (Math.random() - 0.5) * randomSamples;
    const centeredStart = sourceFrame + jitter - (((grainSamples - 1) * rate) * 0.5);
    this.grains.push({
      pos: centeredStart,
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
        const speedNorm = this.valueAt(this.stretchCurve, norm);
        const pitchNorm = this.valueAt(this.pitchCurve, norm);
        const panNorm = this.valueAt(this.panCurve, norm);
        const speed = this.speedFromNorm(speedNorm);
        const cents = -2400 + (pitchNorm * 4800);
        const pan = Math.max(-1, Math.min(1, (panNorm - 0.5) * 2));
        const rate = Math.pow(2, cents / 1200);
        this.smoothSpeed += (speed - this.smoothSpeed) * 0.0008;
        this.smoothRate += (rate - this.smoothRate) * 0.0008;
        this.smoothGain += (this.settings.outputGain - this.smoothGain) * 0.0015;
        this.smoothPan += (pan - this.smoothPan) * 0.0015;

        if (this.isNeutral(speedNorm, pitchNorm, panNorm)) {
          l = this.read(this.left, this.sourceFrame) * this.smoothGain;
          r = this.read(this.right, this.sourceFrame) * this.smoothGain;
          this.grains = [];
          this.nextGrain = 0;
        } else {
        const grainSamples = Math.max(64, Math.round((this.settings.grainSizeMs / 1000) * sampleRate));
        const density = Math.max(2, this.settings.density);
        const interval = Math.max(16, Math.round(grainSamples / density));
        const randomSamples = this.settings.randomness * grainSamples * 1.5;

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
          const env = this.envelope(phase);
          l += this.read(this.left, grain.pos) * env;
          r += this.read(this.right, grain.pos) * env;
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

        if ((i & 63) === 0) {
          this.port.postMessage({
            type: "position",
            seconds: this.sourceFrame / this.sampleRateSource,
            speed,
            cents,
            pan: this.smoothPan,
            token: this.token
          });
        }
      }

      outL[i] = Math.tanh(l);
      outR[i] = Math.tanh(r);
    }

    return true;
  }
}

registerProcessor("audio-transform-processor", AudioTransformProcessor);
