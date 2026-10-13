# Audio source editing — web release, 2026-10-13

This revision supersedes the earlier post-render snapshot/locked-curve prototype.

## Processing and ownership

Original file → decoded immutable original PCM → edited working source → existing
Speed/Pitch/Pan engine → final rendered output → 48 kHz / 24-bit stereo WAV.

Import immediately enables editing. No Edit curves, Values, separate editor window,
or alternate download action. No Crop. Original files are never overwritten.
Edits auto-apply within the current session; reloading loses them. Download writes
a separate final WAV, not an editable project.

## Interaction

- Top: EDIT AUDIO / SOURCE TIME, linked L/R selection, Delete/Backspace joins.
- Corner handles: half-cosine Fade In/Out; release publishes complete PCM. Pointer
  cancellation restores the previous state. Arrow keys adjust 10 ms; Home clears.
- Undo/Redo and focused Cmd/Ctrl+Z; history stores piece references, up to 100 steps.
- Middle curves always remain editable. Normalized curve points do not move after
  deletion, but their absolute-time meaning changes with the shortened source.
- A 34px output-time bar inside the source panel replaces the final waveform.
  It shows current/total output time and supports click, drag and keyboard seeking.
- Space pressed during edit application queues playback of the complete new source;
  Stop cancels that pending request. No audible playback is needed to render the view.
- Delete-all disables Preview/Download; Undo restores audio.

## DSP and display boundaries

Deletion overlaps the join by at most 5 ms using complementary half-cosine weights.
Thus an internal deletion removes the selected interval plus the overlap. Linked
stereo preserves channel relationships. Working PCM retains decoded sample rate;
existing export resampling remains responsible for 48 kHz output. Existing handling
of multichannel input uses first two channels; editing preserves mono as mono.
Fades occur before curve processing: reverse, freeze and pitch affect the faded
source. This is deliberately not a post-transform mastering fade.

Both canvases are 128px high with equal stereo lanes and common peak-based display
gain, anchored to the imported peak and increased reference if output is louder.
The display never writes or normalizes audio samples. Fading does not independently
renormalize each lane. Narrow attacks use maximum covered bucket, including tail.
Source and output duration may differ due to Speed; matching visual style does not
imply matching timelines or PCM.

## Resource and verification limits

Automatic output overview rendering is removed. WAV rendering runs on Download.
Original PCM, working PCM and transient export buffers still consume memory; this
is not streaming or a total-memory bound.
Existing import limits and five-minute output policy remain in force. At widths
below 900px scrolling is intentional; desktop layout minimum height is 700px.

Automated checks cover edit lifecycle, allocation failure, empty recovery, native
rates, display immutability and stale render races. Short real-file import/edit/WAV
save is tested locally. Long-file memory, Safari/Windows, physical playback and
comparative listening remain separate checks. These checks do not establish broad device compatibility or listening approval.

## Source cursor / zoom revision

Click sets a source edit cursor and displays seconds to three decimals. Drag still
selects a delete interval. Magnifier buttons or plain + / - zoom around the cursor;
Fit restores full extent. Horizontal slider pans the visible source range. Actual
source samples supply detailed peaks; linked amplitude scale is unchanged.
Viewport and cursor are UI state, not musical parameters or output seeking.
Automated tests cover anchored zoom, native-frame selection/deletion while zoomed,
Undo, pan bounds, maximum zoom, keyboard exclusions and no playback side effects.
Local browser click/4x zoom/delete/Undo/Fit were checked silently.

Playback tracking: solid white line = actual engine source-read position; dashed
blue line = edit cursor. Zoomed viewport follows out-of-view playback in either
direction, while freeze holds the source head. The edit cursor is not moved.

During playback, hide the dashed source edit cursor; retain its stored position and restore it when stopped (if within the visible viewport). The solid source playback head remains visible. No selection or audio changes.

## Release verification — 2026-10-13

All 20 automated test files and source syntax checks passed before commit. Prior
local browser checks cover real AIFF import/edit/WAV save, zoomed deletion/Undo,
8× source playback tracking using a silent WAV, and hiding/restoring the edit
cursor during playback/Stop.

Follow-up: detailed edit ergonomics, comparative listening of joins/fades, long-file
peak memory and cancellation under load, Safari/Windows and macOS Hub lifecycle.
Keep these in the existing QA process; this release is not a Web v1 freeze.

2026-10-13 visual revision: the source edit-position cursor now uses the same white solid 1.5px line as the playback head, replacing the blue dashed style. It remains hidden during playback; stored position and selection semantics are unchanged.

## Unified source / output-time UI — current revision

This supersedes the earlier separate-final-waveform and edit-only click behavior.
A source click selects a matching output start; Play/Space starts there. Drag selects
a deletion interval and does not invoke source seeking. Inverse mapping uses the
existing worklet seek function: closest output visit to the pre-click playhead wins.
Freeze/unreachable source positions report that no matching output position exists
and retain the previous output position. Output bar always offers direct seeking.
The inverse uses a1024-interval numerical search and validates candidates within
0.5ms source time; extreme/narrow curve cases remain a detail-QA target.
Every seek advances the playback token so a delayed Stop acknowledgment cannot
overwrite a newly selected position. No curve/DSP/interpolation changes.
Source zoom is independent of the full-duration output bar. Audio sample amplitudes
are unchanged; source display is anchored to imported peak only.


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
the displayed fraction (2x = 50%, 4x = 25%), and a dot marks the navigation anchor.
Click/drag centers the viewport around that source position, clamped at boundaries.
Navigation changes the view only, preserving selection, playback start and PCM.
Arrow keys move 5% of source length (Shift: 1%); Home/End navigate to boundaries.
Zoom centers on the selected range midpoint when a selection exists, otherwise
the edit cursor. Near source boundaries the viewport is clamped to avoid empty space.
Transport order is Return to start, Play, Pause, with neutral same-color icons.
