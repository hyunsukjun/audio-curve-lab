# Audio Source Volume — 2026-10-27

PROJECT-SPECIFIC / STANDALONE ASSET. Approved Audio-only source edit. The source waveform is 256 CSS px, with matching high-DPI backing/paint size; output transport remains 34px. Short/narrow windows scroll while retaining the lower curve workspace. Desktop starts at an 828px total-height floor; the measured wrapped-control stack can raise that floor to keep at least 222px for the curve and keep transport below it. Canvas bitmap size is not used as an intrinsic layout minimum.

## Gesture and feedback

- Hold Command to show/edit linked source volume with the pencil cursor. Releasing Command exits temporary editing. A non-unity gain line remains visible so applied processing is not hidden.
- The existing toolbar gains a Volume toggle as a keyboard/pointer/touch-accessible alternative. It focuses the source canvas. Reset volume clears only this envelope and supports Undo. Reset All keeps its existing curve-only scope.
- Click empty graph space to add a point; drag an existing point to change source time and gain. Endpoints stay at the source boundaries. Option-click or Delete removes an interior point in volume mode; endpoints remain protected. The ordinary source selection/deletion behavior remains outside volume mode.
- Left/right selects a volume point; up/down changes gain by 0.5dB (Shift: 0.1dB). Home sets that point to 0dB. Enter adds a unity point at the stored source edit cursor. Cmd/Ctrl+Z and Shift+Z use the existing source Undo/Redo stack. Plain +/− retains source zoom. Space retains transport when not applying/dragging.
- Escape, pointer cancellation, lost capture and window blur restore an unfinished gain drag. Losing Command during a drag does not split the transaction; release commits once. One completed gesture is one history step.
- Graph labels identify source volume, dB and source seconds, distinct from source selection/cursor, actual playback position and output time. While editing, L/R lane labels are replaced by dB marks, with the waveform quiet behind the linked graph. Fade handles temporarily hide to prevent pointer collisions.

## Gain and audio contract

The user approved **+6dB maximum**, 0dB default and exact mute. The graph uses a logarithmic -60..+6dB visual scale, with its bottom edge representing mute. Gain is stored as finite linear amplitude (0..10^(6/20)) at native source frames. Current approved revision (2026-10-28): connect points with straight segments in the displayed dB/time plane. Interpolate that same dB ordinate when materializing source gain. Storage remains linear-amplitude/native-frame points. Preserve exact point gains; mute stays exactly zero at its point and uses the existing -60dB display-floor anchor between points (constant mute stays zero). Viewport edges are evaluated with the same function, then connected directly to visible control points. This supersedes the released linear-amplitude interpolation that looked curved in dB. There is no claim of a preferred listening curve.

Original immutable PCM pieces → existing deletion/join → source-volume gain × existing corner-fade gain → complete working source → unchanged Speed/Pitch/Pan Preview/Render engines → existing output conversion/boundary treatment.

- Linked L/R receive the same gain. Mono remains mono. Native frame count/rate, time axis, channel relationships and all transform parameter mappings are unchanged. Neutral volume is sample-identical in numerical tests.
- A drag previews metadata only. The existing source-edit commit publishes complete PCM on release; there is no partially applied source for playback or WAV. Source edits stop/reset transport through the existing source-edit path. This is not live output-time volume automation.
- Existing source fades and the new envelope are both read from immutable originals on each materialization; Undo/repeated edits do not multiply a previously baked gain again. The final 10ms output boundaries remain unchanged.
- Deletion removes the corresponding source-time automation, shifts retained right points by the actual removed frame count, and bridges gain across the existing at-most-5ms join. Outside that join, retained source gain follows retained source time. Full deletion/Undo and edge cuts remain supported. Manual insertion is capped at 512 points; deletion can add boundary anchors needed to preserve retained trajectories.
- Applying gain, resetting it, Undo/Redo and file replacement invalidate stale WAV output through the existing complete-source apply path. Import resets envelope/history. Allocation failure retains prior PCM/state/history. No new persistence, project format, normalization or limiter is introduced.
- +6dB is pre-transform source gain. Loud sources can drive the existing transform saturation more strongly. Existing output peak/clip monitoring, tanh behavior and WAV quantization remain unchanged; this is not guaranteed +6dB measured at final output.

## Verification and portability

`tests/source-volume.mjs` covers native rates, +6/mute/unity, stereo relationships, fades, delete rebasing, reset and limits, atomic handler transactions/cancellation/failure, keyboard/toggle and replacement. An edited 48kHz source passes through actual AudioWorklet and offline renderer with <1e-6 sample error in the neutral-transform case. Existing transform/edit/transport suites remain separate evidence. These are numerical/interaction checks, not listening approval.

Preserve source-time ownership, linked gain, one gesture/one Undo, cancellation, latest-render invalidation, clear active/modified states and separate timeline meanings in Standalone. Do not carry web 256/828px, browser pointer capture, SVG cursor, ephemeral session storage or the experimental pixel hit radius into native specifications automatically. Ctrl is not newly bound to volume mode; non-Mac use has the Volume toggle. Physical touch, Windows hardware, native UI and new listening require separate evidence.
