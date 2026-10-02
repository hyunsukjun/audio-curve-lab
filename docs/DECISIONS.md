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

## D-013: Bottom Playback And Final-Output Metering

**Date:** 2026-09-29
**Decision:** Keep file/export control at the top, sound and Curve editing in the center,
and the authoritative playback time, scrubber, and compact output meter at the bottom.
Measure a branch of the same final realtime signal sent to the audio destination.
**Reason:** Playback status should not compete with the primary editor, and monitoring
should describe processed output without coupling UI drawing to module DSP.
**Trade-off:** The Web meter samples `AnalyserNode` windows on animation frames and is a
monitoring instrument, not a sample-accurate loudness or mastering measurement system.
**Reusable For:** `COMMON CANDIDATE` for Curve Labs after practical evaluation.
**Standalone Consideration:** `STANDALONE ASSET`; preserve the signal-flow position,
channel-array model, and interaction meaning, then retune native meter ballistics.

## D-014: Waveform-Aligned Gentle Transform

**Date:** 2026-09-30
**Decision:** For transformed non-Freeze playback, remove random grain-position jitter,
align each new grain to the preceding waveform within a bounded 10 ms source search,
and normalize by the active window sum. Preview and Render use the same alignment and
gain helpers. Freeze retains seeded jitter and its previous overlap rule.
**Reason:** The exact `1x`/`0-cent` direct path sounded substantially clearer than
slightly edited curves. In a 440 Hz fixture, the old transformed path retained only
about 8% of energy at the intended frequency for `1.01x`, and about 11% for `+20 cents`;
the aligned path retained nearly 100% and about 98%, respectively. These are narrow
signal measurements, not a complete listening verdict.
**Trade-off:** Extra source reads at each grain start and a possible 10 ms local shift;
extreme transforms and pitch-up aliasing remain. The source-position clock is unchanged.
**Affects:** Realtime Preview, offline WAV Render, Freeze boundaries, native DSP port.

## D-015: Lightweight Web Skin

**Date:** 2026-10-02
**Decision:** Preserve the current layout, control geometry, Curve editor, and Deep
Navy/Charcoal identity while replacing the large animated blurred background with a
solid backdrop, using opaque surfaces, and removing decorative shadows/transitions.
Functional waveform, Curve, playhead, and meter feedback remain unchanged.
**Reason:** Large blurred/animated layers and translucent compositing can burden older
Intel Macs and low-end GPUs. Make the design legible through typography, spacing,
and contrast rather than GPU effects.
**Trade-off:** The background is less atmospheric. No measured performance gain is
claimed until tested on the affected hardware.
**Affects:** Web skin only; no DSP, Canvas geometry, interaction, or native sound
contract changes. `COMMON CANDIDATE` for other Curve Labs after project-specific
visual and performance checks.

## D-016: Distinguish Speed Curve Time From Source Position

**Date:** 2026-10-02
**Decision:** In every parameter mode, show a small mint ring at current output-time
progress on the center line. Keep the existing solid playhead at the source read
position over the waveform.
**Reason:** Variable Speed makes those positions diverge; one line cannot honestly
represent both the curve value being applied and the audio source being read.
**Trade-off:** The ring no longer communicates the current curve value; it is a
time-position marker independent of the selected parameter. It must remain visually
distinct from editable curve nodes.
The earlier full-height dashed cursor was removed because two vertical lines could
suggest a single time axis and clutter the editor. The ring is
display-only and does not change the Bottom Transport, curve data, or audio engine.
**Affects:** Curve editor feedback and future native timeline design.

## D-017: Separate Seeking From Curve Editing On One Output-Time Axis

**Date:** 2026-10-02
**Decision:** Put an output-time waveform above the curve editor. Click/drag on the
waveform seeks; the lower Canvas edits points only. Both cursors share the same
output-time x coordinate. Remove the Bottom Transport Position slider and show
source read time as a separate number.
**Reason:** A shared click surface made seeking ambiguous and the source-position
line appeared misaligned with output-time curves under variable Speed.
**Trade-off:** The projected waveform approximates the source peak envelope at
output times, not the actual rendered waveform. It must be described as a guide;
full audio rendering on every curve gesture would cost substantially more and could
make older computers sluggish. Peak projection is recalculated on source or Speed
changes, not on Pitch/Pan changes. This supersedes D-016's ring/source-line display
without changing its distinction between source and output clocks.
**Affects:** Web layout, seek gestures, visual time model, standalone timeline design;
no DSP, curve data, Preview, or Render changes.

## D-018: Show Input Waveform Channels Separately

**Date:** 2026-10-02
**Decision:** Draw one lane for mono input and labeled L/R lanes for stereo input;
project each channel's peak summary through the same output-time Speed map.
**Reason:** A single left-channel waveform can falsely suggest that a stereo source
was downmixed or that right-channel events were lost.
**Trade-off:** Each stereo lane is shorter and peak extraction stores two summaries.
Inputs beyond two channels still show only the first two, matching the current
processing boundary. The display describes input channels, not the stereo export.
**Affects:** Waveform display and future standalone visual contract only; no audio
engine, curve meaning, or export change.
