// The dial panel: three dials on a Voice, Output or Khali page, and tempo set apart.
import {$} from '../lib/dom.js';
import {st} from '../state.js';
import {VO, KHALI_W} from '../model/constants.js';
import {rerender, fxOf} from '../audio/engine.js';
import {saveSoon} from './persist.js';
import {markPreset} from './presets.js';
import {dial} from './dial.js';
import {syncRows} from './rows.js';

const pct = (v) => Math.round(v * 100) + '%';
let tab = 'voice',
  live = [],
  tempo = null;
const TABS = [
  ['voice', 'Voice'],
  ['output', 'Output'],
  ['khali', 'Khali'],
];

// A change made from a dial: save, and re-pick the preset label.
const touched = () => {
  saveSoon();
  markPreset();
};

function voicePage() {
  const i = st.sel,
    v = () => st.pat.voices[i],
    common = {face: 'var(--vc)', pointer: 'var(--vt)'};
  // [key, label, min, max, step, format, needs re-render]
  return [
    ['level', 'Level', 0, 1, 0.01, pct, 0],
    ['tune', 'Tune', -12, 12, 1, (x) => (x > 0 ? '+' : '') + x + ' st', 1],
    ['decay', 'Decay', 0.3, 3, 0.01, (x) => '×' + x.toFixed(2), 1],
  ].map(([k, label, min, max, step, fmt, re]) =>
    dial({
      ...common,
      label,
      min,
      max,
      step,
      fmt,
      get: () => v()[k],
      set: (x) => (v()[k] = x),
      onSet: () => {
        touched();
        if (re) rerender(i);
      },
    }),
  );
}

function outputPage() {
  return [
    ['spring', 'Spring', 0, 1, pct],
    ['drive', 'Drive', 0, 1, pct],
    ['master', 'Master', 0, 1.5, pct],
  ].map(([k, label, min, max, fmt]) =>
    dial({
      label,
      min,
      max,
      step: 0.01,
      fmt,
      face: 'var(--paper-300)',
      pointer: 'var(--ink)',
      get: () => st.pat.fx[k],
      set: (x) => (st.pat.fx[k] = x),
      onSet: () => {
        if (st.CH) st.CH.upd(fxOf(st.pat));
        touched();
      },
    }),
  );
}

function khaliPage() {
  const k = () => st.pat.khali;
  const share = dial({
    label: 'Share',
    min: KHALI_W[0],
    max: KHALI_W[1],
    step: 1,
    fmt: (x) => x + '%',
    face: 'var(--paper-300)',
    pointer: 'var(--ink)',
    get: () => k().w,
    set: (x) => (k().w = x),
    onSet: touched,
  });
  const key = (text, field) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pkey';
    b.textContent = text;
    b.addEventListener('click', () => {
      k()[field] = k()[field] ? 0 : 1;
      refreshPanel();
      touched();
    });
    return {
      el: b,
      sync: () => {
        b.setAttribute('aria-pressed', String(!!k()[field]));
        if (field === 'hole') b.disabled = !k().on;
      },
    };
  };
  const on = key('Khali', 'on');
  const syncShare = share.sync;
  share.sync = () => {
    syncShare();
    share.setDisabled(!k().on);
  };
  return [share, on, key('Silent start', 'hole')];
}

const PAGES = {voice: voicePage, output: outputPage, khali: khaliPage};

// Rebuild the three slots (after a tab or voice change).
export function buildPanel() {
  const slots = $('#slots');
  slots.replaceChildren();
  live = PAGES[tab]();
  live.forEach((d) => slots.append(d.el));
  $('#panel').className = `panel v${st.sel}`;
  [...$('#tabs').children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === tab)));
  refreshPanel();
}

// Push model values back into the dials (after a rhythm is loaded or edited elsewhere).
export function refreshPanel() {
  live.forEach((d) => d.sync());
  if (tempo) tempo.sync();
}

export function initPanel() {
  TABS.forEach(([id, text]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab';
    b.dataset.tab = id;
    b.textContent = text;
    b.addEventListener('click', () => {
      tab = id;
      buildPanel();
    });
    $('#tabs').append(b);
  });
  tempo = dial({
    label: 'Tempo',
    min: 50,
    max: 170,
    step: 1,
    size: 70,
    fmt: (x) => x + ' bpm',
    face: 'var(--lcd-bg)',
    pointer: 'var(--lcd-amber)',
    get: () => st.pat.tempo,
    set: (x) => (st.pat.tempo = x),
    onSet: () => {
      syncRows(); // updates the LCD's bpm and cycle seconds
      touched();
    },
  });
  $('#tempoSlot').append(tempo.el);
  buildPanel();
}
