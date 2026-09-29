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
  -> grain window/mix compensation
  -> equal-power Pan
  -> gain smoothing
  -> tanh output limiting
  -> Preview output or offline WAV encoding
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

Each grain uses a sine window `sin(pi * phase)`. Gain compensation is
`gain / sqrt(max(1, density * 0.8))`. Source samples use cubic interpolation. The reason
for the exact grain, density, random, and gain values is `TO BE DOCUMENTED`; they are
current behavior, not yet a formally approved listening profile.

Preview and Render also measure the actual sum of active sine-window envelopes. The
expected sum for evenly distributed grains is `density * 2/pi`. The existing mix scale
is multiplied by `expected / actual`, clamped to `0.5..2.0`. This preserves the previous
steady-state level while reducing gain variation when the overlap is temporarily sparse
or dense. A zero envelope sum remains silent; the correction limit prevents tiny edge
weights from being amplified without bound.

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
- grain envelope, mix scale, bounds, and deterministic random sequence;
- bounded actual-overlap level correction;
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
