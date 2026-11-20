// Canvas monitor: one orbit ring per voice on the left, beat/bar gravity bars on the right, status line below.
import {$} from '../lib/dom.js';
import {st, lastE} from '../state.js';
import {TAU} from '../dsp/util.js';
import {VO, GUARDS} from '../model/constants.js';
import {showNow, stepIdx} from './rows.js';
import {dissolvedText} from './guard.js';

const IDLE =
  'Press Play. Each ring is a loop of its own length; the bars on the right show whether a steady pulse is forming.';
let mc;

function draw() {
  requestAnimationFrame(draw);
  showNow();
  const pat = st.pat,
    S = st.S,
    shownT = st.shownT;
  const r = mc.getBoundingClientRect(),
    d = Math.min(devicePixelRatio || 1, 2);
  if (mc.width !== Math.round(r.width * d)) {
    mc.width = Math.round(r.width * d);
    mc.height = Math.round(r.height * d);
  }
  const x = mc.getContext('2d');
  x.setTransform(d, 0, 0, d, 0, 0);
  const w = r.width,
    h = r.height;
  x.clearRect(0, 0, w, h);
  x.font = '10px "Azeret Mono",monospace';
  // Orbit rings
  const R0 = Math.min(h / 2 - 14, w * 0.3),
    cx = Math.min(w * 0.32, R0 + 20),
    cy = h / 2,
    ring = R0 / (VO.length + 1.2);
  VO.forEach((vo, i) => {
    const v = pat.voices[i],
      rr = R0 - i * ring,
      idx = shownT < 0 ? -1 : stepIdx(v, shownT);
    // Inside the khali every ring but Breath's dims; Breath swells.
    const dim = vo.fn === 'breath' ? 1 : [1, 0.65, 0.35][st.shownKh];
    x.globalAlpha = (v.mute ? 0.25 : 1) * dim;
    for (let k = 0; k < v.len; k++) {
      const a0 = -Math.PI / 2 + (k / v.len) * TAU,
        a1 = a0 + (TAU / v.len) * 0.84,
        s = v.steps[k];
      x.beginPath();
      x.arc(cx, cy, rr, a0, a1);
      x.arc(cx, cy, rr - ring * 0.72, a1, a0, true);
      x.closePath();
      x.fillStyle = k === idx && s ? '#efe9d6' : ['#0e2d20', '#2a5a44', '#8cffb4', '#ff5a3c'][s];
      x.fill();
      if (k === idx) {
        x.strokeStyle = '#efe9d6';
        x.lineWidth = 1.5;
        x.stroke();
        x.lineWidth = 1;
      }
      if (k === 0) {
        x.setLineDash([2, 2]);
        x.strokeStyle = '#93b39e';
        x.stroke();
        x.setLineDash([]);
      }
    }
    x.globalAlpha = 1;
  });
  x.fillStyle = '#efe9d6';
  x.textAlign = 'center';
  x.font = '600 13px "Azeret Mono",monospace';
  x.fillText(String(S.moved + S.unstack + S.align), cx, cy + 2);
  x.font = '9px "Azeret Mono",monospace';
  x.fillStyle = '#93b39e';
  x.fillText('1s dissolved', cx, cy + 14);
  x.textAlign = 'left';
  // Gravity meter: energy summed by step phase mod P over the last 64 steps
  const gx = cx + R0 + 30,
    gw = w - gx - 12;
  if (gw > 120) {
    const win = lastE.slice(-64),
      bars = (P, y0, hh, label) => {
        const s = new Float32Array(P);
        let tot = 0;
        win.forEach((q) => {
          s[q.t % P] += q.E;
          tot += q.E;
        });
        const mean = tot / P || 1,
          mx = Math.max(...s, mean * 2.4);
        x.fillStyle = '#93b39e';
        x.fillText(label, gx, y0 - 6);
        const bw = gw / P;
        for (let k = 0; k < P; k++) {
          const bh = (s[k] / mx) * hh;
          x.fillStyle = s[k] / mean > (P === 4 ? 1.6 : 1.85) ? '#ff5a3c' : '#8cffb4';
          x.fillRect(gx + k * bw + 2, y0 + hh - bh, bw - 4, bh);
        }
        const ty = y0 + hh - (mean / mx) * hh;
        x.strokeStyle = '#d9b45a';
        x.setLineDash([3, 3]);
        x.beginPath();
        x.moveTo(gx, ty);
        x.lineTo(gx + gw, ty);
        x.stroke();
        x.setLineDash([]);
        const peak = tot ? Math.max(...s) / mean : 0;
        x.textAlign = 'right';
        x.fillStyle = peak > (P === 4 ? 1.6 : 1.85) ? '#ff5a3c' : '#efe9d6';
        x.fillText(tot ? 'peak ×' + peak.toFixed(2) : '—', gx + gw, y0 - 6);
        x.textAlign = 'left';
      };
    bars(4, 26, (h - 70) / 2, 'Beat gravity (every 4 steps)');
    bars(8, 26 + (h - 70) / 2 + 34, (h - 70) / 2, 'Bar gravity (every 8 steps)');
  }
  // Status line
  const msg = S.log ? `<span class="act">${S.log}</span>` : '';
  const base = st.playing
    ? `<span>Guard <b>${GUARDS[pat.guard]}</b></span>${st.shownKh ? '<span class="act">Khali</span>' : ''}<span>Flat bars mean no felt downbeat; the dashed line is the average.</span>`
    : IDLE;
  const s = base + msg;
  if ($('#ro').innerHTML !== s) $('#ro').innerHTML = s;
  const g = dissolvedText();
  if ($('#guardro').textContent !== g) $('#guardro').textContent = g;
}

export function startMonitor() {
  mc = $('#mc');
  requestAnimationFrame(draw);
}
