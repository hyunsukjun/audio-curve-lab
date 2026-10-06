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

## D-010: WAV Output Contract (rate superseded by D-022)

**Date:** Current baseline documented 2026-09-29  
**Decision:** Offline export is stereo 24-bit PCM WAV at the decoded AudioBuffer sample rate, capped at
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
**Status:** Placement superseded by D-020; distinct seek and edit surfaces remain.
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

## D-019: Capped Seek Mapping And Laptop Transport Visibility

**Date:** 2026-10-03
**Decision:** Compute seek source position from the same capped output duration used
by Preview and the output-time waveform. Keep the bottom transport visible on short
screens; adapt only the Canvas display height and text alignment.
**Reason:** Long-file seeks must not read a different source moment than the playhead
suggests, and laptop users need Play/Stop and metering while editing.
**Trade-off:** A shorter visible Canvas reduces vertical editing precision on small
screens; normalized musical values and DSP behavior remain unchanged.
**Affects:** Seek, waveform trust, responsive layout, Standalone interaction design.

## D-020: Separate Original, Curve, And Speed-Mapped Preview

**Date:** 2026-10-03
**Decision:** Show the original source waveform and its signed-Speed read position
above the editor; keep the output-time curve in the middle and move the Speed-mapped
preview/seek waveform below. Fit each view to the available width without auto-follow.
**Reason:** Musicians should see both where the source is read and where the output
timeline is, even when Speed reverses or freezes; the whole short sound should stay
visible on a laptop. Source-time clicks are ambiguous under repeated/reversed reads,
so seeking remains on the output-time preview.
**Trade-off:** Long sounds have less horizontal editing precision. The lower preview
projects source peaks through Speed only, not Pitch/Pan or rendered WAV audio; its
blue-to-red color indicates direction and is not a sound-quality indicator.
Short source-time and output-time labels distinguish the two clocks. The
display-only source cursor has no circular handle, while the lower seek cursor
retains one. The lower visible title prioritizes output-time seeking; hover
help and accessible text retain the approximate Speed-map qualification.
This adds no DSP processing or third time model.
**Affects:** Web layout, display-only waveform projection, seek placement, standalone
timeline design; no change to normalized curve data, DSP, or export.

## D-021: Pilot Hub v0.10 Identity In Audio Only

**Date:** 2026-10-04
**Classification:** PROJECT-SPECIFIC pilot / COMMON CANDIDATE palette
**Decision:** Supersede D-009's prior blue where applicable with Hub Audio #459BFF;
use exact Hub v0.10 symbol and micro SVGs. Keep semantic parameter colors and DSP intact.
See `IDENTITY_PILOT.md`. No commit/publish or sibling rollout is implied.

## D-022: Fixed 48 kHz WAV With Band-Limited PCM Conversion

**Date:** 2026-10-06
**Decision:** Render at the existing decoded-source rate, then convert the completed
stereo DSP output to 48 kHz before 24-bit PCM encoding. 48 kHz buffers bypass conversion.
**Previous:** Export kept the decoded source rate (D-010); only its rate policy changes.
**Reason:** Adopt the Curve Lab Web v1 family export target without changing existing
sample-rate-dependent DSP smoothing or Preview as a side effect.
**Rejected:** Header-only relabeling changes time/pitch. Native OfflineAudioContext
buffer playback alone failed the 30 kHz rejection test in the current in-app browser.
**Trade-off:** A 96-tap windowed-sinc converter adds CPU and output buffers for non-48k
exports. It yields/cancels by blocks; long-file memory work remains separate. Its
high-frequency rolloff is an intentional part of rate conversion, not a claim of
subjective improvement. Native file decoding was independently checked (-74 dB at
30 kHz for the PCM16 test); that path is not replaced.
**Verification:** Four 60-second source rates (44.1/48/88.2/96k) produced 2,880,000-frame
48k/24-bit stereo WAV and decoded back to 60 seconds. Eleven browser checks passed;
Node conversion and existing transform parity checks passed. 6-second 96k fixture
loaded, played/stopped, exported, and the saved WAV reopened at 6 seconds.
**Still open:** 180-second cap, broad listening, long real music, cross-browser/device
coverage. No commit/public deployment in this change.

## 2026-10-06 — Reject over-limit export instead of truncating (local, unpublished)

Previously the renderer silently limited the body to 180 seconds and reported capped after downloading. It now raises EXPORT_DURATION_LIMIT before output allocation; the app states that no file was saved and restores the controls. Audio checks estimated output duration after Speed; Timbre checks source duration and preserves the existing Delay tail for accepted files. Exactly 180 seconds remains supported. This is an interim explicit limit, not full long-file support. Preview and DSP inside the supported range are unchanged. Long-file memory/cancellation and full-duration policy remain open.

Validation: actual 180-second render accepted, 181/540 seconds rejected, and Audio 120-second input at Speed 0.5 rejected for its 240-second output. Browser 181-second file produced the explicit message with no console errors.

The interim export-limit patch is grouped with cancellation/recovery and time-limit clarity for one release review. No automatic expansion beyond 180 seconds; full-length rendering awaits memory/cancellation/Preview validation.


## Cancellable WAV encoding — 2026-10-06

COMMON CANDIDATE: use bounded PCM blocks and event-loop yields at the WAV serialization boundary, preserving exact file bytes. This removes the single full-WAV ArrayBuffer allocation and allows cancellation. Blob storage/copy behavior is runtime-dependent; Node RSS improvement is not a browser memory guarantee. No support-limit increase is included.

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
