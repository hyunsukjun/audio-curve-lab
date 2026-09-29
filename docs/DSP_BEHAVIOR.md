# DSP Behavior

## Musical Model

Audio Curve Lab treats the source as material read through three trajectories:

- Speed controls how quickly and in which direction the source position moves.
- Pitch controls grain playback rate without changing the signed source-travel rule.
- Pan controls stereo placement through output time.

Curves are evaluated against normalized output progress. The engine therefore composes
what is heard over the resulting timeline, not simply over original source time.

## Signal Flow

```text
Source buffer
  -> curve evaluation at output progress
  -> Speed source-position advance and direction
  -> direct reader OR overlapping grain reader
  -> Pitch grain playback ratio
  -> waveform-aligned grain starts and overlap-level compensation
  -> equal-power Pan
  -> gain smoothing
  -> tanh output limiting
  -> Preview master output -> Peak/RMS meter branch -> audio destination
  OR offline WAV encoding
```

## Curve Evaluation And Mapping

Adjacent points use smoothstep interpolation `t^2(3-2t)`. Speed maps linearly from
normalized `y` to `-2..+2`; Pitch maps to `-2400..+2400` cents and ratio
`2^(cents/1200)`; Pan maps to `-1..+1`.

The shared mapping, interpolation, direction, duration, grain helpers, smoothing
constants, and deterministic random generator live in `src/transform-core.js`.

## Direct Path

The direct reader is used when Pitch is neutral and Speed is constant at exactly
`+1x` or `-1x` within tolerance. It uses cubic interpolation, smoothed gain/pan, signed
source-frame advance, equal-power pan, and `tanh`. This avoids rebuilding an unchanged
sound from grains.

Pan automation remains active on the direct path. Constant `-1x` begins near the end of
the source and reads backward.

## Granular Transform Path

Any non-neutral Pitch or nonconstant/non-unit Speed selects overlapping windowed grains.
Current internal settings are:

- grain size: 140 ms;
- density: 5.5 overlaps;
- randomness: 0.02;
- output gain: 0.95;
- minimum grain length: 128 samples;
- minimum hop: 24 samples;
- jitter span factor: 0.75;
- deterministic random seed: `0x4f1bbcdc`.

Each grain uses a sine window `sin(pi * phase)`. Source samples use cubic interpolation.
For non-Freeze grains, a shared Preview/Render helper searches within 10 ms of the
nominal source start for the waveform that best matches the preceding grain's current
L/R waveform. It evaluates short normalized correlations, penalizes large offsets,
and includes the previous grain's fractional source position as a candidate. This is
a bounded waveform-alignment step, not a full WSOLA or phase-vocoder engine. The
independent source-position clock still follows the Speed curve.

Ordinary transformed grains do not use random source-position jitter. Their active
sine-window sum sets the coherent mix gain as `smoothedGain / max(0.5, envelopeSum)`.
This brings small transformations close to the direct reader's steady-state level
when grains align. Render applies equivalent output-gain smoothing during its final
sample pass. The exact grain size and density remain provisional listening values.

Freeze grains retain seeded jitter and their former `gain / sqrt(max(1, density * 0.8))`
mix scale. For them, the expected sine-envelope sum `density * 2/pi` is divided by the
actual sum and clamped to `0.5..2.0`. Across a Freeze boundary, the active envelope
proportions blend the two gain rules, avoiding an immediate gain switch. A zero
envelope sum remains silent; the lower bound prevents tiny weights from being amplified
without limit.

## Signed Speed, Reverse, And Freeze

Positive Speed advances source position; negative Speed retreats. Direction for grain
reading follows the sign. When `abs(speed) <= 0.02`, the last nonzero direction is
retained while source advance approaches/holds zero. Overlapping grains continue, so a
sustained zero region behaves as a windowed granular Freeze rather than a single-sample
loop.

Output duration is estimated from average absolute Speed over 1024 samples of the curve:
`sourceDuration / average(abs(speed))`, ignoring the Freeze region. An all-Freeze curve
falls back to source duration. Preview and Render cap output at 180 seconds.

## Smoothing

Realtime per-sample approach amounts:

- Speed: 0.0008
- Pitch ratio: 0.0008
- Output gain: 0.0015
- Pan: 0.0015

Offline granular rendering converts these per-sample amounts to equivalent per-hop
amounts using `1 - (1-a)^blockSize`. Exact time constants depend on sample rate and hop
size. Recommended musical smoothing and approval rationale are `TO BE DOCUMENTED`.

## Pan And Channels

Pan angle is `(pan + 1) * pi/4`. Left/right gains are cosine/sine multiplied by
approximately `sqrt(2)` to compensate center level. Mono input uses the same source for
both output channels. Stereo input reads channels 1 and 2 independently. Inputs with
more than two channels are not preserved as multichannel output.

## Gain, Clipping, And Normalization

Both paths apply `tanh` to bound final sample values. Offline transformed output first
measures peak and applies at most unity scaling toward a target peak of 0.92, then applies
`tanh`. Offline direct output does not use this global normalization. Realtime Preview
does not use whole-file normalization because the future peak is unavailable.

Consequently, loudness and transient shape can differ between transformed Preview and
Render. This is a known parity limitation, not an exact-match claim.

The waveform-alignment search improves gentle changes on tested sine and noise inputs,
but cannot guarantee transparent processing for transient-rich polyphonic material,
rapid curve changes, extreme Speed/Pitch, or high-frequency pitch-up aliasing. These
need additional listening fixtures and, if required, a band-limited resampler.

## Sample Rate And Timing

- Default sample: 48 kHz.
- User source: decoded sample rate is retained.
- Offline output: source sample rate.
- Realtime output: AudioContext/AudioWorklet sample rate; grain read rate includes the
  source/output sample-rate ratio.
- Worklet position updates: approximately 30 Hz.
- No explicit user-facing latency compensation is documented.

## Preview Engine

`src/transform-worklet.js` renders sample by sample and keeps at most 96 active grains.
It receives copied source channels, current curves, and settings. Playback tokens prevent
stale position/end messages from controlling a newer session. Curves can update while
playing.

Browser AudioContext suspension, device changes, sleep/wake, and process throttling are
platform lifecycle risks and require real-device testing.

## Realtime Output Metering

The realtime worklet output connects to a unity-gain final-output node. That same final
signal reaches the audio destination and a channel splitter in `src/output-meter.js`.
One standard `AnalyserNode` per channel provides time-domain samples; the analyzer
calculates linear Peak, RMS, and a `peak >= 0.999` Clip flag. Metering does not feed back
into, normalize, or otherwise change the audio signal.

The measurement result is an array indexed by channel, not a permanent L/R-only object.
The current UI displays two channels. Display smoothing, Peak Hold, and Clip latching are
UI behavior rather than module DSP.

Initial unapproved display values are recorded in `finetuning-log.md`. They require
practical listening/visual evaluation before becoming a shared Curve Lab specification.

## Offline Render Engine

`src/offline-render.js` schedules complete grains in hop-sized steps into stereo float
buffers. It yields to the UI after roughly 1% progress or 60 ms, supports cancellation,
uses deterministic jitter, and encodes stereo 24-bit PCM WAV at source sample rate.

Render filename: `AudioCurveLab-export.wav`.

## Preview / Render Parity

Shared:

- parameter mappings and smoothstep interpolation;
- signed Speed and Freeze threshold;
- direct-path eligibility;
- cubic source reading;
- grain envelope, bounded waveform alignment, bounds, and Freeze-only seeded jitter;
- coherent overlap compensation outside Freeze and bounded Freeze overlap correction;
- smoothing constants and equal-power Pan intent;
- duration estimation and 180-second cap.

Different:

- realtime creates/advances overlapping grains sample by sample;
- offline adds one complete grain per hop;
- realtime may run at an output sample rate different from the source;
- transformed offline output uses whole-buffer peak scaling to 0.92;
- realtime cannot perform whole-future-buffer normalization.

Therefore the engines share a product model but are not guaranteed sample-identical or
perceptually identical. Listening comparison at neutral, moderate, extreme, reverse,
Freeze, and rapid-transition cases remains `TO BE DOCUMENTED`.

## Initialization And Reset

Default curves are Speed `+1x`, Pitch `0`, Pan center. Grain clocks, active grains,
random sequence, smoothing state, source position, and output position reset at a fresh
play/seek/stop lifecycle as appropriate. Natural completion posts an ended state.

## Known Limitations And Required Listening Work

- High-quality phase-vocoder/time-stretch parity is not claimed.
- Extreme Speed/Pitch and rapid sign crossing can expose grain/click artifacts.
- Long Freeze texture and timbral stability need formal listening tests.
- Preview/Render loudness/transient differences need measured and listening comparison.
- Current sweet spots, problematic ranges, and monitoring environment are `UNKNOWN`.
- WAV output is stereo 24-bit PCM. This improves final quantization precision but does
  not change granular artifacts, interpolation, clipping behavior, or Preview quality.
