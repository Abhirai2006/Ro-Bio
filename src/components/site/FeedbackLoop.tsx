import { useEffect, useState } from "react";

export type LoopStep = { stage: string; part: string; what: string };
export type Loop = { title: string; steps: [LoopStep, LoopStep, LoopStep, LoopStep] };

// Clockwise ring on a 3x3 grid: step cells in the corners, arrows on the edges.
const cells = ["col-start-1 row-start-1", "col-start-3 row-start-1", "col-start-3 row-start-3", "col-start-1 row-start-3"];
const arrows = [
  { cls: "col-start-2 row-start-1", ch: "→" },
  { cls: "col-start-3 row-start-2", ch: "↓" },
  { cls: "col-start-2 row-start-3", ch: "←" },
  { cls: "col-start-1 row-start-2", ch: "↑" },
];

/** Two feedback loops side by side. A signal walks round both at once; tap a step to stop on it. */
export function FeedbackLoops({ loops }: { loops: Loop[] }) {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const step = tick % 4, cycles = Math.floor(tick / 4);

  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1700);
    return () => window.clearInterval(id);
  }, [paused]);

  const pick = (i: number) => {
    setTick((t) => t - (t % 4) + i);
    setPaused(true);
  };

  return (
    <div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {loops.map((l) => (
          <div key={l.title} className="border-2 border-border bg-card p-5 shadow-hard md:p-6">
            <p className="font-pixel text-xs text-primary">{l.title.toUpperCase()}</p>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] grid-rows-[auto_2.5rem_auto] items-center gap-x-2">
              {l.steps.map((s, i) => {
                const on = i === step;
                return (
                  <button
                    key={s.part}
                    type="button"
                    onClick={() => pick(i)}
                    aria-pressed={on}
                    className={`${cells[i]} border-2 border-border px-3 py-2 text-left transition-[background-color,color,transform] duration-300 ${on ? "-translate-y-0.5 bg-primary text-primary-foreground shadow-hard" : "bg-secondary hover:bg-muted"}`}
                  >
                    <span className={`block font-pixel text-[9px] ${on ? "" : "text-primary"}`}>
                      {i + 1}. {s.stage.toUpperCase()}
                    </span>
                    <span className="block font-display font-bold leading-tight">{s.part}</span>
                  </button>
                );
              })}
              {arrows.map((a, i) => (
                <span
                  key={a.ch}
                  aria-hidden="true"
                  className={`${a.cls} justify-self-center text-xl font-bold transition-colors duration-300 ${i === step ? "text-primary" : "text-border/30"}`}
                >
                  {a.ch}
                </span>
              ))}
              <span
                title="Times round the loop"
                aria-hidden="true"
                className="col-start-2 row-start-2 grid h-11 w-11 place-items-center rounded-full border-2 border-dashed border-border text-center font-mono text-[9px] leading-none"
              >
                <span>
                  <span className="block text-sm text-primary">↻</span>
                  {cycles}
                </span>
              </span>
            </div>
            <p className="mt-4 min-h-[3rem] text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{l.steps[step]!.part}:</span> {l.steps[step]!.what}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          className="border-2 border-border bg-card px-3 py-1.5 font-pixel text-[10px] hover:bg-secondary"
        >
          {paused ? "PLAY THE LOOP" : "PAUSE"}
        </button>
        <span className="text-muted-foreground">Same four stages, two kinds of machine. Tap any step to stop on it.</span>
      </div>
    </div>
  );
}
