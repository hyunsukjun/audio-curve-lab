# Graphite interface verification

2026-10-26. Scope: the shared presentation revision in INTERFACE_GRAPHITE_CONTRACT.md.

- Static/source checks: 38/38 across six Labs, including app/grid syntax, existing grid/keyboard tests, required Audio module syntax and transform parity, unchanged processing/input/transport sources, and shared-asset equality. `src/app.js` changes only the grid-module cache key.
- Browser layout comparison: 48/48 (six Labs × 1440/900/600/390 CSS px × initial/selected states). Same live DOM with the new stylesheet enabled/disabled; measured element bounds and font metrics were unchanged, active/disabled colors unchanged, and final horizontal overflow zero. Oscillator's previous 113 px overflow at 390 px is removed by allowing the complete output/seek text to wrap.
- Real Brave zoom: all six at 125% (1013×914 CSS px, DPR 2.5) and 150% (844×762, DPR 3), confirmed by browser chrome. No horizontal overflow or curve/transport overlap. Some 150% layouts require normal vertical scrolling to reach the transport. Restored local origin to 100%. Screenshots reviewed; this is not Safari/Windows or all-display certification.
- Pointer/UI smoke: each Lab added an interior point (2→3), erased it (3→2), entered Play and returned to paused state. Existing production modules ran inside separate QA-only wrappers with a zero-gain final output sink; there was no listening. Spectral time progression was additionally observed after setup.
- Granular loaded the existing eight-second same-origin test WAV through its actual file-input change handler. The native file-chooser automation bridge lacked file-URL access, so this turn does not certify the native chooser. No extension permission was changed.
- No new WAV export, comparative listening, physical-output, CPU-headroom or native-UI acceptance is claimed. The unchanged audio modules and prior audio evidence remain separate.

Shared detailed evidence is in the coordinating workspace `work/CurveLabWebV1/qa/graphite-20261026/`: static-results.json, layout-results.json, zoom-results.json, interaction-results.json, preview-results.json and browser screenshots. The QA wrappers/harness are outside the product repositories.

The original sequential iframe harness stalled after a second navigation and was replaced with independent initial-load cases. Only completed independent cases are counted above. This was a harness limitation, not a product fix or product pass.
