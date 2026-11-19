# No One — A drum machine with no downbeat

Polymetric drum synth: six voices, each looping at its own prime-ish length.
A "guard" listener rotates loops away when it detects a solid beat or bar pulse
starting to form. The result is rhythm without a fixed 1 / the bar you can feel
but never lock onto.

## Running

    npm install
    npm run dev        # dev server with hot reload, prints a localhost URL
    npm run build      # writes dist/index.html, a single self-contained file
    npm run preview    # serves the built file
    npm run format     # prettier over src/ and index.html

The built `dist/index.html` has all JS and CSS inlined (vite-plugin-singlefile),
so it can be opened, shared or published as one file, like the original.
Web Audio needs a secure context, so open it from localhost or https rather than file://.

## Layout

    index.html            page markup (panels U1–U4); loads src/main.js
    src/
      main.js             entry point: builds every panel, starts the monitor
      state.js            shared mutable state (current rhythm, audio context, guard state)
      guard.js            the downbeat guard and step clock (used live and in export)
      transport.js        look-ahead scheduler, Play/Stop, space bar
      styles.css
      dsp/                sample-level synthesis, no Web Audio
        util.js           TAU, noise, normalise
        biquad.js         per-sample biquad filter
        voices.js         voice circuits (dum, drop, tak, tali, tick, wash, ring, bell)
      audio/
        chain.js          output stage: spring reverb, tape drive, hiss, master
        engine.js         renders voice buffers, plays hits, re-renders on tune/decay
      model/
        constants.js      voice definitions, loop lengths, guard levels and rules
        rhythm.js         presets, JSON sanitising, localStorage
      ui/
        guard.js          U1 guard panel
        rows.js           U2 loop rows and tempo
        voices.js         U3 voice table, U4 output stage
        presets.js        preset menu, New rhythm, Tempt it
        monitor.js        orbit rings and gravity meter canvas
        persist.js        debounced save
      export/
        take.js           32-second offline render, Copy rhythm
        wav.js, zip.js    encoders
      lib/
        dom.js            $ and toast
        claude-shim.js    stand-in for window.claude.use('downloads') outside claude.ai

## How it works

- Each voice is rendered once into an AudioBuffer by a JS "circuit" in `src/dsp/voices.js`
  (sine/square oscillators, noise and biquads computed sample by sample from RC values),
  then triggered with AudioBufferSourceNodes through the output chain.
- `guard.js` keeps the last 64 steps of weighted hit energy. If the energy summed by
  phase mod 4 (beat) or mod 8 (bar) peaks above a threshold, it rotates the voice
  contributing most by one step.
- Rhythms are stored in localStorage (`noone-rhythm`). Export renders 32 seconds offline
  with the same guard and saves WAV + JSON in a zip.
