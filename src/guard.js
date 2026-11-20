// The downbeat guard and step clock. Shared by live play and offline export.
import {TAU} from './dsp/util.js';
import {VO, WGT, NV} from './model/constants.js';

export function newState() {
  return {
    t: 7 + Math.floor(Math.random() * 997),
    hist: [],
    moved: 0,
    unstack: 0,
    align: 0,
    cool: 0,
    log: '',
    flash: 0,
    emptied: 0,
    // Khali clock: position in the current pass and the pass length. Starts at a random point.
    khPass: khaliPass(),
    khPos: Math.floor(Math.random() * 19),
    kh: 0,
    khRest: 0,
  };
}

// The khali comes round once per pass. Each pass length is drawn from 15-29, skipping multiples
// of 4, so the empty region never settles onto the beat or bar grid.
export function khaliPass() {
  let L;
  do L = 15 + Math.floor(Math.random() * 15);
  while (L % 4 === 0);
  return L;
}
// Whether the clock is inside the khali: 0 outside, 2 inside.
export function khaliDepth(S, p) {
  const k = p.khali;
  return k && k.on && S.khPos < k.w ? 2 : 0;
}

// Inside the khali only ghosts play. Every stroke falls to a ghost and loses its accent, and each
// ghost gets its step and the next one to itself: other strokes on its step and everything on the
// step after are dropped. That rest also holds when the step after is past the end of the khali.
function khali(S, p, ev) {
  const d = khaliDepth(S, p);
  S.kh = d;
  if (S.khRest) {
    S.khRest = 0;
    S.emptied += ev.length;
    return [];
  }
  if (!d || !ev.length) return ev;
  ev.forEach((e) => {
    if (e.s > 1 || e.a) S.emptied++;
  });
  S.emptied += ev.length - 1;
  S.khRest = 1;
  return [{...ev[0], s: 1, a: 0}];
}

// Advance one step: return the events {v,s,a,k} to play and, if the guard is on, rotate a voice
// away from any 4-step (beat) or 8-step (bar) pulse that is forming. Mutates p.voices[].rot.
export function advance(S, p) {
  let ev = [];
  let starts = 0;
  for (let i = 0; i < NV; i++) {
    const v = p.voices[i];
    if (v.mute) continue;
    const idx = (((S.t + v.rot) % v.len) + v.len) % v.len;
    if (idx === 0) starts++;
    let s = v.steps[idx];
    if (idx === 0 && s > 1) s = 1;
    if (s > 0) ev.push({v: i, s, a: v.acc ? v.acc[idx] : 0, k: idx});
  }
  if (starts >= 2) S.align++;
  ev = khali(S, p, ev);
  const acc = ev.filter((e) => e.s === 3);
  if (acc.length > 1) {
    S.unstack++;
    acc.forEach((e) => (e.s = 2));
  }
  // Accents never stack either: only the first of several accented strokes keeps its accent.
  ev.filter((e) => e.a && e.s > 1)
    .slice(1)
    .forEach((e) => (e.a = 0));
  const contrib = new Float32Array(NV);
  let E = 0;
  ev.forEach((e) => {
    const w = VO[e.v].w * WGT[e.s];
    contrib[e.v] = w;
    E += w;
  });
  S.hist.push({t: S.t, E, c: contrib});
  if (S.hist.length > 80) S.hist.shift();
  if (p.guard >= 1 && S.cool <= 0 && S.hist.length >= 64) {
    const win = S.hist.slice(-64),
      thr = p.guard === 2 ? [1.6, 1.9] : [1.8, 2.15];
    if (win.filter((h) => h.E > 0).length < 10) {
      tickClock(S);
      return ev;
    }
    for (const [pi, P] of [
      [0, 4],
      [1, 8],
    ]) {
      const sums = new Float32Array(P);
      let tot = 0;
      win.forEach((h) => {
        sums[h.t % P] += h.E;
        tot += h.E;
      });
      if (tot <= 0) break;
      const mean = tot / P;
      let ph = 0;
      for (let k = 1; k < P; k++) if (sums[k] > sums[ph]) ph = k;
      if (sums[ph] / mean > thr[pi]) {
        const vc = new Float32Array(NV);
        win.forEach((h) => {
          if (h.t % P === ph) for (let i = 0; i < NV; i++) vc[i] += h.c[i];
        });
        let vi = 0;
        for (let i = 1; i < NV; i++) if (vc[i] > vc[vi]) vi = i;
        p.voices[vi].rot += 1;
        S.moved++;
        S.cool = 24;
        S.flash = 1;
        S.log = `Moved ${VO[vi].n.toLowerCase()} one step: a ${P === 4 ? 'beat' : 'bar'} pulse was forming`;
        break;
      }
    }
  }
  tickClock(S);
  return ev;
}

function tickClock(S) {
  S.t++;
  S.cool--;
  if (++S.khPos >= S.khPass) {
    S.khPos = 0;
    S.khPass = khaliPass();
  }
}

// Seconds per 16th step; on Absolute the clock drifts.
export function stepDur(S, p) {
  let d = 60 / p.tempo / 4;
  if (p.guard === 2)
    d *=
      1 +
      0.07 * Math.sin((TAU * S.t) / 37) +
      0.04 * Math.sin((TAU * S.t) / 11.3) +
      (Math.random() - 0.5) * 0.03;
  return d;
}
