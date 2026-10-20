"use client";
import { useEffect, useRef, useState } from "react";

const N = 64; // frames in public/frames, f-0.webp to f-63.webp
const BEATS = [
  { at: 0, text: "Scroll to build it." },
  { at: 0.35, text: "Biomedical and Robotic Engineering." },
  { at: 0.7, text: "Mysore University School of Engineering." },
  { at: 0.96, text: "Next up: Bot Forge, 28 Oct." },
];

export default function ScrollSequence() {
  const wrap = useRef<HTMLElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [beat, setBeat] = useState(0);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    const el = wrap.current, canvas = cv.current, ctx = canvas?.getContext("2d");
    if (!el || !canvas || !ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = matchMedia("(max-width: 640px)").matches ? 2 : 1; // phones load every second frame
    const want = Array.from({ length: N }, (_, i) => i).filter((i) => i % step === 0 || i === N - 1);
    const imgs: (HTMLImageElement | undefined)[] = new Array(N).fill(undefined);
    let count = 0, cur = reduced ? N - 1 : 0, raf = 0, visible = true, key = "";

    // First and last frame first, so both ends are ready before the middle.
    [0, N - 1, ...want.filter((i) => i !== 0 && i !== N - 1)].forEach((i) => {
      const im = new Image();
      im.decoding = "async";
      im.src = `/frames/f-${i}.webp`;
      im.onload = () => { imgs[i] = im; setLoaded(++count / want.length); };
    });

    const near = (f: number, dir: 1 | -1) => { for (let i = f; i >= 0 && i < N; i += dir) if (imgs[i]) return i; return -1; };
    const draw = (f: number) => {
      const lo = near(Math.floor(f), -1), hi = near(Math.ceil(f), 1);
      const a = lo >= 0 ? imgs[lo] : undefined, b = hi >= 0 ? imgs[hi] : a;
      if (!a) return;
      const mix = !b || lo === hi ? 0 : Math.min(1, Math.max(0, (f - lo) / (hi - lo)));
      const k = `${lo}:${hi}:${mix.toFixed(2)}:${canvas.width}`;
      if (k === key) return;
      key = k;
      ctx.globalAlpha = 1;
      ctx.drawImage(a, 0, 0, canvas.width, canvas.height);
      if (b && mix > 0) { ctx.globalAlpha = mix; ctx.drawImage(b, 0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
    };

    const size = () => {
      const d = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * d);
      canvas.height = Math.round(canvas.clientHeight * d);
      key = "";
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(canvas);

    const progress = () => {
      const r = el.getBoundingClientRect(), total = r.height - innerHeight;
      return total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
    };
    const tick = () => {
      const p = reduced ? 1 : progress(), target = p * (N - 1);
      cur += (target - cur) * 0.14; // a little inertia, so it feels like it has weight
      if (Math.abs(target - cur) < 0.02) cur = target;
      draw(cur);
      setBeat(BEATS.reduce((n, b, i) => (p >= b.at ? i : n), 0));
      raf = visible ? requestAnimationFrame(tick) : 0;
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(tick); });
    io.observe(el);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, []);

  return (
    <section className="seq" ref={wrap} aria-label="The RO-BIO logo, built as you scroll">
      <div className="seq-stick">
        <div className="seq-card">
          <canvas ref={cv} role="img" aria-label="The RO-BIO robot logo being built layer by layer." />
          {loaded < 1 && <span className="seq-load" style={{ transform: `scaleX(${loaded})` }} />}
        </div>
        <div className="seq-caps">
          {BEATS.map((b, i) => (
            <p key={b.text} className="seq-cap" data-on={i === beat} aria-hidden={i !== beat}>{b.text}</p>
          ))}
        </div>
      </div>
      <noscript><img src={`/frames/f-${N - 1}.webp`} alt="The RO-BIO logo" width={720} height={720} /></noscript>
    </section>
  );
}
