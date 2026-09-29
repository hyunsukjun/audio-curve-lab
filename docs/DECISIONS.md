# Product Decisions

This log records current, consequential product decisions. Where historical rationale
cannot be proved from the repository, it is marked `UNKNOWN` rather than reconstructed.

## D-001: Local Browser Processing

**Date:** Current baseline documented 2026-09-29  
**Decision:** Audio generation, file decoding, Preview, and WAV Render occur on the
user's computer with no upload.  
**Reason:** Privacy, immediate classroom access, and static hosting.  
**Alternatives considered:** Server rendering is mentioned historically but is not
approved or implemented.  
**Affects:** Architecture, privacy text, deployment, Standalone migration.

## D-002: Normalized Curve Product Data

**Date:** Current baseline documented 2026-09-29  
**Decision:** Curves are sorted normalized `{x, y}` points; Canvas pixels are only a
view.  
**Reason:** Musical data must survive resize, zoom, high-DPI displays, and future
platform changes.  
**Alternatives considered:** Pixel-coordinate storage is rejected by the current model.  
**Affects:** Curve editor, state portability, Canvas, Standalone.

## D-003: Smoothstep Curve Interpolation

**Date:** Current baseline documented 2026-09-29  
**Decision:** Adjacent points use `t^2(3-2t)`.  
**Reason:** Exact historical listening/design rationale is `UNKNOWN`; preserve current
behavior until an approved comparison is recorded.  
**Affects:** All parameters, Preview, Render, presets, Standalone.

## D-004: Signed Speed Includes Reverse And Freeze

**Date:** Current baseline documented 2026-09-29  
**Decision:** One Speed domain covers `-2x..+2x`; negative values reverse source travel
and near-zero sustained regions create granular Freeze.  
**Reason:** Direction, time, and Freeze can be composed in one visible trajectory without
a separate Freeze-duration parameter.  
**Alternatives considered:** A separate global direction control existed in earlier UI
designs but is not part of the current product.  
**Affects:** Mapping, duration, source position, Preview, Render, scales, teaching.

## D-005: No User-Visible Forward/Reverse Transport Toggle

**Date:** 2026-09-28  
**Decision:** The visible Forward/Reverse toggle is removed. `globalDirection` remains
internally fixed at `1`; reversal is expressed by the Speed curve.  
**Reason:** Reduce duplicated direction controls and keep behavior predictable.  
**Affects:** Header, README, Speed interaction, future state design.

## D-006: Shared Transform Core, Separate Schedulers

**Date:** Current baseline documented 2026-09-29  
**Decision:** Preview and Render share mappings, interpolation, constants, source math,
and grain helpers while retaining schedulers suited to realtime and offline work.  
**Reason:** Reduce behavioral drift without lowering offline rendering to a realtime
implementation constraint.  
**Trade-off:** This improves consistency but does not guarantee bit identity.  
**Affects:** DSP architecture, tests, Standalone engine design.

## D-007: Neutral Direct Path

**Date:** Current baseline documented 2026-09-29  
**Decision:** Constant signed `1x` Speed with neutral Pitch bypasses granular rebuild and
uses cubic direct reading.  
**Reason:** Preserve an unchanged source more faithfully and avoid unnecessary grain
artifacts.  
**Affects:** Preview, Render, parity tests, pan/gain processing.

## D-008: Deterministic Default Sample

**Date:** Current baseline documented 2026-09-29  
**Decision:** Generate an 8-second stereo white-noise interval sample locally from a
fixed recipe and seed.  
**Reason:** Immediate audible material without a network/download dependency; percussive
events make transformations perceptible. Exact tuning rationale is `TO BE DOCUMENTED`.  
**Affects:** Initialization, teaching, tests, Standalone resources.

## D-009: Audio Curve Lab Brand And Semantic Colors

**Date:** Current baseline documented 2026-09-29  
**Decision:** Use Blue `#4DA7E8` for product identity while preserving independent Speed,
Pitch, and Pan colors.  
**Reason:** Curve Lab family consistency without losing parameter meaning.  
**Affects:** Header, focus/accent, Canvas, native design tokens.

## D-010: WAV Output Contract

**Date:** Current baseline documented 2026-09-29  
**Decision:** Offline export is stereo 24-bit PCM WAV at source sample rate, capped at
180 seconds. The generated default source exports at 48 kHz.  
**Previous:** Stereo 16-bit PCM WAV.  
**Reason:** Preserve more precision for composition, editing, and DAW workflows while
using the standard uncompressed PCM WAV format.  
**Trade-off:** Files are approximately 50% larger than 16-bit output. Preview DSP and
audible transformation quality are otherwise unchanged.  
**Affects:** Output quality, file size, interoperability, Standalone export.

## D-011: Documentation Is Part Of Completion

**Date:** 2026-09-29  
**Decision:** Feature, parameter, interaction, DSP, design, decision, and migration
documents must change with their corresponding product behavior.  
**Reason:** Preserve accumulated musical and technical knowledge independently of the
web implementation.  
**Affects:** All future development.

## D-012: Bounded Actual-Overlap Level Correction

**Date:** 2026-09-29  
**Decision:** Measure the active sine-window envelope sum in Preview and Render and
correct it toward the theoretical steady-state sum. Limit correction to `0.5..2.0`.  
**Reason:** Reduce level movement when grain overlap is temporarily sparse or dense
without replacing the current sine window, grain schedule, or established average mix
scale.  
**Trade-off:** Transformed boundaries and transition regions may sound slightly more
even. The limit intentionally retains some fade behavior and avoids extreme amplification.  
**Affects:** Granular Preview, granular Render, Preview/Render parity, output level.
