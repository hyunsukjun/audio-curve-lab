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
Play/Stop when focus is not in a typing control. Curve edits are sent to the active
engine.  
**Feedback:** Bottom Transport time, aligned output-time cursors on the middle curve
and lower preview, Source readout, moving source-time cursor on the upper original,
Speed, Pitch, Pan, and output meter advance. The source cursor can move backward
or freeze while output time moves forward. Natural completion resets the cursors.

## Stop

**Intent:** End Preview and return to the initial state.  
**Behavior:** Stop halts sound, clears active grains, resets output/source position, and
returns the visible timer and playhead to zero. The meter then decays toward
silence according to its display ballistics.

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
The upper original uses source time; the middle curve and lower preview use output time.

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
