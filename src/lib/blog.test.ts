import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { pieces, plainText, posts, sortedPosts, writeUpOf } from "./blog";
import { events, squadOf } from "./site";
import { GREET } from "./robo-talk";

/** The en dash and the em dash, built from their codes so this file never contains one. */
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

describe("blog", () => {
  it("has posts by real core team members, with real dates and unique slugs", () => {
    expect(new Set(posts.map((p) => p.slug)).size).toBe(posts.length);
    for (const p of posts) {
      expect(p.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(p.date))).toBe(false);
      expect(squadOf(p.author), `${p.author} is not in coreTeam`).toBeDefined();
      if (p.cover) expect(existsSync(resolve("public", p.cover.src.slice(1)))).toBe(true);
      if (p.event) expect(events.some((e) => e.slug === p.event)).toBe(true);
    }
  });

  it("never uses em or en dashes, and only links to pages that exist", () => {
    const routes = new Set(["/", "/about", "/events", "/team", "/contact", "/faq", "/blog"]);
    for (const p of posts) {
      for (const text of [p.title, p.summary, ...p.paragraphs]) expect(text).not.toMatch(DASHES);
      for (const para of p.paragraphs)
        for (const bit of pieces(para)) if (bit.to) expect(routes.has(bit.to), bit.to).toBe(true);
    }
  });

  it("turns [words](/path) into links and leaves other text alone", () => {
    expect(pieces("See our [Events page](/events) or [Contact page](/contact).")).toEqual([
      { text: "See our " },
      { text: "Events page", to: "/events" },
      { text: " or " },
      { text: "Contact page", to: "/contact" },
      { text: "." },
    ]);
    // only links inside this site
    expect(pieces("[x](https://evil.test)")).toEqual([{ text: "[x](https://evil.test)" }]);
    expect(plainText("Check out our [Events page](/events)!")).toBe("Check out our Events page!");
  });

  it("lists the newest post first, links Robo Spark to its write-up and gives Robo a line for each post", () => {
    const list = sortedPosts();
    for (let i = 1; i < list.length; i++) expect(list[i - 1]!.date >= list[i]!.date).toBe(true);
    expect(writeUpOf("robo-spark")?.slug).toBe("robo-spark-kickoff");
    expect(GREET["/blog"]).not.toContain("No posts yet");
    for (const p of posts) expect(GREET[`/blog/${p.slug}`]).toBeTruthy();
  });
});
