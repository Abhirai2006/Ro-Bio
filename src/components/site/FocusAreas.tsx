import { Window } from "@/components/site/parts";
import { focusAreas } from "@/lib/site";

/** The five things the club works on, from focusAreas in site.ts. */
export function FocusAreas({ id = "what-we-do" }: { id?: string }) {
  return (
    <section className="mx-auto max-w-6xl px-4" aria-labelledby={id}>
      <p className="font-pixel text-xs text-primary">WHAT WE DO</p>
      <h2 id={id} className="mt-2 text-3xl font-black md:text-4xl">
        What we work on
      </h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {focusAreas.map((a) => (
          <li key={a.title}>
            <Window tag={a.tag} title={a.title} className="h-full">
              <p className="mt-2 text-sm text-muted-foreground">{a.text}</p>
            </Window>
          </li>
        ))}
      </ul>
    </section>
  );
}
