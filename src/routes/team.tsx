import { createFileRoute } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { PageIntro } from "@/components/site/parts";
import { FlipCard } from "@/components/site/toys";
import { coreTeam, currentSem, faculty } from "@/lib/site";

export const Route = createFileRoute("/team")({
  head: () => ({
    links: [canonical("/team")],
    meta: [
      { title: "Team | RO-BIO" },
      {
        name: "description",
        content:
          "The RO-BIO team: Head of Department Dr. Nithin S K, faculty coordinator Archana G, President Thushar K L, Vice President Shloka D Raj and every squad.",
      },
      { property: "og:title", content: "Team | RO-BIO" },
      { property: "og:description", content: "The people who keep RO-BIO running." },
    ],
  }),
  component: Team,
});

// Squads sit two to a row on wide screens. Sorted by size, so neighbours are about as tall and no row is half empty.
const squadsBySize = [...coreTeam].sort((a, b) => a.members.length - b.members.length);

/** "Dr. Nithin S K" becomes "NS": titles like Dr. are left out. */
const initials = (name: string) =>
  name
    .replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

function Team() {
  return (
    <>
      <PageIntro label="TEAM / CREW" title="The people keeping it running." />
      <section className="mx-auto max-w-6xl px-4 py-14">
        <p className="font-pixel text-xs text-primary">DEPARTMENT AND FACULTY</p>
        <ul className="mt-3 grid gap-6 sm:grid-cols-2">
          {faculty.map((c) => (
            <li key={c.name} className="group flex border-2 border-border bg-card shadow-hard">
              <div className="blueprint relative grid w-32 shrink-0 place-items-center overflow-hidden border-r-2 border-border sm:w-40">
                <span className="font-display text-5xl font-black italic text-primary" aria-hidden="true">
                  {initials(c.name)}
                </span>
                <span
                  className="absolute inset-x-0 top-0 h-0.5 bg-lens opacity-0 group-hover:animate-[scan_1.2s_ease-in-out] group-hover:opacity-100"
                  aria-hidden="true"
                />
              </div>
              <div className="p-5">
                <p className="font-pixel text-[10px] text-primary">{c.role.toUpperCase()}</p>
                <p className="mt-1 font-display text-2xl font-bold">{c.name}</p>
                {c.phone && (
                  <a href={`tel:+91${c.phone}`} className="mt-1 inline-block font-mono text-primary underline">
                    {c.phone}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
        <h2 className="mt-16 text-3xl font-black md:text-4xl">Core team</h2>
        <p className="mt-2 text-muted-foreground">
          Hover or tap a card to flip it. Photos are on the way.
        </p>
        <div className="grid gap-x-8 lg:grid-cols-2">
          {squadsBySize.map((sq) => (
            <div key={sq.title} className="mt-10">
              <p className="font-pixel text-xs text-primary">{sq.title.toUpperCase()}</p>
              <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[...sq.members]
                  .sort((a, b) => Number(!!b.head) - Number(!!a.head))
                  .map((mb) => (
                    <li key={mb.name + mb.sem}>
                      <FlipCard
                        label={mb.name}
                        front={
                          <div className="flex h-full flex-col">
                            <div className="blueprint relative grid flex-1 place-items-center border-b-2 border-border">
                              <span
                                className="font-display text-4xl font-black italic text-primary"
                                aria-hidden="true"
                              >
                                {initials(mb.name)}
                              </span>
                              {(mb.head || mb.role) && (
                                <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 font-pixel text-[9px] text-primary-foreground">
                                  {mb.role ? mb.role.toUpperCase() : "HEAD"}
                                </span>
                              )}
                              <span className="absolute bottom-1 right-2 font-pixel text-[8px] text-muted-foreground">
                                PHOTO SOON
                              </span>
                            </div>
                            <p className="p-3 font-display font-bold leading-tight">{mb.name}</p>
                          </div>
                        }
                        back={
                          <div className="flex h-full flex-col justify-between p-4">
                            <p className="font-pixel text-[10px]">
                              {(mb.role ?? sq.title).toUpperCase()}
                              {mb.head ? " / HEAD" : ""}
                            </p>
                            <div>
                              <p className="font-display text-xl font-black leading-tight">
                                {mb.name}
                              </p>
                              <p className="mt-1 font-mono text-sm">
                                {currentSem(mb.sem)}th sem {mb.dept}
                              </p>
                            </div>
                          </div>
                        }
                      />
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
