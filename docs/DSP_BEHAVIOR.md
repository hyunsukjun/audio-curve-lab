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

The current candidate score uses 32 stereo probe positions separated by two grain
playback samples (`2 * rate` source frames), normalized correlation, and a timing
penalty of `0.08 * offset / maxOffset`.
It tests a coarse grid with step `max(1, round(maxOffset / 80))`, then refines one
source frame at a time around the best candidate. It keeps an aligned start only when
the best score exceeds `0.4`; missing reference data, negligible reference/candidate
energy (`< 1e-7`), or no valid search interval falls back to the nominal start.
The 10 ms bound limits how far an individual grain can shift from the Speed-driven
clock. These thresholds are implementation choices, not listening-approved optima.
Their effect on transient placement, stereo coherence, and CPU cost must be compared
before changing them in a native engine.

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
For seeking, source travel is integrated over that same capped Preview duration.
Using the uncapped estimate would jump too far into a long source when the user
clicks an output-time position; the projected waveform already uses the capped duration.

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
- User source: `decodeAudioData` produces an AudioBuffer at the AudioContext rate;
  this may differ from the imported file's original sample rate.
- Offline DSP: decoded AudioBuffer sample rate. Final WAV: 48,000 Hz / stereo / 24-bit PCM.
- Non-48k completed DSP buffers are band-limited and resampled by `wav-output.js`;
  the original source and realtime Preview buffer are not changed.
- Realtime output: AudioContext/AudioWorklet sample rate; grain read rate includes the
  source/output sample-rate ratio.
- Worklet position updates: approximately 30 Hz.
- No explicit user-facing latency compensation is documented.

## Preview Engine

`src/transform-worklet.js` renders sample by sample and keeps at most 96 active grains.
It receives copied source channels, current curves, and settings. Playback tokens prevent
stale position/end messages from controlling a newer session. Curves can update while
playing.

The alignment helper currently allocates two 32-sample probe arrays and a scoring
closure when a grain begins. No measured CPU budget or cross-device benchmark exists
for this addition. A native realtime port must avoid assuming that this allocation
pattern is callback-safe. Use the repeatable measurement procedure in
`docs/REFERENCE_SOUND_SET.md`; report performance separately from audio quality.

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
uses deterministic jitter, then converts the completed output to 48 kHz and encodes
stereo 24-bit PCM WAV. 48 kHz signals bypass the conversion unchanged.

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
- Owner listening currently accepts a chorus-like character during voice Pitch
  changes as potentially useful in layered composition. The exact test settings and
  whether exported WAV sounds the same are unrecorded; see `finetuning-log.md`.
- WAV output is stereo 24-bit PCM. This improves final quantization precision but does
  not change granular artifacts, interpolation, clipping behavior, or Preview quality.

## Final WAV Rate Conversion (2026-10-06)

`COMMON CANDIDATE` / `STANDALONE ASSET`: output frame count is
`max(1, round(processedFrames * 48000 / processedRate))`. The centered 96-tap,
DC-normalized Blackman-windowed sinc uses cutoff `0.94 * min(1, 48000/sourceRate)`
(relative to source Nyquist). Rational phases are exact for common integer rates;
unusual rates use at most 1024 nearest phases. Boundary samples extend the endpoints.
The centered kernel compensates its delay; it does not append latency or a tail.

Conversion yields every 8192 output frames and checks cancellation between blocks.
This avoids relying on browser-dependent AudioBufferSource resampling. In the tested
Codex in-app browser, native 96->48k OfflineAudioContext playback did not suppress a
30 kHz tone, whereas decodeAudioData did; these are distinct paths. This is not a claim
about all browsers. Do not generalize the current -98 dB measurement to all stopband
frequencies, source rates, or music.

This conversion does not alter grain interpolation, smoothing, speed/Freeze math,
normalization, Preview, or the existing 180-second limit. Non-48k exports deliberately
remove out-of-band content and may differ near Nyquist. Subjective approval remains
NEEDS LISTENING TEST. The old source-rate export behavior is recorded in D-010;
D-022 defines the new output contract.

## 2026-10-06 — Reject over-limit export instead of truncating (local, unpublished)

Previously the renderer silently limited the body to 180 seconds and reported capped after downloading. It now raises EXPORT_DURATION_LIMIT before output allocation; the app states that no file was saved and restores the controls. Audio checks estimated output duration after Speed; Timbre checks source duration and preserves the existing Delay tail for accepted files. Exactly 180 seconds remains supported. This is an interim explicit limit, not full long-file support. Preview and DSP inside the supported range are unchanged. Long-file memory/cancellation and full-duration policy remain open.

Validation: actual 180-second render accepted, 181/540 seconds rejected, and Audio 120-second input at Speed 0.5 rejected for its 240-second output. Browser 181-second file produced the explicit message with no console errors.

### Export recovery follow-up — 2026-10-06

Already-aborted or over-limit renders exit before accessing source PCM channels or allocating output arrays. Five cancel/re-render cycles reproduce the same clean WAV. Browser checks with a 180-second file confirm Cancel returns controls; loading a new 6-second file then exports stereo 48k/24-bit/6 seconds. No console warnings/errors observed. Audio labels its existing capped playback timeline “preview limit”; this does not extend playback or export support. Long-file heap/GC behavior and low-memory device testing are still unverified.

### Release boundary verification

Ten 180-second synthetic-render cancellations with explicit Node GC left no additional ArrayBuffer bytes after collection. This is not browser/device memory certification. Audio accepts a 240-second source when 2x Speed produces 120 seconds; Timbre accepts a 180-second source plus its 100ms test Delay tail. Supported-range DSP and Preview remain unchanged.


## Cancellable WAV encoding — 2026-10-06

Encoding moved to src/wav-encoder.js. PCM quantization, clamping, channel interleave, header bytes and sample count match the frozen legacy encoder. Each block is snapshotted into a Blob part; a final Blob joins the parts. Source-rate DSP, resampling, gain, curves, Preview and duration limits remain unchanged. PCM input/output arrays are still retained; this is not streaming DSP or full long-file support.

Validation: tests/wav-encoder.mjs and tests/browser-wav-encoder.html cover legacy byte parity across block boundaries, pre-abort, final-block abort, and cancel/recovery. Existing WAV, limit and recovery regressions pass; Audio transform parity also passes. Local app default 8-second export saved a 48k/24-bit WAV. Listening, Safari and low-memory device verification remain open.


## Block-fed WAV conversion — 2026-10-06

COMMON CANDIDATE: browser Download WAV requests includePCM:false. After unchanged source-rate DSP, the existing 96-tap conversion sends synchronous Float32 blocks to the PCM24 writer. Global frame indices, filter phase and Float32 rounding remain unchanged. The sink snapshots each block before it is reused. No full converted stereo PCM arrays are allocated for this path. At 48 kHz the sink consumes views of the existing source-rate output. Returned data contains Blob, frameCount, sampleRate, duration and truncated, not left/right. The default includePCM:true preserves the diagnostic PCM-returning API.

Cancellation is checked through conversion, append and finalization, including after the final block yield. The writer rejects incomplete output. Source-rate output and Blob payload still occupy memory; this is not streaming the DSP itself. The 180-second policy and Preview stay unchanged. Native migration should preserve this file contract without requiring the web Blob implementation.

Validation: frozen pre-change conversion/PCM24 oracle, 32 cases per Lab across 32/44.1/48/88.2/96 kHz, block edges, cancellation/recovery and renderer parity (Timbre Delay tail included). Existing regression suites pass. Nine-minute stereo 96k QA-only profiles preserve WAV duration and marker regions; Node memory measurements do not certify browser/low-memory behavior or listening quality.

## 2026-10-06 — Freeze seek direction is independent of playback history

PROJECT-SPECIFIC / STANDALONE ASSET. A seek clears active grains and resets controls, but previously retained lastReadDirection. A prior reverse region could therefore change the sound of the same Freeze target. Reproduced via processor messages: fresh all-Freeze seek reads forward, a seek after reverse reads backward.

The seek handler now restores direction from the current Speed curve: use target speed when outside the Freeze threshold; otherwise use the most recent non-Freeze control point before the target. Smoothstep is monotonic within each segment, so knot traversal avoids missing a short interval through grid sampling. Leading/all-Freeze falls back to the existing initialPlaybackDirection rule, including global Reverse. This defines reproducible seek direction, not reconstruction of every prior grain or sample-smoothed playback state.

Only seek initialization changes. Uninterrupted playback, offline WAV DSP, range, smoothing, grain texture, 180-second export limit and 48k/24-bit contract remain unchanged. Normal Preview/Render grain/normalization differences remain known and need matched listening.

Verification: tests/freeze-seek.mjs failed before the fix, then all6 direction/history cases passed; actual browser OfflineAudioContext+AudioWorklet also passed6 corresponding cases with exact PCM equality and nonzero output. Browser harness waits50ms for message delivery before rendering/resume (an initial unsynchronized harness run produced silence, not a product failure). Existing transform-parity passes. tests/transport-boundaries.mjs covers9 signed speeds ×3 pitches(-2400/0/+2400), including ±0.019/±0.021 around Freeze: finite bounded PCM, Preview/Render length equality, natural replay and Stop/replay determinism. This is synthetic48k testing, not cross-rate or listening approval.

Local candidate, uncommitted/unpublished. Remaining: rapid sign changes/seek smoothing differences, real music, cross-rate Preview and device performance.

## 2026-10-06 — Rapid direction and seek follow-up (local verified bundle)

`tests/sign-transition-seek.mjs`: four trajectories (fast +2/-2 crossing, reverse/Freeze/forward, narrow Freeze, multiple reversals) × two global directions × three pitches(-2400/0/+2400) =24 cases. All produce finite bounded Preview/Render PCM with matching frame counts; natural end and replay reproduce the same Preview PCM. Across five targets(0/.499/.5/.501/.75), active seek and fresh stopped seek+Play match exactly:120 comparisons passed. These fixtures are48k synthetic short sources; they do not certify long-file, cross-rate or audible click performance.

A frozen deployed HEAD Worklet compared with the candidate on the same24 uninterrupted cases produced exactly identical PCM. Only seek initialization changes; offline-render.js is unchanged. Existing transform-parity, six Freeze seek tests, syntax checks and export-limit tests pass, including180s acceptance,181/540s refusal, and240s source at2x producing120s output. No additional production-code edits were needed in this follow-up.

Seek reconstructs curve-derived position/direction and resets grains/control smoothing; it intentionally does not restore the state of uninterrupted playback sample-for-sample. Rapid-transition artifacts, smoothing after seek and subjective Freeze character remain listening questions, not measured acoustic approval.

The Freeze seek fix plus these regressions is ready for commit/deploy review. Still local and unpublished; await the user's release request.
