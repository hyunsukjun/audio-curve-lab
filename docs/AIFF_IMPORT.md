# Portable AIFF input


## AIFF import — 2026-10-11 (COMMON CANDIDATE)

Local implementation: `src/audio-import.js` (identical across the six Labs).
Supported: AIFF FORM/COMM/SSND, signed integer PCM 16/24-bit, mono/stereo,
integer sample rates 8–192 kHz. AIFF-C, other bit depths and multichannel AIFF
are deliberately rejected with a WAV conversion hint. AIFF-C can itself contain
uncompressed PCM; rejecting it is a scoped implementation limit, not a claim
that every AIFF-C file is compressed.

The importer checks chunk bounds, padding, sound offsets, declared frame count,
format and projected decoded memory before allocating an in-memory PCM WAV.
It swaps PCM byte order without changing sample values, channel order, rate,
frame count or bit depth. The original file is not modified or uploaded.
Existing `decodeAudioData` paths handle resampling exactly as for WAV. No DSP,
Preview/Render policy, gain, or export format change. Lab-specific channel use
(e.g. Granular first-channel processing) remains unchanged.

The decision to use a temporary WAV supersedes the earlier direct-AudioBuffer
proposal: it preserves the established browser resampler, at the cost of one
additional PCM-sized byte buffer during import. Conversion yields between
256 KiB batches. Existing file limits still apply; AIFF additionally enforces
128 MiB input/converted bytes and 192 MiB projected Float32 PCM admission limits.
These are guards, not a low-memory-device guarantee. Import cancellation is not
newly added. Existing source replacement/failure policies remain Lab-specific.

Metadata markers/loops/comments are not imported. Non-AIFF formats retain the
existing browser decoder. This is input compatibility, not a native DSP change.
A Standalone decoder should preserve the same PCM/rate/channel contract.

Verification: independent Python WAV/AIFF fixtures across 44.1/48/88.2/96 kHz,
16/24-bit, mono/stereo produced 16 byte-identical WAV pairs. Browser offline
contexts at 44.1/48 kHz produced 32 sample-exact decoded comparisons in Codex
IAB and separately in native Safari (32 cases each). Windows Chrome is not
certified by this result; no
listening approval or low-memory guarantee is implied. Deployment status is tracked separately from these compatibility checks.

Actual IAB file chooser: 96 kHz / 24-bit stereo AIFF imported in all six Labs.
Oscillator Convolution and Resynthesis received the source; analysis completed.
Spectral rejected an AIFC-tagged fixture and recovered on a valid 44.1 kHz
16-bit mono AIFF. Audio actual saved WAV: 48 kHz / 24-bit stereo, 4800 frames
for a 0.1-second source. Other Labs export paths were not re-run in this pass.
Run `node tests/aiff-import.mjs` for repository-local regression checks.
