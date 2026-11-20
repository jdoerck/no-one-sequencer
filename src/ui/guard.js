// U1: guard strength buttons and the rule list.
import {$} from '../lib/dom.js';
import {st} from '../state.js';
import {GUARDS, RULES, KHALI_RULE} from '../model/constants.js';
import {saveSoon} from './persist.js';
import {markPreset} from './presets.js';

export const dissolvedText = () =>
  `${st.S.moved} moved · ${st.S.unstack} accents unstacked · ${st.S.align} loop starts kept quiet · ${st.S.emptied} strokes emptied`;

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
  const kl = document.createElement('li');
  kl.id = 'khrule';
  kl.textContent = KHALI_RULE;
  $('#rules').append(kl);
  $('#khali').addEventListener('click', () => {
    st.pat.khali.on = st.pat.khali.on ? 0 : 1;
    khaliChanged();
  });
  $('#khw').addEventListener('input', (e) => {
    st.pat.khali.w = +e.target.value;
    khaliChanged();
  });
}
function khaliChanged() {
  syncGuard();
  saveSoon();
  markPreset();
}
export function syncGuard() {
  [...$('#guard').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === st.pat.guard)));
  const k = st.pat.khali;
  $('#khali').setAttribute('aria-pressed', String(!!k.on));
  $('#khw').value = k.w;
  $('#khwO').textContent = k.w + ' steps';
  $('#khw').disabled = !k.on;
  [...$('#rules').children].forEach((li) => {
    const on = li.id === 'khrule' ? !!k.on : +li.dataset.lvl <= st.pat.guard;
    li.className = on ? 'on' : 'off';
  });
  $('#guardro').textContent = dissolvedText();
}
