> Superseded: the new readout disclosures/compact strip were reverted by user request. Original presentation restored; see INTERACTION_SPEC.md.

# Audio information-density pilot — 2026-10-15

Status: local, awaiting review; not committed/deployed.

Compact Speed/Pitch/Pan strip; collapsed editing statistics; WAV status near export. Playback values come from preview worklet; stopped values evaluate current curves at the output playhead, before smoothing. No audio processing changes.

Validation: syntax app/core/worklet/offline; transform-parity, source-editor-lifecycle, output-edit, pause-resume, source-seek and keyboard suites passed. Browser: representative point insertion/clear, output seek ArrowRight, Play/Pause/rewind, zoom/Fit, Details open/close. No captured console errors. 640px layout has no horizontal overflow. No fresh exhaustive WAV download or listening approval.

Evidence in family workspace: audio-value-strip-desktop-20261015.png and audio-value-strip-small-expanded-20261015.png.

Details summary Space now isolated from transport with value-details.js. Audio pilot remains uncommitted.
