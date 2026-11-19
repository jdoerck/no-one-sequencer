// The downbeat guard and step clock. Shared by live play and offline export.
import {TAU} from './dsp/util.js';
import {VO, WGT} from './model/constants.js';

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
  };
}

// Advance one step: return the events {v,s} to play and, if the guard is on, rotate a voice
// away from any 4-step (beat) or 8-step (bar) pulse that is forming. Mutates p.voices[].rot.
export function advance(S, p) {
  const ev = [];
  let starts = 0;
  for (let i = 0; i < 6; i++) {
    const v = p.voices[i];
    if (v.mute) continue;
    const idx = (((S.t + v.rot) % v.len) + v.len) % v.len;
    if (idx === 0) starts++;
    let s = v.steps[idx];
    if (idx === 0 && s > 1) s = 1;
    if (s > 0) ev.push({v: i, s});
  }
  if (starts >= 2) S.align++;
  const acc = ev.filter((e) => e.s === 3);
  if (acc.length > 1) {
    S.unstack++;
    acc.forEach((e) => (e.s = 2));
  }
  const contrib = new Float32Array(6);
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
      S.t++;
      S.cool--;
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
        const vc = new Float32Array(6);
        win.forEach((h) => {
          if (h.t % P === ph) for (let i = 0; i < 6; i++) vc[i] += h.c[i];
        });
        let vi = 0;
        for (let i = 1; i < 6; i++) if (vc[i] > vc[vi]) vi = i;
        p.voices[vi].rot += 1;
        S.moved++;
        S.cool = 24;
        S.flash = 1;
        S.log = `Moved ${VO[vi].n.toLowerCase()} one step: a ${P === 4 ? 'beat' : 'bar'} pulse was forming`;
        break;
      }
    }
  }
  S.t++;
  S.cool--;
  return ev;
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
