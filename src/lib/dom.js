// Small DOM helpers shared by every UI module.
export const $ = (s) => document.querySelector(s);

// Messages go to the LCD note line (the monitor draws them), in capitals, for about a second or two.
// A refusal (alert) is shown in the alert color and flashes the ring's crossed-out marker.
export function toast(t, alert = false) {
  toast.msg = String(t).toUpperCase();
  toast.alert = alert;
  toast.until = performance.now() + (alert ? 1400 : 2000);
}
toast.msg = '';
toast.alert = false;
toast.until = 0;
