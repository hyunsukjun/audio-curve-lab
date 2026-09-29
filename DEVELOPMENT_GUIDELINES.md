# Audio Curve Lab Development Guidelines

## Product Goal

Audio Curve Lab is a compact browser instrument for composing time, pitch, and
stereo position as curves. It prioritizes immediate understanding, local processing,
classroom use, and reusable WAV output over feature breadth.

The browser implementation is the current reference implementation. Product behavior,
parameter knowledge, and musical results must remain reproducible if the platform
changes later.

## Current Architecture

| Layer | Current file | Responsibility |
| --- | --- | --- |
| Product UI/state | `index.html`, `src/styles.css`, `src/app.js` | Controls, curve state, Canvas drawing, file lifecycle, transport, status |
| Shared processing model | `src/transform-core.js` | Mapping, interpolation, duration/source-position math, shared DSP constants |
| Realtime Preview | `src/transform-worklet.js` | AudioWorklet playback and position reporting |
| Offline Render | `src/offline-render.js` | Deterministic offline processing and 24-bit stereo PCM WAV encoding |
| Regression model | `tests/transform-parity.mjs` | Mapping, extremes, determinism, direct-path and finite-output checks |

There is no build system, package manager, external library, server component, or
upload path. Keep this deployment simplicity unless a new requirement justifies a
change.

## State And Parameter Architecture

- Curves use stable IDs `stretch`, `pitch`, and `pan`.
- Curve points are ordered `{x, y}` pairs in normalized range `0..1`.
- `x` is progress through output time; `y` maps to the selected parameter domain.
- UI pixels are a view of normalized data and are never the stored musical values.
- Curve and DSP defaults belong in explicit constants/data, not inferred from layout.
- Display labels may evolve; internal IDs require a migration plan if changed.
- There is currently no preset or persistent state schema. A future schema should be
  versioned and describe product data, not Canvas pixels or DOM state.

## Curve Editing

Keep point sorting, smoothstep interpolation, hit testing, tool selection, and endpoint
protection explicit. Resizing, browser zoom, and device pixel ratio must not alter the
curve's normalized values. UI refinements should change painting and layout before
changing curve semantics.

## Canvas Rendering

- The Canvas uses device-pixel-ratio backing resolution for Retina/high-DPI clarity.
- The current workspace has a minimum logical width of 1800 and is clipped by its
  frame on narrower windows. This preserves a stable timeline geometry.
- Parameter scale space is reserved at the left; pointer mapping uses the plot area.
- Active and inactive curves remain semantically visible; only the active curve shows
  editable points.
- Waveform display is an overview, not sample-accurate editing data.

Any Canvas change must test both drawing coordinates and pointer coordinates at narrow
and wide sizes.

## Audio Processing Separation

Mappings, interpolation, direction, duration estimation, shared constants, and helper
math belong in `src/transform-core.js`. Realtime and offline engines may have different
scheduling constraints, but they should consume the same product model.

Do not hide an engine-specific correction inside UI code. If a Preview-only or
Render-only correction is unavoidable, document the audible consequence and parity
risk in `docs/DSP_BEHAVIOR.md`.

## Preview And Render Consistency

The target is perceptual and behavioral consistency, not necessarily bit identity.
Check at minimum:

- same parameter mapping and curve interpolation;
- same signed-speed direction and Freeze boundary;
- same source-position intent;
- same pitch and pan intent;
- no avoidable click, clipping, drop-out, or discontinuity;
- comparable duration and endpoint behavior;
- deterministic Render for identical inputs.

The current transformed Render has post-mix peak normalization while realtime Preview
does not. This known difference must not be described as exact parity.

## File Loading And Default Sample

- Generate the default sample locally; do not add a required network request.
- Decode user files through Web Audio and replace the default sample only after a
  successful decode.
- Browser codec support varies. The UI recommends WAV and MP3; M4A/AIFF and other
  formats must be treated as browser-dependent.
- Keep original sample rate for user-loaded audio and document any channel selection.
- Validate invalid, unsupported, very short, long, mono, and stereo inputs when this
  code changes.

## WAV Export

Render is local and cancellable. Preserve sample rate and channel assumptions, output
duration cap, deterministic processing, filename behavior, and valid WAV headers.
Document any future bit-depth or normalization change because it changes the product's
output contract.

## Responsive And High-DPI Behavior

Use stable dimensions and explicit breakpoints rather than viewport-scaled typography.
The current breakpoints are 1180 px and 860 px. Keep controls readable and nonoverlapping,
and preserve the Canvas-first hierarchy. Use `prefers-reduced-motion` for decorative
animation. Test at least a narrow laptop width and a wide desktop width.

## Performance And Stability

- Avoid per-frame allocation in realtime audio paths.
- Cancel or ignore stale asynchronous jobs and old Preview tokens.
- Bound grains, output duration, and expensive rendering work.
- Yield during long offline renders so cancellation and UI feedback remain responsive.
- Treat sleep/wake, AudioContext suspension, repeated file replacement, repeated
  rendering, and long files as lifecycle risks.
- Optimize only after measuring; do not trade deterministic sound behavior for an
  unverified speed improvement.

## Compatibility Policy

Target current desktop Chrome, Edge, Safari, and Firefox where their standard Web Audio
features permit. Avoid browser-specific core behavior. When a workaround is required,
isolate it and document the browser/version evidence. Browser playback must be tested;
API presence alone is insufficient.

## Dependency Policy

Prefer browser standards and repository-local code. A dependency requires a clear
product need, license/maintenance review, offline/local-processing assessment, and a
plan for long-term replacement. A visual redesign alone is not sufficient reason.

## Testing Policy

1. Run syntax checks.
2. Run `tests/transform-parity.mjs`.
3. Serve through `localhost`; do not use `file://` for audio verification.
4. Exercise the full changed lifecycle with a real audio file when audio code changes.
5. Verify exported WAV metadata and listen to Preview/Render at representative and
   extreme settings.
6. Check console errors and responsive Canvas/pointer alignment.

Record what was actually verified and what remains untested. Do not equate automated
finite-sample checks with subjective sound-quality approval.

## Documentation Policy

Documentation is part of completion. Record the meaning and reason for a value when
known. Preserve significant previous/current tuning values and listening decisions.
Mark unavailable rationale as `UNKNOWN`, and update it after a real decision or
listening test.

## Standalone Considerations

Preserve normalized curves, mappings, constants, gesture meanings, engine behavior,
and output contracts independently of browser APIs. Do not prematurely port to JUCE,
C++, Swift, or another framework. The immediate goal is product-knowledge portability,
not source-code portability.
