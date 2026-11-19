# No One — A drum machine with no downbeat

Polymetric drum synth: six voices, each looping at its own prime-ish length.
A "guard" listener rotates loops away when it detects a solid beat or bar pulse
starting to form. The result is rhythm without a fixed 1 / the bar you can feel
but never lock onto.

## Running

Serve over localhost (AudioWorklet needs a secure context):

    python3 -m http.server 8000

Then open http://localhost:8000/

## Architecture

- Single self-contained HTML file. Zero dependencies beyond Google Fonts.
- Voice synthesis is Web Audio API BiquadFilter + gain nodes — no sampled audio.
- Rhythms are stored in localStorage (`noone-rhythm`). Export as WAV + JSON (32-second render).

