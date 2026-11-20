// Static configuration: the voices, allowed loop lengths, step levels, guard levels and rules.

// Each voice: display name, default level/tune/decay (mix), circuit fn, default component values, which params tune (tk) and decay (dk) scale,
// weight in the guard's pulse detector (w), and reverb send.
export const VO = [
  {
    n: 'Pulse',
    mix: {level: 0.78, tune: 0, decay: 0.56},
    fn: 'pulse',
    open: {m: {rD: 1.6, rP: 1.5}, s: {sweep: 3, click: 0.15}},
    closed: {m: {rD: 0.35}, s: {sweep: 1, click: 0.8, drive: 0.5}},
    P: {rT: 47000, cT: 4.7e-8, rD: 470000, cD: 1e-6, rP: 10000, cP: 1e-6, sweep: 2, drive: 0.3, click: 0.3},
    tk: ['rT'],
    dk: ['rD'],
    w: 1.6,
    send: 0.05,
  },
  {
    n: 'Drop',
    mix: {level: 0.38, tune: 0, decay: 0.62},
    fn: 'drop',
    open: {m: {rD: 1.5}, s: {drop: 1.2, tp: 0.1, noise: 0.1}},
    closed: {m: {rD: 0.4}, s: {drop: 0.3, noise: 0.5}},
    P: {rT: 68000, cT: 2.2e-8, rD: 220000, cD: 1e-6, drop: 0.8, noise: 0.2},
    tk: ['rT'],
    dk: ['rD'],
    w: 1,
    send: 0.2,
  },
  {
    n: 'Tak',
    mix: {level: 0.21, tune: 0, decay: 0.3},
    fn: 'tak',
    open: {m: {rD: 1.8, rS: 1.3}, s: {tone: 0.3, bend: 0.3}},
    closed: {m: {rD: 0.5, rS: 0.5}, s: {tone: 0.7, bend: 0.05}},
    P: {rT: 33000, cT: 2.2e-8, rD: 47000, cD: 2.2e-6, rF: 6800, cF: 1e-8, rS: 100000, cS: 2.2e-6, tone: 0.5},
    tk: ['rT', 'rF'],
    dk: ['rD', 'rS'],
    w: 1.2,
    send: 0.3,
  },
  {
    n: 'Tali',
    mix: {level: 0.55, tune: 6, decay: 0.3},
    fn: 'tali',
    open: {m: {rD: 1.5, rF: 1.25}, s: {}},
    closed: {m: {rD: 0.5}, s: {n: 3}},
    P: {rF: 10000, cF: 1.5e-8, rB: 15000, cB: 1e-6, rD: 100000, cD: 2.2e-6, n: 4},
    tk: ['rF'],
    dk: ['rD'],
    w: 0.9,
    send: 0.45,
  },
  {
    n: 'Tick',
    mix: {level: 0.45, tune: 0, decay: 0.3},
    fn: 'tick',
    open: {m: {rC: 3, rB: 1.25}, s: {}},
    closed: {m: {rC: 0.6, rB: 0.8}, s: {}},
    P: {rM: 33000, cM: 1e-8, rB: 10000, cB: 2.2e-9, rC: 22000, cC: 1e-6},
    tk: ['rM', 'rB'],
    dk: ['rC'],
    w: 0.4,
    send: 0.15,
  },
  {
    n: 'Bell',
    mix: {level: 0.23, tune: 0, decay: 0.3},
    fn: 'bell',
    open: {m: {rD: 1.6}, s: {bend: 0.15}},
    closed: {m: {rD: 0.3}, s: {bend: 0.02}},
    P: {rA: 22000, cA: 1e-8, rB: 39000, cB: 1e-8, rD: 150000, cD: 1e-6},
    tk: ['rA', 'rB'],
    dk: ['rD'],
    w: 0.7,
    send: 0.3,
  },
  {
    n: 'Breath',
    mix: {level: 0.25, tune: 0, decay: 0.35},
    fn: 'breath',
    open: {m: {rD: 1.5}, s: {fall: 0.6}},
    closed: {m: {rA: 0.4, rD: 0.5}, s: {fall: 0.2}},
    P: {rF: 8200, cF: 1e-8, rA: 27000, cA: 2.2e-6, rD: 100000, cD: 3.3e-6},
    tk: ['rF'],
    dk: ['rD'],
    w: 0.3, // soft filler: barely counts toward a felt pulse
    send: 0.4,
  },
];
// Default output stage and tempo for new and preset rhythms.
export const FX = {spring: 0.3, decay: 2, stone: 0.35, drive: 0.01, hiss: 0.08, master: 0.9};
export const TEMPO = 87;
// Number of voices. Rhythms store voices by position, so new voices go at the end.
export const NV = VO.length;

// Loop lengths on offer (bar-making lengths 2, 4, 8, 12, 16 left out).
export const LENS = [3, 5, 6, 7, 9, 10, 11, 13, 14, 15];
// Per step state (0 off, 1 ghost, 2 hit, 3 accent): output amplitude and guard weight.
export const AMP = [0, 0.32, 1, 1.1],
  WGT = [0, 0.3, 1, 1.7];
export const GUARDS = ['Gentle', 'Strict', 'Absolute'];
// [minimum guard level, rule text]
export const RULES = [
  [0, 'The first step of every loop can only whisper (ghost notes only).'],
  [0, 'Dums never stack: when two land together, both play as tak.'],
  [0, 'Loop lengths that make bars (2, 4, 8, 12, 16) are unavailable.'],
  [
    1,
    'A listener watches the last 64 steps. When a beat or bar pulse starts to form, it rotates the voice causing it by one step.',
  ],
  [2, 'The listener is more sensitive, and the clock drifts, so even the step grid never settles.'],
];
