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
    slug: "how-i-built-the-website",
    title: "How I built the RO-BIO website",
    date: "2026-11-13",
    author: "Abhishek Rai A",
    summary:
      "A robot arm, a sumo ring, a heartbeat and a robot called Robo: how the club's website came together, who helped, and what is coming next.",
    paragraphs: [
      "Hi, I'm Abhishek, and I built the website you're reading this on. Abdul wrote our first post, about Robo Spark, so it felt right that the second one should be about the place it lives.",
      "I actually started working on the site on 20 October, before I had even joined RO-BIO. The idea was simple. RO-BIO works on robots and on the human body, and both run the same loop: sense, decide, act, feed back. So the site tries to be a little bit of both.",
      "That's why the home page has a 3D robot arm you can use to pick up and place samples, a Robo Sumo game where you push a CPU robot out of the ring, and a heartbeat beating in the header. Then there's Robo, the small robot who walks across every page and has something to say about each one. Say hi to him.",
      "There's also the serious stuff: a page for every squad on the team, every event with its poster and venue, an FAQ, and this blog. For Robo Spark I built the things we needed on the day too: the presentation, the missions and judging guide, a scoring page for the judges, and the certificates, which anyone can verify on the site. And there are no ads and no analytics, so nobody is tracking you while you look around.",
      "I didn't do it alone. Preetham Gowda S R from the Design squad helped me a lot by giving me the assets, the images and everything else the site needed. The coding was my part.",
      "I'll be honest about one thing: I used some AI help along the way. But I didn't depend on it completely. Every feature still had to be planned, checked and tested, and so far the project has more than 800 commits.",
      "There's a lot more coming. Bot Forge, our first competition, will get its registration on the site once the rules are confirmed. The Gallery will fill up with photos from our events, the Projects page will get write-ups of what we build, and this blog will get a new post every week, written by different members of the club.",
      "I'm also the club's Secretary now, so along with the website I'll be looking after the club's records and documentation. If something on the site is broken, or you have an idea for it, tell me. You can find me on the [Team page](/team).",
      "Thank you to Archana ma'am for trusting me with this, to Preetham for all the assets, and to Abdul for writing our first post. This site is for the whole club, and I want it to keep growing with all of us.",
    ],
  },
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
