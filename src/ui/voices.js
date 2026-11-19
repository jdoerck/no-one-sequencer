// U3 voice level/tune/decay table and U4 output stage sliders.
import {$} from '../lib/dom.js';
import {st} from '../state.js';
import {VO} from '../model/constants.js';
import {rerender, fxOf} from '../audio/engine.js';
import {saveSoon} from './persist.js';
import {markPreset} from './presets.js';

// Callbacks that push st.pat values back into the sliders after a rhythm is loaded.
export const voiceBinds = [];

export function buildVoices() {
  const T = $('#vtab');
  T.innerHTML =
    '<span></span><span class="h">Level</span><span class="h">Tune</span><span class="h">Decay</span>';
  VO.forEach((vo, i) => {
    const nm = document.createElement('span');
    nm.textContent = vo.n;
    T.append(nm);
    // [key, min, max, step, format, needs re-render]
    [
      ['level', 0, 1, 0.01, (v) => Math.round(v * 100) + '%', 0],
      ['tune', -12, 12, 1, (v) => (v > 0 ? '+' : '') + v + ' st', 1],
      ['decay', 0.3, 3, 0.01, (v) => '×' + v.toFixed(2), 1],
    ].forEach(([k, a, b, stp, f, re]) => {
      const c = document.createElement('div');
      const r = document.createElement('input');
      r.type = 'range';
      r.min = a;
      r.max = b;
      r.step = stp;
      r.value = st.pat.voices[i][k];
      r.setAttribute('aria-label', `${vo.n} ${k}`);
      const o = document.createElement('output');
      o.textContent = f(st.pat.voices[i][k]);
      r.addEventListener('input', () => {
        st.pat.voices[i][k] = +r.value;
        o.textContent = f(+r.value);
        saveSoon();
        markPreset();
        if (re) rerender(i);
      });
      c.append(r, o);
      T.append(c);
      voiceBinds.push(() => {
        r.value = st.pat.voices[i][k];
        o.textContent = f(st.pat.voices[i][k]);
      });
    });
  });
}

export function buildOut() {
  const O = $('#out');
  [
    ['spring', 'Spring tank', 0, 1, 0.01, (v) => Math.round(v * 100) + '%'],
    ['drive', 'Tape drive', 0, 1, 0.01, (v) => Math.round(v * 100) + '%'],
    ['master', 'Master', 0, 1.5, 0.01, (v) => Math.round(v * 100) + '%'],
  ].forEach(([k, l, a, b, stp, f]) => {
    const r = document.createElement('div');
    r.className = 'ctl';
    r.innerHTML = `<label for="o-${k}">${l}</label><output></output><input type="range" id="o-${k}" min="${a}" max="${b}" step="${stp}">`;
    const inp = r.querySelector('input'),
      o = r.querySelector('output');
    inp.value = st.pat.fx[k];
    o.textContent = f(st.pat.fx[k]);
    inp.addEventListener('input', () => {
      st.pat.fx[k] = +inp.value;
      o.textContent = f(st.pat.fx[k]);
      if (st.CH) st.CH.upd(fxOf(st.pat));
      saveSoon();
      markPreset();
    });
    voiceBinds.push(() => {
      inp.value = st.pat.fx[k];
      o.textContent = f(st.pat.fx[k]);
    });
    O.append(r);
  });
}
