# Audio Curve Lab Finetuning Log

This is a curated record of experiments whose reasoning may help future Audio Curve
Lab work, another Curve Lab, or a native standalone implementation. It is not a commit
history. Unvalidated values remain provisional.

## 2026-09-30: Gentle Speed/Pitch Transparency

**Component:** Shared transform DSP

**Observed Issue:** Exact neutral playback uses a direct source reader, while even a
small Speed/Pitch edit switches to overlapping grains. A steady 440 Hz fixture lost
most energy at its intended frequency under the former jittered grain placement.

**Experiment:** Keep the 140 ms/5.5 overlap schedule, remove non-Freeze jitter, search
at most 10 ms around each nominal grain start for a match to the prior L/R waveform,
and use actual window-sum gain for aligned grains. Preserve the prior jitter and
overlap rule for Freeze.

**Measured Result:** The fixture's intended-tone energy rose from about 8% to nearly
100% at Speed `1.01x`, and from about 11% to 98% at Pitch `+20 cents`. For a seeded
white-noise fixture, Speed `1.01x` held the neutral RMS and Pitch `+20 cents` was about
1 dB lower. Preview and Render automated checks passed. These measurements do not
replace listening to speech, instruments, transients, and extreme curves.

**Decision:** Keep the bounded waveform alignment as the current Audio Curve Lab
processing rule. Treat grain size, search range, and acceptance limits as provisional
until practical listening is complete.

**Reusable For:** `PROJECT-SPECIFIC`; possible `STANDALONE ASSET` after listening.

**Subsequent listening observation (2026-09-30):** The project owner reports that
small Speed changes now sound substantially more natural when leaving the original
sound. On a human voice, Pitch changes still produce a short-delay/chorus-like
texture. In combination with electronic or instrumental material, that texture can
sound fuller and musically useful. The owner does not currently regard it as a defect
and chose to keep this version. This is a qualitative observation, not an approved
transparent-Pitch claim or a preference for all source types.

**Evidence limits:** The voice recording, exact curve/cents, listening setup, and
Preview-versus-exported-WAV comparison were not recorded. Do not attribute the
texture to a specific DSP stage or claim that the WAV shares it without a controlled
comparison. Capture those conditions using `docs/REFERENCE_SOUND_SET.md` before
promoting this observation to a standalone sonic requirement.

---

## 2026-09-29: Bottom Playback And Output Metering

**Component:** Playback and monitoring hierarchy

**Parameter / Behavior:** Top control, center sound/Curve, bottom playback/monitoring

**Initial State:** Current/total time appeared in the upper header; source playhead time
also appeared among parameter readouts; no scrubber or output meter existed.

**Observed Issue:** Playback state competed with editing information and duplicated time
status. Actual processed output level was not visible.

**Tests / Alternatives:** Preserved Open Audio/Download at the top; moved existing
Play/Stop and the single output-time display to the bottom; removed the duplicate
readout; added output-progress seek and compact monitoring. Checked default sample,
seek, Stop reset, silence decay, and wide/narrow wrapping locally.

**Final Decision:** Implement this hierarchy in Audio Curve Lab for practical use. Do
not propagate it to sibling projects yet.

**Reason:** It keeps the Canvas workspace primary and groups playback state with
monitoring.

**Reusable For:** `COMMON CANDIDATE`

**Web-specific Limitation:** The Canvas retains its existing 1800 px logical minimum and
may be clipped on narrow windows; the Bottom Transport itself reflows independently.

**Standalone Consideration:** `STANDALONE ASSET`; preserve hierarchy and interaction,
then adapt to native window/toolbars.

---

**Component:** Output Level Meter

**Parameter / Behavior:** Measurement, display smoothing, Peak Hold, Clip

**Initial State:** No output measurement.

**Observed Issue:** `UNKNOWN`; visual and musical preferences require continued use.

**Tests / Alternatives:** The current reference measures the final realtime output with
1024-sample analyzer windows. Initial UI values are Peak attack 18 ms/release 320 ms,
RMS attack 45 ms/release 420 ms, Peak Hold 1000 ms followed by 700 ms release, display
range -60..0 dBFS, and Clip threshold 0.999. Default sample activity and silence decay
were observed.

**Final Decision:** Keep these as provisional starting values, not a common standard.

**Reason:** They are responsive and readable in the first implementation, but have not
yet been compared using the complete sustained/transient/low/dense/clipped test set.

**Reusable For:** `COMMON CANDIDATE` after repeated evaluation

**Web-specific Limitation:** `AnalyserNode` windows are read on animation frames and are
not a standards-compliant loudness measurement. The current `tanh` output protection
makes true final-output clipping uncommon.

**Standalone Consideration:** `STANDALONE ASSET`; native implementation should perform
measurement in the audio engine and transfer only compact channel values to the UI.

---

**Component:** Output Level Meter

**Parameter / Behavior:** Level colors

**Initial State:** Blue RMS/Peak bars matched the Audio Curve Lab brand.

**Observed Issue:** Brand color did not communicate the familiar safe/caution/high/near-
full-scale level regions as quickly as a conventional audio meter.

**Final Decision:** Use a fixed green-to-yellow-to-orange-to-red scale. The gradient is
anchored to the complete `-60..0 dBFS` display range and is revealed by level, so a low
signal cannot incorrectly display the red region.

**Reason:** Conventional audio-meter color meaning is immediately recognizable.

**Reusable For:** `COMMON CANDIDATE`

**Standalone Consideration:** `STANDALONE ASSET`; retain threshold meaning and retest
exact colors for the native display color space.

## Hub v0.10 Audio identity pilot — 2026-10-04

PROJECT-SPECIFIC experiment: use the Hub's #459BFF and original Audio symbols
in the header/favicon while preserving functional color semantics.
Acceptance: compare header and favicon at desktop/narrow sizes, verify exact assets
and unchanged processing files. User aesthetic acceptance remains pending.
Details: `docs/IDENTITY_PILOT.md`.

## 2026-10-06 — Audio sign-transition verification (PROJECT-SPECIFIC)
24 rapid sign/Freeze trajectories across global Reverse and ±2400-cent extremes are numerically bounded;120 seek comparisons are independent of previous playback. Uninterrupted PCM matches deployed baseline exactly. No listening tuning performed. Keep audible clicks at rapid reversals and grain/gain restart after seek on the level-matched listening list. See docs/DSP_BEHAVIOR.md for scope and tests.
