# Parameter help — 2026-10-14

UI-only. Live values, axes, enable states, parameter mappings and DSP are preserved.
Hover after 500 ms, keyboard focus immediately, touch selection; Escape/outside press/blur/scroll/resize dismiss. Help can be hovered.
Legacy legend nodes remain available to existing writers but are hidden; no lifecycle reference is removed.

Audio: signed Speed −2…+2, Pitch ±2400 cents, Pan L/top and R/bottom.

Source audit: current app mappings and DSP core modules, cross-checked against PARAMETER_SPEC.md. No parameter values were changed.

## Validation and boundaries

All visible parameter buttons were exercised in the local browser; Oscillator FM/AM/Ring were separately checked after a same-control reopen fix. Escape dismissal and viewport containment passed; all six Labs also passed 540×800 help containment. Play/Pause state passed with default content for Audio, Timbre, Space, Spectral and Oscillator; Granular remained correctly disabled without a file. Family keyboard regression: 27 passed; all source JavaScript syntax and diff whitespace checks passed. No console errors observed in the captured smoke session. No DSP changes, new listening, export, physical touch, or cross-browser proof claimed. Pointer-hover delay is implemented; automated browser checks exercised focus/click rather than pointer hover. Family evidence: family-parameter-help-checks.json.
