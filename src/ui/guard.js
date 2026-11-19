// U1: guard strength buttons and the rule list.
import {$} from '../lib/dom.js';
import {st} from '../state.js';
import {GUARDS, RULES} from '../model/constants.js';
import {saveSoon} from './persist.js';
import {markPreset} from './presets.js';

export const dissolvedText = () =>
  `${st.S.moved} moved · ${st.S.unstack} accents unstacked · ${st.S.align} loop starts kept quiet`;

export function buildGuard() {
  GUARDS.forEach((g, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = g;
    b.addEventListener('click', () => {
      st.pat.guard = i;
      syncGuard();
      saveSoon();
      markPreset();
    });
    $('#guard').append(b);
  });
  RULES.forEach(([lvl, t]) => {
    const li = document.createElement('li');
    li.textContent = t;
    li.dataset.lvl = lvl;
    $('#rules').append(li);
  });
}
export function syncGuard() {
  [...$('#guard').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === st.pat.guard)));
  [...$('#rules').children].forEach((li) => {
    const on = +li.dataset.lvl <= st.pat.guard;
    li.className = on ? 'on' : 'off';
  });
  $('#guardro').textContent = dissolvedText();
}
