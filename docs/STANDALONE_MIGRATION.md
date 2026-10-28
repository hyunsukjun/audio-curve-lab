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


## 2026-10-07 feedback candidate — PROJECT-SPECIFIC

Preserve semantic pan (-1 L / +1 R), independently from top-L display coordinates. Separate render-ready from saved-on-disk status. Resource guards are web implementation policy, not musical parameter bounds; native limits require separate measurement.


## Approved five-minute policy — 2026-10-07 — PROJECT-SPECIFIC

This supersedes earlier 180-second/3-minute limits in this document for Audio only. Final Speed-derived output and Preview timeline now share MAX_OUTPUT_SECONDS = 300 from output-policy.js. Exactly 300 seconds is accepted; longer WAV requests are rejected before source PCM reads/output allocation, never silently truncated. A visible live estimated-duration notice appears while editing over-limit curves and clears when the output fits. Input duration is not itself the output limit: 150 seconds at0.5x is300 seconds. 48kHz/24bit stereo and sound mappings are unchanged. Other Labs retain their policies.

Input guards remain independent provisional resource limits:128MiB file and192MiB decoded PCM. Thus five minutes is a maximum output capability, not acceptance of every five-minute high-rate/multichannel input on every device. Encoded-format decode expansion, concurrent tabs and low-memory devices still require testing. Native migration should preserve explicit duration/no-truncation semantics while measuring its own resource budget.

## Portable keyboard availability contract (2026-10-07)

COMMON CANDIDATE: one physical shortcut press dispatches at most one available transport action. Editing controls and open modal dialogs own their keyboard events. Native focus and key-repeat APIs replace DOM checks; sound and transport semantics remain product-specific.

## Import before first playback in Safari (2026-10-07)

Local file decoding creates/reuses the AudioContext without resuming it. Playback still resumes the context through the existing Play path. A file chooser can return without the user activation Safari requires for `resume()`, leaving its promise pending; import must not wait for permission to play. File-size/PCM guards, native-rate decode, previous-source preservation on failure, normalized curves and DSP remain unchanged.


## 2026-10-08 — Cancel pending first playback

Stop and actual source replacement invalidate a pending Play even before the AudioWorklet node exists. Stop now advances the playback token unconditionally, and Play checks the captured token after asynchronous engine preparation. Forced Stop follows the same rule where present. Explicit Play after cancellation remains available. No-file chooser cancellation and each Lab's existing failed-import policy are preserved. DSP, curve semantics, and export format are unchanged.

Regression: tests/initial-play-cancel.mjs invokes actual application handlers with delayed engine preparation. Old code failed the Stop case; corrected code passes Stop, forced Stop where present, successful source replacement, and explicit retry. This proves request cancellation, not cold-start speed or physical audio onset. Standalone should preserve the same invalidation rule across asynchronous engine setup.


## AIFF input compatibility (2026-10-11)

See [AIFF import contract](AIFF_IMPORT.md): local PCM AIFF 16/24-bit mono/stereo
normalization into PCM WAV before the established decoder. Existing DSP,
resampling and Lab-specific channel policies are preserved. Browser and memory
verification limits are recorded there.

## Source editing and waveform revision (2026-10-13)

Preserve original/working-source/final-output ownership, atomic edit publication, linked stereo edits, reference Undo, and latest-revision render publication. Session auto-apply is distinct from project persistence. Preview and export consume the same working source and curves. See [current contract](OUTPUT_EDIT.md).


## Source cursor and zoom (2026-10-13, PROJECT-SPECIFIC)

Preserve separate source cursor, viewport and output transport state. Store edit selection in source frames, never screen coordinates. After an edit clamp cursor/view to the new source length; a new import resets view to Fit. Fine-detail peaks must come from the visible PCM region.


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
PROJECT-SPECIFIC. Inspired by Granular's grouped transport: Return to start,
Play, Pause, output-position bar, elapsed/total time and stereo meter.
The upper waveform remains the source editing surface. Output seeking retains
pointer and keyboard control, with its own responsive canvas width.
Pause (the existing stopButton ID) retains output/source time; Play resumes.
Space toggles Play/Pause. Return to start seeks to zero without changing whether
playback is active. It cancels pending initial Play when initialization is unfinished.
Internal forced stops for source edits/import/render still reset as required.
Worklet stop acknowledgments carry actual output/source seconds and playback tokens
reject stale acknowledgments. Resume restarts grains/smoothing via the existing
Play/seek path; this does not promise sample-identical continuous playback.


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


## 2026-10-15 — Audio Studio UI pilot

Audio-only local graphite/typography/control-surface pilot, preserving layout and DSP.
Shared web/native semantic roles; native materials require separate measurement.
Pending visual review; no sibling rollout or deployment. See [STUDIO_UI_PILOT.md](STUDIO_UI_PILOT.md).

## COMMON CANDIDATE: compact value hierarchy
Current Audio pilot separates musical values, optional editing statistics and export status. Native UI should expose the basis of values (engine telemetry during playback versus curve targets at the stopped playhead). Do not mislabel point-hover values as live playback values. Pilot awaits visual approval; not a family-wide requirement yet.

## Functional surfaces candidate
See `FUNCTIONAL_SURFACE_PILOT.md`: role-based neutral luminance within the continuous workspace. Local Audio-only experiment; supersedes identical-background interpretation, not the shared button/state rules.


## 10 ms playback boundary candidate — 2026-10-25

The current local candidate supersedes earlier automatic transport-boundary durations with the [10 ms playback/WAV contract](PLAYBACK_BOUNDARY.md). Source/effect envelopes are separate. See that contract for pause-state retention, existing tail-length limits and verification status. Uncommitted; listening acceptance pending.


## Graphite interface roles v1 — 2026-10-26

STANDALONE ASSET. Preserve the role hierarchy and state distinctions in [INTERFACE_GRAPHITE_CONTRACT.md](INTERFACE_GRAPHITE_CONTRACT.md), with machine-readable roles in [graphite-v1.json](../assets/interface/graphite-v1.json). Web styles are a visual reference, not a native framework dependency. Validate native type metrics, system focus and appearance settings independently. This is a presentation revision; DSP, curves and transport semantics are unchanged.

## Read-only value context and selection metadata — 2026-10-27
STANDALONE ASSET / WEB LOCAL REVIEW. Preserve semantic separation among editing target, point tooltip, stopped playhead target, playing telemetry, source edit position, source selection and output audition position. Range labels observe native source frames/sample rate; painting them must not mutate transport, audio or selection. Preserve output-cache freshness independently.

Use platform text/accessibility/spacing roles and expose the range as readable metadata; do not automatically translate current CSS pixels into native points or add an announcement on every drag sample. Test identical data and sizes, selection cancellation, reverse selection, zoom, Delete/Undo and transport before adoption. Native implementation and physical touch acceptance are not implied by this web pilot.

## Readout context family release — 2026-10-27

STANDALONE ASSET. Preserve editing-target, point-value, playhead/Preview-value, source-range and audition/output distinctions. Adopt native typography/accessibility/input conventions; web pixels are not native point specifications. No native implementation or listening acceptance implied. See `READOUT_CONTEXT_CONTRACT.md` for basis, source-range rules, verification boundary and portability.

## Vertical suffix edit transaction — Audio local pilot, 2026-10-27

STANDALONE ASSET / COMMON CANDIDATE. Preserve active-curve ordered-suffix membership, fixed normalized X, original-grab delta, shared bounds and per-gesture cancellation. Keep source selection, audition position and render freshness independent. Mac Option temporary erase replaces Command in the Audio pilot; other platforms retain Ctrl pending separate platform review. Native cursor/hit targets/modifier handling and native Undo require independent design and implementation. See [CURVE_GESTURE_CONTRACT.md](CURVE_GESTURE_CONTRACT.md); local web evidence does not reopen native implementation or certify physical touch/listening.

## Source waveform 256px trial — 2026-10-27

STANDALONE ASSET / LOCAL WEB TRIAL. Allocate vertical space independently to source editing, musical curves and transport. Increasing waveform height must not rescale time coordinates, control text/hit geometry or audio samples. Preserve minimum usable curve space and an accessible transport in shorter windows.256/828 CSS px are web trial values, not required native point sizes. No native or volume-envelope implementation is implied.


## Source volume transaction — 2026-10-27

STANDALONE ASSET. Preserve native-source-frame gain, linked stereo, neutral default, approved mute..+6dB range, one transaction/Undo, cancellation, complete-source publication and render freshness. Keep source edit/selection, audition head and output timeline distinct. Native touch/keyboard/Undo/persistence and control sizes require native design. Web implementation and numerical verification do not approve native audio or listening. See [SOURCE_VOLUME.md](SOURCE_VOLUME.md).


## Source-volume interpolation refinement — 2026-10-28

STANDALONE ASSET / APPROVED AUDIO WEB REVISION. Preserve straight dB/time segments as the source-volume interpolation policy, with exact control gains, finite-floor mute semantics, shared evaluation at zoom boundaries and the same evaluated source for Preview/WAV. Do not substitute a host toolkit default smoothing curve. Point storage, channel linkage, native source time and transaction/history rules remain unchanged.


## Readout groups and shortcut discoverability — 2026-10-28

STANDALONE ASSET / approved Audio web revision. Preserve edit target vs parameter value vs source/output playhead vs engine-reference distinctions. Group related values through order/proximity while keeping required information available. Expose context-specific shortcuts in one discoverable reference, including source-only Undo/Redo and the different meanings of Home/arrow/Delete by focused editor. Native menus/tooltips may provide the reference; platform keyboard conventions take precedence over copying web labels/pixels. A help-dismissal Escape closes the foreground guide before canceling a background edit mode. No new native code or DSP/whole-product acceptance is implied.

## Toolbar hierarchy and technical metadata — 2026-10-28

STANDALONE ASSET / approved web UI. Move the fixed Transform name from the current-value strip into the existing Files information panel. Retain all six musical/editing/playhead fields and their origins. Group editing help with editing tools and reset utilities with upper file/task actions. Separate fixed implementation identity from actionable state. Native layout, focus conventions and dimensions require independent validation; no native implementation or listening acceptance implied.

## Whole-working-source waveform map — 2026-10-28

STANDALONE ASSET / APPROVED AUDIO WEB REVISION. Add a whole-current-source waveform above the detailed source view. The bright outlined rectangle represents viewport only; dim the outside. Reuse authoritative source-frame ranges and bounded cached display summaries/colors, update after accepted edits/Undo/file replacement and clear empty/stale-source imagery. Keep selection, edit cursor, audition/pause position, native time/channel/Link semantics and result freshness distinct. Web18px height,64px gutter, stereo lanes and Canvas/pointer APIs are references, not native specifications. Preserve actual input roles/focus and independently verify native window/type/zoom/accessibility. Actual Brave125%/150% web checks passed with100% restored; this does not start native implementation or approve listening. See [SOURCE_OVERVIEW.md](SOURCE_OVERVIEW.md).
