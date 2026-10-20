import type { Metadata } from "next";
import { GROUPS, PRESIDENT, VICE_PRESIDENT, TEAM_SIZE, ordinal, initials, type Member } from "@/lib/team";

export const metadata: Metadata = {
  title: "Team",
  description: `The ${TEAM_SIZE} students on the RO-BIO core team at Mysore University School of Engineering.`,
  alternates: { canonical: "/team" },
};

function Person({ p, i, role }: { p: Member; i: number; role?: string }) {
  return (
    <li className="person">
      <span className="badge" data-c={i % 3} aria-hidden="true">{initials(p.name)}</span>
      <span>
        <strong>{p.name}</strong>{p.head && <span className="tag">Head</span>}
        <br />
        <span className="muted">{role ? `${role}, ` : ""}{ordinal(p.sem)} sem, {p.branch}</span>
      </span>
    </li>
  );
}

export default function Team() {
  return (
    <div className="wrap">
      <h1>Team</h1>
      <p className="lead">{TEAM_SIZE} students across six groups, from Biomedical and Robotic Engineering, CS&amp;D and AIML.</p>

      <div className="grid">
        <section className="win" aria-label="President">
          <div className="tab"><span>PRESIDENT</span><span aria-hidden="true">x</span></div>
          <ul className="body people"><Person p={PRESIDENT} i={0} /></ul>
        </section>
        <section className="win" aria-label="Vice president">
          <div className="tab"><span>VICE PRESIDENT</span><span aria-hidden="true">x</span></div>
          <ul className="body people"><Person p={VICE_PRESIDENT} i={1} /></ul>
        </section>
      </div>

      <div className="grid wide">
        {GROUPS.map((g) => (
          <section className="win" key={g.slug} aria-labelledby={`g-${g.slug}`}>
            <div className="tab"><span>{g.members.length} PEOPLE</span><span aria-hidden="true">x</span></div>
            <div className="body">
              <h2 id={`g-${g.slug}`}>{g.title}</h2>
              <ul className="people">{g.members.map((p, i) => <Person key={p.name + i} p={p} i={i} />)}</ul>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
