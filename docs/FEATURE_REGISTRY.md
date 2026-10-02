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
shows output time/duration. Clicking or dragging the upper waveform seeks by output
time; the lower Canvas remains dedicated to curve editing. Natural completion returns
the timer and playhead to zero.

**Processing:** An AudioWorklet receives the source, curves, and settings. Position
messages update the UI at approximately 30 Hz. Curve edits are sent to an active engine.

**Display:** A solid cursor crosses both the upper waveform and lower curve editor
at the same output-time x coordinate. Source read time has a separate numeric
readout. The upper waveform projects source peaks through the signed Speed curve;
it is a visual guide, not a rendered-output waveform or sample-accurate audio trace.
Mono input has one labeled lane; stereo input has separate L/R lanes. The
waveform indicates input channel count, not the channel count of the WAV export.

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
and a compact stereo L/R meter. Seeking happens on the upper waveform. The meter shows RMS body, Peak extent,
Peak Hold, and a latched Clip indicator that can be clicked to reset.

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

**Output:** Stereo 24-bit PCM WAV at the source sample rate, maximum 180 seconds.

**Processing:** Uses shared mappings/constants with a deterministic offline grain
schedule. Transformed output is peak-scaled toward 0.92 before `tanh`; neutral direct
output uses `tanh` without global normalization. Granular Preview and Render share a
bounded correction based on the actual sine-window overlap sum.

**Edge cases:** Preview and Render are not bit-identical. Long output consumes memory.

**Tests:** Direct-path expected samples, deterministic transformed output, finite values,
bounds, reverse, Freeze, and extremes are automated. WAV header/browser download and
listening parity are manual.

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
