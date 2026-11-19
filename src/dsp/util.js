// Shared DSP constants and helpers.
export const TAU = 2 * Math.PI;
export const rnd = () => Math.random() * 2 - 1;
// Peak-normalise to 0.95 and apply a short fade-out tail.
export function norm(o) {
  let pk = 0;
  for (const v of o) pk = Math.max(pk, Math.abs(v));
  if (pk > 0) {
    const g = 0.95 / pk;
    for (let i = 0; i < o.length; i++) o[i] *= g;
  }
  const f = Math.min(o.length, Math.round(o.length * 0.02) + 32);
  for (let i = 0; i < f; i++) o[o.length - 1 - i] *= i / f;
  return o;
}
