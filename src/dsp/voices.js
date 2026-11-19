// Voice circuits: each renders one hit into a Float32Array from RC component values.
// P = component params, sr = sample rate, acc = accented hit.
import {TAU, rnd, norm} from './util.js';
import {bq, run} from './biquad.js';
export const RAT = [1, 1.483, 1.734, 2.051, 2.394, 2.812];
export const V = {
  kick(P, sr, acc) {
    const f0 = 1 / (TAU * P.rT * P.cT),
      tau = P.rD * P.cD * (P.fb ? 3 : 1),
      tp = P.rP * P.cP,
      L = Math.ceil(sr * Math.min(4, tau * 6 + 0.05)),
      o = new Float32Array(L),
      dr = 1 + P.drive * 5 * (acc ? 1.5 : 1),
      sw = Math.pow(2, P.sweep) - 1;
    let ph = 0,
      ph2 = 0;
    for (let i = 0; i < L; i++) {
      const t = i / sr,
        f = f0 * (1 + sw * Math.exp(-t / tp));
      ph += f / sr;
      ph2 += (f * 0.749) / sr;
      let s = Math.sin(TAU * ph);
      if (P.dual) s = s * 0.7 + 0.5 * Math.sin(TAU * ph2);
      let c = t < 0.004 ? rnd() * P.click * (1 - t / 0.004) : 0;
      if (P.fb) s += 0.15 * Math.sin(TAU * ph * 2.01) * Math.exp(-t / (tau * 0.4));
      o[i] = Math.tanh((s * Math.exp(-t / tau) + c) * dr);
    }
    return norm(o);
  },
  tom(P, sr, acc) {
    const f0 = 1 / (TAU * P.rT * P.cT),
      tau = P.rD * P.cD * (P.ring ? 2.5 : 1),
      tp = P.slack ? 0.2 : 0.06,
      dd = P.slack ? P.drop * 1.6 : P.drop,
      L = Math.ceil(sr * Math.min(3, tau * 6 + 0.05)),
      o = new Float32Array(L);
    let ph = 0,
      lp = 0;
    for (let i = 0; i < L; i++) {
      const t = i / sr;
      ph += (f0 * (1 + dd * Math.exp(-t / tp))) / sr;
      lp += (rnd() - lp) * 0.08;
      o[i] = Math.tanh(
        (Math.sin(TAU * ph) * Math.exp(-t / tau) + lp * 3 * P.noise * Math.exp(-t / 0.03)) *
          1.4 *
          (acc ? 1.4 : 1),
      );
    }
    return norm(o);
  },
  snare(P, sr, acc) {
    const f0 = 1 / (TAU * P.rT * P.cT),
      tb = P.rD * P.cD,
      fc = 1 / (TAU * P.rF * P.cF),
      ts = P.rS * P.cS * (P.loose ? 2.2 : 1),
      bp = bq('bp', fc, 0.8, sr),
      L = Math.ceil(sr * Math.min(3, Math.max(tb, ts) * 6 + 0.05)),
      o = new Float32Array(L);
    let p1 = 0,
      p2 = 0;
    for (let i = 0; i < L; i++) {
      const t = i / sr,
        f = f0 * (1 + 0.12 * Math.exp(-t / 0.012));
      p1 += f / sr;
      p2 += (f * 1.47) / sr;
      let body = (Math.sin(TAU * p1) + 0.55 * Math.sin(TAU * p2)) * Math.exp(-t / tb);
      if (P.bitter) body *= 0.5 + 0.9 * Math.sin(TAU * f * 2.31 * t);
      let n = run(bp, rnd()) * Math.exp(-t / ts);
      if (P.loose) n *= 1 + 0.7 * Math.sign(Math.sin(TAU * 31 * t)) * Math.exp(-t / 0.15);
      o[i] = Math.tanh((body * (1 - P.tone) + n * P.tone * 3) * 1.6 * (acc ? 1.4 : 1));
    }
    return norm(o);
  },
  clap(P, sr, acc) {
    const fc = 1 / (TAU * P.rF * P.cF),
      T = 0.7 * P.rB * P.cB,
      td = P.rD * P.cD,
      n = Math.round(P.n),
      bp = bq('bp', fc, 1.4, sr),
      bp2 = bq('bp', fc * 1.7, 1.6, sr),
      times = [];
    let t0 = 0;
    for (let k = 0; k < n; k++) {
      times.push(t0);
      t0 += T * (P.smear ? 0.5 + Math.random() * 1.3 : 1);
    }
    const tn = times[n - 1],
      L = Math.ceil(sr * Math.min(3, tn + td * 6 + 0.05)),
      o = new Float32Array(L);
    for (let i = 0; i < L; i++) {
      const t = i / sr;
      let e = 0;
      for (let k = 0; k < n - 1; k++) if (t >= times[k]) e = Math.max(e, Math.exp(-(t - times[k]) / 0.005));
      if (t >= tn) e = Math.max(e, Math.exp(-(t - tn) / td));
      const x = rnd();
      o[i] = Math.tanh((run(bp, x) + (P.doubled ? 0.7 * run(bp2, x) : 0)) * e * 3 * (acc ? 1.4 : 1));
    }
    return norm(o);
  },
  metal(base, fc, tau, oscs, sr, acc, lpf, ring, maxL) {
    const bp = bq('bp', fc, 1.2, sr),
      hp = bq('hp', fc * 0.6, 0.7, sr),
      L = Math.ceil(sr * Math.min(maxL, tau * 6 + 0.03)),
      o = new Float32Array(L),
      ph = new Float64Array(6),
      lpk = lpf ? 1 - Math.exp((-TAU * lpf) / sr) : 0;
    let lp = 0;
    for (let i = 0; i < L; i++) {
      const t = i / sr;
      let s = 0;
      for (let k = 0; k < oscs; k++) {
        ph[k] += (base * RAT[k]) / sr;
        ph[k] -= Math.floor(ph[k]);
        s += ph[k] < 0.5 ? 1 : -1;
      }
      s /= oscs;
      let y = run(hp, run(bp, s));
      if (lpk) {
        lp += (y - lp) * lpk;
        y = lp * 2.5;
      }
      if (ring) y *= Math.sin(TAU * base * 0.63 * t);
      o[i] = Math.tanh(y * Math.exp(-t / tau) * 4 * (acc ? 1.4 : 1));
    }
    return norm(o);
  },
  hatC(P, sr, acc) {
    return V.metal(
      1 / (TAU * P.rM * P.cM),
      1 / (TAU * P.rB * P.cB),
      P.rC * P.cC,
      P.broken ? 3 : 6,
      sr,
      acc,
      0,
      0,
      1,
    );
  },
  hatO(P, sr, acc) {
    return V.metal(
      1 / (TAU * P.rM * P.cM),
      1 / (TAU * P.rB * P.cB),
      P.rO * P.cO,
      P.broken ? 3 : 6,
      sr,
      acc,
      0,
      0,
      3,
    );
  },
  gong(P, sr, acc) {
    const b = 1 / (TAU * P.rM * P.cM);
    return V.metal(b, b * 6, P.rD * P.cD, 6, sr, acc, 500 + P.tone * 6000, P.ring, 5);
  },
  clang(P, sr, acc) {
    const f1 = 1 / (TAU * P.rA * P.cA),
      f2 = 1 / (TAU * P.rB * P.cB),
      tau = P.rD * P.cD,
      bp = bq('bp', Math.sqrt(f1 * f2) * 2, 2, sr),
      L = Math.ceil(sr * Math.min(3, tau * 6 + 0.05)),
      o = new Float32Array(L);
    let a = 0,
      b = 0,
      ln = 0;
    for (let i = 0; i < L; i++) {
      const t = i / sr,
        d = 1 + 0.05 * Math.exp(-t / 0.01);
      a += (f1 * d) / sr;
      b += (f2 * d) / sr;
      a -= Math.floor(a);
      b -= Math.floor(b);
      let s = (a < 0.5 ? 1 : -1) * (b < 0.5 ? 1 : -1);
      if (P.rust) {
        ln += (rnd() - ln) * 0.02;
        s *= 0.4 + Math.abs(ln) * 6;
      }
      o[i] = Math.tanh(run(bp, s) * Math.exp(-t / tau) * 3 * (acc ? 1.4 : 1));
    }
    return norm(o);
  },
};
