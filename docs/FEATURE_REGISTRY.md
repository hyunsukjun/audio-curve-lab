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
points with Eraser, and inspect values by hover/drag tooltip.

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

**Tests:** Interpolation is automated. Full pointer lifecycle is manual.

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
