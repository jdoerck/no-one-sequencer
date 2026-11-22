// The monitor loop: playhead on the rings, the two gravity meters in the window corners, and the LCD's note line.
import {$, toast} from '../lib/dom.js';
import {st, lastE} from '../state.js';
import {showNow, cycleText, setHub, flashMark} from './rows.js';

let cv, beat, bar, note, kh, col;
let lastLog = '',
  logAt = 0,
  lastToast = 0;

// "Moved pulse one step: a beat pulse was forming" -> "MOVED PULSE · BEAT PULSE"
const fmtLog = (s) => {
  const m = /^Moved (\w+) .* a (beat|bar) pulse/.exec(s);
  return (m ? `Moved ${m[1]} · ${m[2]} pulse` : s).toUpperCase();
};

// One gravity meter: energy summed by step phase mod P over the last 64 steps. A bar over the line is a pulse forming.
function meter(c, P, label) {
  const r = c.getBoundingClientRect(),
    d = Math.min(devicePixelRatio || 1, 2);
  if (c.width !== Math.round(r.width * d)) {
    c.width = Math.round(r.width * d);
    c.height = Math.round(r.height * d);
  }
  const x = c.getContext('2d');
  x.setTransform(d, 0, 0, d, 0, 0);
  x.clearRect(0, 0, r.width, r.height);
  const s = new Float32Array(P);
  let tot = 0;
  lastE.slice(-64).forEach((q) => {
    s[q.t % P] += q.E;
    tot += q.E;
  });
  const mean = tot / P || 1,
    mx = Math.max(...s, mean * 2.4),
    limit = P === 4 ? 1.6 : 1.85,
    peak = tot ? Math.max(...s) / mean : 0,
    top = 13,
    h = r.height - top,
    bw = r.width / P;
  x.font = '600 9px "IBM Plex Mono", monospace';
  x.fillStyle = peak > limit ? col.strike : col.ink;
  x.fillText(`${label} ${tot ? '×' + peak.toFixed(1) : '—'}`, 0, 8);
  for (let k = 0; k < P; k++) {
    const bh = (s[k] / mx) * h;
    x.fillStyle = s[k] / mean > limit ? col.strike : col.ink;
    x.fillRect(k * bw + 1, top + h - bh, bw - 2, bh);
  }
  const ty = top + h - (mean / mx) * h;
  x.strokeStyle = col.soft;
  x.setLineDash([2, 2]);
  x.beginPath();
  x.moveTo(0, ty);
  x.lineTo(r.width, ty);
  x.stroke();
  x.setLineDash([]);
}

function draw() {
  requestAnimationFrame(draw);
  showNow();
  const S = st.S,
    now = performance.now();
  setHub(S.moved + S.unstack + S.align);
  meter(beat, 4, 'BEAT');
  meter(bar, 8, 'BAR');
  // LCD note line: a message, a recent guard move, the khali, or the cycle.
  let text = cycleText,
    alert = false;
  if (S.log !== lastLog) {
    lastLog = S.log;
    logAt = now;
  }
  if (toast.until > now) {
    text = toast.msg;
    alert = toast.alert;
  } else if (S.log && now - logAt < 2500) text = fmtLog(S.log);
  else if (st.playing && st.shownKh) text = 'KHALI';
  if (note.textContent !== text) note.textContent = text;
  note.classList.toggle('alert', alert);
  // The ring's crossed-out marker flashes with a refusal that came from a rule.
  if (alert && toast.until !== lastToast) {
    lastToast = toast.until;
    flashMark();
  }
  const k = st.pat.khali.on ? 'Khali' : '';
  if (kh.textContent !== k) kh.textContent = k;
  kh.classList.toggle('live', !!(k && st.playing && st.shownKh));
}

export function startMonitor() {
  note = $('#lcdNote');
  kh = $('#cKhali');
  beat = $('#mBeat');
  bar = $('#mBar');
  const cs = getComputedStyle(document.documentElement);
  col = {
    ink: cs.getPropertyValue('--ink').trim(),
    soft: cs.getPropertyValue('--ink-soft').trim(),
    strike: cs.getPropertyValue('--strike').trim(),
  };
  requestAnimationFrame(draw);
}
