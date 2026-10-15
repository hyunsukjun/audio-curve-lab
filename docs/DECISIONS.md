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


## 2026-10-07 feedback candidate — PROJECT-SPECIFIC

2026-10-07 feedback candidate: prefer resource admission plus explicit output limits over a universal five-minute rule. 128/192 MiB are conservative provisional thresholds, not measured safe limits for every device. Compressed/unknown format expansion can still exhaust memory during decode before the post-decode guard. Multiple tabs/windows independently allocate PCM and run DSP; no cross-tab lock, tab count detection or forced shutdown was added. Safari short-WAV rendering reached its site download permission dialog locally; the reported multi-window failure is not yet reproduced and user-activation expiry is only a hypothesis.


## Approved five-minute policy — 2026-10-07 — PROJECT-SPECIFIC

This supersedes earlier 180-second/3-minute limits in this document for Audio only. Final Speed-derived output and Preview timeline now share MAX_OUTPUT_SECONDS = 300 from output-policy.js. Exactly 300 seconds is accepted; longer WAV requests are rejected before source PCM reads/output allocation, never silently truncated. A visible live estimated-duration notice appears while editing over-limit curves and clears when the output fits. Input duration is not itself the output limit: 150 seconds at0.5x is300 seconds. 48kHz/24bit stereo and sound mappings are unchanged. Other Labs retain their policies.

Input guards remain independent provisional resource limits:128MiB file and192MiB decoded PCM. Thus five minutes is a maximum output capability, not acceptance of every five-minute high-rate/multichannel input on every device. Encoded-format decode expansion, concurrent tabs and low-memory devices still require testing. Native migration should preserve explicit duration/no-truncation semantics while measuring its own resource budget.

## Give editing and dialogs priority over global transport (2026-10-07)

COMMON CANDIDATE: transport shortcuts must respect the same availability as Play and must not consume form editing or modal button activation. Guard the current handlers without changing DSP or curve data. The old modal handling could start background playback (Audio/Space handler path; directly reproduced in Space) or suppress Cancel keyup (directly reproduced in Spectral). Both phases now defer to the open dialog.

## Import before first playback in Safari (2026-10-07)

Local file decoding creates/reuses the AudioContext without resuming it. Playback still resumes the context through the existing Play path. A file chooser can return without the user activation Safari requires for `resume()`, leaving its promise pending; import must not wait for permission to play. File-size/PCM guards, native-rate decode, previous-source preservation on failure, normalized curves and DSP remain unchanged.

Evidence: actual Safari public baseline remained Loading for a valid stereo 48 kHz/24-bit/300-second WAV before any playback. Local corrected version imported the same file and completed a 300-second render with two other idle Lab windows. `tests/import-suspended-context.mjs` fails on the previous handler with a never-resolving resume promise and passes after the change; it also verifies decode failure preserves the previous source and that playback still requests resume. Local disk download was not approved; final public saved-file verification is recorded separately in the family workboard.


## 2026-10-08 — Cancel pending first playback

Stop and actual source replacement invalidate a pending Play even before the AudioWorklet node exists. Stop now advances the playback token unconditionally, and Play checks the captured token after asynchronous engine preparation. Forced Stop follows the same rule where present. Explicit Play after cancellation remains available. No-file chooser cancellation and each Lab's existing failed-import policy are preserved. DSP, curve semantics, and export format are unchanged.

Regression: tests/initial-play-cancel.mjs invokes actual application handlers with delayed engine preparation. Old code failed the Stop case; corrected code passes Stop, forced Stop where present, successful source replacement, and explicit retry. This proves request cancellation, not cold-start speed or physical audio onset. Standalone should preserve the same invalidation rule across asynchronous engine setup.


## AIFF input compatibility (2026-10-11)

See [AIFF import contract](AIFF_IMPORT.md): local PCM AIFF 16/24-bit mono/stereo
normalization into PCM WAV before the established decoder. Existing DSP,
resampling and Lab-specific channel policies are preserved. Browser and memory
verification limits are recorded there.

## Source editing and waveform revision (2026-10-13)

Supersedes the local post-render snapshot prototype. User approved automatic editing before curves, so source edits and curves coexist without a discard dialog. Preserve immutable original references and linked display gain. Five-ms joins remain provisional pending listening. See [current contract](OUTPUT_EDIT.md).


## Source cursor and zoom (2026-10-13, PROJECT-SPECIFIC)

Source editing position remains independent of final-output transport because Speed/Reverse/Freeze do not guarantee one-to-one mapping. Zoom is view-only and does not alter PCM, curves, export or audio gain. Visible-region peak summaries are rebuilt from actual working PCM and cached, rather than stretching the coarse full-source summary.


## Source playback head correction (2026-10-13, PROJECT-SPECIFIC)

The source waveform draws a solid white playback head using the AudioWorklet's
sourceSeconds at the working buffer sample rate. A dashed blue edit cursor remains
independent. Forward/reverse/freeze therefore follow actual source reading, not
elapsed output time. During playback, leaving the zoomed viewport recenters it
around the source head; drag/busy editing suppresses follow. No DSP/transport or
curve mapping changes. Source selection and zoom anchor are preserved.


## Unified editing and playback (2026-10-13, supersedes separate Final Output)

Remove the lower rendered waveform and its automatic full render. A thin output
time bar lives in the bottom transport beside Play/Pause, leaving more height for curves. Source
click chooses a matching output-time start; Play/Space starts there. Drag retains
range selection. Multiple visits choose closest to pre-click output position;
unreachable positions report feedback and retain output position. Direct output
bar seeking remains available. See OUTPUT_EDIT.md for numerical mapping limits.


## Bottom transport and pause/resume (2026-10-13)
PROJECT-SPECIFIC. Inspired by Granular's grouped transport: Return to start, Play, Pause, output-position bar, elapsed/total time and stereo meter.
The upper waveform remains the source editing surface. Output seeking retains
pointer and keyboard control, with its own responsive canvas width.
Pause (the existing stopButton ID) retains output/source time; Play resumes.
Space toggles Play/Pause. Return to start seeks to zero without changing whether
playback is active. It cancels pending initial Play when initialization is unfinished.
Internal forced stops for source edits/import/render still reset as required.
Worklet stop acknowledgments carry actual output/source seconds and playback tokens
reject stale acknowledgments. Resume restarts grains/smoothing via the existing
Play/seek path; this does not promise sample-identical continuous playback.


### Transport icon presentation
The bottom controls use compact monochrome geometric icons in the order Return to start,
Play, Pause, with spacing after the navigation control. All three icons share
the same neutral color; active playback uses a neutral background. Tooltips and accessible names retain the action meaning.
Reference: https://www.ocenaudio.com/en/features (official toolbar screenshots);
this adapts the compact icon-led grouping, not an exact copy of its full toolbar.
Pause/resume and return-to-start semantics remain unchanged.


### Full-source overview navigator
PROJECT-SPECIFIC. The source navigation track aligns with the waveform time-axis
width and represents 100% of the working source. An outlined viewport represents
the displayed fraction (2x = 50%, 4x = 25%). No separate navigation-anchor dot is shown.
Click/drag centers the viewport around that source position, clamped at boundaries.
Navigation changes the view only, preserving selection, playback start and PCM.
Arrow keys move 5% of source length (Shift: 1%); Home/End navigate to boundaries.
Zoom centers on the selected range midpoint when a selection exists, otherwise
the edit cursor. Near source boundaries the viewport is clamped to avoid empty space.
Transport order is Return to start, Play, Pause, with neutral same-color icons.

## Source overview marker simplification — 2026-10-13
PROJECT-SPECIFIC: remove the small round navigation-anchor marker. Keep the
viewport rectangle, click/drag navigation, zoom centering and waveform playhead.
This changes markup/styles only; audio processing and navigation state are unchanged.


## 2026-10-14 — File guidance disclosure (local pilot)

Move long default format/limit guidance into optional help beside Open Audio; keep actual error notices visible. Apply only to Audio pending user review; do not propagate to sibling Labs yet. The 128 MiB input and 5-minute 48k/24-bit output policies are unchanged.


## 2026-10-14 — Parameter help pilot

COMMON CANDIDATE: show static parameter meaning/ranges on demand; keep live values and axes visible. Pilot only in Audio pending user review. No audio engine change or release in this step.

Validation: syntax checks for app/core/worklet/offline renderer/help passed; transform-parity and five transport keyboard tests passed. Local browser verified Pitch selection/help, Escape dismissal, Tab to Pan help, Enter selects Pan. Screenshot recorded in family evidence/audio-parameter-help.png. No new listening/export or physical touch-device test claimed. Hover delay is implemented; browser automation did not exercise pointer hover.


## 2026-10-14 — Family parameter help

Static parameter descriptions are available on the relevant buttons using the Audio help design; current values, axes and activation feedback remain visible. See `docs/PARAMETER_HELP.md` (or `PARAMETER_HELP.md` in this directory). No DSP or curve mapping changes.


## 2026-10-14 — Open Audio keyboard access
파일 입력을 display:none 대신 시각적으로만 숨겨 Tab과 Enter/Space로 기본 파일 선택기에 접근하도록 수정. 포커스는 기존 fileButton:focus-within 윤곽선으로 표시한다. 파일 디코딩·처리 계약은 변경하지 않는다.


## 2026-10-14 — Reset modal focus
Reset 확인창의 Tab/Shift+Tab은 Cancel과 Reset All 사이에서 순환한다. Escape 취소와 닫은 뒤 Reset All 포커스 복귀는 유지한다. 확인창 뒤의 버튼을 키보드로 우발 작동하지 않도록 보완하며 리셋 대상과 음향 처리는 변경하지 않는다.


## 2026-10-15 — Audio Studio UI pilot

Audio-only local graphite/typography/control-surface pilot, preserving layout and DSP.
Shared web/native semantic roles; native materials require separate measurement.
Pending visual review; no sibling rollout or deployment. See [STUDIO_UI_PILOT.md](STUDIO_UI_PILOT.md).


## Audio typography pilot — 2026-10-15
COMMON CANDIDATE, local review only. Implements the CSS-text stage of the family typography contract in src/typography.css.
Preserve title23/600, main controls13/500, readout labels11/400 and values14/500.
Use12px regular edit instructions,11px/600 section labels,13px/600 transport time (previous680),10px/600 CLIP and channel labels.
File/parameter actions use12px horizontal padding; editing helpers8px; parameter group gap8px. Keep existing heights, color semantics, focus, CSS transport icons and fade handles.
Canvas-rendered text remains a separate follow-up: do not claim full Canvas token migration. No JavaScript, DSP, source/export or interaction changes.

Validation: actual CSS1280x800,900x600,390x640 no horizontal overflow/button clipping. Native Brave125%(DPR2.5,1189x609) and150%(DPR3,990x508) no button clipping or curve/transport overlap;100% restored. Narrow screens retain natural vertical scrolling.
Browser Pitch/Speed, source zoom/Fit, Play/Pause/rewind, point add(2→3) and Clear Current(3→2) passed; error log empty. This is control-state/visual proof, not comparison listening or a new WAV regression.
Native confirmation keyboard and comparative listening remain deferred. No commit/deployment.


## Canvas typography pilot — 2026-10-15
COMMON CANDIDATE. src/canvas-typography.js provides display-only role fonts: axis/time ticks11/400, emphasized tick11/500, section11/600, instruction12/400, point tooltip12/500, channel10/600. Font stack matches the system sans-serif family.
Waveform time divisions are capped by measured endpoint-label width plus16px clearance; waveform, normalized curves, timing, hit regions and sample summaries are unchanged. The existing optional inline instruction is shown only when its measured width fits; equivalent persistent toolbar/accessible instruction remains. Tooltip box retains26px height and8px horizontal padding.
Validation: required four syntax checks and transform parity passed;390 CSS px Pitch points/ticks visibly fit, actual Brave125%(1189x609,DPR2.5) and150%(990x508,DPR3) checked;100% restored. Point addition/Clear Current, all three mode selection, source zoom/Fit, playback/pause/rewind observed; console errors none. Drag attempt created another point rather than proving point relocation, so relocation is not counted as a new test pass. No interaction code changed.
Evidence: shared QA evidence/audio-canvas-type-390.png, audio-canvas-type-150.png, audio-canvas-type-pilot.png. Canvas screenshots are visual evidence, not pixel-level font metric certification or comparison listening.
Local review only; earlier CSS pilot remains uncommitted. Native dialog keyboard and comparative listening deferred.


## Restrained type and control treatment — Audio local candidate
2026-10-15: supersedes the earlier Audio pilot's weight choices only. Keep type sizes and text colors; ordinary buttons/current values400, section labels500, transport time500. Use title/sentence case for readout labels and Edit Audio / Curves / Output Time, including waveform heading/instruction. Short technical abbreviations L/R/CLIP remain.
Remove decorative button highlights; active parameter lower bevel3px→1px. Preserve parameter colors, disabled styling, hover edge and focus rules. Explicit ID-bearing role group is necessary to override the legacy high-specificity !important state selector; computed-style confirmed inactive shadow none / active1px.
390px no horizontal overflow; selection/help and playback/pause/rewind checked; console errors none. Required JS syntax and transform parity passed. This refinement did not repeat native125/150% checks from preceding canvas pilot. Audio-only, no commit or deployment; native confirmation keyboard and comparison listening remain deferred.

## Source tone waveform pilot — 2026-10-15 (PROJECT-SPECIFIC, review pending)
- Audio source editing waveform only. Color encodes an approximate per-channel magnitude spectral centroid of the current editable source before Speed/Pitch/Pan; it is not pitch, clipping, output analysis, or an audio effect. Source deletion/fades/Undo trigger a refreshed estimate. The original file is unchanged.
- Palette: blue (lower centroid) → teal → gold → peach (higher centroid). Log mapping150–8000Hz, clamped; neutral gray-blue for negligible spectral magnitude. These are provisional visual parameters, not musical thresholds or a Freesound palette reproduction. Header legend and Edit Audio title explain source scope.
- Signed min/max envelope retains peaks and asymmetry, with16000 overview bins and physical-pixel polygon drawing. No cosmetic waveform smoothing that hides transients. Zoom resummarizes the visible source at device-pixel-aware resolution.
- Analysis: bounded1024 windows×1024samples per channel, at most2channels/8MiB copied to a dedicated worker. Long files are sampled, not exhaustively analyzed; short events between windows may be missed. Thus colors are a broad timbre guide, not a spectral measurement tool. Worker failure falls back to the existing blue display. New source/edit terminates the previous worker; stale results are ignored.
- Static waveform raster is cached across playback/selection redraws. Cache invalidates for buffer/viewport/device-pixel ratio/visual gain/colors changes. No added dependency or audio engine change.
- Verification: centroid tones187.5/1500/6000Hz and silence, source immutability, signed transient envelope; required transform parity and source editor/output edit suites pass. Browser sample import, selection deletion, Undo, fade handles via keyboard, zoom/Fit, Play/Pause, WAV download pass. Saved WAV:10s/48k/24bit/stereo. No observed console error. No listening approval.
- Current Mac browser display benchmark, synthetic300s stereo: summary19.4ms, bounded window copy1.6ms, worker elapsed57.6ms, raster4.5ms;5 animation frames during analysis, max gap16.7ms. Canvas copy timings measure command submission, not completed GPU work. Not a low-spec or long-session guarantee.
- Small viewport forcing did not affect the target tab in this session (actual1092×1318); do not claim390px verification. Small-screen/actual zoom review remains pending.
- No commit/deployment/freeze. DSP remains Curve Lab DSP; this pilot only reads source samples for visualization.
