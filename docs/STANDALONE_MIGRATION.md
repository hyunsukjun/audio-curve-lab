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
- Direct-path eligibility and granular behavior/constants.
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
**Reusable data/algorithm:** Core math, windows, cubic reader, seeded jitter, constants.  
**Web-specific dependency:** AudioContext lifecycle, AudioWorklet global scope, message
port, browser sample rate.  
**Replacement needed:** Native realtime audio callback, lock-free/control-state exchange,
device lifecycle, and transport clock.  
**Risk / priority:** Highest priority; high risk because realtime safety and sound quality
cannot be inferred from offline tests.

### Offline Render And WAV

**Current web implementation:** Main-thread asynchronous renderer, Float32 buffers,
Blob download, 24-bit PCM encoder.  
**Platform-independent behavior:** Deterministic render, cancellation, progress, stereo
WAV at source rate, 180-second cap, current normalization/limiting behavior.  
**Reusable data/algorithm:** Offline grain schedule, mappings, seed, encoder contract.  
**Web-specific dependency:** Blob, DOM download, `performance.now`, timer yielding.  
**Replacement needed:** Background render job, native file save panel, WAV library or
equivalent encoder.  
**Risk / priority:** High priority; medium/high parity risk because realtime/offline
schedulers differ.

### Transport And Playhead

**Current web implementation:** DOM buttons/Spacebar, worklet messages near 30 Hz,
Canvas playhead, double-click seek.  
**Platform-independent behavior:** Play/Stop toggle, reset on natural end, output-time
display, signed-Speed-aware source seek.  
**Replacement needed:** Native commands, keyboard handling, timeline display, reliable
audio-thread clock transfer.  
**Risk / priority:** High priority; medium risk from clock/UI synchronization.

### Design System

**Current web implementation:** CSS variables, media queries, ambient pseudo-elements.  
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

These items are `TO BE DOCUMENTED`; do not guess them during a port.
