# Current-value context and source-range contract v1

2026-10-27 · COMMON CANDIDATE / STANDALONE ASSET. User authorized six-Lab rollout, scoped commits, verification and public deployment. UI release evidence remains separate from listening or product-wide acceptance.

## Retained meaning

All current-value elements and IDs, units, precision, curve data, parameter colors, focus, axes, tools and transport remain. Editing / Curve points identify the editable curve, not the audition position. Point tooltips describe their own point and must not drive the value strip. Captions and existing native titles identify the existing value source:

| Lab | Basis retained by this UI change |
| --- | --- |
| Audio | Paused: curve targets at capped output playhead. Playing: existing live engine telemetry. Source playhead is source playback position, not source editing position/selection. |
| Timbre | Paused: existing curve target/effective-depth value at output playhead. Playing: Preview engine values. No enabled/selected effect retains --. |
| Space | Existing Direction/Distance curve values at output playhead, with unchanged Off/bypass meaning; no claim of measured speaker/audio output. |
| Granular | Initial Preview defaults, then most recent Preview-engine snapshot. These are not newly evaluated stopped playhead or selected-point targets. |
| Spectral | Curve targets at the current source playhead, including when an effect is Off; not a processed spectrum or rendered measurement. |
| Oscillator | Curve targets and derived stack/voices at output playhead, before modulation/file IR/output processing; synthesis limit counts remain separate from playback status. |

Use compact visible names alongside full parameter buttons; native titles retain full basis. Do not label every Lab's data as live playback telemetry. Preserve always-visible values; do not reintroduce Details disclosures.

## Source ranges

Audio's existing source-toolbar field shows source edit position without selection, or selected source start/end/length with a nonzero selection. Granular's Source Window metadata shows the selected grain-source window in source seconds when a file exists, separately from read position within that window and output time. Its existing exact-percent canvas title remains. The no-file state hides the new metadata.

Read existing frame/rate or normalized-window/duration data only. Seconds use three decimals for display; stored bounds/sample indices and output clock remain untouched. Showing metadata must not seek, play, apply audio, alter a selection or change export freshness. Granular source-window selection retains its existing send-settings behavior; the new display adds no messages. Do not create source-range controls or numeric ranges in Labs without that feature. Oscillator's imported-source overview remains a static reference.

## Visual and interaction boundary

Reuse existing Graphite/caption/tabular-number roles. Narrow range text may wrap; preserve complete text, graph axes, necessary dividers, focus and surrounding controls. Granular metadata uses a small caption row in the existing source frame; the existing available-height observer retains editor/transport fit. No new button/icon, hit-area enlargement, keyboard point editor, data generator, audio path, processing, native implementation or dependency.

## Verification and portability

Compare equal-sized before/after frames and equal source data; separate actual zoom from CSS-width fixtures, and long Korean layout text from actual import/error reproduction. Check selection/mode, pause/seek, no-file/file-present state, source metadata and relevant cancellation/recovery. Preserve processing hashes and compare prior numeric/value functions. Only scoped paths may be committed. Require completed Pages runs and public/local parity for release.

Standalone should preserve these semantic distinctions and read-only observation, using native text/accessibility/input roles rather than copying web pixels. No continuous live announcement on every drag sample is added. Physical touch, listening, CPU headroom and unsupported environments remain unverified unless separately observed.
