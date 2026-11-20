// "Export 32 seconds": render offline with the same guard, save WAV + JSON as a zip. Also "Copy rhythm".
import {$, toast} from '../lib/dom.js';
import {st} from '../state.js';
import {clone} from '../model/rhythm.js';
import {newState, advance, stepDur} from '../guard.js';
import {chain} from '../audio/chain.js';
import {makeBufs, hit, fxOf} from '../audio/engine.js';
import {wav16} from './wav.js';
import {zip} from './zip.js';

let DL = null;

async function exportTake() {
  const sr = 44100,
    secs = 32,
    len = Math.ceil((secs + 2.5) * sr);
  toast('Rendering 32 seconds…');
  try {
    const oc = new OfflineAudioContext(1, len, sr),
      p = clone(st.pat),
      ch = chain(oc, fxOf(p), true),
      bufs = makeBufs(oc, p);
    ch.out.connect(oc.destination);
    const St = newState();
    let t = 0.02;
    while (t < secs) {
      const ev = advance(St, p);
      ev.forEach((e) => hit(oc, ch, bufs, p, e.v, e.s, t, e.a));
      t += stepDur(St, p);
    }
    const out = await oc.startRendering(),
      d = out.getChannelData(0);
    let pk = 0;
    for (const v of d) pk = Math.max(pk, Math.abs(v));
    if (pk > 0.98) for (let i = 0; i < d.length; i++) d[i] *= 0.98 / pk;
    const n =
      (p.name || 'rhythm')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + `_${p.tempo}bpm_no-one`;
    await DL.save({
      filename: n + '.zip',
      data: zip([
        {name: n + '.wav', data: wav16(d, sr)},
        {
          name: n + '.json',
          data: new TextEncoder().encode(
            JSON.stringify(Object.assign({}, st.pat, {guardMovesInTake: St.moved}), null, 1),
          ),
        },
      ]),
    });
    toast('Saved ' + n + '.zip');
  } catch (e) {
    const c = e && e.code;
    if (c === 'declined') return;
    toast(
      c === 'rate_limited'
        ? 'A save prompt is already open'
        : 'The take could not be rendered or saved here.',
    );
  }
}

function copyRhythm() {
  const t = JSON.stringify(st.pat, null, 1);
  try {
    navigator.clipboard.writeText(t).then(
      () => toast('Rhythm copied'),
      () => toast('Copy was blocked here'),
    );
  } catch (e) {
    toast('Copy was blocked here');
  }
}

export function initExport() {
  (async () => {
    try {
      DL = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    } catch (e) {
      DL = null;
    }
    if (DL) $('#exp').hidden = false;
  })();
  $('#exp').addEventListener('click', exportTake);
  $('#copy').addEventListener('click', copyRhythm);
}
