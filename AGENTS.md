# Audio Curve Lab Agent Rules

This repository is the Audio Curve Lab product. Its brand color is Blue
`#4DA7E8`. These rules apply only to this repository.

## Working Order

1. Inspect the current code and documentation before proposing changes.
2. Treat observed runtime behavior as evidence; do not infer behavior from names alone.
3. Preserve sound, parameter meaning, curve data, and interaction before visual polish.
4. Make the smallest coherent change. Do not perform large refactors without an
   explicit request.
5. Verify the changed behavior and its surrounding regression surface.
6. Update the product-knowledge documents listed below.

Preserve knowledge, not only code. Record a finetuning result only when it can help
reproduce behavior, explain a consequential choice, guide another Curve Lab, or inform
the future standalone application. Do not create a chronological development diary.

If code and documentation disagree, investigate and report the difference. Do not
silently choose one as authoritative.

## Protected Product Behavior

- Keep internal parameter IDs stable: `stretch`, `pitch`, and `pan`.
- Keep curve points in normalized `{x, y}` coordinates unless a versioned migration
  is explicitly approved.
- Do not change curve interpolation, parameter ranges, defaults, smoothing, signed
  speed behavior, or Freeze behavior as a side effect of UI work.
- Preserve Pen/Eraser behavior, endpoint protection, Command-click on macOS,
  Ctrl-click on other platforms, Spacebar transport, Clear Current, and Reset All.
- Preserve the shared Preview/Render parameter model in `src/transform-core.js`.
- Treat Preview/Render differences as audio-engine work, not cosmetic work.
- Do not change file loading, the generated default sample, WAV export, or output
  duration limits while working on unrelated features.
- Keep Canvas resize and high-DPI work independent from normalized musical data.

## Architecture Boundaries

- Product behavior: what the musician sees, hears, and controls.
- Processing/data model: normalized curves, mappings, interpolation, smoothing,
  source position, and DSP rules.
- Platform implementation: HTML, CSS, Canvas, Pointer Events, Web Audio, and
  AudioWorklet.

Avoid adding coupling between these layers. Do not rewrite stable code merely to
prepare for a hypothetical native framework.

## Change Boundaries

- Separate UI/design changes from DSP changes.
- Separate Preview engine changes from offline Render changes, then test their parity.
- Do not rename HTML IDs or JavaScript-referenced classes for styling convenience.
- Add no dependency without a concrete need, compatibility assessment, and approval.
- Do not add analytics, accounts, upload services, servers, or cloud processing by
  default. Audio processing remains local to the user's browser.
- Do not modify sibling Curve Lab projects from this repository task.
- Commit, push, or deploy only when the user explicitly requests it.

## Required Documentation Updates

- New or changed feature: `docs/FEATURE_REGISTRY.md`
- Parameter range, default, mapping, or identity: `docs/PARAMETER_SPEC.md`
- Gesture, shortcut, tool, or lifecycle: `docs/INTERACTION_SPEC.md`
- DSP, smoothing, gain, channel, Preview, or Render behavior: `docs/DSP_BEHAVIOR.md`
- Product or architectural decision: `docs/DECISIONS.md`
- Native/plug-in migration impact: `docs/STANDALONE_MIGRATION.md`
- Visual language or token: `CURVE_LAB_DESIGN_SYSTEM.md`
- Stable development principles: `DEVELOPMENT_GUIDELINES.md` (the repository's
  `development-guide.md` equivalent)
- Meaningful experiments and provisional tuning: `finetuning-log.md`

Promote a finding from `finetuning-log.md` into stable specifications only after it has
survived practical testing. Mark knowledge as `PROJECT-SPECIFIC`, `COMMON CANDIDATE`,
or `STANDALONE ASSET` where that distinction matters.

Unknown musical intent or tuning must be marked `UNKNOWN` or `TO BE DOCUMENTED`.
Never invent a sweet spot, listening result, or historical reason.

## Verification Minimum

For JavaScript or DSP changes:

```sh
node --check src/app.js
node --check src/transform-core.js
node --check src/transform-worklet.js
node --check src/offline-render.js
node tests/transform-parity.mjs
```

Also exercise the affected browser lifecycle. Relevant checks include default sample,
file load, Play/Stop, Spacebar, all modes, point add/move/delete, modifier erase,
endpoint protection, Clear Current, Reset All cancellation/confirmation, waveform,
playhead, scales, Preview, WAV render/download, resize, narrow/wide layouts, and console
errors. A syntax or unit test is not proof that audio playback is correct.

For documentation-only work, run the transform test and syntax checks to preserve a
known baseline, then confirm no runtime files changed.
