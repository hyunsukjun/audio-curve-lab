# Interaction Specification

This document describes user intent independently of browser event names. Current web
implementation details are included only where needed for verification or migration.

## Load A Source

**Intent:** Replace the generated sample with a local sound.  
**Behavior:** Open Audio presents a local file chooser. A successful decode replaces
the source, redraws the waveform, resets transport state, and makes Preview/Render use
the new source. A failed decode leaves the app usable and reports an error.  
**Constraint:** The file is processed on the user's computer and is not uploaded.

## Select A Parameter

**Intent:** Choose which musical trajectory is editable.  
**Behavior:** Speed, Pitch, or Pan becomes active. Its button, line weight, points,
readouts, scale, and tooltip semantics update together. Other edited curves remain
visible without points. Switching modes does not alter curve data.

## Pen: Add A Point

**Intent:** Add a parameter value at a chosen output time.  
**Behavior:** With Pen selected, pressing empty plot space creates one normalized point,
sorts it by time, selects it, and permits immediate dragging.  
**Current web implementation:** Pointer coordinates are converted from Canvas display
space into normalized plot coordinates after accounting for the left scale gutter and
right padding.

## Pen: Select And Move A Point

**Intent:** Refine an existing time/value pair.  
**Behavior:** Press near a point to select it. Dragging changes both normalized time and
value while maintaining time order. The tooltip shows the mapped musical value.  
**Precision:** No snapping or keyboard nudge is currently implemented. Hit testing uses
a small screen-space region rather than exact pixels.

## Eraser: Delete A Point

**Intent:** Remove one existing node without creating new data.  
**Behavior:** With Eraser selected, click an interior point to remove only that point.
Clicking empty space does nothing. The first and last sorted points are protected.  
**Important limitation:** Protected endpoints can be moved; they are protected from
deletion but are not hard-locked to exact timeline boundaries.

## Temporary Eraser Modifier

**Intent:** Delete quickly without leaving Pen.  
**Behavior:** Command-click on macOS/iOS-family platform detection, or Ctrl-click on
other platforms, temporarily applies Eraser behavior. Releasing the modifier leaves the
selected tool unchanged. Empty-space clicks still do nothing.

## Tool Feedback

**Intent:** Make the current editing mode obvious before an action.  
**Behavior:** Pen/Eraser pressed state, cursor shape, accessible label, and tooltip agree.
Pen is the default tool. The Eraser uses the repository cursor asset.

## Hover And Value Tooltip

**Intent:** Read a point's actual parameter value without modifying it.  
**Behavior:** Hovering a point or dragging it displays Speed ratio, Pitch cents, or Pan
position. The tooltip follows the active parameter's semantic color.

## Play

**Intent:** Hear the current source transformed by all curves.  
**Behavior:** Play starts or resumes the current Preview state. Spacebar toggles
Play/Pause when focus is not in a typing control. Curve edits are sent to the active
engine.  
**Feedback:** Bottom Transport time, aligned output-time cursors on the middle curve
and bottom progress bar, Source readout, moving source-time cursor on the upper original,
Speed, Pitch, Pan, and output meter advance. The source cursor can move backward
or freeze while output time moves forward. Natural completion resets the cursors.

## Pause and Return to start

Pause halts sound and clears active grains while retaining output/source position.
Play resumes from that position. Return to start seeks to zero and preserves
playing/paused state. Internal forced stops for editing/import/render remain reset
operations. The meter decays toward silence on Pause.

## Seek

**Intent:** Audition a different output-time position.  
**Behavior:** Clicking or dragging the lower Speed-mapped waveform maps the chosen
output-time position to source position using signed Speed. The upper original
waveform only shows source position; clicking it does not seek, because one source
position can occur at several output times under Reverse or Freeze. The middle
curve editor does not seek. Keyboard focus on the lower waveform supports Left/Right (1 second),
Shift+Left/Right (0.1 second), Home, and End. Active grains/control smoothing
restart around the new location.
Visible labels identify the upper source-time view and the middle/lower output-time
views; the lower view explicitly indicates that click/drag seeks. Only the lower
cursor has paired triangle handles, since the source-time cursor is display-only.
Pointer hover previews the destination with a dashed line matching the current cursor's 1.5px width and brightness, without changing
playback or displaying another time label. Dragging hides the guide; leaving or
cancelling clears it. Hover redraws only the lower waveform and adds no animation loop.
Hover help and the accessible name explain that the lower waveform is an
approximate Speed-based guide, not rendered audio.
The source-position calculation uses the same capped output duration as Preview,
including when a long source exceeds the 180-second output limit.
All views fit their available width without automatically following playback.
The upper original uses source time; the middle curve and bottom progress bar use output time.

## Reset Clip Indicator

**Intent:** Acknowledge a previously detected full-scale realtime output peak.
**Behavior:** The Clip state latches when any displayed channel reaches the threshold.
Clicking CLIP clears the latch without changing playback, curves, gain, or audio data.

## Clear Current

**Intent:** Reset only the selected parameter.  
**Behavior:** Stops playback and replaces the active curve with its two-point default.
Other parameter curves remain unchanged.

## Reset All

**Intent:** Return the whole transform to defaults.  
**Behavior:** Opens a confirmation dialog. Cancel, Escape, or backdrop dismissal changes
nothing. Confirm replaces all three curves with defaults, clears edited state, and
returns internal direction to its default.  
**Reason:** There is no undo, so this destructive operation requires confirmation.

## Download WAV

**Intent:** Create a reusable file matching the current transform model.  
**Behavior:** Active Preview stops before Render. Progress is reported; completion starts
a local file download. Invoking the action while a render is active cancels it. Any
curve/setting/source change marks an earlier render stale.

## Responsive And Accessibility Behavior

- Keyboard focus must remain visible.
- Disabled transport actions must not fire.
- Decorative animation must respect reduced-motion preference.
- Layout may wrap, but commands and readouts must not overlap.
- High-DPI or resize changes drawing resolution only; they never alter normalized points.
- Pointer Events provide mouse/pen/touch compatibility, but a touch-first usability
  review is `TO BE DOCUMENTED`.

## Future Interaction Gaps

- Undo/Redo: not implemented.
- Keyboard point editing and accessible numeric entry: not implemented.
- Curve-region drawing/freehand stroke: not implemented; interaction is point-based.
- Preset/state save and restore: not implemented.
- Confirmed mobile/touch workflow: `UNKNOWN`.

## 2026-10-06 — Reject over-limit export instead of truncating (local, unpublished)

Previously the renderer silently limited the body to 180 seconds and reported capped after downloading. It now raises EXPORT_DURATION_LIMIT before output allocation; the app states that no file was saved and restores the controls. Audio checks estimated output duration after Speed; Timbre checks source duration and preserves the existing Delay tail for accepted files. Exactly 180 seconds remains supported. This is an interim explicit limit, not full long-file support. Preview and DSP inside the supported range are unchanged. Long-file memory/cancellation and full-duration policy remain open.

Validation: actual 180-second render accepted, 181/540 seconds rejected, and Audio 120-second input at Speed 0.5 rejected for its 240-second output. Browser 181-second file produced the explicit message with no console errors.

### Export recovery follow-up — 2026-10-06

Already-aborted or over-limit renders exit before accessing source PCM channels or allocating output arrays. Five cancel/re-render cycles reproduce the same clean WAV. Browser checks with a 180-second file confirm Cancel returns controls; loading a new 6-second file then exports stereo 48k/24-bit/6 seconds. No console warnings/errors observed. Audio labels its existing capped playback timeline “preview limit”; this does not extend playback or export support. Long-file heap/GC behavior and low-memory device testing are still unverified.


## Cancellable WAV encoding — 2026-10-06

Cancel during PCM-to-WAV encoding raises AbortError at a block boundary; no partial Blob is returned or downloaded. A pending cancellation after the final PCM block is checked before success. Controls recover through the existing render lifecycle. Progress remains the existing DSP progress indicator; no new encoding percentage is claimed.

Validation: tests/wav-encoder.mjs and tests/browser-wav-encoder.html cover legacy byte parity across block boundaries, pre-abort, final-block abort, and cancel/recovery. Existing WAV, limit and recovery regressions pass; Audio transform parity also passes. Local app default 8-second export saved a 48k/24-bit WAV. Listening, Safari and low-memory device verification remain open.


### Block-fed export lifecycle

Download WAV uses the Blob-only renderer path. Existing Cancel and control recovery remain; no partial file is published. Progress retains its existing DSP-only meaning. PCM arrays are returned only to callers using the default diagnostic path.

### Freeze seek direction — 2026-10-06 local candidate
Seeking into Freeze now restores direction from the current Speed trajectory rather than the previously played region. Leading/all-Freeze retains the existing initial/global Reverse fallback. Seeking still restarts grains and gain smoothing; it is not continuous-playback sample reconstruction. See DSP_BEHAVIOR.md and tests/freeze-seek.mjs.


## 2026-10-07 feedback candidate — PROJECT-SPECIFIC

Pan ticks, lines (including inactive overlays), endpoints, hover tooltips and pointer conversion share the same inverted display mapping. Render completion retains a visible Save WAV anchor for a direct user click if automatic saving is blocked. The anchor is invalidated on curve/settings changes, successful file replacement and new export. Ready means a WAV Blob exists, not that disk saving succeeded. Rejected imports preserve previous audio, curves and completed export. An attempted decode stops playback; size-only rejection happens before stopping.


## Approved five-minute policy — 2026-10-07 — PROJECT-SPECIFIC

This supersedes earlier 180-second/3-minute limits in this document for Audio only. Final Speed-derived output and Preview timeline now share MAX_OUTPUT_SECONDS = 300 from output-policy.js. Exactly 300 seconds is accepted; longer WAV requests are rejected before source PCM reads/output allocation, never silently truncated. A visible live estimated-duration notice appears while editing over-limit curves and clears when the output fits. Input duration is not itself the output limit: 150 seconds at0.5x is300 seconds. 48kHz/24bit stereo and sound mappings are unchanged. Other Labs retain their policies.

Input guards remain independent provisional resource limits:128MiB file and192MiB decoded PCM. Thus five minutes is a maximum output capability, not acceptance of every five-minute high-rate/multichannel input on every device. Encoded-format decode expansion, concurrent tabs and low-memory devices still require testing. Native migration should preserve explicit duration/no-truncation semantics while measuring its own resource budget.

## Spacebar routing (2026-10-07)

Spacebar dispatches at most one transport action per physical press. Held-key repeats are consumed, and disabled Play or an absent source blocks dispatch. Input, select, textarea and editable-text targets retain native keydown/keyup behavior. Existing Play/Stop or Play/Pause semantics and DSP are unchanged. While Reset All is open, both Space events are left to the dialog buttons: Cancel and confirmation remain keyboard-operable without toggling background transport.

## Import before first playback in Safari (2026-10-07)

Local file decoding creates/reuses the AudioContext without resuming it. Playback still resumes the context through the existing Play path. A file chooser can return without the user activation Safari requires for `resume()`, leaving its promise pending; import must not wait for permission to play. File-size/PCM guards, native-rate decode, previous-source preservation on failure, normalized curves and DSP remain unchanged.


## 2026-10-08 — Cancel pending first playback

Stop and actual source replacement invalidate a pending Play even before the AudioWorklet node exists. Stop now advances the playback token unconditionally, and Play checks the captured token after asynchronous engine preparation. Forced Stop follows the same rule where present. Explicit Play after cancellation remains available. No-file chooser cancellation and each Lab's existing failed-import policy are preserved. DSP, curve semantics, and export format are unchanged.

Regression: tests/initial-play-cancel.mjs invokes actual application handlers with delayed engine preparation. Old code failed the Stop case; corrected code passes Stop, forced Stop where present, successful source replacement, and explicit retry. This proves request cancellation, not cold-start speed or physical audio onset. Standalone should preserve the same invalidation rule across asynchronous engine setup.

## Source editing and waveform revision (2026-10-13)

Import immediately enables source editing. Drag then Delete; fade release auto-applies. Shared Space/Play uses the complete latest edited source with curves. Curves stay editable. Bottom actual output supports seeking; source selection does not seek. Session edits are not disk autosaves. See [current contract](OUTPUT_EDIT.md).


## Source cursor and zoom (2026-10-13, PROJECT-SPECIFIC)

Click sets the source edit cursor (3px click tolerance); drag selects absolute source frames. Plain +/= and − zoom around that cursor. Text fields and Ctrl/Meta/Alt shortcuts are excluded. Fit shows the whole source. Range slider pans without moving the cursor or selection. Cursor may be offscreen after panning; it is not pinned to an incorrect edge. Fade handles outside the visible source range are hidden. Zoom/selection never seek final output.


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


### Bottom transport readability
The output track is 6px high, centered at y=17 within its unchanged 34px
pointer target; the white current-position marker is 3x14px on that same center.
Stereo meter tracks are 9px high with 11px channel/value labels.
Seeking, time mapping and meter analysis are unchanged.


### Segmented output meter
Remove visible OUT and numeric peak readouts; retain L/R and latched CLIP reset.
Dark fixed color zones brighten up to the measured level: green below -12 dBFS,
yellow from -12 to -3 dBFS, red from -3 to 0 dBFS, on the existing -60..0 scale.
These are display choices, not processing thresholds. Clip full-width gradients
instead of scaling them, so colors remain tied to dBFS. White peak hold and existing
meter ballistics remain; CLIP retains the existing sampled-peak threshold 0.999
(not a true-peak detector). Per-channel accessible labels retain numeric values.


## 2026-10-14 — File guidance disclosure (local pilot)

The file information disclosure opens by click, Enter or Space. Space events inside it do not reach audio transport. Escape closes it and focuses its summary; an outside pointer click closes it. File/duration alerts remain visible in their existing status/alert elements. No import, editing, rendering or transport handlers changed.

Verification: transform-parity and 5 transport-keyboard checks pass; changed module and required engine syntax checks pass. Local browser: initial collapse, Space opens without starting playback, Escape and outside click close, panel fits observed narrow viewport, no console errors. Existing fileNotice/durationNotice and admission handlers remain unchanged; actual oversized-file rejection was not rerun. Not committed or deployed.

Pilot refinement: information control is now left of Open Audio, with a 28 px circular outline and a distinct dotted i glyph (no nested circle). Help behavior remains unchanged.


## 2026-10-14 — Family file information

Approved circular dotted-i disclosure immediately left of Open Audio. Default format guidance moves into this optional panel; privacy and actual error/status notices remain. Space operates disclosure without audio transport; Escape/outside click dismiss. Output guidance: Up to 5 min · Stereo · 48 kHz / 24-bit WAV. Input limits reflect current implementation, not a device-memory guarantee. No DSP, admission, export, IDs or defaults changed.

Family verification: all six information panels passed desktop/narrow bounds and Space/Escape/outside-click checks; shared keyboard regression 27/27 passed. Existing dynamic errors and audio handlers unchanged. User approved commit and publication on 2026-10-14. Release evidence in family FILE_HELP_2026-10-14.md. Earlier Audio-only pilot status is superseded.


## 2026-10-14 — Parameter help pilot

Parameter help appears after 500 ms pointer hover or immediately on button focus. Touch selection also reveals help; outside press, Escape, blur, scrolling or resizing closes it. Pointer may enter the help to read it. aria-describedby connects each button to its explanation. Parameter selection and Space transport are preserved.


## 2026-10-14 — Family parameter help

Static parameter descriptions are available on the relevant buttons using the Audio help design; current values, axes and activation feedback remain visible. See `docs/PARAMETER_HELP.md` (or `PARAMETER_HELP.md` in this directory). No DSP or curve mapping changes.


## 2026-10-14 — Open Audio keyboard access
파일 입력을 display:none 대신 시각적으로만 숨겨 Tab과 Enter/Space로 기본 파일 선택기에 접근하도록 수정. 포커스는 기존 fileButton:focus-within 윤곽선으로 표시한다. 파일 디코딩·처리 계약은 변경하지 않는다.


## 2026-10-14 — Reset modal focus
Reset 확인창의 Tab/Shift+Tab은 Cancel과 Reset All 사이에서 순환한다. Escape 취소와 닫은 뒤 Reset All 포커스 복귀는 유지한다. 확인창 뒤의 버튼을 키보드로 우발 작동하지 않도록 보완하며 리셋 대상과 음향 처리는 변경하지 않는다.
