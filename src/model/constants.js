// Static configuration: the six voices, allowed loop lengths, step levels, guard levels and rules.

// Each voice: display name, circuit fn, default component values, which params tune (tk) and decay (dk) scale,
// weight in the guard's pulse detector (w), and reverb send.
export const VO = [
  {
    n: 'Kick',
    fn: 'kick',
    P: {rT: 47000, cT: 4.7e-8, rD: 470000, cD: 1e-6, rP: 10000, cP: 1e-6, sweep: 2, drive: 0.3, click: 0.3},
    tk: ['rT'],
    dk: ['rD'],
    w: 1.6,
    send: 0.05,
  },
  {
    n: 'Tom',
    fn: 'tom',
    P: {rT: 68000, cT: 2.2e-8, rD: 220000, cD: 1e-6, drop: 0.8, noise: 0.2},
    tk: ['rT'],
    dk: ['rD'],
    w: 1,
    send: 0.2,
  },
  {
    n: 'Snare',
    fn: 'snare',
    P: {rT: 33000, cT: 2.2e-8, rD: 47000, cD: 2.2e-6, rF: 6800, cF: 1e-8, rS: 100000, cS: 2.2e-6, tone: 0.5},
    tk: ['rT', 'rF'],
    dk: ['rD', 'rS'],
    w: 1.2,
    send: 0.3,
  },
  {
    n: 'Clap',
    fn: 'clap',
    P: {rF: 10000, cF: 1.5e-8, rB: 15000, cB: 1e-6, rD: 100000, cD: 2.2e-6, n: 4},
    tk: ['rF'],
    dk: ['rD'],
    w: 0.9,
    send: 0.45,
  },
  {
    n: 'Hat',
    fn: 'hatC',
    P: {rM: 33000, cM: 1e-8, rB: 10000, cB: 2.2e-9, rC: 22000, cC: 1e-6},
    tk: ['rM', 'rB'],
    dk: ['rC'],
    w: 0.4,
    send: 0.15,
  },
  {
    n: 'Clang',
    fn: 'clang',
    P: {rA: 22000, cA: 1e-8, rB: 39000, cB: 1e-8, rD: 150000, cD: 1e-6},
    tk: ['rA', 'rB'],
    dk: ['rD'],
    w: 0.7,
    send: 0.3,
  },
];

// Loop lengths on offer (bar-making lengths 2, 4, 8, 12, 16 left out).
export const LENS = [3, 5, 6, 7, 9, 10, 11, 13, 14, 15];
// Per step state (0 off, 1 ghost, 2 hit, 3 accent): output amplitude and guard weight.
export const AMP = [0, 0.32, 1, 1.45],
  WGT = [0, 0.3, 1, 1.7];
export const GUARDS = ['Gentle', 'Strict', 'Absolute'];
// [minimum guard level, rule text]
export const RULES = [
  [0, 'The first step of every loop can only whisper (ghost notes only).'],
  [0, 'Accents never stack: when two land together, both play as plain hits.'],
  [0, 'Loop lengths that make bars (2, 4, 8, 12, 16) are unavailable.'],
  [
    1,
    'A listener watches the last 64 steps. When a beat or bar pulse starts to form, it rotates the voice causing it by one step.',
  ],
  [2, 'The listener is more sensitive, and the clock drifts, so even the step grid never settles.'],
];
