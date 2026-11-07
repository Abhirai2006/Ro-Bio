import { currentSem, teamLinkedIn, teamPhotos, type Member } from "@/lib/site";

/** "Dr. Nithin S K" becomes "NS": titles like Dr. are left out. */
const initials = (name: string) =>
  name
    .replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

/** A square photo, or the person's initials on the blueprint grid until a photo arrives. */
export function Portrait({ name, className = "" }: { name: string; className?: string }) {
  const photo = teamPhotos[name];
  return (
    <div className={`blueprint relative aspect-square overflow-hidden ${className}`}>
      {photo ? (
        <img
          src={photo}
          alt={`Photo of ${name}`}
          width={640}
          height={640}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span
          className="absolute inset-0 grid place-items-center font-display text-5xl font-black italic text-primary"
          aria-hidden="true"
        >
          {initials(name)}
        </span>
      )}
    </div>
  );
}

/** One team member: photo, name, role or HEAD badge, semester and branch, LinkedIn when given. */
export function MemberCard({ member, index = 0 }: { member: Member; index?: number }) {
  const link = teamLinkedIn[member.name];
  const badge = member.role ?? (member.head ? "Head" : undefined);
  return (
    <article
      className="team-rise flex h-full flex-col border-2 border-border bg-card shadow-hard"
      style={{ animationDelay: `${Math.min(index, 10) * 70}ms` }}
    >
      <div className="relative border-b-2 border-border">
        <Portrait name={member.name} />
        {badge && (
          <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 font-pixel text-[9px] text-primary-foreground">
            {badge.toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="font-display text-lg font-bold leading-tight">{member.name}</h3>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {currentSem(member.sem)}th sem {member.dept}
        </p>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex w-fit items-center gap-1.5 border-2 border-border px-2 py-1 text-sm font-bold hover:bg-secondary"
            aria-label={`${member.name} on LinkedIn (opens in a new tab)`}
          >
            LinkedIn <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </article>
  );
}
