# Whole-source waveform navigator — Audio approved web revision

2026-10-28 · PROJECT-SPECIFIC / STANDALONE ASSET · scoped UI verification passed; user authorized commit and publication after actual Brave125%/150% checks. UI evidence remains separate from listening/native/product acceptance.

The existing source navigator now contains a thin two-lane waveform of the entire **current working source**, after accepted source edits and before Speed/Pitch/Pan. The detailed waveform below retains its existing visible source range. Source-tone colors carry the same spectral-centroid meaning as the detailed source waveform; they do not represent clipping, processed output or rendered freshness.

The visible range stays at normal waveform brightness with a thin neutral outline; areas outside it have a restrained dark mask. This rectangle means viewport, never edit selection or an audition/loop range. At Fit it covers the whole source. No playhead, new range handle or new command is added to the overview.

## Preserved behavior

`editPan`, its role/focus/keyboard behavior, 18 CSS px track geometry, axis-aligned position, click/drag centering, clamping, selection-centered zoom, playback-follow and Fit are retained. Its original pointer hit area is unchanged. The decorative Canvas and masks ignore pointer events and add no focus stop. Arrow keys, Shift+arrows and Home/End continue to navigate as before.

Navigation changes the view only. It must not modify the source selection/edit cursor, audition/paused position, curve points, source-volume/fades, audio, Undo history, or render/cache freshness. The existing automatic source-playback follow remains unchanged. Source selection and output seeking retain their existing controls.

## Display implementation and resource boundary

`source-overview.js` consumes the already computed whole-source signed min/max summaries and source-tone colors. The app invokes its cached paint beside the existing detailed source paint. No new PCM scan, worker, FFT, audio node, analysis request, event listener, timer or dependency is added.

The raster is keyed by summary identity, color identity, reference display peak, CSS dimensions and device pixel ratio. Panning/selection/playback reuse it; two CSS masks and the existing viewport rectangle show the view. File replacement, accepted delete/fade/volume edits, Undo/Redo, empty source, size/DPR and completed source-color analysis invalidate or clear the appropriate raster. Pending color analysis is blank rather than a temporary legacy waveform or the previous source. A DPR-aware polygon retains signed extrema, last-sample transients and the shared stereo display scale. A maximum of256 color stops per lane is used, with no cosmetic peak smoothing.

Changing the overview presentation does not invalidate the rendered result. Actual source edits retain their existing invalidation path. Existing PCM/materialization, delete-join crossfade, source volume, transport, transform and WAV paths are unchanged.

## Verification boundary

See the coordinating `qa/audio-source-overview-20261028/REVIEW.md` (historical local review), `RELEASE.md`, baseline and machine-readable results. Scoped checks cover the painter cache/immutability, existing edit/volume/transport paths, actual pointer selection/navigation and file replacement in IAB, and equal-data before/after layouts. Actual Brave125% (1637×853 CSS px,DPR2.5) and150% (1364×682,DPR3) were independently verified through native zoom labels and DOM geometry. Home/End/Fit, raster resize, source/curve alignment, no horizontal overflow and150% scroll/keyboard access to the non-overlapping footer passed. At150%, Play/Pause and paused-position preservation across overview navigation passed.100% was restored. CSS viewport resizing remains separate evidence. Wall-clock display microbenchmarks do not certify audio callback CPU headroom. No new listening, device, Windows/touch, native implementation or whole-product acceptance is claimed.

## Standalone transfer

Reuse this as a source-overview component role, not as a copy of web pixel sizes, Canvas APIs or stereo/channel limits. A native overview follows the current source/instance/channel/layout and accepted source edits using the native authoritative frame range. It must remain distinct from selected edit range, listening position, control/output clocks and render-result freshness. Reuse approved source summaries/colors where suitable; independently validate caching, native type/focus/keyboard/accessibility/zoom, visible vs pointer target and logical/physical channel semantics. It must not infer a channel conversion or change DD38/DD39/time/channel decisions. Any native implementation remains a separate approved stage.
