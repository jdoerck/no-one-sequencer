// Preset menu, "New rhythm" generator and "Tempt it".
import {$, toast} from '../lib/dom.js';
import {st} from '../state.js';
import {VO, LENS} from '../model/constants.js';
import {PRESETS, clone} from '../model/rhythm.js';
import {makeBufs, fxOf} from '../audio/engine.js';
import {syncRows} from './rows.js';
import {voiceBinds} from './voices.js';
import {saveSoon} from './persist.js';
import {setPlay} from '../transport.js';

const ps = () => $('#preset');

// Select the matching preset, or a "Your rhythm" entry when the rhythm has been edited.
export function markPreset() {
  const s = JSON.stringify(st.pat),
    i = PRESETS.findIndex((p) => JSON.stringify(p) === s);
  if (i >= 0) {
    ps().value = i;
    return;
  }
  if (!$('#custom')) {
    const o = document.createElement('option');
    o.value = '';
    o.id = 'custom';
    o.textContent = 'Your rhythm';
    ps().prepend(o);
  }
  ps().value = '';
}

export function loadPat(p) {
  st.pat = clone(p);
  syncRows();
  voiceBinds.forEach((f) => f());
  if (st.AC) {
    st.BUF = makeBufs(st.AC, st.pat);
    st.CH.upd(fxOf(st.pat));
  }
  saveSoon();
  markPreset();
}

// Euclidean distribution of k hits over L steps.
const euclid = (k, L) =>
  Array.from({length: L}, (_, i) => Math.floor(((i + 1) * k) / L) - Math.floor((i * k) / L));

function generate() {
  const pat = st.pat,
    pick = (a) => a[Math.floor(Math.random() * a.length)];
  const used = new Set();
  const dens = [0.25, 0.18, 0.2, 0.12, 0.45, 0.15, 0.15];
  const vs = VO.map((vo, i) => {
    let L;
    do {
      L = pick(LENS);
    } while (used.has(L) && used.size < LENS.length);
    used.add(L);
    const k = Math.max(1, Math.min(L - 1, Math.round(L * dens[i] * (0.7 + Math.random() * 0.7))));
    let e = euclid(k, L),
      r = 0;
    while (e[r % L] && r < L) r++;
    e = e.map((_, j) => e[(j + r) % L]);
    if (e[0]) e[0] = 0;
    const steps = e.map((x) => (x ? 2 : 0));
    const hits = steps.map((s, j) => (s ? j : -1)).filter((j) => j > 0);
    if (hits.length && Math.random() < 0.6) steps[pick(hits)] = 3;
    for (let j = 1; j < L; j++) if (!steps[j] && Math.random() < 0.08) steps[j] = 1;
    if (Math.random() < 0.3) steps[0] = 1;
    while (steps.length < 16) steps.push(0);
    return {
      len: L,
      steps,
      acc: Array(16).fill(0),
      rot: 0,
      mute: 0,
      level: VO[i].mix.level,
      tune: pat.voices[i].tune,
      decay: pat.voices[i].decay,
    };
  });
  loadPat(Object.assign({}, pat, {name: 'Your rhythm', voices: vs}));
  toast('New rhythm. No bar lines anywhere.');
}

// Force pulse, tak and tick onto a shared 6-step pulse so the guard has something to break up.
// All hits sit on even steps of a 6-step loop, which lands every one of them on the same two
// phases of a 4-step beat (the strongest pulse a non-bar length can make). Only one accent
// falls on each step, so the accents are not unstacked into plain hits.
const TEMPT_STEPS = {
  0: [0, 0, 3, 0, 2, 0], // pulse: accent, hit
  2: [0, 0, 0, 0, 3, 0], // tak: accent
  4: [0, 0, 2, 0, 2, 0], // tick: hit, hit
};
function tempt() {
  const pat = st.pat;
  [0, 2, 4].forEach((i) => {
    const v = pat.voices[i];
    v.len = 6;
    v.rot = 0;
    v.mute = 0;
    v.steps = [...TEMPT_STEPS[i], ...Array(10).fill(0)];
    v.acc = Array(16).fill(0);
  });
  pat.name = 'Your rhythm';
  syncRows();
  saveSoon();
  markPreset();
  if (!st.playing) setPlay(true);
  toast(
    pat.guard
      ? 'Pulse, tak and tick now share one 6-step pulse. Watch the listener pull them apart.'
      : 'Pulse, tak and tick now share one 6-step pulse. Gentle has no listener, so switch to Strict to see it dissolve.',
  );
}

export function buildPresets() {
  PRESETS.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = p.name;
    ps().append(o);
  });
  ps().addEventListener('change', () => {
    if (ps().value === '') return;
    loadPat(PRESETS[+ps().value]);
  });
  $('#gen').addEventListener('click', generate);
  $('#tempt').addEventListener('click', tempt);
}
