# CLAUDE.md

No One is a polymetric drum machine with no downbeat. Six synthesized voices loop at
their own lengths, and a "guard" listener rotates any voice that starts to build a felt
beat or bar. The goal now is to turn it from a sketch into a real instrument.

## Commands

    npm install
    npm run dev        # Vite dev server with hot reload
    npm run build      # dist/index.html, one self-contained file (vite-plugin-singlefile)
    npm run preview    # serve the build
    npm run format     # prettier over src/ and index.html

There are no tests yet. Web Audio needs localhost or https, not file://.

## Layout

- `index.html` holds the markup for panels U1–U4 and loads `src/main.js`.
- `src/main.js` is the entry point. It builds each panel and starts the monitor.
- `src/state.js` holds the shared mutable state in `st`: the current rhythm `pat`, guard state `S`, the AudioContext, the output chain and the voice buffers. Modules read and write `st.*` directly.
- `src/guard.js` contains `advance()` (one step plus the guard) and `stepDur()` (the clock). Live play and offline export both use it, so a change here changes both.
- `src/transport.js` is the look-ahead scheduler: a 25 ms tick that schedules 120 ms ahead.
- `src/dsp/` does sample-level synthesis without Web Audio nodes. `voices.js` holds one "circuit" per voice, driven by RC component values.
- `src/audio/` has `chain.js` (spring reverb, tape drive, hiss, master) and `engine.js` (buffer rendering, `hit()`, `audition()`).
- `src/model/` has `constants.js` (voice definitions `VO`, allowed `LENS`, `GUARDS`, `RULES`) and `rhythm.js` (presets, `sanitize()`, localStorage).
- `src/ui/` has one module per panel, plus `monitor.js` for the canvas and `persist.js` for the debounced save.
- `src/export/` has the 32-second offline render with its WAV and ZIP encoders, and Copy rhythm.

## Conventions

- Plain ES modules with no framework and no runtime dependencies. Keep the build output to a single file.
- Hard rules of the instrument:
  - The first step of a loop is ghost only.
  - Accents never stack.
  - Bar-making lengths (2, 4, 8, 12, 16) are never offered.
  - The guard has no off switch.
- New guard behaviour must run identically in live play and export, so put it in `guard.js`, not in the UI.
- Saved rhythms go through `sanitize()`. When you add a field to the rhythm model, add it there too, or old saves and imports will drop it.
- After editing, run `npm run format`.

## Known issues

- "Tempt it" never makes the guard move. The three accents land together and get demoted to plain hits, so the pulse peaks at about 1.4–1.5× the mean, below the 1.6–2.15× thresholds.
- `V.gong` and `V.hatO` in `dsp/voices.js` are written but not used by any voice.
- Copy rhythm has no matching paste or import.

## Design direction

J's research notes, kept as written. J says the ideas and texts below come from J's own knowledge and haven't been checked, so treat them as starting points.

### Machines worth looking at

* Radel (India): a Bangalore company that has made Indian practice instruments for decades. Its Taalmala electronic tabla units play tala cycles, and there are also electronic tanpuras (drones). Radel’s own history dates its first product, a Shrutibox, to 1971. Vintage Radel tabla units turn up on Reverb listed as “Indian analog drum machines”, and the current Taalmala manuals are online. They show how a machine is organised around tala cycles instead of bars.
* Arranger keyboards in the Middle East: the rhythm machine of much regional pop has been the arranger keyboard (rhythm and accompaniment built in) rather than a standalone drum machine. The Syrian Cassette Archives describe the Ketron Vega (1998) shipping with Laff, Baladi and Sa’idi rhythms, plus daf, darbuka and tabla sounds, and being used to build dabke rhythms. Korg still makes “Oriental” editions of its Pa arranger keyboards with Middle Eastern rhythms and quarter-tone scales.

### Ideas from rhythmic systems

These are from my own knowledge rather than checked sources, so treat them as starting points:

* Khali in Hindustani tala: cycles have a structurally “empty” section, marked by a wave of the hand instead of a clap. That’s a principle the guard could enforce: a moving region of the cycle where voices thin out to ghosts.
* Eduppu in Carnatic music: a composition can start before or after the cycle’s strong point. Your random start point is a crude version of this; a deliberate offset per voice would be closer.
* Gamelan colotomic structure: gong punctuation marks the end of a cycle rather than its beginning. A felt arrival still forms that way, so it’s a counterpoint to No One rather than a fit.
* West African timelines: an asymmetric bell pattern serves as the shared reference, and players relate to it from different positions. A “timeline” voice the guard keeps everything else from locking to would translate this well.
* Aksak rhythms (Balkans and Turkey): additive groupings like 2+2+3. Accents follow the groups instead of a bar position, which suits your odd loop lengths.
* Arabic iqa’: cycles are defined by dum (low) and tak (high) strokes. That’s a different vocabulary from kick and snare, and could replace them. The 13th-century theorist Safi al-Din al-Urmawi notated rhythmic cycles as circles, much like the orbit rings.

### Texts to reference

From my knowledge; I haven’t checked these in this session:

* Godfried Toussaint, The Geometry of Musical Rhythm (2013): Euclidean rhythms and the geometry of timelines across cultures. It’s the closest match to how No One already works.
* Justin London, Hearing in Time: how listeners infer meter and downbeats, useful for sharpening what the listener detects.
* Martin Clayton, Time in Indian Music (2000): tala in depth, including sam and khali.
* Simha Arom, African Polyphony and Polyrhythm (1991): detailed transcriptions of interlocking parts.
* Kofi Agawu, Representing African Music (2003): a useful counterweight. He argues against the Western habit of describing African music as having no downbeat, which keeps the project honest about what it’s borrowing.
* Michael Tenzer, Gamelan Gong Kebyar (2000): cycle structure in Balinese music.
* Jeff Pressing, “Cognitive isomorphisms between pitch and rhythm in world musics” (1983): how the standard bell pattern parallels the diatonic scale.

The khali region and dum/tak strokes would be the easiest to add to the No One prompt. A real Taalmala manual is also worth reading for how a commercial machine organised tala cycles.

### Sources

* [Radel: Magic Boxes](https://www.radel.in/2015/12/15/radel-magic-boxes/)
* [Radel: About us](https://www.radel.in/about-us/)
* [Radel Taalmala Digi-60 DX](https://radel.in/?p=143)
* [Taalmala Digi 108 manual (PDF)](https://radel.in/wp-content/uploads/2014/12/TAALMALA-DIGI-108-2024.pdf)
* [Vintage Radel analog electronic tabla on Reverb](https://reverb.com/item/44663313-vintage-radel-indian-analog-drum-machine-electronic-tabla)
* [Syrian Cassette Archives feature on the Org](https://syriancassettearchives.org/features/FEAT_0023?lang=en)
* [Korg Pa700 Oriental](https://www.korg.com/hken/products/synthesizers/pa700_oriental/)
* [Synthtopia on the Korg Pa5X Middle Eastern edition](https://www.synthtopia.com/content/2024/07/20/new-korg-pa5x-professional-arranger-keyboard-features-middle-eastern-sounds-rhythms/)
