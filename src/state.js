// Mutable app state shared across modules. Modules read and write fields on `st` directly.
import {loadStored} from './model/rhythm.js';
import {newState} from './guard.js';

export const st = {
  pat: loadStored(), // current rhythm
  S: newState(), // guard/clock state for live play
  AC: null,
  CH: null,
  AN: null,
  BUF: [], // AudioContext, output chain, analyser, per-voice {n,a} buffers
  playing: false,
  shownT: -1, // step currently shown as playing
};
// Scheduled steps waiting to be displayed, and the recent displayed steps for the gravity meter.
export const queue = [],
  lastE = [];
