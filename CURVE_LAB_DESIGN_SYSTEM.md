# Curve Lab Design System: Audio Curve Lab

## Current local pilot (2026-10-15)
The Audio-only Studio UI pilot overrides the historical blue-surface tokens below.
See [STUDIO_UI_PILOT.md](docs/STUDIO_UI_PILOT.md) and `src/studio-theme.css`.
It is awaiting visual review, not yet a family-wide frozen standard.
Layout, hit targets and DSP remain unchanged.

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

## Linked waveform display (2026-10-13)
Top editable source and bottom actual output use equal 128px canvases, equal L/R lane heights and one linked peak-based display gain. Original source peak anchors the scale so fades remain visible. No audio normalization. At desktop widths the curve canvas flexes between both waveforms; below 900px controls wrap and scrolling preserves usable targets. Fade handles sit below the title row.


## Source cursor and zoom (2026-10-13, PROJECT-SPECIFIC)

Magnifier buttons and Fit sit beside Undo; a compact horizontal range slider moves the source viewport. Cursor time uses tabular milliseconds. Waveform amplitude scale and lane height do not change with time zoom.

Source view: solid white 1.5px playback head and dashed blue 1px edit cursor. Draw both above selection/fade shading; hide out-of-view lines rather than pinning them to a false edge.

During playback, hide the dashed source edit cursor; retain its stored position and restore it when stopped (if within the visible viewport). The solid source playback head remains visible. No selection or audio changes.

2026-10-13 visual revision: the source edit-position cursor now uses the same white solid 1.5px line as the playback head, replacing the blue dashed style. It remains hidden during playback; stored position and selection semantics are unchanged.

Current layout: one source waveform with a34px output-time strip underneath; no lower Final Output waveform. Flat blue progress fill represents time, not energy or amplitude. Curve canvas uses the reclaimed height.


## Bottom transport and pause/resume (2026-10-13)
PROJECT-SPECIFIC. Inspired by Granular's grouped transport: Return to start, Play, Pause, output-position bar, elapsed/total time and stereo meter.
The upper waveform remains the source editing surface. Output seeking retains
pointer and keyboard control, with its own responsive canvas width.
Pause (the existing stopButton ID) retains output/source time; Play resumes.
Space toggles Play/Pause. Return to start seeks to zero without changing whether
playback is active. It cancels pending initial Play when initialization is unfinished.
Internal forced stops for source edits/import/render still reset as required.
Worklet stop acknowledgments carry actual output/source seconds and playback tokens
reject stale acknowledgments. Resume restarts grains/smoothing via the existing
Play/seek path; this does not promise sample-identical continuous playback.


### Transport icon presentation
The bottom controls use compact monochrome geometric icons in the order Return to start,
Play, Pause, with spacing after the navigation control. All three icons share
the same neutral color; active playback uses a neutral background. Tooltips and accessible names retain the action meaning.
Reference: https://www.ocenaudio.com/en/features (official toolbar screenshots);
this adapts the compact icon-led grouping, not an exact copy of its full toolbar.
Pause/resume and return-to-start semantics remain unchanged.


### Full-source overview navigator
PROJECT-SPECIFIC. The source navigation track aligns with the waveform time-axis
width and represents 100% of the working source. An outlined viewport represents
the displayed fraction (2x = 50%, 4x = 25%). No separate navigation-anchor dot is shown.
Click/drag centers the viewport around that source position, clamped at boundaries.
Navigation changes the view only, preserving selection, playback start and PCM.
Arrow keys move 5% of source length (Shift: 1%); Home/End navigate to boundaries.
Zoom centers on the selected range midpoint when a selection exists, otherwise
the edit cursor. Near source boundaries the viewport is clamped to avoid empty space.
Transport order is Return to start, Play, Pause, with neutral same-color icons.


### Transport icon vertical alignment
Center transport pseudo-element geometry absolutely at 50% / 50% of its button.
Hidden text must not create an extra grid row that shifts the visible icon upward.
Preserve the common 16px icon and 32px button height, colors and hit areas.


### Bottom transport readability
The output track is 6px high, centered at y=17 within its unchanged 34px
pointer target; the white current-position marker is 3x14px on that same center.
Stereo meter tracks are 9px high with 11px channel/value labels.
Seeking, time mapping and meter analysis are unchanged.


### Continuous output meter
Remove visible OUT and numeric peak readouts; retain L/R and latched CLIP reset.
Dark fixed color zones brighten up to the measured level: green below -12 dBFS,
yellow from -12 to -3 dBFS, red from -3 to 0 dBFS, on the existing -60..0 scale.
These are display choices, not processing thresholds. Clip full-width gradients
instead of scaling them, so colors remain tied to dBFS. White peak hold and existing
meter ballistics remain; CLIP retains the existing sampled-peak threshold 0.999
(not a true-peak detector). Per-channel accessible labels retain numeric values.


### Continuous meter refinement
Use 8px continuous tracks without segment dividers or an outer border.
A fixed full-width gradient moves from green through lime/yellow to orange/red;
the measured level clips this field rather than stretching its color positions.
Dim background follows the same gradient. Peak hold is a 1px pale line.
Meter processing, -60..0 dBFS mapping and latched CLIP behavior are unchanged.


## 2026-10-14 — Common Clear Current / Reset All appearance
Both actions follow Audio's neutral navy reference: background #122438, text #aabccc, 6px radius, 13px/620 type, 92px minimum width, 38px height (30px at >=900px viewport width). Clear border #3b5063; Reset border #203a52. Shared hover/pressed/focus/disabled styles live in src/curve-actions.css. Red action emphasis is removed; brand/parameter colors elsewhere stay independent. Existing IDs, handlers, reset scope, confirmation mechanism and keyboard behavior remain unchanged. This is a local visual update, separate from DSP verification.


## 2026-10-14 — File guidance disclosure (local pilot)

Audio-only information-button pilot: compact outlined info disclosure beside Open Audio, dark panel with Input/AIFF/File size/Output rows. Narrow screens use a viewport-contained scrollable panel. Local browser processing. No upload. stays visible.

Pilot refinement: information control is now left of Open Audio, with a 28 px circular outline and a distinct dotted i glyph (no nested circle). Help behavior remains unchanged.


## 2026-10-14 — Family file information

Approved circular dotted-i disclosure immediately left of Open Audio. Default format guidance moves into this optional panel; privacy and actual error/status notices remain. Space operates disclosure without audio transport; Escape/outside click dismiss. Output guidance: Up to 5 min · Stereo · 48 kHz / 24-bit WAV. Input limits reflect current implementation, not a device-memory guarantee. No DSP, admission, export, IDs or defaults changed.


## 2026-10-14 — Parameter help pilot

Parameter help pilot: compact dark 300px maximum panel, 12px type, 8px radius, viewport-clamped position under its trigger (above when needed). Avoid a persistent range legend; preserve functional color and numeric feedback.


## 2026-10-14 — Family parameter help

Static parameter descriptions are available on the relevant buttons using the Audio help design; current values, axes and activation feedback remain visible. See `docs/PARAMETER_HELP.md` (or `PARAMETER_HELP.md` in this directory). No DSP or curve mapping changes.


## 2026-10-14 — Open Audio keyboard access
파일 입력을 display:none 대신 시각적으로만 숨겨 Tab과 Enter/Space로 기본 파일 선택기에 접근하도록 수정. 포커스는 기존 fileButton:focus-within 윤곽선으로 표시한다. 파일 디코딩·처리 계약은 변경하지 않는다.


## Studio pilot 0.2 — legibility and state distinction (2026-10-15)
PROJECT-SPECIFIC / local review, Audio only.
- Selected parameter uses colored fill plus a 2px inset underline; active tool
  gets an inset underline. Focus remains an independent outside ring.
- Parameter buttons expose aria-pressed, including initial state.
- Fixed legacy action/transport hover specificity so blue/red hover styles do
  not return. Disabled controls use explicit readable neutral colors rather
  than whole-element opacity.
- Token-pair contrast calculations: button 7.56:1, secondary 8.10:1,
  muted 6.04:1, selected Speed/Pitch/Pan 8.76/7.35/7.19:1.
  Disabled text 3.76:1. These are targeted checks, not a full WCAG audit.
- Browser observed: all parameter selection states, zoom/fit, fade keyboard
  edit and Undo, Play/time/meter update, Pause, reset confirmation.
- PASS: four required syntax checks; transform-parity, source-editor-lifecycle,
  output-edit, transport-keyboard.test, pause-resume, reset-focus,
  waveform-overview. No listening or full browser file import/export repeated.
- Layout, hit targets, parameters and DSP unchanged. No commit/deployment.


## Studio pilot 0.3 — cool-grey console / dark editor
User-provided ocenaudio and TotalMix screenshots are the visual references.
The previous near-black surfaces were too similar in luminance. Raise chrome
and controls, preserving a dark recessed plotting surface.
- Header #383B43 with a restrained static #41444E top tone.
- Tool/transport panels #353941, readout #30353D; editor #191C20.
- Buttons #4E5560 to #444A54; primary control text #E0E6ED.
- Audio Blue and existing parameter identities retained. Selected fills are
  brighter, retaining underline and independent keyboard focus.
- No blur, animation, images, layout or processing changes in this revision.
- This supersedes 0.1/0.2 surface tokens and their contrast figures; those
  remain historical evidence, not current certification.
- Actual browser screenshot verified after reload. Commit/deploy pending.


## Studio pilot 0.4 — meter separation
Audio only; local review pending. Neutral #161D25 meter wells replace the dim
green/yellow/red background. Only the clipped measured signal is colored,
using smooth green/lime/yellow/orange/red stops; the field remains fixed to
the full-width dBFS axis. No level mapping, smoothing, peak hold, clip latch,
DSP, dimensions or interaction changed. Neutral CLIP label is more readable;
the existing clipped alarm rule is preserved.

Current sampled opaque foreground/background contrast pairs:
- button: 5.98:1
- hover: 4.98:1
- muted readout: 6.48:1
- Speed selected: 7.55:1
- Pitch selected: 7.11:1
- Pan selected: 7.11:1

These token checks are not whole-interface accessibility certification.
Browser: Speed/Pitch/Pan selection and active playback/meter/time inspected.
Default sample reaches the green/lime portion; full-scale yellow/red rendering
has not been visually exercised with a high-level file in this revision.
PASS: meter-display, transform-parity, source-editor-lifecycle, output-edit,
transport-keyboard.test, pause-resume, reset-focus. Full import/save and listening
not repeated for this CSS-only change.


## Studio pilot 0.5 — restored meter / visible remaining timeline
Audio-only, local candidate. User prefers the original continuous meter palette.
Removed 0.4 palette/background overrides; original dim colored background and
signal gradient restored. Added a 1px #788492 outer shadow outline without
changing meter dimensions. Remaining timeline rail raised to #8290A1 against
#353941 transport panel; blue progress and white cursor remain unchanged.

Browser evidence: imported synthetic 20s stepped PCM and 4s hot float WAV.
Timeline End/ArrowLeft seeking and playback worked. Observed output peaks
-2.7 dBFS and -1.2 dBFS; screenshots show continuous yellow/orange/red approach,
no segmented gaps. These are display checks, not listening approval or a
full-scale clipping test. Hot input did not show the clip alarm in this test.
Playback paused after each test. Default sample restored afterward.
PASS: four required JS syntax checks, meter-display, transform-parity,
source-editor-lifecycle, output-edit, transport-keyboard.test, pause-resume,
reset-focus, and git diff --check. No DSP, limits or hit-target changes.


## Studio pilot 0.6 — continuous workspace
Audio-only local candidate. Replace separate rounded panel cards with full-width
bands sharing one shell. Remove outer editor gaps/padding and footer margins;
retain control sizes, selection/focus cues, meter frame and horizontal functional
separators. Header and parameter toolbar share #3B3F48; readouts/source toolbar
share #343941. Canvas remains dark. Module order and DSP unchanged.
Browser: no horizontal overflow at observed 910px CSS viewport; source zoom/fit,
curve midpoint insertion (2 to 3 points), Clear Current (3 to 2, 8s restored)
confirmed. Screenshot: audio-unified-workspace-20261015.png.
Further narrow-device/zoom review remains separate; not a full regression claim.


## Studio pilot 0.7 — narrow screen recovery
Found: below 900 CSS px, legacy fixed transport obscured the curve editor;
readouts used four tall rows even on medium widths.
Fix: static transport in document flow below 900px; no reserved footer padding;
four readout columns at 640–899px and two below 640px. Hide legacy tagline,
allow source-edit help wrapping. Vertical scroll is intentional on small screens.
No control shrink, parameter/DSP or normalized-coordinate change.

Observed CSS viewports: 800px and 416px (viewport requests are affected by the
host scaling). No horizontal overflow or off-right buttons. Footer begins at
canvas bottom within subpixel rounding, no overlap. Full-page screenshot saved
as evidence/audio-unified-small-20261015.png.
Browser checks: source zoom 2x/Fit, midpoint insertion (2 to 3), Clear Current
(3 to 2), file-help panel within viewport at 800px.
Cmd-plus did not change innerWidth/DPR in IAB: actual 125%/150% browser zoom
is NOT verified. Do not equate viewport resizing with zoom certification.
PASS existing tests: transform-parity, source-editor-lifecycle, waveform-overview,
transport-keyboard.test, pause-resume, reset-focus, meter-display.
Audio-only local pilot; no commit/deploy. Listening remains separate.


## Studio pilot 0.8 — text contrast and actual browser zoom
Audio only. Header bottom border is transparent, joining title and parameter
toolbar. Header/toolbar #353A44; main text #F0F3F7; secondary #D5DCE5;
muted #C3CDD9. Neutral buttons use darker #444C58 to #39414C surfaces,
retaining selected parameter colors and independent focus cues.
User comfort remains subjective; do not declare fatigue solved by numeric contrast.

Actual Brave zoom verified using native browser menu/zoom UI:
- Original 100%; 125% confirmed by browser accessibility label, DPR 2.5,
  viewport 1016x986 CSS pixels, no horizontal overflow.
- 150% confirmed by label, DPR 3, viewport 846x822; no horizontal overflow
  or footer overlap. Source zoom/Fit and point insertion/Clear verified at 150%.
- 100% restored afterward. This closes the prior IAB-only zoom evidence gap
  for this Mac/Brave environment, not all browsers/Windows.
Screenshot audio-brave-150-20261015.png uses native capture because extension
screenshots at non-100% were cropped. 125% viewport measurements remain valid.

PASS four required syntax checks, git diff --check, and ten existing test suites:
transform-parity, source-editor-lifecycle, output-edit, waveform-overview,
transport-keyboard.test, pause-resume, reset-focus, meter-display,
wav-encoder, export-recovery.
UI scope is ready for a consolidated commit/release after user review;
no commit/push/deployment performed in this request. Listening, visual comfort
and wider platform verification remain separate.


## Studio pilot 0.9 — deeper text-bearing surfaces
User requests darker background behind text. Continuous shell/header/toolbar/
transport now #292F38; readout/source toolbar #252C35; curve label #222A34;
neutral buttons #363F4B to #2D3540; help/dialog #252E39. Preserve text,
selected parameter fills, focus cues, plot background, meter and geometry.
CSS-only visual adjustment, local review; no commit or deployment.

## Common button states — 2026-10-15

`src/button-states.css` is the identical six-Lab contract, loaded after studio-theme.
Available off/bypassed: Audio reference gradient #363F4B → #2D3540, text #F0F3F7, edge #626C79. Unavailable: #353B44 / #949EAC / #495360 at full opacity. Selected: preserve existing parameter-specific fill, text and border colors, replace text underline with a full-width dark lower inset bevel (3 px). Focus remains independent. No hit-target, state, DSP or timing changes.

### Common role dimensions — 2026-10-15

- Main text buttons: 13px, weight 500, line-height 18px; 4px corner radius.
- Open/Download/Save: 38px high. Parameter/effect/waveform/synthesis mode/chain/action/dialog buttons: 34px.
- Pen/Eraser: 32px with shared 4px outer group; joined inner edges remain square. Transport: 32px, existing 3px corners and CSS glyphs retained.
- Audio edit helpers: 26px, 11px text; zoom symbols 14px. Fade handles are excluded.
- Secondary status text 12px; readout labels 11px, strong values 14px. Parameter colors and state semantics unchanged.
- Verified all six at 1422px and 640px CSS widths: no document horizontal overflow or measured button text clipping. Representative mode switching passed; Timbre Flanger expanded controls inspected, Audio Pen/Eraser and zoom/Fit exercised. Keyboard regression and diff whitespace checks passed.
- This is CSS-only verification, not fresh audio/export or listening certification. Local changes remain unpublished.

## Current precedence
See `docs/SHARED_VISUAL_CONTRACT.md` for the accepted shared baseline and resolution of older pilot conflicts. Newer role/state rules supersede old underline and 30px compact-button guidance.

## Audio-only information density pilot (unreleased)
Speed/Pitch/Pan share one compact strip. Editing target, point count, engine and source playback position remain available in collapsed Details, in document flow. WAV status moves next to Download WAV. Preserve all bound readout IDs. No sibling adoption until user visual review.

## Functional surfaces candidate
See `docs/FUNCTIONAL_SURFACE_PILOT.md`: role-based neutral luminance within the continuous workspace. Local Audio-only experiment; supersedes identical-background interpretation, not the shared button/state rules.

## Readout disclosure rollback — 2026-10-15
User requested removal of the newly introduced Details disclosures across the family. Original always-visible readout panels restored; Oscillator retains its pre-existing Synthesis detail panel and original contents. Value computation and audio behavior unchanged. Do not add disclosure or restructure information during color/minor-UI work. Audio also removes the border above EDIT AUDIO.

## Shared content rails — 2026-10-15 (local review)
Title/icon, primary controls, values, editor outer edges and transport contents share 20px side insets; <=600px uses 10px. Dark canvas surfaces stop at this rail with neutral #373B43 outer gutters. Internal axis labels/plot margins remain part of the canvas, not the shell rail. Space retains its two-column spatial view; Oscillator retains Synthesis detail without double insets. Colors of controls/transport and all DSP behavior are preserved. Implementation: src/content-alignment.css. No release authorized for this alignment pass.

### Shared transport alignment — 2026-10-15 (uncommitted review)
Return / Play / Pause retain their order and behavior. Each occupies a 38 × 32px cell with 4px spacing and a centered 16px icon. Remove the first button's extra 7px offset/divider so visual spacing is uniform. Audio reference palette: surround #292F37, thin border #596472, hover #343A42, playing #5C6978; no per-button accent colors. Override generic button backgrounds only inside transport. Preserve keyboard focus and disabled states.

Release approval (2026-10-15): user approved the reviewed transport/layout changes. All six transport-keyboard suites passed (27 tests total); Oscillator syntax and diff checks passed. Prior browser measurements confirmed equal transport cells, and Oscillator point add/erase, Clear Current, Play/Pause/rewind and narrow layout were checked.

### Transport surface continuity — 2026-10-15 (uncommitted review)
Transport and surrounding page #373B43, no outer border. Fixed transport docks at bottom:0 (no 12px floating gap); bar padding 8px vertically, minimum 56px. At <=1180px all transport containers return to document flow so wrapped controls/meters do not cover editors. Remaining track uses #8290A1; completed portion retains each Lab accent. Audio's canvas track already uses the same remaining color. Transport button capsule remains #292F37 / #596472. This supersedes older #30343C transport surface and mixed footer breakpoints.

### COMMON CANDIDATE — title and identity geometry (2026-10-15)
Audio is the geometry reference: at 900 CSS px and above, mark 38×38 px, title 23 px/1.1, weight 600, tracking −.025em, mark-to-copy gap 10 px. Below 900 px retain Audio’s compact 40×40 px mark and 22 px title with 12 px gap. Center the mark vertically against the brand copy; retain each Lab’s symbol, palette, subtitle, and status content. This does not prescribe identical header heights when content wraps. Shared implementation: `src/brand-layout.css`.
- Browser layout validation: 1280, 768, 600, and 390 CSS px widths; consistent title/mark/gap measurements, no title clipping or document horizontal overflow. Existing SVG assets and audio/interaction JavaScript unchanged.

### COMMON CANDIDATE — channel selector and current-value rhythm
Header output-channel selectors match adjacent file/export controls at 38px height, 13px type, 4px radius. Other synthesis selects retain their own role dimensions. Current-value strips use 8px vertical padding, 14px label line, 4px label-to-value gap and 18px value line (11px/14px font sizes). Preserve existing column counts, wrapping, labels, units, value sources and horizontal rails. Implementation: `src/readout-layout.css`.

### COMMON CANDIDATE — header information rhythm
Use Audio header vertical padding 9px and section gap 12px. At 900px and above hide the descriptive tagline, as Audio already does; below 900px retain it with 12px/1.35 typography. Always retain file/engine status and the local-processing notice, wrapping as needed. Keep existing horizontal rails and control wrapping. Granular engine readout wraps in its own value row instead of clipping; preserve the full Preview/Render counts and dynamic text.
- Checked at 1280/900/768/390 CSS px: header status retained, no horizontal document overflow; Granular engine text remains complete. Separate pre-existing 900px readout truncations remain for Space Preview (Headphones) and Oscillator Safety; not changed in this header pass.

### COMMON CANDIDATE — time and unit notation
Transport clocks use mm:ss.hh, rounded before splitting minutes/seconds (59.999 s → 01:00.00). File-duration metadata uses seconds to two decimals; integer output-duration controls use s / min, preserving one-second steps. Keep millisecond editing precision and existing DSP-parameter precision. Separate numbers from s, ms, Hz, kHz, cents, st, dB/oct and x; keep percent formatting. Granular density uses grains/s and pitch ranges use an en dash. Spectral stretch retains three decimals with x. Compact axis labels may retain abbreviations where space is limited. Display changes do not alter duration, parameter mapping, interpolation, or audio processing.
- Verified clock rollover at 59.999 and 3599.999 s, zero/negative/non-finite fallback, and 10-minute display. Layout checked at 1280/900/390 CSS px. Audio transform-parity test passed; Granular duration control min/max and Audio transport smoke checked. Listening and cross-browser export are not revalidated by this display-only pass.

Audio source/edit waveform, edit toolbar and navigator backdrop now use #191C20, matching the curve canvas. Waveform/selection/fade drawing and contrast are retained.

### COMMON CANDIDATE — compact current-value spacing (2026-10-15, approved)
Below 900 CSS px, current-value strip vertical padding 8→6px, row gap 12→8px, label/value gap 4→2px. Retain label 11px/14px and value 14px/18px typography, existing column counts, wrapping exceptions and all semantic values. No fields hidden, no Details controls introduced. Desktop spacing unchanged.

### COMMON CANDIDATE — inline processing notices
Import/export notices follow the shared content inset (20px desktop, 10px at <=600px), with 13px text and 1.45 line-height. Preserve wrapping, alert semantics, message text, and empty-state hiding. Error feedback must align with the same rails as normal controls; do not create a new panel or change audio/file behavior.


## Audio typography pilot — 2026-10-15
COMMON CANDIDATE, local review only. Implements the CSS-text stage of the family typography contract in src/typography.css.
Preserve title23/600, main controls13/500, readout labels11/400 and values14/500.
Use12px regular edit instructions,11px/600 section labels,13px/600 transport time (previous680),10px/600 CLIP and channel labels.
File/parameter actions use12px horizontal padding; editing helpers8px; parameter group gap8px. Keep existing heights, color semantics, focus, CSS transport icons and fade handles.
Canvas-rendered text remains a separate follow-up: do not claim full Canvas token migration. No JavaScript, DSP, source/export or interaction changes.

Validation: actual CSS1280x800,900x600,390x640 no horizontal overflow/button clipping. Native Brave125%(DPR2.5,1189x609) and150%(DPR3,990x508) no button clipping or curve/transport overlap;100% restored. Narrow screens retain natural vertical scrolling.
Browser Pitch/Speed, source zoom/Fit, Play/Pause/rewind, point add(2→3) and Clear Current(3→2) passed; error log empty. This is control-state/visual proof, not comparison listening or a new WAV regression.
Native confirmation keyboard and comparative listening remain deferred. No commit/deployment.


## Canvas typography pilot — 2026-10-15
COMMON CANDIDATE. src/canvas-typography.js provides display-only role fonts: axis/time ticks11/400, emphasized tick11/500, section11/600, instruction12/400, point tooltip12/500, channel10/600. Font stack matches the system sans-serif family.
Waveform time divisions are capped by measured endpoint-label width plus16px clearance; waveform, normalized curves, timing, hit regions and sample summaries are unchanged. The existing optional inline instruction is shown only when its measured width fits; equivalent persistent toolbar/accessible instruction remains. Tooltip box retains26px height and8px horizontal padding.
Validation: required four syntax checks and transform parity passed;390 CSS px Pitch points/ticks visibly fit, actual Brave125%(1189x609,DPR2.5) and150%(990x508,DPR3) checked;100% restored. Point addition/Clear Current, all three mode selection, source zoom/Fit, playback/pause/rewind observed; console errors none. Drag attempt created another point rather than proving point relocation, so relocation is not counted as a new test pass. No interaction code changed.
Evidence: shared QA evidence/audio-canvas-type-390.png, audio-canvas-type-150.png, audio-canvas-type-pilot.png. Canvas screenshots are visual evidence, not pixel-level font metric certification or comparison listening.
Local review only; earlier CSS pilot remains uncommitted. Native dialog keyboard and comparative listening deferred.


## Restrained type and control treatment — Audio local candidate
2026-10-15: supersedes the earlier Audio pilot's weight choices only. Keep type sizes and text colors; ordinary buttons/current values400, section labels500, transport time500. Use title/sentence case for readout labels and Edit Audio / Curves / Output Time, including waveform heading/instruction. Short technical abbreviations L/R/CLIP remain.
Remove decorative button highlights; active parameter lower bevel3px→1px. Preserve parameter colors, disabled styling, hover edge and focus rules. Explicit ID-bearing role group is necessary to override the legacy high-specificity !important state selector; computed-style confirmed inactive shadow none / active1px.
390px no horizontal overflow; selection/help and playback/pause/rewind checked; console errors none. Required JS syntax and transform parity passed. This refinement did not repeat native125/150% checks from preceding canvas pilot. Audio-only, no commit or deployment; native confirmation keyboard and comparison listening remain deferred.

## Source tone waveform pilot — 2026-10-15 (PROJECT-SPECIFIC, review pending)
- Audio source editing waveform only. Color encodes an approximate per-channel magnitude spectral centroid of the current editable source before Speed/Pitch/Pan; it is not pitch, clipping, output analysis, or an audio effect. Source deletion/fades/Undo trigger a refreshed estimate. The original file is unchanged.
- Palette: blue (lower centroid) → teal → gold → peach (higher centroid). Log mapping150–8000Hz, clamped; neutral gray-blue for negligible spectral magnitude. These are provisional visual parameters, not musical thresholds or a Freesound palette reproduction. Header legend and Edit Audio title explain source scope.
- Signed min/max envelope retains peaks and asymmetry, with16000 overview bins and physical-pixel polygon drawing. No cosmetic waveform smoothing that hides transients. Zoom resummarizes the visible source at device-pixel-aware resolution.
- Analysis: bounded1024 windows×1024samples per channel, at most2channels/8MiB copied to a dedicated worker. Long files are sampled, not exhaustively analyzed; short events between windows may be missed. Thus colors are a broad timbre guide, not a spectral measurement tool. Worker failure falls back to the existing blue display. New source/edit terminates the previous worker; stale results are ignored.
- Static waveform raster is cached across playback/selection redraws. Cache invalidates for buffer/viewport/device-pixel ratio/visual gain/colors changes. No added dependency or audio engine change.
- Verification: centroid tones187.5/1500/6000Hz and silence, source immutability, signed transient envelope; required transform parity and source editor/output edit suites pass. Browser sample import, selection deletion, Undo, fade handles via keyboard, zoom/Fit, Play/Pause, WAV download pass. Saved WAV:10s/48k/24bit/stereo. No observed console error. No listening approval.
- Current Mac browser display benchmark, synthetic300s stereo: summary19.4ms, bounded window copy1.6ms, worker elapsed57.6ms, raster4.5ms;5 animation frames during analysis, max gap16.7ms. Canvas copy timings measure command submission, not completed GPU work. Not a low-spec or long-session guarantee.
- Small viewport forcing did not affect the target tab in this session (actual1092×1318); do not claim390px verification. Small-screen/actual zoom review remains pending.
- No commit/deployment/freeze. DSP remains Curve Lab DSP; this pilot only reads source samples for visualization.

## Canvas grid contract — 2026-10-18 (local review)
- General decorative grid: 32 CSS px minor, 128 CSS px major, 1 px strokes; density independent of canvas aspect ratio. No snap or change to normalized musical coordinates.
- Semantic value ticks remain parameter-specific; frequency axes preserve existing logarithmic mapping, use shared 1/2/5-per-decade candidates plus endpoints, Hz/kHz units and 24 px minimum label separation.
- Source envelope waits for asynchronous source-color data; no initial legacy blue waveform. On worker failure, neutral gray source shape remains available. No audio samples or processing modified.
- Oscillator partial monitor is retained in source but hidden in the web UI; curve editor reuses freed height.
- Browser verification pending; no commit/deployment or listening approval implied.
- Tick text: 11 px regular, emphasized ticks 11 px medium; point/hover text: 12 px medium. Absolute frequency axes share labels; frequency offsets (e.g. Spectral Shift) retain their signed linear meaning.
- Verified locally: grid/log-label/worker-error tests, source-color tests, keyboard tests, JS syntax; browser initial load and Play/Pause (Granular with 8-second WAV). Independent app tabs reported no console errors. 600 px iframe inspection: all six document widths match their viewport (583 px after scrollbar), minimum curve height about 220 px and transport retained through vertical scrolling. This is not a new native browser zoom or listening certification.

- Release check 2026-10-18: native Brave 125% and 150% reviewed across the family; curve point add/move/Command-delete verified in every Lab. Small viewport checks retained separately. Canvas-grid, source-colors, transport-keyboard and syntax checks passed. Listening/DSP and native confirmation-dialog checks remain separate.

## Shared axis gutter — 2026-10-18
- Curve and source waveform plot starts use canvasAxisWidth = 64 CSS px. Audio fade handle/navigator and source pointer conversion share the same gutter. Normalized curve points, timing and DSP remain unchanged. Absolute frequency axes retain their logarithmic scale.

Verification: 600px layout and actual Brave 125%/150% checked. Pointer add/move/modifier-delete checked across all six labs; Audio source edit lifecycle passed. Oscillator imported 8-second WAV overview aligns with the curve axis. This is UI evidence, not DSP/listening certification.

## Audio quiet UI trial — 2026-10-23
PROJECT-SPECIFIC, uncommitted review candidate. Layout, dimensions, labels, hit targets, selected parameter colors and curve data remain unchanged. Resting command buttons use a flat #303740 surface and #48515c edge; hover/focus remain explicit. Secondary labels use #adb6c2 / #aab4c0, while current values remain unchanged. Background grid opacity is multiplied by 0.65 within a saved canvas state; axes, labels, points, waveform and playhead stay unchanged. No DSP changes. This does not replace the frozen family baseline until reviewed.
