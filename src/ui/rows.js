// U2: one row per voice with step cells, loop length, rotate and mute; plus tempo.
import {$, toast} from '../lib/dom.js';
import {st, queue, lastE} from '../state.js';
import {VO, LENS} from '../model/constants.js';
import {ensure, audition} from '../audio/engine.js';
import {saveSoon} from './persist.js';
import {markPreset} from './presets.js';
import {syncGuard} from './guard.js';

const rowEls = [];
// Common tail after any edit to the rhythm.
const edited = () => {
  syncRows();
  saveSoon();
  markPreset();
};
// Position of voice v at global step t, accounting for rotation.
export const stepIdx = (v, t) => (((t + v.rot) % v.len) + v.len) % v.len;

export function buildRows() {
  const R = $('#rows');
  R.innerHTML = '';
  rowEls.length = 0;
  VO.forEach((vo, i) => {
    const row = document.createElement('div');
    row.className = 'vrow';
    const lab = document.createElement('button');
    lab.type = 'button';
    lab.className = 'lab';
    lab.textContent = vo.n;
    lab.title = 'Tap to hear';
    lab.addEventListener('click', () => {
      if (ensure()) audition(i);
    });
    const cells = document.createElement('div');
    cells.className = 'cells';
    const cs = [];
    for (let k = 0; k < 16; k++) {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'cell' + (k === 0 ? ' first' : '');
      // Cycle off -> tak -> dum -> ghost; the first step only toggles off <-> ghost.
      c.addEventListener('click', () => {
        const v = st.pat.voices[i];
        const order = k === 0 ? [0, 1] : [0, 2, 3, 1];
        const cur = v.steps[k];
        v.steps[k] = order[(order.indexOf(cur) + 1) % order.length];
        if (k === 0 && cur === 0) toast('The first step of a loop can only whisper');
        edited();
        if (v.steps[k] && !st.playing && ensure()) audition(i, v.steps[k]);
      });
      cells.append(c);
      cs.push(c);
    }
    const rc = document.createElement('div');
    rc.className = 'rc';
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', vo.n + ' loop length');
    LENS.forEach((L) => {
      const o = document.createElement('option');
      o.value = L;
      o.textContent = L + ' steps';
      sel.append(o);
    });
    sel.addEventListener('change', () => {
      st.pat.voices[i].len = +sel.value;
      edited();
    });
    const mk = (t, l, f) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t;
      b.setAttribute('aria-label', l);
      b.addEventListener('click', f);
      return b;
    };
    const rl = mk('◀', `Rotate ${vo.n} earlier`, () => {
        st.pat.voices[i].rot += 1;
        edited();
      }),
      rr = mk('▶', `Rotate ${vo.n} later`, () => {
        st.pat.voices[i].rot -= 1;
        edited();
      });
    const mu = mk('M', 'Mute ' + vo.n, () => {
      st.pat.voices[i].mute ^= 1;
      edited();
    });
    rc.append(sel, rl, rr, mu);
    row.append(lab, cells, rc);
    R.append(row);
    rowEls.push({row, cs, sel, mu});
  });
  syncRows();
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a),
  lcm = (a, b) => (a / gcd(a, b)) * b;

export function syncRows() {
  const pat = st.pat;
  rowEls.forEach(({row, cs, sel, mu}, i) => {
    const v = pat.voices[i];
    cs.forEach((c, k) => {
      c.classList.toggle('gone', k >= v.len);
      c.dataset.s = v.steps[k];
      c.setAttribute(
        'aria-label',
        `${VO[i].n} step ${k + 1}: ${['off', 'ghost', 'tak', 'dum'][v.steps[k]]}`,
      );
    });
    sel.value = v.len;
    mu.setAttribute('aria-pressed', String(!!v.mute));
    row.classList.toggle('muted', !!v.mute);
  });
  const L = pat.voices.filter((v) => !v.mute).reduce((a, v) => lcm(a, v.len), 1);
  $('#lcmro').textContent = `full cycle ${L} steps · ${((L * 60) / pat.tempo / 4).toFixed(0)} s`;
  $('#tempo').value = pat.tempo;
  $('#tempoO').textContent = pat.tempo + ' bpm';
  syncGuard();
}

// Pop scheduled steps whose time has come and highlight the current cell in each row.
export function showNow() {
  let t = -1;
  if (st.playing && st.AC) {
    while (queue.length && queue[0].at <= st.AC.currentTime) {
      const q = queue.shift();
      t = q.t;
      lastE.push(q);
      if (lastE.length > 64) lastE.shift();
    }
  }
  if (t >= 0) st.shownT = t;
  rowEls.forEach(({cs}, i) => {
    const v = st.pat.voices[i],
      idx = st.shownT < 0 ? -1 : stepIdx(v, st.shownT);
    cs.forEach((c, k) => c.classList.toggle('now', k === idx));
  });
}

export function initTempo() {
  $('#tempo').addEventListener('input', (e) => {
    st.pat.tempo = +e.target.value;
    edited();
  });
}
