# Audio identity pilot — Hub v0.10

2026-10-04 · Audio-only identity pilot. User authorized GitHub/Pages publication on 2026-10-04. Deployment verification is reported separately.

## Canonical source

CURVE LAB HUB for macOS design study:
`/Users/hyunsukjun/Documents/Codex/2026-09-27/referenced-chatgpt-conversation-this-is-an/outputs/CurveLabHub/DesignIdentity/iterations/2026-10-04-v0.10`

Portable pinned snapshot: `assets/identity/palette.json`, `tokens.css`, Audio SVGs.
The palette JSON records original asset hashes. No runtime dependency on Hub paths.

| Lab | sRGB |
| --- | --- |
| Audio | `#459BFF` |
| Timbre | `#F4CB38` |
| Space | `#A982FF` |
| Granular | `#EF4FA4` |
| Spectral | `#FF7047` |
| Oscillator | `#28CDB0` |

## Scope

- Header: Hub v0.10 Audio symbol; brand text #459BFF.
- Browser tab: Hub v0.10 Audio micro symbol.
- Download WAV: canonical accent border and darker accent-derived background.
- Focus/hover: lighter derived blue, identified separately from canonical colors.
- Stored app tile: future standalone reuse only.
- No other Lab changed. No processing, curve data, parameter identity, canvas
  waveform colors, control IDs, keyboard handling, or layout geometry changed.

## Updating and rollback

Update palette JSON and CSS together from a named Hub iteration; copy exact SVGs
and update hashes. Do not reinterpret the shape independently inside this product.
Previous brand: #4DA7E8 and inline 48-unit waveform. The pre-pilot Git revision is
`c5481a0`; use its HTML/CSS as comparison, preserving any later unrelated edits.

## Validation

Local browser validation: 1294px desktop and observed 434px narrow viewport;
no horizontal document overflow (narrow document width 419px). Header color resolves
to rgb(69,155,255) and SVG loads. Default sample reaches Playing and advancing time;
no warning/error console entries observed. All existing src/*.js hashes unchanged;
three SVGs match their Hub source hashes. Header screenshot stored with Hub pilot records. JS byte comparison checks the protected runtime
surface; it is not a listening test. No actual native Dock verification claim.
