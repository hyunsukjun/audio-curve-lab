# Decoded audio admission and previous-source retention

Status: IMPLEMENTED — 2026-10-29. Non-listening verification passed; user authorized commit and deployment. No listening acceptance.

## Shared product contract

A new local/default source is a candidate until decoding, existing module-specific limits, and full decoded-PCM validation succeed. Reject empty/invalid decoded metadata and any NaN/+Infinity/−Infinity in any channel, including tails outside Oscillator's30s analysis excerpt and channels Granular does not consume. Existing browser codec acceptance and AIFF checks remain; this is not an exhaustive container/malware validator.

Failure must not install, transfer, or analyze the candidate. Retain the previous valid source, waveform, curves, source edits/selection/window, and applicable IR/analysis data. Report the reason and previous-source availability in the existing status/notice area. Repeated failures must remain recoverable; a later valid mono/stereo source follows the existing replacement behavior. A chooser cancellation changes nothing.

Opening a file still stops/cancels the previous playback attempt as before. Rejection does not automatically resume. A completed WAV belonging to the unchanged previous source/settings remains available; successful replacement invalidates it. In-flight render cancellation remains the module's existing policy. Initial failure without a previous source leaves unavailable actions disabled; Oscillator's file-free dry synthesis remains a valid mode.

Finite high peaks, preclipped PCM, DC and silence are not rejected/normalized by this boundary. Headroom/limiting, DC analysis, aliasing, IR source-end boundaries and perceptual quality remain separate open DSP issues. Existing file-size/rate/channel limits are preserved, including Spectral mono/stereo and Granular channel0 source consumption.

## Web implementation

Reuse the identical six-Lab `src/audio-import.js`. `validateAudioBuffer` reads at most65536samples into one reused Float32 scratch array (at most256KiB), scans every channel, yields after about8ms of measured scanning, checks abort/latest-owner state, and returns the same AudioBuffer. It does not modify PCM, resample, mix channels, compute gain, alter length, or change DSP.

Use `copyFromChannel`, not a mutable `getChannelData` view, for the extra admission scan. In the current Brave test, repeated view reads changed a retained sample reference; copying did not. This observation is specific to the tested browser/environment, not a universal claim about all browsers. The actual validator is checked against retained PCM bytes. Avoid adding a full-sized clone merely to validate.

Validate both the48kHz source and any separately decoded native-rate IR in Oscillator before installation. Validate the lazy default resynthesis source too. Existing analysis algorithms and the choice of analysis channel/excerpt are preserved.

## Standalone asset

Portable requirements: candidate/validated/committed ownership, bounded read-only full-channel scan, cancellation and latest-request ownership, commit only after admission, previous source and dependent state retained on failure, truthful source/render identity, and retry without reload. Native decoding must remain independent of opening/activating the output device. Keep the adapter and platform APIs outside the DSP model.

Do not transplant Web Audio getter behavior, JavaScript chunk sizes or8ms as mandatory native constants. Choose native batch sizes using measurements. Record frame count/rate/channel metadata and error category, without automatically uploading audio. Native implementation, device/CPU/long-form acceptance and source recovery persistence require their own verification.

## Verification

`tests/input-validation.mjs`: whole-buffer/all-channel/tail coverage, finite PCM bit preservation, empty/invalid shape, reader error, abort and stale ownership. Relevant existing import/AIFF/pending-Play tests retain valid decoded-buffer fixtures. Family browser evidence/report: `work/CurveLabWebV1/qa/input-validation-20261029` in the coordinating workspace. Browser checks are silent and are not listening approval. User authorized commit, push and deployment on2026-10-29. Public verification is recorded separately in the coordinating input-validation-release-20261029 evidence; it is not listening acceptance.
