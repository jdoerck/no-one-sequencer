// A flat dial: 270-degree arc, colored face, pointer. Drag vertically (about 140 px for the full range) or use the arrow keys. No easing.
const NS = 'http://www.w3.org/2000/svg';
const START = 135,
  SWEEP = 270;
const pol = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [32 + r * Math.cos(a), 32 + r * Math.sin(a)];
};
const arc = (f) => {
  const [x0, y0] = pol(27, START),
    [x1, y1] = pol(27, START + SWEEP * f);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A27 27 0 ${SWEEP * f > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

// get/set read and write the model; fmt prints the value with its unit. face and pointer are CSS colors.
export function dial({label, min, max, step, get, set, fmt, size = 52, face, pointer, onSet}) {
  const el = document.createElement('div');
  el.className = 'dial';
  el.innerHTML = `<svg viewBox="0 0 64 64" width="${size}" height="${size}" tabindex="0" role="slider" aria-label="${label}" aria-valuemin="${min}" aria-valuemax="${max}"><path class="tr"/><path class="va"/><circle cx="32" cy="32" r="16" style="stroke:var(--ink);stroke-width:1.5"/><line class="pt" x1="32" y1="32"/></svg><span class="legend">${label}</span><span class="readout"></span>`;
  const q = (s) => el.querySelector(s),
    svg = q('svg');
  q('.tr').setAttribute('d', arc(1));
  q('circle').style.fill = face;
  q('.pt').style.stroke = pointer;
  const clamp = (v) => Math.min(max, Math.max(min, Number((Math.round(v / step) * step).toFixed(4))));
  function sync() {
    const v = get(),
      f = (v - min) / (max - min),
      [px, py] = pol(14, START + SWEEP * f);
    q('.va').setAttribute('d', f > 0 ? arc(f) : '');
    q('.pt').setAttribute('x2', px.toFixed(2));
    q('.pt').setAttribute('y2', py.toFixed(2));
    q('.readout').textContent = fmt(v);
    svg.setAttribute('aria-valuenow', v);
    svg.setAttribute('aria-valuetext', fmt(v));
  }
  const change = (v) => {
    v = clamp(v);
    if (v === get()) return;
    set(v);
    sync();
    if (onSet) onSet();
  };
  let drag = null;
  svg.addEventListener('pointerdown', (e) => {
    svg.setPointerCapture(e.pointerId);
    drag = {y: e.clientY, v: get()};
  });
  svg.addEventListener('pointermove', (e) => {
    if (drag) change(drag.v + ((drag.y - e.clientY) / 140) * (max - min));
  });
  ['pointerup', 'pointercancel'].forEach((ev) => svg.addEventListener(ev, () => (drag = null)));
  svg.addEventListener('keydown', (e) => {
    const d = {ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1}[e.key];
    if (d) change(get() + d * Math.max(step, (max - min) * 0.05));
    else if (e.key === 'Home') change(min);
    else if (e.key === 'End') change(max);
    else return;
    e.preventDefault();
  });
  sync();
  return {el, sync, setDisabled: (b) => el.classList.toggle('off', b)};
}
