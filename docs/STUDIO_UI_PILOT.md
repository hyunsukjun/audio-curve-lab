# Studio UI pilot 0.1 — Audio Curve Lab
Date: 2026-10-15
Status: local visual candidate; user review pending. Not a release or sonic approval.

## Purpose
Build a restrained professional workspace for web and future commercial macOS
standalone, preserving the current layout and editing model. Audio only.
No feature, parameter, timing, audio, export-policy or hit-target changes.

## Visual contract
- Neutral graphite surfaces: workspace #17191C, canvas #191C20, panels #1D2024.
- Primary text #E4E7EB; secondary #B1B7C0; muted #969EA8.
- System typography: macOS system face first, weight 500 controls/readouts,
  weight 600 product title. Keep existing font sizes and control dimensions.
- Audio identity remains #459BFF; icon retains Hub v0.10 identity.
  Title becomes neutral to reserve color for audio content and interaction.
- Preserve Speed mint, Pitch coral and Pan violet identities.
- 1px borders, 4px control corners, 6px panel corners; restrained selected fills.
- Curve drawing: active 2.8px, inactive 1.5px. Point radius/hit targets unchanged.
- White playback cursor and existing continuous meter gradient remain.
- Visible focus outline remains distinct from selection and hover.
- Disabled opacity is preserved; disabled controls must remain distinguishable.
- No external fonts, new dependencies, animation, backdrop blur or raster assets.

## Web / standalone consistency
Share semantic colors, typography roles, icon geometry, spacing, interaction states.
The web pilot uses solid panels and small static button gradients.
Native materials may be considered for window chrome or transient panels, only
after measuring their effect during rendering/playback on supported Macs.
Do not place decorative translucency behind waveform or curve data.
Native is not assumed to have unlimited GPU/energy budget.
Static imagery is optional for branding only, with measured size/HiDPI costs;
never bake controls, labels or editable plots into a background image.

## Evidence and scope
Required JS syntax checks and transform parity must pass.
Browser smoke: parameter selection, zoom/fit, reset open/cancel, layout bounds.
Screenshots are stored in CurveLabWebV1/evidence/audio-design-*-20261015.png.
No listening approval, cross-platform accessibility certification, long-run
performance benchmark or native-app implementation is implied.

## Next review gate
1. Judge density, contrast and fatigue on the user's actual display.
2. Verify small-laptop/zoom views and keyboard focus.
3. Agree tokens before expanding to sibling Labs.
4. Resume remaining technical verification; listening remains separate.
Existing layout/readouts are deliberately retained in this pilot.

## References
- Apple HIG materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Browser rendering pipeline: https://web.dev/articles/rendering-performance
These inform hierarchy/performance questions; this is not a copy of vendor assets.

## Pilot verification result
- PASS: syntax checks for app, transform-core, transform-worklet, offline-render.
- PASS: tests/transform-parity.mjs.
- PASS: browser Pitch selection, zoom to 2x/fit, reset dialog open/cancel.
- PASS: observed CSS viewports 910x1099 and 1580x889: no horizontal overflow;
  transport bottom within viewport. Browser scaling means requested dimensions
  differ from observed CSS dimensions; this is not a certified 125% zoom test.
- No browser errors captured during the pilot smoke test.
- Audio and export implementation unchanged; no full file lifecycle repeated.
- Pending: user visual review, low-end paint measurements, cross-browser visual QA.


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
