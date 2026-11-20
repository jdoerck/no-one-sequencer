// Rhythm data: preset patterns, validation of loaded JSON, and localStorage persistence.
import {LENS, NV, VO, FX, TEMPO} from './constants.js';

// Step string: '.' off, 'g' ghost, 'x' tak, 'X' dum, 'A' accented tak, 'D' accented dum.
// The first step is clamped to ghost. Returns the steps (0-3) and the accent flags (0/1).
export const parse = (s) => {
  const code = {g: [1, 0], x: [2, 0], X: [3, 0], A: [2, 1], D: [3, 1]};
  const a = [...s].map((c) => code[c] || [0, 0]).slice(0, 16);
  while (a.length < 16) a.push([0, 0]);
  if (a[0][0] > 1) a[0] = [1, 0];
  return {steps: a.map((c) => c[0]), acc: a.map((c) => c[1])};
};
export const mkv = (len, str, o) => Object.assign({len, ...parse(str), rot: 0, mute: 0}, o || {});
// Voices take their default level/tune/decay from VO unless the preset overrides them.
const R = (name, tempo, guard, vs, khali = {on: 0, w: 25, hole: 0}) => ({
  name,
  tempo,
  guard,
  khali,
  voices: vs.map((v, i) => Object.assign({}, VO[i].mix, v)),
  fx: {...FX},
});

export const PRESETS = [
  R('Seven against nine', TEMPO, 1, [
    mkv(7, '.x...x.'),
    mkv(9, '...g..x..'),
    mkv(5, '..X..'),
    mkv(11, '.....x....g'),
    mkv(3, '.xg'),
    mkv(13, '........X....'),
    mkv(10, '..g....x..'),
  ]),
  R('Prime field', 112, 1, [
    mkv(5, '.x..x'),
    mkv(13, '..x.....x..g.'),
    mkv(11, '....X......'),
    mkv(7, '......x', {mute: 1}),
    mkv(5, 'gx.xx'),
    mkv(3, '..x'),
    mkv(9, '...x...g.'),
  ]),
  R('Lopsided', 84, 2, [
    mkv(9, '..x....x.'),
    mkv(10, '.g...x...g'),
    mkv(7, '...X...'),
    mkv(14, '.........x...g'),
    mkv(6, '.xgxg.'),
    mkv(15, '.....X.........'),
    mkv(11, '.....g..x..'),
  ]),
  R(
    'Sparse orbit',
    70,
    1,
    [
      mkv(11, '....x......'),
      mkv(15, '..........x....'),
      mkv(13, '.......X.....'),
      mkv(9, '..g......'),
      mkv(7, '.x..x.g'),
      mkv(5, '...X.'),
      mkv(14, '......x......g'),
    ],
    {on: 1, w: 6},
  ),
];

export const clone = (o) => JSON.parse(JSON.stringify(o));

// Coerce untrusted JSON into a valid rhythm, falling back to preset 0 values.
export function sanitize(o) {
  const p = clone(PRESETS[0]);
  if (!o || typeof o !== 'object') return p;
  const n = (v, a, b, d) => {
    v = +v;
    return isFinite(v) ? Math.max(a, Math.min(b, v)) : d;
  };
  if (o.name) p.name = String(o.name).slice(0, 40);
  p.tempo = Math.round(n(o.tempo, 50, 170, TEMPO));
  p.guard = Math.round(n(o.guard, 0, 2, 1));
  // Rhythms saved before the khali was added load with it off.
  const k = o.khali && typeof o.khali === 'object' ? o.khali : {};
  p.khali = {on: k.on ? 1 : 0, w: Math.round(n(k.w, 15, 40, 25)), hole: k.hole ? 1 : 0};
  // Rhythms saved before Breath was added have 6 voices; the missing ones take preset 0's defaults.
  if (Array.isArray(o.voices) && o.voices.length >= 6 && o.voices.length <= NV)
    p.voices = p.voices.map((d, i) => {
      const v = o.voices[i];
      if (!v || typeof v !== 'object') return d;
      const len = LENS.includes(+v.len) ? +v.len : d.len;
      const steps = Array.from({length: 16}, (_, k) => {
        let s = Array.isArray(v.steps) ? Math.round(n(v.steps[k], 0, 3, 0)) : 0;
        if (k === 0 && s > 1) s = 1;
        return s;
      });
      // An accent only sits on a tak or dum step.
      const acc = steps.map((s, k) => (s > 1 && v.acc && v.acc[k] ? 1 : 0));
      return {
        len,
        steps,
        acc,
        rot: Math.round(n(v.rot, -999, 999, 0)),
        mute: v.mute ? 1 : 0,
        level: n(v.level, 0, 1, d.level),
        tune: Math.round(n(v.tune, -12, 12, d.tune)),
        decay: n(v.decay, 0.3, 3, d.decay),
      };
    });
  if (o.fx)
    for (const [k, a, b] of [
      ['spring', 0, 1],
      ['drive', 0, 1],
      ['master', 0, 1.5],
    ])
      if (o.fx[k] !== undefined) p.fx[k] = n(o.fx[k], a, b, p.fx[k]);
  return p;
}

const KEY = 'noone-rhythm';
export function loadStored() {
  let p;
  try {
    const s = localStorage.getItem(KEY);
    p = s ? sanitize(JSON.parse(s)) : null;
  } catch (e) {}
  return p || clone(PRESETS[0]);
}
export function store(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch (e) {}
}
