# Shared default source —2026-10-29

Status: user-approved source asset and implementation; release evidence is recorded separately. This is not a new DSP algorithm or whole-product listening approval.

## Asset

- J. S. Bach, Prelude in C major, BWV846/1, first four measures.
- Original synthesized B mallet recording made for CurveLab; no third-party recording or soundfont.
- 72 quarter BPM,15.000 decoded seconds,48kHz stereo, MP3 CBR320kbps.
- File: `assets/audio/bach-prelude-72bpm.mp3`; 601964 bytes.
- SHA-256: `ed401c52cd9ba71cc08e79d6ac57af48f101931d67e070e493a41bc1c9b3c997`.
- A very quiet short room is already baked into the source recording. No new reverb or gain stage is added to the product.
- The uncompressed authored WAV is preserved in the coordinating asset archive. MP3 is the approved web delivery asset; it is lossy and is not a replacement for lossless DSP reference fixtures.

## Product role

The first page load prepares this MP3 through the existing local-file import/decode/install path. It does not start playback. Audio editing, curve/effect defaults, source/output clocks and output-duration controls retain their existing meaning.

Stereo source and source editing are retained.

## Loading and ownership

The shared `src/default-source.js` owns only the asset identity, HTTP fetch and generation/abort guard. It does not decode or process audio. Each Lab reuses its own existing decode/install path. The same helper is copied into independent deployments and byte-checked; it creates no cross-site dependency.

Open Audio remains available during the initial fetch. The newest accepted source request owns the result. An aborted or late example may not replace a user source or restore stale status/readiness. No autoplay is added. A stalled fetch is bounded to15seconds. A failed initial fetch/decode leaves an actionable message and Open Audio recovery; it does not silently return to noise. Ordinary user-file failure behavior remains Lab-specific. Existing WAV/render staleness handling is reused.

## Verification boundary

Focused request-ownership and timeout tests are in `tests/default-source.mjs`. Extracted file-loader fixtures receive the actual gate dependency. Coordinating release evidence covers served MP3 hash, real Brave decode, no autoplay, first Play/Pause/Resume/end, actual WAV download, user-file precedence and failed-HTTP recovery. Numerical/browser evidence is separate from human acoustic acceptance. Existing unrelated historical fixture failures are recorded with before/after evidence instead of being called product regressions.

## Standalone asset

Retain composition/recording identity, source-vs-IR distinction, user-file precedence, visible loading/failure recovery, and the same independent source/output clocks. Bundle a local approved asset where suitable; do not copy HTTP, Web Audio or the web MP3 choice as a native requirement. Authored WAV remains available for a separately approved native packaging choice. No native implementation is implied.
