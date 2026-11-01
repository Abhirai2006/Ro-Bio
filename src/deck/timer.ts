// A countdown that survives a page reload: its state is kept in this browser, so refreshing the deck
// in the middle of the discussion does not reset the clock. Storage can fail (private mode); it then just lives in memory.

type Saved = {
  endsAt: number | null;
  left: number;
  started: boolean;
  duration: number;
  savedAt?: number;
};

export class Countdown {
  duration: number;
  started = false;
  paused = false;
  endedAt: number | null = null;
  private endsAt: number | null = null; // while running
  private left: number; // while paused or before the start
  private readonly key: string;
  private readonly listeners = new Set<() => void>();
  private alerted = new Set<number>();

  constructor(key: string, minutes: number) {
    this.key = `robo-spark-timer:${key}`;
    this.duration = minutes * 60000;
    this.left = this.duration;
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return;
      const s = JSON.parse(raw) as Saved;
      if (s.duration !== this.duration && !s.started) return;
      this.duration = s.duration;
      this.started = s.started;
      this.endsAt = s.endsAt;
      this.left = s.left;
      this.paused = s.started && s.endsAt === null;
      // A timer that ran out more than 30 minutes ago, or was last touched 3 hours ago (a rehearsal), starts fresh.
      const stale = Date.now() - (s.savedAt ?? 0) > 3 * 3600000;
      if (stale || (s.endsAt !== null && Date.now() - s.endsAt > 30 * 60000)) this.reset();
      const rem = this.remaining();
      for (const mark of [300000, 60000, 0]) if (rem <= mark) this.alerted.add(mark);
    } catch {
      /* storage blocked: start fresh */
    }
  }

  private save() {
    try {
      localStorage.setItem(
        this.key,
        JSON.stringify({
          endsAt: this.endsAt,
          left: this.left,
          started: this.started,
          duration: this.duration,
          savedAt: Date.now(),
        } satisfies Saved),
      );
    } catch {
      /* fine */
    }
    for (const f of this.listeners) f();
  }

  onChange(f: () => void) {
    this.listeners.add(f);
    return () => this.listeners.delete(f);
  }

  remaining(now = Date.now()) {
    if (this.endsAt === null) return Math.max(0, this.left);
    const rem = Math.max(0, this.endsAt - now);
    if (rem === 0 && this.endedAt === null) this.endedAt = this.endsAt;
    return rem;
  }

  /** Marks crossed since the last call: 300000 (5 min), 60000 (1 min) and 0. */
  crossed() {
    const rem = this.remaining();
    const out: number[] = [];
    if (!this.started) return out;
    for (const mark of [300000, 60000, 0]) {
      if (mark >= this.duration) continue;
      if (rem <= mark && !this.alerted.has(mark)) {
        this.alerted.add(mark);
        out.push(mark);
      }
    }
    return out;
  }

  start() {
    if (this.endsAt !== null) return;
    if (this.remaining() === 0) this.reset();
    this.started = true;
    this.paused = false;
    this.endsAt = Date.now() + this.left;
    this.save();
  }

  /** Starts the clock the first time its slide is shown. Never restarts a timer that already ran. */
  autoStart() {
    if (!this.started) this.start();
  }

  pause() {
    if (this.endsAt === null) return;
    this.left = this.remaining();
    this.endsAt = null;
    this.paused = true;
    this.save();
  }

  toggle() {
    if (this.endsAt === null) this.start();
    else this.pause();
  }

  reset() {
    this.endsAt = null;
    this.left = this.duration;
    this.started = false;
    this.paused = false;
    this.endedAt = null;
    this.alerted.clear();
    this.save();
  }

  /** Adds (or with a negative number, takes away) time. Never below zero or above 99 minutes. */
  add(ms: number) {
    const next = Math.min(99 * 60000, Math.max(0, this.remaining() + ms));
    if (next > this.remaining()) {
      this.endedAt = null;
      for (const mark of [...this.alerted]) if (next > mark) this.alerted.delete(mark);
    }
    if (this.endsAt === null) this.left = next;
    else this.endsAt = Date.now() + next;
    if (next > this.duration) this.duration = next;
    this.save();
  }
}

/** A short two-tone chime made in the browser, so no sound file has to load. */
export function chime(times = 1) {
  try {
    const A = (window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext) as typeof AudioContext;
    const ctx = new A();
    for (let i = 0; i < times; i++) {
      for (const [f, at] of [
        [880, 0],
        [1320, 0.18],
      ] as const) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.frequency.value = f;
        const t = ctx.currentTime + i * 0.55 + at;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.connect(g).connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.32);
      }
    }
    window.setTimeout(() => void ctx.close(), times * 600 + 500);
  } catch {
    /* no audio: the colours still change */
  }
}
