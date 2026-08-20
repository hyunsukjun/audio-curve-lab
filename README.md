# Audio Curve Lab

Draw time, pitch, and space onto sound.

Audio Curve Lab is a browser-based classroom tool for electronic music and sound composition. Students can load an audio file, draw time-stretch, pitch, and pan curves over the waveform, then export the result as a WAV file.

The audio file is processed locally in the student's browser. It is not uploaded to a server.

## Classroom Use

1. Open the website.
2. Click `Open Audio` and choose a short audio file.
3. Select `Time Stretch`, `Pitch`, or `Pan`.
4. Draw points directly on the waveform.
5. Use `Play` for a quick check.
6. Use `Download WAV` to export the transformed sound.
7. Use `Clear Curve` to reset only the selected curve, or `Reset All` to reset every curve.
8. Import the WAV into a DAW, Max, or another composition environment.

## Why This Is Useful

Audio Curve Lab helps students treat sound as flexible compositional material:

- Time can be stretched, compressed, or shaped as a curve.
- Pitch can move gradually through glissandi or larger register shifts.
- Pan can become a composed spatial motion.
- The result is a concrete WAV file students can reuse in their pieces.

The tool is especially useful before introducing more technical systems such as Csound, Max/MSP, phase vocoders, or granular synthesis code.

## Current Engine

- Realtime `Play`: Web Audio API / AudioWorklet transform engine.
- `Download WAV`: browser-based offline transform export.

This version is not yet a high-end time-stretch engine. It is a classroom workflow prototype. The current internal algorithm is intentionally hidden from the main interface so the tool can later support different engines, including granular synthesis, Csound, Rubber Band, a phase-vocoder renderer, or a server-side rendering pipeline.

## Browser Compatibility

Recommended: Chrome, Edge, or Safari on a laptop or desktop browser.

The app uses standard browser audio features: Web Audio API, AudioWorklet, Canvas, and local file decoding. These are stable browser technologies, but audio-file decoding can vary slightly by browser and operating system. WAV, AIFF, MP3, and M4A are the safest formats to use in class.

For long-term maintenance, test the site once or twice a semester in the browsers used by students.

## GitHub Pages

This is a static website. It can be hosted directly with GitHub Pages from the repository root.

## Run Locally

```sh
cd /Users/hyunsukjun/Documents/Codex/2026-08-20/referenced-chatgpt-conversation-this-is-an/AudioCurveLab
python3 -m http.server 5174
```

Then open:

```text
http://127.0.0.1:5174/
```

Do not use `file://` for regular testing. Browser audio features are more reliable through `localhost` or `https://`.

## Current Stage

This project is currently in local classroom-prototype development. The next work should focus on interaction, curve editing, sound quality, and export behavior before any public GitHub Pages deployment.

## Recommended Student Notes

- Use short files first, around 5 to 30 seconds.
- Use a laptop or desktop browser.
- Chrome, Edge, and Safari are the first browsers to test.
- If the browser slows down, reload the page and use a shorter file.
- Downloaded WAV files are created by the browser and can be imported into a DAW.
