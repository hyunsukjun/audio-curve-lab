# Feature Registry

Status values: `IDEA`, `PROPOSED`, `APPROVED`, `IMPLEMENTED`, `VERIFIED`,
`DEPRECATED`. `VERIFIED` means the current automated checks cover the documented
calculation; it does not imply complete listening or browser-matrix approval.

## ACL-COM-001: Default Sample And Local Audio Loading

**Category:** COMMON  
**Status:** IMPLEMENTED

**Purpose:** Start with an immediately playable teaching sample and allow a musician's
own source to replace it without upload.

**User behavior:** The app opens with an 8-second white-noise interval sample. Open
Audio decodes a local file and replaces the source after successful decoding.

**Input / output:** Generated stereo sample or browser-decoded audio becomes the source
buffer, waveform, duration, and transform input.

**Data model / parameters:** See `default_sample.*` in `PARAMETER_SPEC.md`.

**Edge cases:** Codec support is browser-dependent; sources longer than 180 seconds
receive a warning and processing remains capped at 180 seconds; more than two channels
are not fully represented.

**Web implementation:** `src/app.js` uses Web Audio `AudioBuffer` and
`decodeAudioData`. No network upload occurs.

**Platform-independent requirement:** A valid source is always available; a user source
replaces the default only after successful decode; source duration/sample rate/channel
semantics remain explicit.

**Standalone notes:** Replace browser decoding with native decoders. Preserve the
deterministic sample recipe rather than embedding a network asset.

**Tests:** Browser file lifecycle is manual. Default recipe is code-reviewed but not
currently asserted by the automated test.

## ACL-COM-002: Curve Editor

**Category:** COMMON  
**Status:** IMPLEMENTED

**Purpose:** Represent a musical parameter as an editable trajectory through output
time.

**User behavior:** Select a parameter, add or drag points with Pen, remove interior
points with Eraser, and inspect values by hover/drag tooltip. The approved Audio gesture adds Shift-drag of a time-sorted suffix vertically with fixed X, and changes Mac temporary erase to Option-click; see [CURVE_GESTURE_CONTRACT.md](CURVE_GESTURE_CONTRACT.md).

**Data model:** Sorted arrays of normalized `{x, y}` points. Both axes are `0..1`.
Interpolation is smoothstep between adjacent points.

**Interaction:** Active curve shows points; inactive edited curves remain visible.
First and last sorted points cannot be erased.

**Edge cases:** Endpoints may currently move in `x`; protection means nondeletable,
not fixed to exact `x=0` and `x=1`. Duplicate/near-duplicate x values use a small
denominator guard.

**Web implementation:** Canvas and Pointer Events in `src/app.js`.

**Platform-independent requirement:** Window size, zoom, and display density must not
change stored musical values.

**Standalone notes:** Recreate gesture meaning and normalized model; native drawing
APIs do not need to match Canvas internals.

**Tests:** Interpolation is automated. `tests/curve-gestures.mjs` covers the Audio gesture model and cancellation. The user confirmed actual Shift group movement; native Option/endpoint/ordinary-drag evidence is recorded separately from automated tests.

## ACL-AUD-001: Signed Speed Curve And Freeze

**Category:** MODULE-SPECIFIC  
**Status:** IMPLEMENTED

**Purpose:** Compose forward/reverse source travel, time expansion/compression, and
stationary granular texture on one curve.

**User behavior:** Draw from `-2x` to `+2x`. Positive values move forward, negative
values move backward, and a sustained region around `0x` holds the source position.

**Input / output:** Normalized `stretch` curve controls source-frame advance and output
duration estimation.

**Processing:** Signed speed mapping, direction retention near zero, waveform-aligned
overlapping grains for non-Freeze transforms, and a direct path for constant `+1x`/`-1x`
with neutral pitch. Freeze keeps its seeded granular texture.

**Edge cases:** `abs(speed) <= 0.02` is the Freeze threshold. All-zero duration estimate
falls back to source duration. Output is capped at 180 seconds. Extreme/repeated direction
changes may expose granular artifacts and require listening tests.

**Dependencies:** Pitch curve determines direct versus granular path.

**Tests:** Mapping, direction, duration, source position, reverse start, Freeze finite
output, extremes, determinism, and small Speed-change tone stability in Preview/Render
are automated. Real-source listening remains necessary.

## ACL-AUD-002: Pitch Curve

**Category:** MODULE-SPECIFIC  
**Status:** IMPLEMENTED

**Purpose:** Compose transposition and glissando independently of signed source travel.

**User behavior:** Draw pitch from `-2400` to `+2400` cents. Center is `0 cents`.

**Processing:** Normalized value maps linearly to cents; playback ratio is
`2^(cents/1200)`. Non-neutral pitch selects the granular path with waveform-aligned
grain starts outside Freeze.

**Edge cases:** Extreme pitch combined with extreme/reversing Speed can increase
artifacts. Approved musical sweet spots are `UNKNOWN`.

**Tests:** Mapping, finite/bounded extremes, deterministic transformed output, and
small Pitch-change tone stability in Preview/Render are automated. Listening parity
is manual.

## ACL-AUD-003: Pan Curve

**Category:** MODULE-SPECIFIC  
**Status:** IMPLEMENTED

**Purpose:** Compose stereo movement from left through center to right.

**User behavior:** Draw between L, C, and R.

**Processing:** Normalized value maps linearly to `-1..+1`; equal-power cosine/sine
gains with center compensation are applied in Preview and Render.

**Edge cases:** Mono sources become stereo output. Multichannel input beyond the first
two channels is not fully preserved.

**Tests:** Mapping and finite/bounded output are automated. Perceptual pan law approval
is `TO BE DOCUMENTED`.

## ACL-COM-003: Preview Transport And Playhead

**Category:** COMMON  
**Status:** IMPLEMENTED

**Purpose:** Hear the current transform and understand both output progress and source
position.

**User behavior:** Play or Spacebar starts; Stop or Spacebar stops. The Bottom Transport
shows output time/duration. Clicking or dragging the lower Speed-mapped waveform seeks
by output time; the middle Canvas remains dedicated to curve editing. Natural completion returns
the timer and playhead to zero.

**Processing:** An AudioWorklet receives the source, curves, and settings. Position
messages update the UI at approximately 30 Hz. Curve edits are sent to an active engine.
Seeking integrates source travel over the actual capped output duration, so a long
source's click position agrees with the waveform projection and Preview timeline.

**Display:** The upper original waveform has a source-time read cursor that may
retreat or hold; the middle curve and lower preview share one forward-moving
output-time cursor. The lower waveform projects source peaks through signed Speed,
with blue forward, red reverse, and neutral color near zero. It is a visual guide,
not a rendered-output waveform or sample-accurate audio trace; Pitch and Pan are
not drawn into it. Mono input has one labeled lane; stereo input has L/R lanes.
The views indicate input channel count, not the WAV export channel count.
The upper view explicitly labels source time and shows a line-only read cursor;
the curve header and lower view label output time. The lower view retains a
paired triangle cursor handles and a visible click/drag seek hint. An equally bright 1.5px dashed
hover guide previews the target, hidden while dragging or outside the view. Its accessible name and
hover help, rather than its short on-screen title, identify the Speed-based
projection as approximate and distinct from the rendered WAV.

**Edge cases:** AudioContext suspension after sleep/wake and long-session browser state
remain lifecycle risks. Stale worklet messages are ignored by playback token.

**Tests:** Transform math is automated. Real transport, sleep/wake, and audio output are
manual browser tests.

## ACL-COM-006: Bottom Playback And Output Monitoring

**Category:** COMMON CANDIDATE
**Status:** IMPLEMENTED

**Purpose:** Keep playback state readable without competing with the Curve workspace,
and show the level that actually leaves the realtime engine.

**User behavior:** The bottom area contains Play/Stop, current output time and duration,
and a compact stereo L/R meter. Seeking happens on the lower preview waveform. The meter shows RMS body, Peak extent,
Peak Hold, and a latched Clip indicator that can be clicked to reset.
The transport stays visible at the bottom of a laptop viewport; short viewports
reduce only the displayed editor height, not the normalized curve data.

**Input / output:** `src/output-meter.js` receives the final realtime Web Audio output,
splits it by channel, and reports channel-indexed Peak/RMS/Clip data. `src/app.js` owns
only display smoothing, hold state, reset interaction, and DOM painting.

**Edge cases:** The current output is bounded by `tanh`, so final-output clipping should
be uncommon. Clip uses a `0.999` full-scale threshold. Meter values describe realtime
Preview, not the offline WAV currently being rendered.

**Responsive behavior:** Transport and time remain first. Scrubber and meter wrap to
their own rows as width decreases; secondary labels simplify below 520 px.

**Standalone notes:** Preserve the channel-array data model. Stereo may remain compact;
Quad/8ch may add an expandable detailed view without changing the measurement contract.

**Tests:** Default-sample Play/Stop, meter response, silence decay, scrub seek, reset,
and narrow/wide layout were exercised locally. Sustained, transient, low-level, dense,
and deliberately clipped source listening remains `TO BE DOCUMENTED`.

## ACL-COM-004: Offline Render And WAV Download

**Category:** COMMON  
**Status:** IMPLEMENTED

**Purpose:** Create a reusable transformed sound file locally.

**User behavior:** Download WAV stops active playback, renders current curves, reports
progress, and downloads `AudioCurveLab-export.wav`. Pressing the action during an active
render cancels it.

**Output:** Stereo 24-bit PCM WAV at 48 kHz, maximum 180 seconds. The source-rate DSP
result is actually band-limited and resampled when needed; no header-only conversion.
The source/Preview buffer and musical duration rules remain unchanged.

**Processing:** Uses shared mappings/constants with a deterministic offline grain
schedule. Transformed output is peak-scaled toward 0.92 before `tanh`; neutral direct
output uses `tanh` without global normalization. Granular Preview and Render share a
bounded correction based on the actual sine-window overlap sum.

**Edge cases:** Preview and Render are not bit-identical. Long output consumes memory.

**Tests:** Direct-path expected samples, deterministic transformed output, finite values,
bounds, reverse, Freeze, and extremes are automated. `tests/wav-output.mjs` checks the
output converter. `tests/browser-wav-output.html` verifies four rates at 60 seconds,
WAV re-decode, mode lengths, stereo, stopband rejection, and cancellation. Browser
download/reopen was checked with a generated 96k stereo WAV; listening parity is manual.

## ACL-COM-005: Clear And Reset

**Category:** COMMON  
**Status:** IMPLEMENTED

**Purpose:** Return one or all parameters to known defaults without ambiguity.

**User behavior:** Clear Current resets only the active curve. Reset All opens a
confirmation dialog; Cancel/Escape/backdrop preserves all data and confirmation resets
all curves.

**Data model:** Defaults are Speed `+1x`, Pitch `0 cents`, Pan center, each represented
by two endpoint values.

**Edge cases:** There is no undo. Destructive confirmation is therefore required for
Reset All.

**Tests:** Manual interaction test; no automated DOM test currently exists.

## Not Currently Implemented

- Undo/Redo
- Preset save/load or versioned state exchange
- User-selectable granular engine controls
- Sample-accurate waveform editing
- Dedicated touch-first interaction
- Analytics, accounts, upload, or cloud rendering
- User-visible global Forward/Reverse transport control

## ACL-IDENTITY-001: Hub-Aligned Audio Identity Pilot

**Category:** PROJECT-SPECIFIC
**Status:** IMPLEMENTED (Audio-only identity pilot)

Header and favicon use pinned Hub v0.10 Audio assets. Brand blue is #459BFF.
See `IDENTITY_PILOT.md` for provenance, scope, validation, and rollback.

## 2026-10-06 — Reject over-limit export instead of truncating (local, unpublished)

Previously the renderer silently limited the body to 180 seconds and reported capped after downloading. It now raises EXPORT_DURATION_LIMIT before output allocation; the app states that no file was saved and restores the controls. Audio checks estimated output duration after Speed; Timbre checks source duration and preserves the existing Delay tail for accepted files. Exactly 180 seconds remains supported. This is an interim explicit limit, not full long-file support. Preview and DSP inside the supported range are unchanged. Long-file memory/cancellation and full-duration policy remain open.

Validation: actual 180-second render accepted, 181/540 seconds rejected, and Audio 120-second input at Speed 0.5 rejected for its 240-second output. Browser 181-second file produced the explicit message with no console errors.

Release scope remains explicit export limits, early abort and recovery, not expanded long-file support. Audio limit notices use Speed-derived output time.


## Cancellable WAV encoding — 2026-10-06

WAV export now encodes 65,536-frame PCM blocks with a task yield between blocks, including the final block. The existing Cancel action remains effective during encoding. Stereo 48 kHz / 24-bit WAV and the 180-second admission policy are unchanged.

Validation: tests/wav-encoder.mjs and tests/browser-wav-encoder.html cover legacy byte parity across block boundaries, pre-abort, final-block abort, and cancel/recovery. Existing WAV, limit and recovery regressions pass; Audio transform parity also passes. Local app default 8-second export saved a 48k/24-bit WAV. Listening, Safari and low-memory device verification remain open.


## Block-fed WAV conversion — 2026-10-06

COMMON CANDIDATE: browser Download WAV requests includePCM:false. After unchanged source-rate DSP, the existing 96-tap conversion sends synchronous Float32 blocks to the PCM24 writer. Global frame indices, filter phase and Float32 rounding remain unchanged. The sink snapshots each block before it is reused. No full converted stereo PCM arrays are allocated for this path. At 48 kHz the sink consumes views of the existing source-rate output. Returned data contains Blob, frameCount, sampleRate, duration and truncated, not left/right. The default includePCM:true preserves the diagnostic PCM-returning API.

Cancellation is checked through conversion, append and finalization, including after the final block yield. The writer rejects incomplete output. Source-rate output and Blob payload still occupy memory; this is not streaming the DSP itself. The 180-second policy and Preview stay unchanged. Native migration should preserve this file contract without requiring the web Blob implementation.

Validation: frozen pre-change conversion/PCM24 oracle, 32 cases per Lab across 32/44.1/48/88.2/96 kHz, block edges, cancellation/recovery and renderer parity (Timbre Delay tail included). Existing regression suites pass. Nine-minute stereo 96k QA-only profiles preserve WAV duration and marker regions; Node memory measurements do not certify browser/low-memory behavior or listening quality.


## 2026-10-07 feedback candidate — PROJECT-SPECIFIC

Audio import has provisional 128 MiB encoded-file and 192 MiB decoded-PCM guards. File size is checked before arrayBuffer; RIFF PCM/float WAV chunk headers estimate decoded PCM before decoding. All decoded formats are checked before replacing the current buffer. Long-source and export-limit errors are visible in a role=alert region. No five-minute input restriction or output expansion was introduced; the existing Speed-derived 180-second output bound remains.


## Approved five-minute policy — 2026-10-07 — PROJECT-SPECIFIC

This supersedes earlier 180-second/3-minute limits in this document for Audio only. Final Speed-derived output and Preview timeline now share MAX_OUTPUT_SECONDS = 300 from output-policy.js. Exactly 300 seconds is accepted; longer WAV requests are rejected before source PCM reads/output allocation, never silently truncated. A visible live estimated-duration notice appears while editing over-limit curves and clears when the output fits. Input duration is not itself the output limit: 150 seconds at0.5x is300 seconds. 48kHz/24bit stereo and sound mappings are unchanged. Other Labs retain their policies.

Input guards remain independent provisional resource limits:128MiB file and192MiB decoded PCM. Thus five minutes is a maximum output capability, not acceptance of every five-minute high-rate/multichannel input on every device. Encoded-format decode expansion, concurrent tabs and low-memory devices still require testing. Native migration should preserve explicit duration/no-truncation semantics while measuring its own resource budget.

## Keyboard transport availability (2026-10-07)

Spacebar dispatches at most one transport action per physical press. Held-key repeats are consumed, and disabled Play or an absent source blocks dispatch. Input, select, textarea and editable-text targets retain native keydown/keyup behavior. Existing Play/Stop or Play/Pause semantics and DSP are unchanged. While Reset All is open, both Space events are left to the dialog buttons: Cancel and confirmation remain keyboard-operable without toggling background transport. See `tests/transport-keyboard.test.mjs` for event-routing regression checks; these isolate command dispatch from DSP.

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

Always-available working-source editing: linked deletion, short join, fades, Undo/Redo. Top source → middle curves → bottom actual output. One transport and Download WAV. No Crop, mode switch or Values fields. See [current contract](OUTPUT_EDIT.md).


## Source cursor and zoom (2026-10-13, PROJECT-SPECIFIC)

Source edit cursor and horizontal zoom: click sets a persistent edit cursor; drag selects. Magnifier −/+ buttons beside Undo, Fit, and a source-range slider support detailed deletion. Maximum zoom 1024× or at least 32 visible samples, whichever is less.


## Source playback head correction (2026-10-13, PROJECT-SPECIFIC)

The source waveform draws a solid white playback head using the AudioWorklet's
sourceSeconds at the working buffer sample rate. A dashed blue edit cursor remains
independent. Forward/reverse/freeze therefore follow actual source reading, not
elapsed output time. During playback, leaving the zoomed viewport recenters it
around the source head; drag/busy editing suppresses follow. No DSP/transport or
curve mapping changes. Source selection and zoom anchor are preserved.

During playback, hide the dashed source edit cursor; retain its stored position and restore it when stopped (if within the visible viewport). The solid source playback head remains visible. No selection or audio changes.

2026-10-13 visual revision: the source edit-position cursor now uses the same white solid 1.5px line as the playback head, replacing the blue dashed style. It remains hidden during playback; stored position and selection semantics are unchanged.


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


### Continuous output meter
Remove visible OUT and numeric peak readouts; retain L/R and latched CLIP reset.
Dark fixed color zones brighten up to the measured level: green below -12 dBFS,
yellow from -12 to -3 dBFS, red from -3 to 0 dBFS, on the existing -60..0 scale.
These are display choices, not processing thresholds. Clip full-width gradients
instead of scaling them, so colors remain tied to dBFS. White peak hold and existing
meter ballistics remain; CLIP retains the existing sampled-peak threshold 0.999
(not a true-peak detector). Per-channel accessible labels retain numeric values.


### Continuous meter refinement
Use 8px continuous tracks without segment dividers or an outer border.
A fixed full-width gradient moves from green through lime/yellow to orange/red;
the measured level clips this field rather than stretching its color positions.
Dim background follows the same gradient. Peak hold is a 1px pale line.
Meter processing, -60..0 dBFS mapping and latched CLIP behavior are unchanged.


## 2026-10-14 — File guidance disclosure (local pilot)

Audio-only pilot: file/export guidance is in an information disclosure beside Open Audio. The permanent privacy line remains. No file admission or output policy changes.


## 2026-10-14 — Family file information

Approved circular dotted-i disclosure immediately left of Open Audio. Default format guidance moves into this optional panel; privacy and actual error/status notices remain. Space operates disclosure without audio transport; Escape/outside click dismiss. Output guidance: Up to 5 min · Stereo · 48 kHz / 24-bit WAV. Input limits reflect current implementation, not a device-memory guarantee. No DSP, admission, export, IDs or defaults changed.


## 2026-10-14 — Parameter help pilot

Audio-only parameter help pilot: Speed/Pitch/Pan static range legend moved into per-button tooltips. Live values, curve axes, colors and selection remain unchanged. Other Labs are not changed.


## 2026-10-14 — Family parameter help

Static parameter descriptions are available on the relevant buttons using the Audio help design; current values, axes and activation feedback remain visible. See `docs/PARAMETER_HELP.md` (or `PARAMETER_HELP.md` in this directory). No DSP or curve mapping changes.


## 2026-10-14 — Open Audio keyboard access
파일 입력을 display:none 대신 시각적으로만 숨겨 Tab과 Enter/Space로 기본 파일 선택기에 접근하도록 수정. 포커스는 기존 fileButton:focus-within 윤곽선으로 표시한다. 파일 디코딩·처리 계약은 변경하지 않는다.


## 2026-10-14 — Reset modal focus
Reset 확인창의 Tab/Shift+Tab은 Cancel과 Reset All 사이에서 순환한다. Escape 취소와 닫은 뒤 Reset All 포커스 복귀는 유지한다. 확인창 뒤의 버튼을 키보드로 우발 작동하지 않도록 보완하며 리셋 대상과 음향 처리는 변경하지 않는다.

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


## 10 ms playback boundary candidate — 2026-10-25

The current local candidate supersedes earlier automatic transport-boundary durations with the [10 ms playback/WAV contract](PLAYBACK_BOUNDARY.md). Source/effect envelopes are separate. See that contract for pause-state retention, existing tail-length limits and verification status. Uncommitted; listening acceptance pending.

## Current-value basis and source-selection readout — 2026-10-27 (local review)
PROJECT-SPECIFIC. Existing always-visible readouts identify Editing, Curve points and Source playhead. Musical captions distinguish paused playhead targets from live playback telemetry; the value sources are unchanged. The existing source toolbar readout displays either source edit position or source selection start/end/length, in seconds with three decimals. This display reads the existing source frames/rate and never seeks, applies audio, changes selection or replaces the output clock. No new disclosure, button, hit target or DSP control.

## Readout context family release — 2026-10-27

Existing current-value captions now identify their basis. Stopped playhead / running telemetry; source edit position and selection are distinct from Source playhead and output clock. See `READOUT_CONTEXT_CONTRACT.md` for basis, source-range rules, verification boundary and portability.

## Source waveform 256px trial — 2026-10-27

PROJECT-SPECIFIC / IMPLEMENTED LOCAL REVIEW. Increase only Edit Audio / Source Time waveform height from128 to256 CSS px, with matching Canvas paint height/DPR backing size. Retain existing source selection, deletion, corner fades, zoom/navigation, Undo/Redo, curve/transport behavior and DSP. Desktop minimum app height becomes828px (700+128) to preserve the previous minimum curve workspace; low/narrow viewports use document scrolling with transport below content. No Command-volume graph was implemented. Commit/deployment are pending user review.


## Audio source volume + height — 2026-10-27

PROJECT-SPECIFIC. The approved 256px source editor now includes Command/pencil linked volume, unity to mute and up to +6dB, Volume toggle, Reset volume and existing source Undo/Redo. This supersedes the earlier height-only trial boundary. See [SOURCE_VOLUME.md](SOURCE_VOLUME.md). Publication and listening evidence are separate.
