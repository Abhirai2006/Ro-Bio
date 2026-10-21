# RO-BIO

The website of RO-BIO, the Biomedical and Robotic Engineering club at Mysore University School of Engineering, Mysuru.

Live site: https://ro-bio.abhirai2006.workers.dev

## What is on the site

Home with an interactive robot arm (inverse kinematics) and a live ECG, About, Events (Bot Forge), Workshops, Projects, Team, Gallery, Blog and Contact. There is also a Robo Sumo game and a small robot buddy.

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
