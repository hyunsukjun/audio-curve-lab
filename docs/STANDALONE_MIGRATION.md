# Standalone Migration Notes

## Goal

The goal is not to reuse every line of browser code. It is to reproduce Audio Curve
Lab's verified feature meaning, parameter response, interaction, sound, and state on a
future native platform. No framework (Swift, JUCE, C++, or other) is selected here.

## Portable Product Assets

- Stable parameter IDs: `stretch`, `pitch`, `pan`.
- Normalized sorted curve points and smoothstep interpolation.
- Parameter ranges/defaults/mappings and scale labels.
- Signed Speed, direction retention, Freeze threshold, and duration/source-position math.
- Direct-path eligibility, waveform-aligned grain starts, Freeze-only jitter, and
  the two overlap-gain rules.
- Pen/Eraser gesture meanings, modifier erase, endpoint deletion protection.
- Default sample recipe and deterministic seeds.
- Blue identity and semantic parameter design tokens.
- Output contract and known Preview/Render differences.

## Migration Matrix

### Curve Editor

**Current web implementation:** Canvas, Pointer Events, DPR backing resolution.  
**Platform-independent behavior:** Edit normalized parameter trajectories through output
time; active-only points; visible inactive edited curves; point tooltip.  
**Reusable data/algorithm:** `{x,y}` model, sorting, smoothstep, parameter mapping.  
**Web-specific dependency:** Canvas coordinates, browser pointer/modifier fields, SVG
cursor asset.  
**Replacement needed:** Native drawing, hit testing, hover/drag, accessibility, and
cursor system.  
**Risk / priority:** High priority; medium risk because interaction feel and normalized
coordinate integrity are core product behavior.

### Audio Source And Default Sample

**Current web implementation:** Web Audio `AudioBuffer` and `decodeAudioData`; generated
Float32 sample.  
**Platform-independent behavior:** Default sample on launch; successful local file load
atomically replaces it; no remote upload.  
**Reusable data/algorithm:** Sample recipe, envelope values, deterministic seed.  
**Replacement needed:** Native file picker, codec decoding, channel conversion, and
buffer ownership.  
**Risk / priority:** High priority; medium risk from codec/channel/sample-rate variation.

### Parameter And Curve Model

**Current web implementation:** JavaScript objects/arrays.  
**Platform-independent behavior:** Stable IDs, domains, defaults, interpolation, output
progress semantics.  
**Reusable data/algorithm:** All mapping formulas in `PARAMETER_SPEC.md` and
`transform-core.js`.  
**Replacement needed:** Typed native model and versioned serialization.  
**State requirement:** Proposed future shape:

```json
{
  "schemaVersion": 1,
  "product": "audio-curve-lab",
  "parameters": {},
  "curves": {
    "stretch": [{ "x": 0, "y": 0.75 }, { "x": 1, "y": 0.75 }],
    "pitch": [{ "x": 0, "y": 0.5 }, { "x": 1, "y": 0.5 }],
    "pan": [{ "x": 0, "y": 0.5 }, { "x": 1, "y": 0.5 }]
  },
  "settings": {}
}
```

This schema is a migration proposal, not an implemented storage format.  
**Risk / priority:** Highest priority; high compatibility impact if IDs or mappings drift.

### Realtime Preview

**Current web implementation:** AudioWorklet processor with copied source buffers,
sample-by-sample grains, 96-grain cap, and message-based position updates.  
**Platform-independent behavior:** Responsive transformed monitoring, signed source
travel, Freeze, stable transport lifecycle, live curve updates.  
**Reusable data/algorithm:** Core math, bounded L/R grain-alignment search, windows,
cubic reader, Freeze-only seeded jitter, overlap-gain rules, and constants.
**Web-specific dependency:** AudioContext lifecycle, AudioWorklet global scope, message
port, browser sample rate.  
**Replacement needed:** Native realtime audio callback, lock-free/control-state exchange,
device lifecycle, and transport clock.  
**Risk / priority:** Highest priority; high risk because realtime safety and sound quality
cannot be inferred from offline tests.

### Playback And Output Metering

**Current web behavior:** Bottom Transport owns Play/Stop, output time/duration, seek,
and compact stereo Peak/RMS/Peak Hold/Clip monitoring. Measurement observes the final
realtime output through channel-indexed analyzer data.
**Platform-independent behavior:** Monitoring does not alter sound; Clip reset changes
only the latch; transport and current time outrank secondary labels responsively.
**Replacement needed:** Native audio-thread-safe Peak/RMS accumulation, lock-free meter
data transfer, native display timing, and device/channel-layout lifecycle handling.
**Risk / priority:** Medium/high. `STANDALONE ASSET`: signal-flow position, arbitrary
channel data model, Clip semantics, and tested meter ballistics after approval.

### Offline Render And WAV

**Current web implementation:** Main-thread asynchronous renderer, Float32 buffers,
Blob download, 24-bit PCM encoder.  
**Platform-independent behavior:** Deterministic render, cancellation, progress, stereo
48 kHz / 24-bit PCM WAV, actual band-limited conversion after source-rate DSP,
180-second cap, current normalization/limiting behavior.
**Reusable data/algorithm:** Offline grain schedule, shared alignment and gain helpers,
Freeze seed, mappings, windowed-sinc output conversion and encoder contract.
**Web-specific dependency:** Blob, DOM download, `performance.now`, timer yielding.  
**Replacement needed:** Background render job, native file save panel, WAV library or
equivalent encoder.  
**Risk / priority:** High priority; medium/high parity risk because realtime/offline
schedulers differ.

### Transport And Playhead

**Current web implementation:** DOM buttons/Spacebar, worklet messages near 30 Hz,
aligned output preview/editor cursors, a separate source cursor, and click/drag
seek on the lower preview waveform.
**Platform-independent behavior:** Play/Stop toggle, reset on natural end, output-time
display, signed-Speed-aware source seek.  
**Replacement needed:** Native commands, keyboard handling, timeline display, reliable
audio-thread clock transfer.  
**Risk / priority:** High priority; medium risk from clock/UI synchronization.

### Three Time And Display Coordinates

```text
output time t / estimated output duration D -> lower preview seek and middle curve x
                                     Speed(t) -> source read position s(t)
source read position s / source duration S -> upper original waveform x and Source readout
```

The middle curve and lower preview share one output-progress x axis, while the upper
original uses source-time x. The lower preview is a projection of 4,000 peak buckets
per input channel (up to L/R) using signed Speed and the estimated (capped) output
duration. Blue means forward, red reverse, and gray near zero. It is not rendered output audio or
sample-accurate edit data; Pitch and granular artifacts are not represented.
Mono sources have one waveform lane, stereo sources have separate L/R lanes;
this input display does not describe the channel count of the stereo export.
The Bottom Transport shows output time/duration. Matching cursors on the curve
and preview show output progress, while the original source cursor can retreat or
hold independently. A native design should preserve these
distinct clocks without implying that source and output x coordinates are identical.

Seek estimates source position by integrating the signed Speed curve over output
progress in 1,024 steps. Realtime playback also smooths Speed and advances in
samples, so the estimate is not guaranteed to match the exact audio read frame at
every rapid transition. The current UI has no explicit latency compensation.
When porting, test output timer, audible source event, Canvas playhead, and seek
together rather than treating each display as independent proof of synchronization.

### Design System

**Current web implementation:** CSS variables, media queries, and solid low-cost surfaces.
**Platform-independent behavior:** Deep navy/charcoal workspace, Blue identity, semantic
parameter colors, Canvas-first hierarchy, active/focus/disabled/reduced-motion states.  
**Reusable data:** `CURVE_LAB_DESIGN_SYSTEM.md` token values and roles.  
**Replacement needed:** Native theme/token layer and accessibility semantics.  
**Risk / priority:** Medium priority; low DSP risk but high family-consistency value.

## Preview / Render Strategy For Native Work

A native version should first encode one authoritative parameter/curve specification,
then adapt realtime and offline schedulers around it. Preserve the current direct path
and granular path as a reference baseline. Before replacing the engine, create listening
fixtures and exported reference files for neutral, reverse, Freeze, moderate Pitch,
extreme Pitch/Speed, and moving Pan.

Bit identity with the browser is not required unless later approved. Perceptual behavior,
duration, direction, curve response, transients, and output level must be compared.

## Information Still Needed Before Migration

- Approved listening sweet spots and problematic ranges for all parameters.
- Monitoring environment and reference source set.
- Accepted Preview/Render loudness and artifact tolerance.
- Whether a native version also needs an optional 16-bit compatibility export in
  addition to the current 24-bit product default.
- Long-file policy beyond the current 180-second cap.
- Preset/state schema approval and migration rules.
- Plug-in automation semantics and host timeline relationship, if a plug-in is pursued.
- Touch/accessibility/numeric-editing requirements.
- Reference Sound Set results for voice, sustained tone, transients, dense material,
  broadband noise, and stereo material; use `docs/REFERENCE_SOUND_SET.md`.
- Measured CPU cost and realtime glitch rate for waveform-aligned grain search on
  representative devices; no approved performance threshold exists yet.

These items are `TO BE DOCUMENTED`; do not guess them during a port.

## Identity Asset Pilot

`STANDALONE ASSET`: `assets/identity/audio-app.svg` preserves the Hub v0.10
Audio app-tile concept; symbol/micro variants and palette accompany it. Native
packaging and small-Dock validation are not performed by this web pilot.

### WAV Conversion Reference Asset

The browser-independent `wav-output.js` and `tests/wav-output.mjs` define the new 48k
output boundary (D-022). Native migration must preserve duration to one output frame,
channel separation, DC gain and out-of-band rejection. A different resampler may be
used, but its passband/stopband and boundary behavior require numerical and listening
comparison. The current 180-second cap is not a future-native requirement.

## 2026-10-06 — Reject over-limit export instead of truncating (local, unpublished)

Previously the renderer silently limited the body to 180 seconds and reported capped after downloading. It now raises EXPORT_DURATION_LIMIT before output allocation; the app states that no file was saved and restores the controls. Audio checks estimated output duration after Speed; Timbre checks source duration and preserves the existing Delay tail for accepted files. Exactly 180 seconds remains supported. This is an interim explicit limit, not full long-file support. Preview and DSP inside the supported range are unchanged. Long-file memory/cancellation and full-duration policy remain open.

Validation: actual 180-second render accepted, 181/540 seconds rejected, and Audio 120-second input at Speed 0.5 rejected for its 240-second output. Browser 181-second file produced the explicit message with no console errors.

### Export recovery follow-up — 2026-10-06

Already-aborted or over-limit renders exit before accessing source PCM channels or allocating output arrays. Five cancel/re-render cycles reproduce the same clean WAV. Browser checks with a 180-second file confirm Cancel returns controls; loading a new 6-second file then exports stereo 48k/24-bit/6 seconds. No console warnings/errors observed. Audio labels its existing capped playback timeline “preview limit”; this does not extend playback or export support. Long-file heap/GC behavior and low-memory device testing are still unverified.


## Cancellable WAV encoding — 2026-10-06

STANDALONE ASSET: WAV serialization must preserve signed 24-bit quantization, stereo ordering and exact frame count, and allow cancellation before publishing a complete file. The web implementation uses chunked Blob parts; native software may use a cancellable file writer instead. Never expose a partial export as successful.

Validation: tests/wav-encoder.mjs and tests/browser-wav-encoder.html cover legacy byte parity across block boundaries, pre-abort, final-block abort, and cancel/recovery. Existing WAV, limit and recovery regressions pass; Audio transform parity also passes. Local app default 8-second export saved a 48k/24-bit WAV. Listening, Safari and low-memory device verification remain open.


## Block-fed WAV conversion — 2026-10-06

COMMON CANDIDATE: browser Download WAV requests includePCM:false. After unchanged source-rate DSP, the existing 96-tap conversion sends synchronous Float32 blocks to the PCM24 writer. Global frame indices, filter phase and Float32 rounding remain unchanged. The sink snapshots each block before it is reused. No full converted stereo PCM arrays are allocated for this path. At 48 kHz the sink consumes views of the existing source-rate output. Returned data contains Blob, frameCount, sampleRate, duration and truncated, not left/right. The default includePCM:true preserves the diagnostic PCM-returning API.

Cancellation is checked through conversion, append and finalization, including after the final block yield. The writer rejects incomplete output. Source-rate output and Blob payload still occupy memory; this is not streaming the DSP itself. The 180-second policy and Preview stay unchanged. Native migration should preserve this file contract without requiring the web Blob implementation.

Validation: frozen pre-change conversion/PCM24 oracle, 32 cases per Lab across 32/44.1/48/88.2/96 kHz, block edges, cancellation/recovery and renderer parity (Timbre Delay tail included). Existing regression suites pass. Nine-minute stereo 96k QA-only profiles preserve WAV duration and marker regions; Node memory measurements do not certify browser/low-memory behavior or listening quality.
