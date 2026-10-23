// A synthetic lead II ECG beat built from Gaussian waves around the R peak (P, Q, R, S, T).
// tau is seconds relative to the R peak, rr is the beat-to-beat interval. QT shortens as the heart speeds up.
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
