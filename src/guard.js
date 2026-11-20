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
const BREATH = VO.findIndex((v) => v.fn === 'breath');

// How deep the clock is in the khali: 0 outside, 1 on its edge steps, 2 in the middle.
export function khaliDepth(S, p) {
  const k = p.khali;
  if (!k || !k.on || S.khPos >= k.w) return 0;
  return S.khPos === 0 || S.khPos === k.w - 1 ? 1 : 2;
}

// Thin the events inside the khali. On the edge steps every stroke drops one level (dum to tak,
// tak to ghost); in the middle every stroke falls to a ghost and ghosts fall silent. Accents go.
// Breath swells instead: in the middle its strokes play as accented tak (never on its first step).
function khali(S, p, ev) {
  const d = khaliDepth(S, p);
  S.kh = d;
  if (!d) return ev;
  return ev.filter((e) => {
    if (e.v === BREATH) {
      if (d === 2 && e.k > 0) {
        e.s = Math.max(e.s, 2);
        e.a = 1;
      }
      return true;
    }
    const s0 = e.s,
      a0 = e.a;
    e.s = d === 1 ? Math.max(1, e.s - 1) : e.s - 1;
    e.a = 0;
    if (e.s !== s0 || a0) S.emptied++;
    return e.s > 0;
  });
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
