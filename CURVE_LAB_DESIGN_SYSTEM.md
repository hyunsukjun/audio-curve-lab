# Curve Lab Design System: Audio Curve Lab

## Identity And Hierarchy

Audio Curve Lab uses brand Blue `#459BFF`. Brand color identifies the product through
the top-left icon, the words `Curve Lab`, and restrained focus/accent details. It does
not replace parameter colors or fill the workspace.

The visual priority is:

1. Curve and waveform workspace
2. Active parameter and editing tool
3. Playback, monitoring, and export
4. Status/readouts
5. Decorative atmosphere

## Portable Tokens

### Color

| Role | Web token | Value |
| --- | --- | --- |
| Deep background | `--cl-bg-deep` | `#050B12` |
| Background | `--cl-bg` | `#07111C` |
| Surface | `--cl-surface` | `#0D1B29` |
| Raised surface | `--cl-surface-raised` | `#122438` |
| Hover surface | `--cl-surface-hover` | `#182F46` |
| Active surface | `--cl-surface-active` | `#1B3751` |
| Border | `--cl-border` | `#203A52` |
| Strong border | `--cl-border-strong` | `#345672` |
| Primary text | `--cl-text` | `#E8F0F6` |
| Secondary text | `--cl-text-secondary` | `#AABCCC` |
| Muted text | `--cl-text-muted` | `#71889B` |
| Audio brand | `--cl-accent` | `#459BFF` |
| Focus | `--cl-focus` | `#8FBFFF` |
| Speed parameter | `--cl-speed` | `#6DE0C0` |
| Pitch parameter | `--cl-pitch` | `#EB6F75` |
| Pan parameter | `--cl-pan` | `#B887F4` |
| Destructive action | `--cl-danger` | `#E35D80` |
| Meter safe range | `--cl-meter-green` | `#20D45B` |
| Meter caution | `--cl-meter-yellow` | `#F2D31B` |
| Meter high | `--cl-meter-orange` | `#F28C18` |
| Meter near full scale | `--cl-meter-red` | `#E44747` |
| Meter Hold | `--cl-meter-hold` | `#F4F7F9` |

Brand and parameter colors are separate semantic systems. Do not recolor Speed, Pitch,
or Pan blue merely to match the product identity.

### Geometry And Spacing

- Spacing scale: 4, 8, 12, 16, 24, 32 px.
- Control height: 38 px.
- Toolbar minimum height: 54 px.
- Radius: 4 px small, 6 px medium, 8 px large.
- Borders are generally 1 px with a stronger border for focus/selection.
- Typography uses the operating-system sans-serif stack; no external font is required.
- Laptop text hierarchy: 13 px commands and status values, 11-12 px metadata,
  and 16 px output time. Status labels share a baseline with one another.
- Letter spacing remains neutral.

These values are current web measurements. Their hierarchy and proportions are the
portable design knowledge.

## Layout Language

- Top header: brand left; file input and export control right.
- Common toolbar: parameter modes, Pen/Eraser, semantic legend, destructive actions.
- Thin status strip: current curve, point count, engine, parameter values, source
  read time, and WAV state.
- Upper waveform: original source overview with a signed-Speed read cursor, no seek
  gesture. Middle Canvas: parameter curves and output-time cursor. Lower waveform:
  Speed-mapped preview and click/drag output-time seek target. Blue indicates forward
  source travel, red reverse, and neutral gray the turn through zero; these colors
  belong to the preview only, not to Speed/Pitch/Pan parameter identity.
- Label the upper axis as source time and the middle/lower axes as output time.
  The upper read cursor is a line without a handle; the lower seek cursor retains
  paired 10px inward-facing triangle handles and a bright blue vertical line.
  A dashed hover guide matches the current cursor's 1.5px width and brightness,
  previewing the destination without a time label;
  hide it during dragging and when the pointer leaves. Keep the lower click/drag hint prominent, and identify
  its Speed-based approximation in hover help and accessible text rather than
  implying that the visible waveform is a rendered WAV.
- The input waveform has one labeled lane for mono and separate L/R lanes for stereo;
  displaying stereo as one mono-looking lane misrepresents the loaded source.
- Bottom Transport: Play/Stop, one authoritative current-time/duration display,
  and compact final-output meter. Keep it visible on laptop-height viewports and
  reserve scroll space so it cannot hide the end of the editor.
- The Canvas stays visually dominant and is never placed inside decorative nested cards.

## Playback And Meter Visibility

- Transport and current time take priority over the meter and secondary
  labels when space becomes limited.
- Stereo uses two compact L/R rows. Additional future channels require an expandable
  design rather than making the default footer dominate the Canvas.
- On desktop layouts, the stereo meter receives roughly one third of the viewport width
  so level changes remain readable. Narrow layouts move it to a full-width row.
- RMS is the quieter body, Peak is the brighter extent, and Peak Hold is a thin marker.
- Meter color follows the conventional level hierarchy: green safe range, yellow
  caution, orange high level, and red near full scale. Color positions stay fixed to
  the dB scale rather than stretching to fit the current value.
- The idle meter track is uniformly dark. Threshold colors appear only inside the
  active RMS/Peak fill, never as a colored background guide.
- CLIP remains subdued until latched and resets independently when clicked.
- Meter movement changes only painted width/position; it must not resize the layout.

## Curve Editor Visibility

- Active curve line width: 4.8 px, opacity 1.
- Inactive edited curve line width: 2.1 px, opacity 1.
- Active point radius: 6 px; point stroke: 2 px.
- Active curve only shows points.
- Curves use round caps and joins.
- Selection is primarily communicated by line thickness and matching parameter-border
  color, not blur or low opacity.
- Parameter scale and grid remain quieter than the curves.
- Matching solid cursors in the waveform and editor identify output-time progress
  in every parameter mode. Source read time is a separate status value because it
  can move backward or pause while output time moves forward.

## Controls And States

- Active parameter borders use that parameter's color and a darker related background.
- Pen/Eraser forms a compact two-state icon control; cursor and pressed state agree.
- Hover raises surface contrast without changing geometry.
- `focus-visible` uses a clear focus ring.
- Disabled controls remain legible but noninteractive.
- Reset All is visibly destructive but not alarmist; confirmation uses Cancel and
  Reset All actions.
- Tooltips describe icon function and modifier shortcut.

## Motion

The Web skin uses solid Deep Navy/Charcoal surfaces rather than animated blurred
background layers. It has no decorative animation or button color transition; the
Curve, waveform, playhead, and level meter remain the visual motion that conveys
musical state. Keep their shape, position, and semantic colors independent of future
skin changes. A future animation must have a measured benefit, a low-cost fallback,
and reduced-motion support before being added.

This lightweight skin is a `COMMON CANDIDATE` for sibling Curve Labs, not permission
to change their layout, editor geometry, DSP, or project-specific brand color.

## Responsive And High-DPI Rules

- Current layout breakpoints: 1180 px, 860 px, and a 520 px label-simplification step.
- Header and toolbar may wrap; controls must not overlap or truncate key commands.
- Canvas uses a high-DPI backing store based on device pixel ratio.
- Canvas musical coordinates remain normalized and independent of CSS size.
- All three views fit the available width without following the playhead. The middle
  curve and lower preview share output-time x; the upper original has a separate
  source-time x. Only the display scale changes; normalized curve data does not.
- On short viewports, reduce the Canvas display height while keeping normalized
  point values unchanged; the transport stays in view. Align status labels and
  values to consistent baselines, and keep metadata legible without changing the
  established visual hierarchy.
- Validate the scale gutter and pointer mapping after any layout change.

## Platform-Independent Requirements

A native implementation may use different widgets and measurements, but must preserve:

- the deep navy/charcoal working environment;
- Blue product identity and distinct parameter colors;
- Canvas-first visual hierarchy;
- explicit active parameter/tool state;
- high contrast without decorative overload;
- accessible focus, hover, disabled, and reduced-motion behavior;
- stable geometry that does not modify musical curve data.

## Hub v0.10 Identity Pilot (2026-10-04)

`PROJECT-SPECIFIC` pilot using a `COMMON CANDIDATE` palette from CURVE LAB HUB for macOS.
The palette is pinned in `assets/identity/palette.json` and loaded through
`assets/identity/tokens.css`; `--cl-accent` aliases `--curve-lab-audio`.
Header symbol and favicon are byte-for-byte Hub v0.10 Audio symbol/micro SVGs.
The app SVG is retained as a future `STANDALONE ASSET`, not installed as a native icon.
Focus #8FBFFF and hover #6AAFFF are Audio web derivatives, not new suite brand colors.
Semantic parameter, meter and waveform colors remain unchanged. Background and
workspace geometry retain the existing web design. See `docs/IDENTITY_PILOT.md`.
