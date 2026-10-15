# Functional surface pilot — 2026-10-15

PROJECT-SPECIFIC / STANDALONE ASSET CANDIDATE. Approved for release by user on 2026-10-15.

The continuous workspace remains intact. Distinguish functional zones through neutral surface luminance, not separate rounded cards or bright outlines. File management, parameter controls and current values share #373b43, source editing controls, navigation and waveform share #252c32, curve canvas #191c20, transport #30343c. Parameter colors retain their meanings; surface tones do not encode active state. Waveform canvas paint matches its CSS surround.

This refines the previous continuous-shell rule: continuity means shared edges and alignment, not identical backgrounds everywhere. Text-bearing surfaces remain dark; no new shadows, blur, animation or bitmap backgrounds. Existing layout, hit areas, DSP, curve coordinates, editing and playback semantics remain unchanged.

## Verification
1422 and 640 CSS px browser views: no horizontal overflow; Details expanded remains in flow. Play advanced the time and meter, Pause/rewind worked, source zoom/Fit worked, Speed/Pitch/Pan selected correctly. Details Space toggled disclosure without playback. No captured browser errors. JavaScript syntax and transform parity passed. This is a visual/interaction check, not new listening or cross-platform certification.

## Review refinement
The title, parameter controls and current-value strip form one upper control area and share the title background. Do not distinguish every row with a separate tone. Retain the source-editing and curve-canvas surfaces below. This supersedes the initial three-tone header trial.

The source-edit toolbar and navigator surround now use the waveform background #252c32. Treat source editing as one independent surface below the unified header; the navigation track and viewport indicator retain their interactive contrast.
