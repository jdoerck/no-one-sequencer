// Mono 16-bit PCM WAV encoder.
export function wav16(f, rate) {
  const n = f.length,
    buf = new ArrayBuffer(44 + n * 2),
    d = new DataView(buf),
    w = (o, s) => {
      for (let i = 0; i < 4; i++) d.setUint8(o + i, s.charCodeAt(i));
    };
  w(0, 'RIFF');
  d.setUint32(4, 36 + n * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  d.setUint32(16, 16, true);
  d.setUint16(20, 1, true);
  d.setUint16(22, 1, true);
  d.setUint32(24, rate, true);
  d.setUint32(28, rate * 2, true);
  d.setUint16(32, 2, true);
  d.setUint16(34, 16, true);
  w(36, 'data');
  d.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++)
    d.setInt16(44 + 2 * i, Math.max(-32768, Math.min(32767, Math.round(f[i] * 32767))), true);
  return new Uint8Array(buf);
}
