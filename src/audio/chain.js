// Output stage: dry + spring-reverb send -> tape drive (waveshaper) -> master, with optional hiss.
import {TAU, rnd} from '../dsp/util.js';

// Synthetic spring-tank impulse response.
export function springIR(ctx, fx) {
  const sr = ctx.sampleRate,
    L = Math.max(1, Math.round(sr * fx.decay)),
    b = ctx.createBuffer(1, L, sr),
    d = b.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < L; i++) {
    const t = i / sr;
    lp += (rnd() - lp) * 0.25;
    const flutter = 0.6 + 0.4 * Math.cos(TAU * t * 28),
      chirp = 0.35 * Math.sin(TAU * (1700 - 900 * Math.min(1, t * 2)) * t) * Math.exp(-t * 7);
    d[i] = (lp * flutter + chirp) * Math.exp((-3.2 * t) / fx.decay);
  }
  for (let i = 0; i < 120; i++) d[i] *= i / 120;
  return b;
}

export function driveCurve(k) {
  const n = 1024,
    c = new Float32Array(n),
    g = 1 + k * 8;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * g) / Math.tanh(g);
  }
  return c;
}

// Works with both AudioContext (live) and OfflineAudioContext (export).
export function chain(ctx, fx, withHiss) {
  const dry = ctx.createGain(),
    send = ctx.createGain(),
    conv = ctx.createConvolver(),
    wlp = ctx.createBiquadFilter(),
    wet = ctx.createGain(),
    sum = ctx.createGain(),
    sh = ctx.createWaveShaper(),
    out = ctx.createGain();
  conv.normalize = true;
  conv.buffer = springIR(ctx, fx);
  wlp.type = 'lowpass';
  send.connect(conv).connect(wlp).connect(wet).connect(sum);
  dry.connect(sum);
  sum.connect(sh).connect(out);
  sh.oversample = '2x';
  const hg = ctx.createGain();
  if (withHiss) {
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate),
      nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = rnd();
    const ns = ctx.createBufferSource();
    ns.buffer = nb;
    ns.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    ns.connect(hp).connect(hg).connect(out);
    ns.start();
  }
  const upd = (f) => {
    wlp.frequency.value = 600 + f.stone * 6000;
    wet.gain.value = f.spring * 1.6;
    sh.curve = driveCurve(f.drive);
    sum.gain.value = 0.8;
    hg.gain.value = f.hiss * 0.03;
    out.gain.value = f.master;
  };
  upd(fx);
  return {dry, send, out, conv, upd};
}
