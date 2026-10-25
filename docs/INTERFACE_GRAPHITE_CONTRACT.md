# Curve Lab graphite interface contract

Version 1, 2026-10-26. **COMMON CANDIDATE / STANDALONE ASSET.**

The user approved applying the researched visual direction to all six web Labs and committing the result. This is a presentation revision after the earlier UI baseline: the layout, interaction and DSP contracts remain authoritative. Current implementation is `src/refined-ui.css`; the portable manifest is `assets/interface/graphite-v1.json`. Module identity and musical colors belong to each Lab.

## Visual purpose

A deep neutral shell supports shallow, readable controls and clear musical content. The current task, selected curve, playback position and warning states remain unmistakable. Sophistication comes from coherent luminance, type roles and optical weight. It must not reduce discoverability or hide information.

## Role colors

| Role | Previous web value | Graphite v1 |
| --- | --- | --- |
| Continuous title, controls, readouts and transport surround | #373B43 | #2D3138 |
| Source waveform and curve content | #191C20 | #191C20 retained |
| Available, unselected control | #303740 | #363C45 |
| Available control edge | #48515C | #505A67 |
| Available control hover | #404A56 | #444D59 |
| Hover edge | #7A899B | #7D8796 |
| Primary text | #F0F3F7 in common roles | #E5E9EF |
| Readout caption / reference value | #ADB6C2 captions | #B6BEC9 |
| Canvas-related CSS caption | #AAB4C0 | #AAB4C0 retained |
| Readout divider | #454B54 | #424952 |
| Tooltip / file-information surface | module legacy neutrals | #272C33 |
| Keyboard focus | #A9CFFF | #A9CFFF retained |

The primary-on-shell solid-color contrast is 10.72:1; secondary-on-shell is 6.96:1; primary-on-control is 9.12:1; secondary-on-control is 5.93:1. These calculations describe specified solid-color pairs, not full accessibility certification or a physical-display result. Decorative edges do not replace required control/state identification.

## Typography and geometry

Retain the system font stack, existing title size, control sizes, weights, line heights, tracking, label wording and source order. Main controls remain 13 CSS px, current values 14, readout captions 11, compact auxiliary selectors 12 where already specified. Numeric tabular alignment stays in place. No global font smoothing or opacity trick is introduced.

Narrow-screen exception: below 601 CSS px, the existing output/seek time string may wrap without truncation. This fixes the pre-existing Oscillator 390 px horizontal overflow while preserving both clock meanings and all controls. The footer may grow vertically; this is the only intentional layout effect.

Retain 34 px mode buttons, 38 px file/export buttons, 32 px tool/transport buttons and their existing hit targets. Retain existing corner radii and the optical centering of transport glyphs. Pen/Eraser SVG stroke weight is 1.75 instead of 2 within the same 17 px box; paths and targets are unchanged. Do not apply this stroke rule to identity icons or Canvas plots.

Curve name readouts use a slightly brighter neutral; Engine reference values and the local-processing note use the secondary neutral. Points, musical values, safety, output time, warnings and errors retain their content and role. This revision does not split generated value strings into new DOM nodes, change units or hide readouts.

## State semantics

- Available/off uses the neutral control surface. It is distinct from unavailable.
- Active parameter, enabled effect, current edit selection and clipping retain their existing module colors and state logic. In Timbre/Spectral, enabled and currently edited are different states; several effects may be enabled simultaneously.
- Disabled styles, hover feedback, focus visibility and warning colors remain observable. Focus extends to native selectors with the same outside ring.
- No active text underline is introduced. The approved subtle lower-edge treatment remains.
- File/help panels use the common neutral surface, existing dimensions/placement and readable type. Error/progress notices keep their own semantics.

## Canvas and functional colors

The common decorative grid retains 32 CSS px minor spacing, 128 px major spacing, 1 px strokes and the existing caller opacity. Major grid RGBA remains `(139,149,162,.18)`; minor alpha changes `.08 -> .065`. Only relative visual emphasis changes. Axis width remains 64 px. Frequency axes retain logarithmic mapping, semantic frequency marks and measured label spacing.

Curve coordinates, value interpolation, curve/point shapes, pointer mapping, waveform raster/color analysis, time positions and snapping behavior do not change. Source-tone colors, parameter hues, speaker/source markers, progress/remaining-track colors, meter gradients and clipping thresholds remain module-owned. Space's outer spatial-panel edge and header labels use the common neutral roles; spatial geometry and canvas markers remain intact.

## Web and Standalone boundary

The role names, hierarchy, state distinctions and verification criteria are portable product assets. A native implementation should map them to AppKit/SwiftUI color and text roles and validate the result under macOS appearance/accessibility settings. CSS pixels are web reference measurements, not an automatic native point-size specification. Native hover, keyboard focus, menu and selector behavior should follow platform conventions while preserving the product meaning.

Web v1 uses opaque surfaces and an existing, smaller transient-panel shadow. No backdrop blur, animation loop, external font, rasterized labels, dependency or new processing is added. Future native materials are limited candidates for navigation/transient surfaces and require measured readability and rendering cost. Keep waveform/curve content backgrounds stable.

## Verification and change control

Compare the same live DOM with the presentation stylesheet enabled/disabled at desktop and narrow sizes. Check geometry and font metrics, active/disabled state colors, overflow, long values, expanded parameters, help/focus, source input and curve editing. Actual 125%/150% browser zoom is separate from CSS viewport testing. Silent UI/playback simulation does not establish listening quality.

Verify shared asset parity across all six repositories and inspect the exact commit paths. Do not include unrelated DSP/listening work. Updates should revise the role manifest and this contract together; unexplained local variants are not permitted. Public deployment requires the corresponding user instruction and separate release evidence.

## Design references

These are design references, not Apple-derived exact hex values or a claim of native equivalence.

- [Apple Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode): appearance-aware colors and readable foreground/background contrast.
- [Apple design system](https://developer.apple.com/videos/play/wwdc2025/356/): hierarchy, related controls and consistent component anatomy.
- [Logic Pro](https://www.apple.com/logic-pro/) and [Final Cut Pro](https://www.apple.com/final-cut-pro/): official reference screens for restrained surroundings and content emphasis.
- [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials): platform-specific materials and hierarchy.
- [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html): preserve required control/state indicators.

Visual approval, browser UI verification, audio measurement, listening acceptance and native readiness are separate decisions.

Verification of this revision: [Graphite interface verification](INTERFACE_GRAPHITE_VERIFICATION.md).
