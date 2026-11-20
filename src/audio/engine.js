// Live audio engine: renders voice buffers and plays hits through the output chain.
import {V} from '../dsp/voices.js';
import {VO, AMP} from '../model/constants.js';
import {chain} from './chain.js';
import {st} from '../state.js';
import {toast} from '../lib/dom.js';

// Voice params with the rhythm's tune (semitones) and decay multiplier applied, then the stroke's overrides.
// stroke is 'open' (dum), 'closed' (tak) or undefined for the base voice.
export function vParams(i, p, stroke) {
  const vo = VO[i],
    v = p.voices[i],
    P = Object.assign({}, vo.P),
    tf = Math.pow(2, -v.tune / 12);
  vo.tk.forEach((k) => (P[k] *= tf));
  vo.dk.forEach((k) => (P[k] *= v.decay));
  const ov = stroke && vo[stroke];
  if (ov) {
    for (const k in ov.m) P[k] *= ov.m[k];
    Object.assign(P, ov.s);
  }
  return P;
}
const toBuf = (ctx, d) => {
  const b = ctx.createBuffer(1, d.length, ctx.sampleRate);
  b.getChannelData(0).set(d);
  return b;
};
// Closed (tak) and open (dum) buffer per voice.
const renderVoice = (ctx, p, i) => {
  const fn = V[VO[i].fn];
  return {
    closed: toBuf(ctx, fn(vParams(i, p, 'closed'), ctx.sampleRate)),
    open: toBuf(ctx, fn(vParams(i, p, 'open'), ctx.sampleRate)),
  };
};
export function makeBufs(ctx, p) {
  return VO.map((_, i) => renderVoice(ctx, p, i));
}
export const fxOf = (p) => Object.assign({decay: 2, stone: 0.35, hiss: 0.08}, p.fx);

// Create the AudioContext on first user gesture. Returns false if audio is unavailable.
export function ensure() {
  if (st.AC) {
    if (st.AC.state === 'suspended') st.AC.resume();
    return true;
  }
  try {
    st.AC = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    toast('Audio is unavailable in this browser');
    return false;
  }
  st.CH = chain(st.AC, fxOf(st.pat), true);
  st.AN = st.AC.createAnalyser();
  st.AN.fftSize = 1024;
  st.CH.out.connect(st.AN);
  st.AN.connect(st.AC.destination);
  st.BUF = makeBufs(st.AC, st.pat);
  return true;
}

// Schedule one hit of voice i at step state s (1-3) at time t. Dum (3) uses the open buffer, the rest closed.
export function hit(ctx, ch, bufs, p, i, s, t) {
  const src = ctx.createBufferSource();
  src.buffer = s === 3 ? bufs[i].open : bufs[i].closed;
  const g = ctx.createGain(),
    sg = ctx.createGain();
  g.gain.value = p.voices[i].level * AMP[s];
  sg.gain.value = VO[i].send;
  src.connect(g);
  g.connect(ch.dry);
  g.connect(sg);
  sg.connect(ch.send);
  src.start(t);
}
// Audition voice i now.
export const audition = (i, s = 2) => hit(st.AC, st.CH, st.BUF, st.pat, i, s, st.AC.currentTime + 0.01);

// Re-render one voice after a tune/decay change (debounced), auditioning it when stopped.
const reT = [];
export function rerender(i) {
  clearTimeout(reT[i]);
  reT[i] = setTimeout(() => {
    if (!st.AC) return;
    st.BUF[i] = renderVoice(st.AC, st.pat, i);
    if (!st.playing) audition(i);
  }, 80);
}
