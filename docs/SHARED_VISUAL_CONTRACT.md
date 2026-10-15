# Curve Lab shared visual contract — 2026-10-15

Status: accepted web baseline; STANDALONE ASSET. This document supersedes earlier pilot statements where they conflict. Historical pilot notes are retained as history, not simultaneous requirements.

## Principles
- One continuous neutral dark workspace; use hierarchy and restrained separators instead of nested cards. Preserve each Lab layout and musical meaning.
- Canvas #191C20; neutral grids. Product identity colors and parameter colors are separate systems.
- Available off/bypassed buttons share Audio neutral colors; disabled controls have a distinct common subdued appearance. Preserve enabled effect versus current editing target semantics.
- Selected controls retain parameter color, use a dark full-width lower bevel. No text underline. Focus uses a separate visible ring; hover does not imply selection.
- Role metrics: file actions 38px, parameter/settings/Clear/Reset 34px, tool/transport 32px, Audio edit helpers 26px. Main text 13px, general corners 4px; joined tools and transport retain role-specific edges.
- Native implementation should map these to logical points and optical alignment, not blindly copy CSS pixel arithmetic. Respect system scaling, keyboard navigation and platform accessibility.

## Resolved instruction conflicts
| Earlier direction | Current decision |
|---|---|
| Colored text underline for selection | Removed; dark lower bevel is current standard |
| Lab-specific neutral button fills | Shared Audio-derived neutral fill; active parameter colors retained |
| Audio 30px parameter/action buttons, sibling 34px | 34px role standard supersedes earlier compact heights |
| Fit everything into one screen | Preferred at normal desktop sizes; zoom/narrow screens may scroll vertically to preserve legibility and hit targets |
| Preserve existing layout | Preserve order and functional grouping; allow wrapping and modest height changes required by role sizing |

## Boundaries
UI-only release: no DSP, normalized curve data, interpolation, parameter range/default, output policy or input behavior changes. A selected editing target is not always the same as an enabled effect. Do not unify these behaviors merely to make screenshots alike.

## Remaining proposals, not implementation instructions
- Standardize numerical units, precision and status wording by role while preserving source/output-time semantics.
- Reduce always-visible diagnostic/readout density using a common disclosure policy.
- Refine optical icon alignment and neutral dropdown/input surfaces to match button tokens.
- Verify disabled text and focus contrast at user-selected scaling; keep color-independent state cues.
- Consolidate historical CSS overrides in a separate maintenance change after the visual baseline is stable.

## Release evidence
All six: local play/pause/rewind smoke, no captured browser errors; Granular used a short local WAV fixture, others built-in samples/synthesis. Prior 1422/640 CSS px checks found no horizontal overflow or button text clipping. Actual 125/150% zoom verified during canvas pass, before final metric adjustment. Keyboard and targeted render/cancel regressions passed in preceding checks. This is not comparative listening or a new exhaustive Safari/Windows certification.
