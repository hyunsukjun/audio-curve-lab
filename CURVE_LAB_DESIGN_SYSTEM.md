# Curve Lab Design System: Audio Curve Lab

## Identity And Hierarchy

Audio Curve Lab uses brand Blue `#4DA7E8`. Brand color identifies the product through
the top-left icon, the words `Curve Lab`, and restrained focus/accent details. It does
not replace parameter colors or fill the workspace.

The visual priority is:

1. Curve and waveform workspace
2. Active parameter and editing tool
3. Transport and export
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
| Audio brand | `--cl-accent` | `#4DA7E8` |
| Focus | `--cl-focus` | `#7CC8F5` |
| Speed parameter | `--cl-speed` | `#6DE0C0` |
| Pitch parameter | `--cl-pitch` | `#EB6F75` |
| Pan parameter | `--cl-pan` | `#B887F4` |
| Destructive action | `--cl-danger` | `#E35D80` |

Brand and parameter colors are separate semantic systems. Do not recolor Speed, Pitch,
or Pan blue merely to match the product identity.

### Geometry And Spacing

- Spacing scale: 4, 8, 12, 16, 24, 32 px.
- Control height: 38 px.
- Toolbar minimum height: 54 px.
- Radius: 4 px small, 6 px medium, 8 px large.
- Borders are generally 1 px with a stronger border for focus/selection.
- Typography uses the operating-system sans-serif stack; no external font is required.
- Letter spacing remains neutral.

These values are current web measurements. Their hierarchy and proportions are the
portable design knowledge.

## Layout Language

- Common top header: brand left, time centered, transport right.
- Common toolbar: parameter modes, Pen/Eraser, semantic legend, destructive actions.
- Thin status strip: current curve, point count, engine, playhead, parameter values,
  and WAV state.
- Dark Canvas workspace: major/minor grid, muted blue-gray waveform, parameter curves,
  points, tooltip, and playhead.
- The Canvas stays visually dominant and is never placed inside decorative nested cards.

## Curve Editor Visibility

- Active curve line width: 4.8 px, opacity 1.
- Inactive edited curve line width: 2.1 px, opacity 1.
- Active point radius: 6 px; point stroke: 2 px.
- Active curve only shows points.
- Curves use round caps and joins.
- Selection is primarily communicated by line thickness and matching parameter-border
  color, not blur or low opacity.
- Parameter scale and grid remain quieter than the curves.

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

Ambient background motion may be slow and low-opacity (current cycles: approximately
96 s and 118 s). It must ignore pointer input and never reduce curve visibility.
`prefers-reduced-motion` disables ambient animation and nonessential transitions.

## Responsive And High-DPI Rules

- Current layout breakpoints: 1180 px and 860 px.
- Header and toolbar may wrap; controls must not overlap or truncate key commands.
- Canvas uses a high-DPI backing store based on device pixel ratio.
- Canvas musical coordinates remain normalized and independent of CSS size.
- Current product behavior uses a minimum Canvas width of 1800 px and clips the right
  portion in narrow windows rather than rescaling curve data.
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

