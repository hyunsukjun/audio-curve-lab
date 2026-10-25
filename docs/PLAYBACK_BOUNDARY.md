# Playback boundary — 10 ms (2026-10-25)

Status: implemented and technically verified; user authorized commit and public release on 2026-10-25. Subjective listening acceptance remains separate.

- Linear 10 ms attack on Play/resume and 10 ms final release on natural end.
- Pause continues rendering through its release, then retains the resulting position. Audio-thread processing ends at zero; context-based graphs suspend after zero acknowledgment/ramp completion (control delivery can add silent quanta).
- A release starts from current gain, including an interrupted attack; natural/pause gain is not stacked in the sample envelope.
- WAV output receives one boundary at the completed output's first/last samples. Output length, channel layout, source PCM, curves and effect parameters remain unchanged. Very short output shortens the boundary. Dither may contribute one least-significant bit.
- Explicit reset, invalidating edits/file replacement and error cancellation retain their immediate safety-stop semantics; these are not ordinary Pause.
- This treatment addresses transport discontinuities, not clipping or clicks within an imported recording.

## Module-specific integration

The automatic one-pole startup gain ramp is replaced by the boundary envelope. Parameter smoothing and intentional source-editor fades remain separate. WAV fades run after resampling.

## Verification and limits

Shared local evidence: `work/CurveLabWebV1/qa/fade10/` in the Interface workspace. Includes finite-output/short-file tests, release-frame and resume checks, completed browser WAV checks for six Labs and dry/IR Oscillator, plus affected regression logs. Browser/device listening is not inferred from these numeric checks. Release authorization does not imply subjective listening acceptance.
