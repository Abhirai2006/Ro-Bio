// The blog posts. Add a new post at the top of `posts`: the blog page, its own page, the sitemap, llms.txt and
// what Robo says all read this list. A paragraph can link to a page on this site as [the words](/path).
// No imports, so the Node script that writes the sitemap can read it too.

export type Post = {
  slug: string;
  title: string;
  /** YYYY-MM-DD, the day it was published. */
  date: string;
  /** Exactly as the name appears in `coreTeam` in site.ts, so the byline shows their photo and squad. */
  author: string;
  /** One or two sentences for the blog list and search results. */
  summary: string;
  cover?: { src: string; alt: string; width: number; height: number };
  /** The slug of the event this post writes up, so the event's page can link to it. */
  event?: string;
  paragraphs: string[];
};

export const posts: Post[] = [
  {
    slug: "robo-spark-kickoff",
    title: "Sparking the Future: How We Kicked Off RO-BIO with Robo Spark!",
    date: "2026-11-04",
    author: "Abdul Muhaymin Khan",
    event: "robo-spark",
    summary:
      "How our first event went: first years designing robots without their phones, a few dal-serving drones, and what this blog is for.",
    cover: {
      src: "/events/robo-spark.jpg",
      alt: "The Robo Spark poster: an interactive group discussion for first years, 3 November 2026",
      width: 1200,
      height: 1600,
    },
    paragraphs: [
      "Welcome to RO-BIO's new website! We're the robotics and biomedical engineering club at Mysore University School of Engineering, and the site is finally live. This is where we'll share our projects, our events and whatever else is going on at the club.",
      "We couldn't have picked a better way to start. On 3 November the auditorium was buzzing for Robo Spark, our first big event.",
      "Robo Spark was made for first years who are just getting into engineering, and it wasn't a sit-and-listen kind of event. In teams of five, they took on a technical problem, talked it through and designed their very first robot, all without the internet or their phones.",
      "Some of the ideas had no limits at all. At one point we were picturing a hundred robots with face recognition, and a fleet of drones built for one job: serving dal to a few students. Lol! Jokes aside, Robo Spark showed us just how many builders and thinkers there are in the new batch.",
      "And that was only the start. Now that the website and this blog are up, this is where you'll find updates on workshops, hands-on build sessions, our projects, upcoming events and things to learn from.",
      "RO-BIO also isn't just for robotics or biomedical students. Computer Science, Civil or any other branch, if you're curious and interested, you're in. You don't have to know everything before you walk in. That's what we're here for!",
      "A huge thanks to everyone who came, took part, helped out and ran Robo Spark with us. It was a memorable start, and we've got a lot more planned. Got an idea for our next project, or want to get involved? Check out our [Events page](/events) or reach the team through our [Contact page](/contact). We'd love to hear from you!",
    ],
  },
];

/** Newest first. */
export const sortedPosts = () => [...posts].sort((a, b) => b.date.localeCompare(a.date));

export const postBySlug = (slug: string) => posts.find((p) => p.slug === slug);

/** The newest post that writes up an event, if there is one. */
export const writeUpOf = (eventSlug: string) => sortedPosts().find((p) => p.event === eventSlug);

export type Piece = { text: string; to?: string };

/** Splits a paragraph into plain text and links. Only links to pages on this site (starting with "/") are kept. */
export function pieces(paragraph: string): Piece[] {
  const out: Piece[] = [];
  const re = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;
  let at = 0;
  for (let m = re.exec(paragraph); m; m = re.exec(paragraph)) {
    if (m.index > at) out.push({ text: paragraph.slice(at, m.index) });
    out.push({ text: m[1]!, to: m[2]! });
    at = m.index + m[0].length;
  }
  if (at < paragraph.length) out.push({ text: paragraph.slice(at) });
  return out;
}

/** The paragraph as plain text, for search results and llms.txt. */
export const plainText = (paragraph: string) =>
  pieces(paragraph)
    .map((p) => p.text)
    .join("");
