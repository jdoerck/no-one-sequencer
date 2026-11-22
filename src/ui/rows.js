// The loop rings (the main surface), the voice keys, loop length, mute and rotate.
import {$, toast} from '../lib/dom.js';
import {st, queue, lastE} from '../state.js';
import {VO, LENS} from '../model/constants.js';
import {ensure, audition} from '../audio/engine.js';
import {saveSoon} from './persist.js';
import {markPreset} from './presets.js';
import {syncGuard} from './guard.js';
import {buildPanel, refreshPanel} from './voices.js';

const NS = 'http://www.w3.org/2000/svg';
const CX = 160,
  R0 = 146,
  PITCH = (R0 - 26) / VO.length,
  THICK = PITCH - 4,
  GAP = 3;
const bass = VO.map((v) => v.fn === 'pulse' || v.fn === 'drop');
let ring, rings, hubN, flashEl, keys;
let groups = [],
  segs = [];
// Cycle line for the LCD, set by syncRows.
export let cycleText = '';
export const setHub = (n) => {
  if (hubN.textContent !== String(n)) hubN.textContent = n;
};
export const flashMark = () => {
  flashEl.classList.add('flash');
  setTimeout(() => flashEl.classList.remove('flash'), 1000);
};

// Common tail after any edit to the rhythm.
const edited = () => {
  syncRows();
  saveSoon();
  markPreset();
};
// Position of voice v at global step t, accounting for rotation.
export const stepIdx = (v, t) => (((t + v.rot) % v.len) + v.len) % v.len;

const el = (tag, attrs, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.append(n);
  return n;
};
const pt = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CX + r * Math.sin(a)];
};
const f2 = (p) => p.map((n) => n.toFixed(2)).join(' ');
const segPath = (ro, ri, a0, a1) => {
  const lg = a1 - a0 > 180 ? 1 : 0;
  return `M${f2(pt(ro, a0))}A${ro} ${ro} 0 ${lg} 1 ${f2(pt(ro, a1))}L${f2(pt(ri, a1))}A${ri} ${ri} 0 ${lg} 0 ${f2(pt(ri, a0))}Z`;
};

// Accent is a flag on a tak or dum step; ghosts and off steps cannot take it.
function toggleAccent(i, k) {
  const v = st.pat.voices[i];
  if (v.steps[k] < 2) {
    toast('Only tak, dum take accent', true);
    flashMark();
    return;
  }
  v.acc[k] = v.acc[k] ? 0 : 1;
  edited();
  if (v.acc[k] && !st.playing && ensure()) audition(i, v.steps[k], true);
}

export function selectVoice(i) {
  st.sel = i;
  syncRows();
  buildPanel();
}

// Draw every ring from the model. Cheap enough to redo on each edit.
function renderRings() {
  rings.replaceChildren();
  groups = [];
  segs = [];
  VO.forEach((vo, i) => {
    const v = st.pat.voices[i],
      ro = R0 - i * PITCH,
      ri = ro - THICK,
      g = el('g', {class: `ring v${i}`}, rings),
      step = 360 / v.len,
      row = [];
    for (let k = 0; k < v.len; k++) {
      const a0 = -90 + k * step + GAP / 2,
        a1 = -90 + (k + 1) * step - GAP / 2,
        s = v.steps[k];
      const p = el(
        'path',
        {
          class: 'seg' + (k === 0 ? ' k0' : '') + (v.acc[k] ? ' acc' : ''),
          d: segPath(ro, ri, a0, a1),
          'data-v': i,
          'data-k': k,
          'data-s': s,
        },
        g,
      );
      const t = el('title', {}, p);
      t.textContent = `${vo.n} step ${k + 1}: ${['off', 'ghost', 'tak', 'dum'][s]}${v.acc[k] ? ', accented' : ''}`;
      row.push(p);
      const am = (a0 + a1) / 2;
      if (s === 3) {
        const rs = ri + THICK * 0.3,
          d = (a1 - a0) * 0.22;
        el('path', {class: 'stripe', d: `M${f2(pt(rs, a0 + d))}A${rs} ${rs} 0 0 1 ${f2(pt(rs, a1 - d))}`}, g);
      }
      if (v.acc[k]) {
        const [x, y] = pt(ro - THICK * 0.3, am);
        el('circle', {class: 'dot', cx: x.toFixed(2), cy: y.toFixed(2), r: 2}, g);
      }
    }
    segs.push(row);
    groups.push(g);
  });
  el('circle', {class: 'selring', cx: CX, cy: CX, r: R0 - st.sel * PITCH - THICK - 2.2}, rings);
  paintNow();
}

// Playhead on the current step of each ring, and the dimmed bass rings during khali.
function paintNow() {
  segs.forEach((row, i) => {
    const v = st.pat.voices[i],
      idx = st.shownT < 0 ? -1 : stepIdx(v, st.shownT);
    row.forEach((p, k) => p.classList.toggle('now', k === idx));
    groups[i].style.opacity = (v.mute ? 0.3 : 1) * (bass[i] ? [1, 0.65, 0.35][st.shownKh] : 1);
  });
}

export function buildRows() {
  ring = $('#ring');
  ring.replaceChildren();
  rings = el('g', {}, ring);
  const hub = el('g', {}, ring);
  el('circle', {class: 'hub', cx: CX, cy: CX, r: 22}, hub);
  hubN = el('text', {class: 'hubn', x: CX, y: CX + 3}, hub);
  hubN.textContent = '0';
  const u = el('text', {class: 'hubu', x: CX, y: CX + 14}, hub);
  u.textContent = '1s';
  flashEl = el('g', {}, ring);
  el('circle', {class: 'mark', cx: CX, cy: 7, r: 4.5}, flashEl);
  el('line', {class: 'mark-x', x1: CX - 6, y1: 12, x2: CX + 6, y2: 2}, flashEl);

  // Delegated pointer handling: a tap on another ring selects it; on the selected ring it edits the step.
  // A long press (touch) or Shift-click toggles the accent.
  let press = 0,
    held = false;
  ring.addEventListener('pointerdown', (e) => {
    held = false;
    clearTimeout(press);
    const p = e.target.closest('.seg');
    if (!p || +p.dataset.v !== st.sel) return;
    press = setTimeout(() => {
      held = true;
      toggleAccent(+p.dataset.v, +p.dataset.k);
    }, 400);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) =>
    ring.addEventListener(ev, () => clearTimeout(press)),
  );
  ring.addEventListener('click', (e) => {
    if (held) {
      held = false;
      return;
    }
    const p = e.target.closest('.seg');
    if (!p) return;
    const i = +p.dataset.v,
      k = +p.dataset.k;
    if (i !== st.sel) return selectVoice(i);
    if (e.shiftKey) return toggleAccent(i, k);
    // Cycle off -> tak -> dum -> ghost; the first step only toggles off <-> ghost.
    const v = st.pat.voices[i],
      order = k === 0 ? [0, 1] : [0, 2, 3, 1],
      cur = v.steps[k];
    v.steps[k] = order[(order.indexOf(cur) + 1) % order.length];
    if (v.steps[k] < 2) v.acc[k] = 0;
    if (k === 0 && cur === 0) {
      toast('Downbeat refused', true);
      flashMark();
    }
    edited();
    if (v.steps[k] && !st.playing && ensure()) audition(i, v.steps[k], !!v.acc[k]);
  });

  // Voice keys: select and audition.
  const K = $('#vkeys');
  K.replaceChildren();
  keys = VO.map((vo, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `vkey v${i}`;
    b.innerHTML = `<span>${vo.n}</span><span class="num"></span>`;
    b.addEventListener('click', () => {
      selectVoice(i);
      if (ensure()) audition(i);
    });
    K.append(b);
    return b;
  });

  // Loop length, mute and rotate act on the selected voice.
  const len = (d) => {
    const v = st.pat.voices[st.sel],
      j = Math.min(LENS.length - 1, Math.max(0, LENS.indexOf(v.len) + d));
    v.len = LENS[j];
    edited();
  };
  $('#lenDn').addEventListener('click', () => len(-1));
  $('#lenUp').addEventListener('click', () => len(1));
  $('#mute').addEventListener('click', () => {
    st.pat.voices[st.sel].mute ^= 1;
    edited();
  });
  $('#rotL').addEventListener('click', () => {
    st.pat.voices[st.sel].rot += 1;
    edited();
  });
  $('#rotR').addEventListener('click', () => {
    st.pat.voices[st.sel].rot -= 1;
    edited();
  });
  syncRows();
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a),
  lcm = (a, b) => (a / gcd(a, b)) * b;

export function syncRows() {
  const pat = st.pat,
    sv = pat.voices[st.sel];
  renderRings();
  keys.forEach((b, i) => {
    const v = pat.voices[i];
    b.querySelector('.num').textContent = v.len;
    b.setAttribute('aria-pressed', String(i === st.sel));
    b.classList.toggle('muted', !!v.mute);
    b.setAttribute('aria-label', `${VO[i].n}, ${v.len} steps${v.mute ? ', muted' : ''}`);
  });
  $('#lenO').textContent = `${VO[st.sel].n} · ${sv.len} steps`;
  $('#lenDn').disabled = sv.len === LENS[0];
  $('#lenUp').disabled = sv.len === LENS[LENS.length - 1];
  $('#mute').setAttribute('aria-pressed', String(!!sv.mute));
  const L = pat.voices.filter((v) => !v.mute).reduce((a, v) => lcm(a, v.len), 1);
  cycleText = `${L} steps · ${((L * 60) / pat.tempo / 4).toFixed(0)} s`;
  $('#lcdBpm').textContent = pat.tempo;
  refreshPanel();
  syncGuard();
}

// Pop scheduled steps whose time has come and highlight the current step on each ring.
export function showNow() {
  let t = -1,
    kh = 0;
  if (st.playing && st.AC) {
    while (queue.length && queue[0].at <= st.AC.currentTime) {
      const q = queue.shift();
      t = q.t;
      kh = q.kh;
      lastE.push(q);
      if (lastE.length > 64) lastE.shift();
    }
  }
  if (t >= 0) {
    st.shownT = t;
    st.shownKh = kh;
  }
  if (!st.playing) st.shownKh = 0;
  paintNow();
}
