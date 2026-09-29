const DEFAULT_OPTIONS = Object.freeze({
  channelCount: 2,
  fftSize: 1024,
  clipThreshold: 0.999
});

export class OutputMeterAnalyzer {
  constructor(context, options = {}) {
    const settings = { ...DEFAULT_OPTIONS, ...options };
    this.context = context;
    this.channelCount = Math.max(1, Math.floor(settings.channelCount));
    this.clipThreshold = settings.clipThreshold;
    this.input = context.createGain();
    this.input.gain.value = 1;
    this.input.channelCount = this.channelCount;
    this.input.channelCountMode = "explicit";
    this.splitter = context.createChannelSplitter(this.channelCount);
    this.analysers = [];
    this.sampleBuffers = [];

    this.input.connect(this.splitter);
    for (let channel = 0; channel < this.channelCount; channel += 1) {
      const analyser = context.createAnalyser();
      analyser.fftSize = settings.fftSize;
      analyser.smoothingTimeConstant = 0;
      this.splitter.connect(analyser, channel);
      this.analysers.push(analyser);
      this.sampleBuffers.push(new Float32Array(analyser.fftSize));
    }
  }

  connect(destination) {
    this.input.connect(destination);
  }

  read() {
    return this.analysers.map((analyser, channel) => {
      const samples = this.sampleBuffers[channel];
      analyser.getFloatTimeDomainData(samples);
      let peak = 0;
      let sumSquares = 0;
      for (let i = 0; i < samples.length; i += 1) {
        const absolute = Math.abs(samples[i]);
        if (absolute > peak) peak = absolute;
        sumSquares += samples[i] * samples[i];
      }
      return {
        peak,
        rms: Math.sqrt(sumSquares / samples.length),
        clipped: peak >= this.clipThreshold
      };
    });
  }
}
