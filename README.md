# RO-BIO

The website of RO-BIO, the Biomedical and Robotic Engineering club at Mysore University School of Engineering, Mysuru.

Live site: https://ro-bio.abhirai2006.workers.dev

## What is on the site

Home with an interactive robot arm (inverse kinematics) and a live ECG, About, Events (Bot Forge), Workshops, Projects, Team, Gallery, Blog and Contact. There is also a Robo Sumo game and a small robot buddy.

## Robots and games

- `src/lib/robo-rig.ts` (front view), `robo-walk.ts` (side view), `robo-roam.ts` (his brain) and `components/site/RoboLayer.tsx`: Robo, the robot that roams the whole site. He sleeps, wakes, walks along the bottom of the screen, hops onto headings and cards, goes to what you are reading, can be picked up, and runs into a link and pops out on the next page. Preview poses with `node scripts/render-robo.mjs` and `render-walk.mjs`. Test his behaviour in a real browser with `scripts/roam-check` (23 checks: waking, walking, hopping, anchoring, the trip between pages, drag and drop, rest, reduced motion).
- `src/lib/sumo.ts` and `components/site/SumoGame.tsx`: Robo Sumo. Physics and CPU brain are plain code. `node --experimental-strip-types scripts/sumo-sim.mjs` plays hundreds of seeded matches and prints win rates for players of different skill.
- `components/site/HeaderEcg.tsx`: the live heartbeat in the header. Its rate follows how active the visitor is.

## SEO and AI readiness

`npm run seo` (it also runs before every build) writes `public/sitemap.xml`, `robots.txt`, `llms.txt` and `llms-full.txt` from `src/lib/site.ts`. Edit the facts there, not in those files. Pages carry canonical links and structured data (Organization, WebSite, Event, FAQPage).

## Where the facts live

Club facts, contacts, events and the core team are in `src/lib/site.ts`. Edit them there.
Registration stays "coming soon" until the club confirms the rules.

## Stack

TanStack Start (React), Tailwind CSS, deployed to Cloudflare Workers.

## Run it

```sh
npm install
npm run dev
```

## Deploy

Pushing to `main` builds and deploys through Cloudflare. In the Cloudflare project, the settings are:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

The Worker name in `wrangler.jsonc` (`ro-bio`) must match the project name in Cloudflare.
To deploy by hand: `npm run deploy`.

## Tests

`npm test`
