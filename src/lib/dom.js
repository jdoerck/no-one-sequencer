// Small DOM helpers shared by every UI module.
export const $ = (s) => document.querySelector(s);

export function toast(t) {
  const el = $('#toast');
  el.textContent = t;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), 2600);
}
