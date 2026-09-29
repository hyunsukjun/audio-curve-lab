# Parameter Specification

## Identity Rules

Internal IDs are durable product identities. Display names may change, but IDs and
mapping changes require a recorded migration decision. Curve values are normalized
`0..1`, then mapped into the domains below.

## `stretch`: Speed

| Field | Specification |
| --- | --- |
| Display name | Speed |
| Module | Audio transform |
| Purpose | Signed source travel, time transformation, reverse, Freeze |
| Type / unit | Continuous ratio, `x` |
| Minimum / maximum | `-2.0x` / `+2.0x` |
| Default | `+1.0x` |
| Normalized default | `0.75` |
| Mapping | Linear: `speed = -2 + 4y` |
| Display mapping | `-2.00 x` to `+2.00 x`; scale marks `+2,+1,0,-1,-2` |
| Curve support | Yes |
| Interpolation | Smoothstep between points |
| Preview / Render | Shared mapping and signed-direction rules |
| Automation intent | Continuous trajectory through output progress |
| Version | 1 |

**Edge cases:** `abs(speed) <= 0.02` is treated as Freeze for direction/duration logic.
Near zero retains the previous direction. An all-Freeze curve estimates output duration
as source duration. Maximum output is 180 seconds. Constant signed `1x` with neutral
pitch qualifies for the direct path.

**Perceptual / musical tuning**

- Useful range: `TO BE DOCUMENTED` by listening.
- Sweet spot: `UNKNOWN`.
- Transition region: the `-0.02..+0.02` threshold is technical Freeze behavior, not a
  confirmed perceptual sweet spot.
- Extreme behavior: rapid sign changes and values near `+/-2x` can expose granular
  texture/click risk in Preview; current quality approval is `NEEDS MORE TESTING`.
- Interaction with Pitch: non-neutral Pitch forces granular transformation.
- Reason for linear `-2..+2` mapping: `UNKNOWN` beyond the current product behavior.

**Standalone mapping:** Preserve signed domain, smoothstep curve evaluation, threshold,
duration behavior, direct-path eligibility, and output-time interpretation.

## `pitch`: Pitch

| Field | Specification |
| --- | --- |
| Display name | Pitch |
| Module | Audio transform |
| Purpose | Transposition and glissando |
| Type / unit | Continuous cents |
| Minimum / maximum | `-2400` / `+2400` cents |
| Default | `0` cents |
| Normalized default | `0.5` |
| Mapping | Linear: `cents = -2400 + 4800y` |
| DSP mapping | `ratio = 2^(cents/1200)` |
| Display mapping | Scale marks `+2400,+1200,0,-1200,-2400` |
| Curve support | Yes |
| Interpolation | Smoothstep between points |
| Preview / Render | Shared mapping; granular path when non-neutral |
| Version | 1 |

**Edge cases:** At extremes the playback ratio ranges from `0.25` to `4`. Interaction
with signed Speed changes source direction independently from pitch ratio.

**Perceptual / musical tuning:** Useful range, sweet spot, artifact threshold, and
reason for the current `+/-2400` domain are `TO BE DOCUMENTED` through listening tests.

**Standalone mapping:** Preserve cents as the stable unit and derive playback ratio,
rather than storing a UI pixel or a platform pitch control value.

## `pan`: Pan

| Field | Specification |
| --- | --- |
| Display name | Pan |
| Module | Audio transform |
| Purpose | Stereo position trajectory |
| Type / unit | Continuous normalized pan |
| Minimum / maximum | `-1` (L) / `+1` (R) |
| Default | `0` (center) |
| Normalized default | `0.5` |
| Mapping | Linear: `pan = 2(y - 0.5)` clamped to `-1..1` |
| Display mapping | L / C / R and percentage-style readout |
| Curve support | Yes |
| Interpolation | Smoothstep between points |
| Preview / Render | Equal-power gain intent in both engines |
| Version | 1 |

**Edge cases:** Mono input produces stereo output. Current handling does not preserve a
source with more than two channels as multichannel audio.

**Perceptual / musical tuning:** Pan-law approval, center loudness judgment, and useful
motion speeds are `TO BE DOCUMENTED`.

**Standalone mapping:** Preserve `-1..+1` semantic pan values and the documented pan
law; do not map directly from widget coordinates.

## Curve Model Parameters

| ID | Current value | Meaning |
| --- | --- | --- |
| `curve.x` | `0..1` | Progress through output timeline |
| `curve.y` | `0..1` | Normalized parameter value |
| `curve.interpolation` | Smoothstep `t^2(3-2t)` | Ease-in/out transition between neighboring points |
| Default point count | 2 | Start/end values for each parameter |
| Endpoint deletion | Protected | First and last sorted points cannot be erased |

Curve resolution is continuous floating-point data. There is no user-visible step or
grid snapping. Hit-test tolerance is a UI implementation value, not parameter data.

## Internal DSP Settings

These are implementation/tuning values, not current user controls. Changing them can
alter timbre, artifacts, gain, CPU use, and Preview/Render parity.

| ID | Value | Role |
| --- | --- | --- |
| `freezeThreshold` | `0.02` | Direction/Freeze boundary |
| `minGrainSamples` | `128` | Lower grain-length bound |
| `minHopSamples` | `24` | Lower scheduling-hop bound |
| `jitterFactor` | `0.75` | Random grain-position span multiplier |
| `speedSmoothing` | `0.0008` | Per-sample realtime speed approach amount |
| `rateSmoothing` | `0.0008` | Per-sample pitch-rate approach amount |
| `gainSmoothing` | `0.0015` | Per-sample gain approach amount |
| `panSmoothing` | `0.0015` | Per-sample pan approach amount |
| `overlapCorrectionMin` | `0.5` | Lower bound for actual/expected window-overlap correction |
| `overlapCorrectionMax` | `2.0` | Upper bound preventing excessive edge amplification |
| `randomSeed` | `0x4f1bbcdc` | Deterministic jitter seed |
| `grainSizeMs` | `140 ms` | Internal granular window duration |
| `density` | `5.5` | Internal grain overlap/scheduling density |
| `randomness` | `0.02` | Internal jitter amount before jitter-factor scaling |
| `outputGain` | `0.95` | Internal target gain before pan/limiting |
| Preview maximum grains | `96` | Realtime resource bound |
| Render peak target | `0.92` | Transformed offline peak scaling before `tanh` |
| Output duration cap | `180 s` | Preview/Render safety bound |
| `globalDirection` | `1` | Internal fixed multiplier; no current UI control |

The values are confirmed current behavior. Their historical rationale, useful ranges,
and listening approval require a dedicated tuning review: `TO BE DOCUMENTED`.

## Default Sample Recipe

| ID | Value |
| --- | --- |
| `default_sample.duration` | `8 s` |
| `default_sample.sample_rate` | `48000 Hz` |
| `default_sample.noise_burst` | `0.045833 s` |
| `default_sample.gap` | `0.020833 s` |
| `default_sample.attack` | `0.003 s` |
| `default_sample.decay` | `0.014 s` |
| `default_sample.sustain` | `0.22` |
| `default_sample.release` | `0.018 s` |
| `default_sample.gain` | `0.32` |
| `default_sample.random_seed` | `123456789` |
| `default_sample.channels` | Stereo dual-mono |

**Musical intent:** A regular, percussive noise pattern makes time, direction, pitch,
and pan changes easy to hear before loading a file. Exact listening approval and the
historical reason for each envelope value are `TO BE DOCUMENTED`.

## Export Contract

| Field | Current behavior |
| --- | --- |
| Container / encoding | RIFF/WAVE, integer PCM |
| Channels | Stereo |
| Bit depth | 24-bit |
| Sample rate | Loaded source sample rate |
| Default-sample export rate | 48 kHz |
| Maximum duration | 180 seconds |

Bit depth is an output-storage property, not a Preview parameter. Internal DSP remains
Float32. The 24-bit export reduces final quantization error but does not alter granular
windowing, curve response, limiting, or clipping prevention.
