// Per-sample biquad filter (RBJ cookbook): bandpass, highpass, lowpass.
import {TAU} from './util.js';
export function bq(type, f, Q, sr) {
  const w = (TAU * Math.min(f, sr * 0.45)) / sr,
    cs = Math.cos(w),
    a = Math.sin(w) / (2 * Q),
    a0 = 1 + a;
  let b0, b1, b2;
  if (type === 'bp') {
    b0 = a;
    b1 = 0;
    b2 = -a;
  } else if (type === 'hp') {
    b0 = (1 + cs) / 2;
    b1 = -(1 + cs);
    b2 = (1 + cs) / 2;
  } else {
    b0 = (1 - cs) / 2;
    b1 = 1 - cs;
    b2 = (1 - cs) / 2;
  }
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: (-2 * cs) / a0,
    a2: (1 - a) / a0,
    x1: 0,
    x2: 0,
    y1: 0,
    y2: 0,
  };
}
export const run = (f, x) => {
  const y = f.b0 * x + f.b1 * f.x1 + f.b2 * f.x2 - f.a1 * f.y1 - f.a2 * f.y2;
  f.x2 = f.x1;
  f.x1 = x;
  f.y2 = f.y1;
  f.y1 = y;
  return y;
};
