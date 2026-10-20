// A synthetic lead II ECG built from Gaussian waves (P, Q, R, S, T) around each R peak.
// Times are seconds, values are in millivolt-like units. The QT interval shortens as the heart speeds up.
const g = (t: number, c: number, s: number, a: number) => a * Math.exp(-((t - c) ** 2) / (2 * s * s));

export function beatShape(tau: number, rr: number) {
  const k = Math.sqrt(Math.max(0.3, rr) / 0.833);
  return (
    g(tau, -0.17 * k, 0.025 * k, 0.14) + // P: atria contract
    g(tau, -0.028, 0.008, -0.12) + // Q
    g(tau, 0, 0.011, 1) + // R: ventricles fire
    g(tau, 0.03, 0.009, -0.22) + // S
    g(tau, 0.3 * k, 0.05 * k, 0.32) // T: ventricles reset
  );
}

export function ecgAt(t: number, beats: number[], rr: number) {
  let v = 0;
  for (const b of beats) if (Math.abs(t - b) < 0.9) v += beatShape(t - b, rr);
  return v;
}
