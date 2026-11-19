// Look-ahead scheduler: every 25 ms, schedule steps up to 120 ms ahead.
import {st, queue} from './state.js';
import {advance, stepDur, newState} from './guard.js';
import {ensure, hit} from './audio/engine.js';
import {syncRows, showNow} from './ui/rows.js';
import {saveSoon} from './ui/persist.js';
import {$} from './lib/dom.js';

let nextT = 0,
  timer = null;
function tick() {
  const {AC, CH, BUF, pat} = st;
  while (nextT < AC.currentTime + 0.12) {
    const S = st.S,
      ev = advance(S, pat);
    ev.forEach((e) => hit(AC, CH, BUF, pat, e.v, e.s, nextT));
    queue.push({at: nextT, t: S.t - 1, E: S.hist[S.hist.length - 1].E});
    nextT += stepDur(S, pat);
  }
  if (st.S.flash) {
    st.S.flash = 0;
    syncRows();
    saveSoon();
  }
}

export function setPlay(on) {
  if (on && !ensure()) return;
  st.playing = on;
  $('#play').setAttribute('aria-pressed', String(on));
  $('#play').textContent = on ? 'Stop' : 'Play';
  if (on) {
    st.S = newState();
    nextT = st.AC.currentTime + 0.06;
    queue.length = 0;
    tick();
    timer = setInterval(tick, 25);
  } else {
    clearInterval(timer);
    timer = null;
    queue.length = 0;
    st.shownT = -1;
    showNow();
  }
}

export function initTransport() {
  $('#play').addEventListener('click', () => setPlay(!st.playing));
  addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) {
      e.preventDefault();
      setPlay(!st.playing);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && st.playing) setPlay(false);
  });
}
