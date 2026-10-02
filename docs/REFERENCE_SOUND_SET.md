# Reference Sound Set And Listening Record

## Status And Purpose

This is a proposed repeatable comparison protocol, not a completed listening test
or an approved sonic specification. No third-party recordings are bundled. Keep
source files local, record their provenance and permission for testing, and use the
same files when comparing Web Preview, exported WAV, and a future standalone build.
The generated eight-second noise-interval sample is useful for startup and rhythm
checks but is not sufficient by itself to approve sound quality.

## Source Categories

Choose a short, known-good source in each category and retain an unchanged copy:

| Category | What it exposes |
| --- | --- |
| Spoken voice with sustained vowel and consonants | Pitch chorus/formants, transient articulation |
| Sustained pitched instrument or stable tone | Beating, pitch drift, grain modulation |
| Short percussion with clear attacks | Clicks, pre-echo, transient placement |
| Dense or polyphonic music | Smearing and tonal balance |
| Broadband/noise texture | Granular coloration and level changes |
| Stereo source with distinct left/right content | Image movement and channel coherence |

Record source filename or ID, checksum, sample rate, bit depth, channel count,
duration, and the exact region used. A synthetic 440 Hz tone can supplement these
files for numerical checks, but must not stand in for musical listening.

## Comparison Matrix

For each relevant source, compare neutral direct playback, small Speed changes
(`1.01x` and a modest slowdown), small Pitch changes (`+20 cents` and a modest
downward shift), a moderate transform, and moving Pan. Include separate cases for
reverse, sustained Freeze, rapid Speed sign crossing, sharp curve changes, and the
supported extremes. These are test positions, not endorsed musical sweet spots.
Use the same curve points, source region, output level, and monitor setting for
Preview and exported WAV. Listen both alone and, when musically relevant, layered
with another sound. Compare timing, pitch, timbre, clicks, stereo image, perceived
level, and whether any coloration is useful or unacceptable for the intended task.

## Listening Record Template

Copy one record per source and setting. Leave untested fields explicitly `NOT TESTED`.

```text
Date / tester:
App commit or version / browser and OS:
Source ID / checksum / permission / sample rate / channels / duration:
Exact source region and curve points (normalized x,y):
Speed / Pitch / Pan values and output position examined:
Preview, exported WAV, or both:
Audio device, headphones/speakers, level-matching method:
Heard result (timbre, transient, click, stereo, level):
Preview versus WAV difference:
Musical usefulness and limitation:
Decision (keep, investigate, reject) and confidence:
Open questions / next comparison:
```

Do not infer an algorithmic cause solely from a heard effect. A subjective report
without source/settings metadata is useful provisional feedback, not a reproducible
approval. Keep the original WAV and rendered output when permission allows.

## Performance Record

Measure quality and performance separately. For each representative browser/device,
record app commit, CPU/device model, OS/browser, input length/rate/channels, curves,
and whether playback was foreground, backgrounded, or resumed after sleep. Repeat
each case at least three times. Record offline render wall time and output duration,
plus realtime dropouts/clicks and UI response during playback. Compare neutral,
gentle Pitch/Speed, dense curve edits, Freeze, and the longest supported output.

Browser wall time is not an audio-thread CPU measurement; a smooth UI is not proof
of glitch-free audio. A future native implementation should additionally measure
audio callback duration, deadline misses, and allocations using native tooling.
No CPU results or acceptable thresholds have yet been approved for this project.
